/**
 * Filtrage du catalogue.
 *
 * Le filtre principal est le sujet, pas la compétence couverte. C'est toute la
 * raison des trois niveaux de classification : filtrer sur *sujet = SEO*
 * remonte les parcours dont c'est réellement l'objet ; filtrer sur *compétence
 * couverte = SEO* remonte ceux qui l'abordent. Un filtre qui remonte 54
 * résultats sur 195 ne filtre plus rien.
 *
 * Un filtre ne retire jamais une fiche parce qu'elle est incomplète. Le budget
 * fait exception explicite : une fiche sans prix publié reste visible quel que
 * soit le plafond, faute de quoi ne pas publier son prix deviendrait un moyen
 * d'échapper au filtre — ou d'y figurer indûment.
 */
import type { ParcoursListe } from "@/donnees/requetes";
import type {
  CategorieOrganisme,
  DomaineParcours,
  FormatParcours,
  NiveauEntree,
} from "@/types/cursus";
import { PARTIELLEMENT_GRATUIT, SANS_FRAIS } from "./modalite-acces";
import { accessibleIndividuellement, prixAffichable } from "./modalite-commerciale";

/** Tranches de volume horaire publiées dans la page Méthode. */
export const TRANCHES_DUREE = [
  "moins_20h",
  "de_20_a_100h",
  "de_100_a_500h",
  "plus_500h",
  "non_communique",
] as const;
export type TrancheDuree = (typeof TRANCHES_DUREE)[number];

export const LIBELLES_DUREES: Record<TrancheDuree, string> = {
  moins_20h: "Moins de 20 h",
  de_20_a_100h: "20 à 100 h",
  de_100_a_500h: "100 à 500 h",
  plus_500h: "Plus de 500 h",
  non_communique: "Non communiqué",
};

/** Tranche d'un volume horaire, ou `non_communique` s'il n'est pas publié. */
export function trancheDe(volumeHoraire: number | null): TrancheDuree {
  if (volumeHoraire === null) return "non_communique";
  if (volumeHoraire < 20) return "moins_20h";
  if (volumeHoraire <= 100) return "de_20_a_100h";
  if (volumeHoraire <= 500) return "de_100_a_500h";
  return "plus_500h";
}

/** Financements qui relèvent d'une prise en charge par l'employeur. */
const FINANCEMENTS_ENTREPRISE = /OPCO|plan de développement|entreprise|alternance/i;

export type Filtres = {
  recherche: string;
  /** Nom exact d'un organisme, tel que passé par la vue Organismes. */
  organisme: string | null;
  domaine: DomaineParcours | null;
  sujets: string[];
  competences: string[];
  categories: CategorieOrganisme[];
  formats: FormatParcours[];
  niveaux: NiveauEntree[];
  /** Plafond en euros. `null` = sans limite. */
  budget: number | null;
  eligibleCpf: boolean;
  certifiantSeulement: boolean;
  /**
   * L'apprenant ne débourse rien pour le parcours : accès libre, compte requis,
   * compte produit requis, ou prise en charge par un tiers.
   */
  sansFrais: boolean;
  /** Financement par l'employeur : OPCO, plan de développement des compétences. */
  financementEntreprise: boolean;
  /** Ne garder que les parcours dont le prix est effectivement publié. */
  prixCommunique: boolean;
  /**
   * Ne retenir que les parcours qu'une personne peut acheter elle-même.
   *
   * Critère d'accessibilité, pas de budget : un parcours réservé aux
   * entreprises reste au catalogue et reste visible sans ce filtre — il
   * intéresse un dirigeant qui forme son équipe.
   */
  accessibleIndividuellement: boolean;
  /**
   * Tranches de volume horaire. `non_communique` est une tranche explicite et
   * sélectionnable : une fiche sans volume publié doit pouvoir être cherchée,
   * pas seulement subie.
   */
  durees: TrancheDuree[];
  /**
   * Une partie seulement est gratuite : freemium, ou contenu libre à
   * certification payante. Distinct de « sans frais » — les confondre était
   * précisément l'ambiguïté du filtre « Gratuit ».
   */
  accesPartiel: boolean;
};

