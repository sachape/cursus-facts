/**
 * L'état des filtres, porté par l'adresse.
 *
 * TROIS RAISONS, ET AUCUNE N'EST LE CONFORT.
 *
 * 1. Les pages de croisement — « formation Shopify éligible CPF », « formation
 *    e-commerce à distance » — ne peuvent pas exister sans adresse portant un
 *    état de filtre. Sans elles, les guides qualifient sans convertir.
 * 2. Personne ne peut aujourd'hui envoyer un lien vers une recherche filtrée,
 *    ce qu'on attend de n'importe quel comparateur.
 * 3. La mesure : sans filtre dans l'adresse, `filtre_applique` est le seul
 *    endroit où l'on sait ce que les gens filtrent. Dans l'adresse, la Search
 *    Console le dit directement, et sur toute la population — pas seulement sur
 *    celle qui accepte la mesure.
 *
 * LES NOMS DE PARAMÈTRES SONT UN CONTRAT PUBLIC. Une adresse partagée, indexée
 * ou collée dans un document doit continuer de fonctionner : ces clés se
 * complètent, elles ne se renomment pas. C'est la même règle que les ancres
 * déclarées de la page Méthode.
 *
 * SEULES LES VALEURS QUI S'ÉCARTENT DU DÉFAUT SONT ÉCRITES. Une adresse qui
 * énumère dix-huit filtres vides est illisible, impartageable, et fabrique
 * autant de variantes de la même page.
 */
import {
  FILTRES_VIDES,
  normaliserBudget,
  TRANCHES_DUREE,
  type Filtres,
  type TrancheDuree,
} from "./filtres";
import { FILTRES_CONDITION, type FiltreCondition } from "./condition-cout";
import { LIBELLES_CATEGORIES, LIBELLES_DOMAINES } from "./vocabulaires";
import {
  CATEGORIES_ORGANISME,
  FORMATS_PARCOURS,
  NIVEAUX_ENTREE,
  type CategorieOrganisme,
  type DomaineParcours,
  type FormatParcours,
  type NiveauEntree,
} from "@/types/cursus";

/** Les paramètres d'adresse reconnus, en clair. */
export type ParametresFiltres = {
  q?: string;
  organisme?: string;
  domaine?: string;
  sujet?: string;
  competence?: string;
  categorie?: string;
  format?: string;
  niveau?: string;
  duree?: string;
  condition?: string;
  budgetMin?: string;
  budgetMax?: string;
  prixInconnu?: string;
  cpf?: string;
  certifiant?: string;
  sansFrais?: string;
  accesPartiel?: string;
  entreprise?: string;
  prixPublie?: string;
  individuel?: string;
};

export const CLES_FILTRES = [
  "q",
  "organisme",
  "domaine",
  "sujet",
  "competence",
  "categorie",
  "format",
  "niveau",
  "duree",
  "condition",
  "budgetMin",
  "budgetMax",
  "prixInconnu",
  "cpf",
  "certifiant",
  "sansFrais",
  "accesPartiel",
  "entreprise",
  "prixPublie",
  "individuel",
] as const satisfies ReadonlyArray<keyof ParametresFiltres>;

/*
  La virgule sépare les valeurs multiples : lisible dans une barre d'adresse,
  et acceptée telle quelle par les moteurs. Un sujet contenant une virgule
  casserait le découpage — il n'en existe aucun dans le vocabulaire, et
  `parite.test.ts` verrouille ce vocabulaire.
*/
const SEPARATEUR = ",";

/**
 * Une valeur d'adresse, lue comme du texte.
 *
 * ACCEPTE AUSSI LES NOMBRES. Le routeur relit `?cpf=1` comme le nombre 1 et
 * `?budgetMax=2500` comme 2500 : un paramètre d'adresse n'a pourtant pas de
 * type, il n'a qu'une écriture. Exiger `typeof === "string"` faisait
 * silencieusement disparaître tous les filtres dont la valeur ressemble à un
 * nombre — c'est-à-dire tous les drapeaux et les deux bornes de budget.
 */
function texte(valeur: unknown): string | null {
  if (typeof valeur === "number" && Number.isFinite(valeur)) return String(valeur);
  if (typeof valeur !== "string") return null;
  const propre = valeur.trim();
  return propre === "" ? null : propre;
}

function liste(valeur: unknown): string[] {
  const brut = texte(valeur);
  if (brut === null) return [];
  return brut
    .split(SEPARATEUR)
    .map((v) => v.trim())
    .filter((v) => v !== "");
}

/**
 * Ne retient d'une liste que les valeurs du vocabulaire.
 *
 * Une valeur inventée dans l'adresse ne doit pas produire une liste vide sans
 * explication : elle est ignorée, et la page répond ce qu'elle peut. C'est la
 * règle déjà posée sur `?domaine=`, généralisée à tous les filtres fermés.
 */
function retenues<T extends string>(valeur: unknown, vocabulaire: readonly T[]): T[] {
  const connues = new Set<string>(vocabulaire);
  return [...new Set(liste(valeur).filter((v): v is T => connues.has(v)))];
}

function vrai(valeur: unknown): boolean {
  return texte(valeur) === "1";
}

function entier(valeur: unknown): number | null {
  const brut = texte(valeur);
  if (brut === null || !/^\d+$/.test(brut)) return null;
  return Number(brut);
}

/** L'état de filtres décrit par une adresse. */
export function depuisParametres(recherche: Record<string, unknown>): Filtres {
  const { budgetMin, budgetMax } = normaliserBudget(
    entier(recherche["budgetMin"]),
    entier(recherche["budgetMax"]),
  );

  const domaine = texte(recherche["domaine"]);

  return {
    ...FILTRES_VIDES,
    recherche: texte(recherche["q"]) ?? "",
    organisme: texte(recherche["organisme"]),
    domaine: domaine !== null && domaine in LIBELLES_DOMAINES ? (domaine as DomaineParcours) : null,
    /*
      Sujets, compétences et organismes ne forment pas un vocabulaire fermé :
      ils viennent du catalogue, qui bouge. Une valeur inconnue y donne zéro
      résultat plutôt que d'être ignorée — et c'est le bon comportement, car
      elle a pu exister hier et disparaître avec une fiche.
    */
    sujets: [...new Set(liste(recherche["sujet"]))],
    competences: [...new Set(liste(recherche["competence"]))],
    categories: retenues<CategorieOrganisme>(recherche["categorie"], CATEGORIES_ORGANISME),
    formats: retenues<FormatParcours>(recherche["format"], FORMATS_PARCOURS),
    niveaux: retenues<NiveauEntree>(recherche["niveau"], NIVEAUX_ENTREE),
    durees: retenues<TrancheDuree>(recherche["duree"], TRANCHES_DUREE),
    conditionsAcces: retenues<FiltreCondition>(recherche["condition"], FILTRES_CONDITION),
    budgetMin,
    budgetMax,
    // Cochée par défaut : l'adresse ne porte que le refus explicite.
    inclurePrixInconnu: texte(recherche["prixInconnu"]) !== "0",
    eligibleCpf: vrai(recherche["cpf"]),
    certifiantSeulement: vrai(recherche["certifiant"]),
    sansFrais: vrai(recherche["sansFrais"]),
    accesPartiel: vrai(recherche["accesPartiel"]),
    financementEntreprise: vrai(recherche["entreprise"]),
    prixCommunique: vrai(recherche["prixPublie"]),
    accessibleIndividuellement: vrai(recherche["individuel"]),
  };
}

/** L'adresse qui décrit un état de filtres. Seuls les écarts au défaut y figurent. */
export function versParametres(f: Filtres): ParametresFiltres {
  const p: ParametresFiltres = {};
  const poser = (cle: keyof ParametresFiltres, valeur: string | null) => {
    if (valeur !== null && valeur !== "") p[cle] = valeur;
  };
  const drapeau = (cle: keyof ParametresFiltres, actif: boolean) => {
    if (actif) p[cle] = "1";
  };

  poser("q", f.recherche.trim() === "" ? null : f.recherche.trim());
  poser("organisme", f.organisme);
  poser("domaine", f.domaine);
  poser("sujet", f.sujets.join(SEPARATEUR));
  poser("competence", f.competences.join(SEPARATEUR));
  poser("categorie", f.categories.join(SEPARATEUR));
  poser("format", f.formats.join(SEPARATEUR));
  poser("niveau", f.niveaux.join(SEPARATEUR));
  poser("duree", f.durees.join(SEPARATEUR));
  poser("condition", f.conditionsAcces.join(SEPARATEUR));
  poser("budgetMin", f.budgetMin === null ? null : String(f.budgetMin));
  poser("budgetMax", f.budgetMax === null ? null : String(f.budgetMax));
  // Seul le refus s'écrit : l'inclusion est le défaut.
  if (!f.inclurePrixInconnu) p.prixInconnu = "0";
  drapeau("cpf", f.eligibleCpf);
  drapeau("certifiant", f.certifiantSeulement);
  drapeau("sansFrais", f.sansFrais);
  drapeau("accesPartiel", f.accesPartiel);
  drapeau("entreprise", f.financementEntreprise);
  drapeau("prixPublie", f.prixCommunique);
  drapeau("individuel", f.accessibleIndividuellement);

  return p;
}

/**
 * L'adresse d'un état de filtres, pour un canonique ou un lien.
 *
 * ORDRE STABLE, celui de `CLES_FILTRES` : deux adresses décrivant le même état
 * doivent être la même chaîne, sans quoi un canonique auto-référent désignerait
 * une variante de lui-même et le moteur verrait deux pages là où il y en a une.
 */
export function adresseFiltre(parametres: ParametresFiltres, base = ""): string {
  const paires = CLES_FILTRES.filter((cle) => parametres[cle] !== undefined).map(
    (cle) => `${cle}=${encodeURIComponent(parametres[cle]!)}`,
  );
  return paires.length === 0 ? `${base}/` : `${base}/?${paires.join("&")}`;
}

/** Vrai si l'adresse porte au moins un filtre. Pilote l'indexabilité. */
export function porteUnFiltre(parametres: ParametresFiltres): boolean {
  return CLES_FILTRES.some((cle) => parametres[cle] !== undefined);
}

/** Les seuls paramètres de filtre d'une adresse, dans un ordre stable. */
export function normaliserParametres(recherche: Record<string, unknown>): ParametresFiltres {
  return versParametres(depuisParametres(recherche));
}

/**
 * Vrai si les deux adresses décrivent le même état de filtres.
 *
 * Comparé sur les paramètres NORMALISÉS, jamais sur la chaîne brute : l'ordre
 * des clés, une valeur inventée ou un doublon donnent des chaînes différentes
 * pour un même état, et une comparaison textuelle relancerait une navigation
 * en boucle.
 */
export function memesFiltres(a: ParametresFiltres, b: ParametresFiltres): boolean {
  return CLES_FILTRES.every((cle) => (a[cle] ?? null) === (b[cle] ?? null));
}