export const FILTRES_VIDES: Filtres = {
  recherche: "",
  organisme: null,
  domaine: null,
  sujets: [],
  competences: [],
  categories: [],
  formats: [],
  niveaux: [],
  budget: null,
  eligibleCpf: false,
  certifiantSeulement: false,
  sansFrais: false,
  financementEntreprise: false,
  prixCommunique: false,
  accessibleIndividuellement: false,
  durees: [],
  accesPartiel: false,
};

/** Texte indexé pour la recherche plein texte. */
function texteRecherchable(p: ParcoursListe): string {
  return [
    p.nom,
    p.organismeNom,
    p.sujetPrincipal,
    ...p.competencesCouvertes,
    p.certification ?? "",
    p.codeRncpRs ?? "",
    p.lieu ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function correspond(p: ParcoursListe, f: Filtres): boolean {
  if (f.recherche.trim() !== "") {
    const termes = f.recherche.toLowerCase().trim().split(/\s+/);
    const texte = texteRecherchable(p);
    if (!termes.every((t) => texte.includes(t))) return false;
  }

  if (f.organisme !== null && p.organismeNom !== f.organisme) return false;
  if (f.domaine !== null && p.domaine !== f.domaine) return false;
  if (f.sujets.length > 0 && !f.sujets.includes(p.sujetPrincipal)) return false;
  if (f.competences.length > 0 && !f.competences.some((c) => p.competencesCouvertes.includes(c))) {
    return false;
  }
  if (f.categories.length > 0 && !f.categories.includes(p.organismeCategorie)) return false;
  if (f.formats.length > 0 && !f.formats.some((fmt) => p.formats.includes(fmt))) return false;
  if (f.niveaux.length > 0 && (p.niveauEntree === null || !f.niveaux.includes(p.niveauEntree))) {
    return false;
  }

  // Un prix non publié n'exclut pas : l'absence d'information ne doit ni
  // profiter ni nuire. La fiche reste visible, son prix reste inconnu.
  // Le budget porte toujours sur le tarif individuel : un parcours sans tarif
  // inter n'a pas de prix comparable, et le filtrer sur son tarif de groupe
  // l'écarterait sur un chiffre qui ne concerne pas l'acheteur.
  const prixIndividuel = prixAffichable(p.prixMin, p);
  if (f.budget !== null && prixIndividuel !== null && prixIndividuel > f.budget) return false;

  if (f.durees.length > 0 && !f.durees.includes(trancheDe(p.volumeHoraire))) return false;

  // Un prix non publié n'est pas un prix : ce filtre sert à ne voir que les
  // fiches sur lesquelles une comparaison budgétaire est possible.
  if (f.prixCommunique && prixIndividuel === null) return false;

  // Ne promet que ce qui a été constaté : une disponibilité non tranchée ne
  // vaut pas une disponibilité vérifiée.
  if (f.accessibleIndividuellement && !accessibleIndividuellement(p)) return false;

  if (
    f.financementEntreprise &&
    !(p.financements ?? []).some((x) => FINANCEMENTS_ENTREPRISE.test(x))
  ) {
    return false;
  }

  if (f.eligibleCpf && p.eligibleCpf !== true) return false;
  if (f.certifiantSeulement && p.codeRncpRs === null) return false;

  // Une gratuité non qualifiée n'est pas une gratuité : une fiche dont la
  // modalité n'a pas été vérifiée ne remonte dans aucun des deux filtres.
  if (f.sansFrais && (p.modaliteAcces === null || !SANS_FRAIS.includes(p.modaliteAcces))) {
    return false;
  }
  if (
    f.accesPartiel &&
    (p.modaliteAcces === null || !PARTIELLEMENT_GRATUIT.includes(p.modaliteAcces))
  ) {
    return false;
  }

  return true;
}

export function filtrer(parcours: readonly ParcoursListe[], f: Filtres): ParcoursListe[] {
  return parcours.filter((p) => correspond(p, f));
}

/**
 * Décompte d'une valeur de filtre, tous les autres filtres restant actifs.
 *
 * Affiché à côté de chaque option : un filtre dont on ignore le rendement se
 * coche à l'aveugle, et une option à zéro résultat doit se voir avant d'être
 * cliquée, pas après.
 */
export function compterAvec(
  parcours: readonly ParcoursListe[],
  f: Filtres,
  remplacement: Partial<Filtres>,
): number {
  return filtrer(parcours, { ...f, ...remplacement }).length;
}

/** Vrai si au moins un filtre est actif — pilote l'affichage du bouton d'effacement. */
export function auMoinsUnFiltre(f: Filtres): boolean {
  return (
    f.recherche.trim() !== "" ||
    f.organisme !== null ||
    f.domaine !== null ||
    f.sujets.length > 0 ||
    f.competences.length > 0 ||
    f.categories.length > 0 ||
    f.formats.length > 0 ||
    f.niveaux.length > 0 ||
    f.budget !== null ||
    f.eligibleCpf ||
    f.certifiantSeulement ||
    f.sansFrais ||
    f.accesPartiel ||
    f.financementEntreprise ||
    f.prixCommunique ||
    f.accessibleIndividuellement ||
    f.durees.length > 0
  );
}

/* -------------------------------------------------------------------------- */
/* Écartées faute d'information                                               */
/* -------------------------------------------------------------------------- */

/**
 * Champs sur lesquels un filtre actif peut écarter une fiche pour la seule
 * raison que l'organisme ne publie pas l'information.
 */
const CHAMPS_SILENCIEUX: Array<{
  actif: (f: Filtres) => boolean;
  absent: (p: ParcoursListe) => boolean;
}> = [
  { actif: (f) => f.eligibleCpf, absent: (p) => p.eligibleCpf === null },
  { actif: (f) => f.certifiantSeulement, absent: (p) => p.codeRncpRs === null },
  { actif: (f) => f.sansFrais || f.accesPartiel, absent: (p) => p.modaliteAcces === null },
  { actif: (f) => f.financementEntreprise, absent: (p) => (p.financements ?? []).length === 0 },
  { actif: (f) => f.niveaux.length > 0, absent: (p) => p.niveauEntree === null },
  { actif: (f) => f.formats.length > 0, absent: (p) => p.formats.length === 0 },
];

/**
 * Compte les parcours écartés parce qu'une information manque, et non parce
 * qu'ils ne correspondent pas.
 *
 * Sans ce décompte, le filtrage récompense mécaniquement les organismes qui
 * publient et efface les autres — ce qui contredit la règle d'exhaustivité et
 * reproduit, au niveau du filtre, l'incitation inversée que le regroupement
 * cherche à supprimer.
 *
 * La tranche « non communiqué » du filtre de durée est un choix explicite de
 * l'utilisateur : elle n'entre pas dans ce décompte.
 */
export function compterEcartesFauteInformation(
  parcours: readonly ParcoursListe[],
  f: Filtres,
): number {
  const actifs = CHAMPS_SILENCIEUX.filter((champ) => champ.actif(f));
  if (actifs.length === 0) return 0;

  // Une fiche n'est comptée que si elle échoue *uniquement* à cause d'un champ
  // absent : si elle serait écartée de toute façon, ce n'est pas le silence de
  // l'organisme qui l'exclut.
  const sansCesFiltres: Filtres = {
    ...f,
    eligibleCpf: false,
    certifiantSeulement: false,
    sansFrais: false,
    accesPartiel: false,
    financementEntreprise: false,
    niveaux: [],
    formats: [],
  };

  return parcours.filter(
    (p) =>
      !correspond(p, f) && correspond(p, sansCesFiltres) && actifs.some((champ) => champ.absent(p)),
  ).length;
}
