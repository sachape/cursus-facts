/**
 * Les pages de croisement — un sujet, un critère, une adresse lisible.
 *
 * POURQUOI ELLES EXISTENT. Personne ne cherche « formation e-commerce ». On
 * cherche « formation Shopify éligible CPF », « formation e-commerce en
 * alternance », « formation Amazon FBA sans prérequis ». Chaque combinaison est
 * une requête réelle, à faible concurrence, qu'aucune fiche individuelle ne
 * capte et que le catalogue entier capte mal.
 *
 * ELLES SONT DÉRIVÉES DU CATALOGUE, JAMAIS ÉCRITES À LA MAIN. Une liste figée
 * survivrait à la donnée qui la justifie : la page resterait en ligne le jour
 * où la combinaison retombe à deux parcours. Ici, une page n'existe que tant
 * que le seuil est franchi, et elle disparaît d'elle-même sinon.
 *
 * PAS DE PARAMÈTRES DE REQUÊTE DANS L'ADRESSE INDEXABLE. `/formations/shopify-cpf`
 * et non `/catalogue?sujet=Shopify&cpf=1`. Les deux serviraient le même contenu,
 * et deux adresses pour un contenu est la définition du doublon. Les adresses à
 * paramètres restent donc en `noindex` sans exception — voir `plan-pages.ts`.
 *
 * CE QUI RESTE INTERDIT ICI COMME AILLEURS : aucun classement par qualité,
 * aucune mise en avant, aucun chiffre écrit en dur. Une page qui annonce douze
 * formations en annonce onze le jour où l'une sort.
 */
import type { ParcoursListe } from "@/donnees/requetes";
import type { DomaineParcours, FormatParcours, NiveauEntree } from "@/types/cursus";
import { FILTRES_VIDES, filtrer, type Filtres } from "./filtres";
import { LIBELLES_DOMAINES, LIBELLES_FORMATS, LIBELLES_NIVEAUX } from "./vocabulaires";
import { formaterNombre } from "./nombres";

/**
 * Le seuil, et il ne se négocie pas.
 *
 * CINQ PARCOURS DONT TROIS AVEC UN PRIX. Les deux conditions disent deux choses
 * différentes : cinq, c'est de quoi remplir une liste — en deçà, la page
 * n'apprend rien que le catalogue filtré n'apprendrait. Trois prix, c'est de
 * quoi annoncer une fourchette honnête : une fourchette calculée sur un seul
 * montant n'est pas une fourchette, c'est un prix déguisé en intervalle.
 *
 * Sous le seuil, la page N'EST PAS GÉNÉRÉE — ni vide, ni en `noindex`. Une page
 * pauvre servie en `noindex` reste une page : elle s'affiche, elle se partage,
 * elle déçoit. Celle-ci répond 404, ce qui est la vérité.
 */
export const SEUIL_PARCOURS = 5;
export const SEUIL_PRIX = 3;

export type FamilleCroisement = "financement" | "format" | "niveau";

export type Croisement = {
  slug: string;
  famille: FamilleCroisement;
  /** Ce sur quoi porte la page : un sujet nommé, ou un domaine. */
  axeLibelle: string;
  /** Le second critère, tel qu'il s'écrit dans un titre. */
  critereLibelle: string;
  /** Les filtres à poser sur le catalogue — la même fonction que la liste. */
  filtres: Filtres;
};

/**
 * Les sujets qui passent par leur DOMAINE plutôt que par leur nom.
 *
 * « E-commerce généraliste + présentiel » et « E-commerce + présentiel »
 * désignent la même liste à quelques fiches près. Publier les deux fabriquerait
 * exactement le motif de page en double qu'on cherche à éviter — et c'est le
 * genre de doublon qu'on ne voit pas, puisque les deux pages ont l'air
 * légitimes prises séparément.
 *
 * La règle : un sujet générique n'a pas de nom qu'on tape dans un moteur, donc
 * il passe par son domaine. Un sujet nommé — Shopify, Amazon FBA — garde le
 * sien, puisque c'est celui de la requête.
 */
const SUJETS_GENERIQUES = [
  "E-commerce généraliste",
  "Marketing digital généraliste",
  "Commerce et vente",
] as const;

type Axe = { cle: string; libelle: string; filtres: Partial<Filtres> };

/** Les axes disponibles, lus dans le catalogue et non déclarés. */
function axes(parcours: readonly ParcoursListe[]): Axe[] {
  const sujets = [...new Set(parcours.map((p) => p.sujetPrincipal))]
    .filter((s) => !(SUJETS_GENERIQUES as readonly string[]).includes(s))
    .sort();
  const domaines = [...new Set(parcours.map((p) => p.domaine))].sort();
  return [
    ...sujets.map((s) => ({ cle: s, libelle: s, filtres: { sujets: [s] } })),
    ...domaines.map((d) => ({
      cle: d,
      libelle: LIBELLES_DOMAINES[d as DomaineParcours],
      filtres: { domaine: d as DomaineParcours },
    })),
  ];
}

type Critere = {
  famille: FamilleCroisement;
  cle: string;
  /** Ce qui s'écrit dans le titre, après le sujet. */
  libelle: string;
  filtres: Partial<Filtres>;
};

/*
  LES TROIS FAMILLES VIVANTES.

  La quatrième — domaine × région — n'y figure pas, et ce n'est pas un oubli :
  `lieu` est vide sur 173 fiches sur 215, et sur les 42 restantes il mélange des
  régions et des villes (« Île-de-France » à côté de « Paris », « Lyon »,
  « Vieux-Lille », « Paris 15 », et même « En ligne »). La région la mieux
  fournie réunit six parcours, ce qui produit UNE combinaison au seuil : une
  page unique ne fait pas une famille, et son maillage n'aurait nulle part où
  aller.

  Ce qui débloquerait la famille n'est pas une route de plus, c'est un
  nettoyage du champ en vocabulaire de régions — un chantier de collecte, à
  mener avant d'ouvrir la porte, pas après.
*/
const CRITERES: readonly Critere[] = [
  // 1. Financement — le plus fort en intention : qui cherche un financement a
  //    déjà décidé de se former.
  { famille: "financement", cle: "cpf", libelle: "éligibles au CPF", filtres: { eligibleCpf: true } },
  {
    famille: "financement",
    cle: "sans-frais",
    libelle: "sans frais pour l'apprenant",
    filtres: { sansFrais: true },
  },
  // 2. Format.
  ...(["distanciel", "presentiel", "alternance"] as const).map((f) => ({
    famille: "format" as const,
    /* L'ADRESSE ÉPOUSE LA REQUÊTE, PAS LE VOCABULAIRE DE LA BASE. On tape
       « formation shopify à distance », jamais « distanciel » — et l'adresse
       est lue par un humain avant de l'être par un robot. Les deux autres
       gardent leur mot, qui est celui qu'on tape. */
    cle: f === "distanciel" ? "a-distance" : f,
    libelle:
      f === "distanciel" ? "à distance" : f === "presentiel" ? "en présentiel" : "en alternance",
    filtres: { formats: [f as FormatParcours] },
  })),
  // 4. Niveau d'entrée.
  ...(["aucun_prerequis", "bac2", "bac3", "experience"] as const).map((n) => ({
    famille: "niveau" as const,
    cle: n === "aucun_prerequis" ? "sans-prerequis" : n.replace("_", "-"),
    libelle:
      n === "aucun_prerequis"
        ? "sans prérequis"
        : n === "experience"
          ? "accessibles par l'expérience"
          : `accessibles à ${LIBELLES_NIVEAUX[n]}`,
    filtres: { niveaux: [n as NiveauEntree] },
  })),
];

function slugifier(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Toutes les pages de croisement que le catalogue justifie AUJOURD'HUI.
 *
 * Recalculée à chaque lecture. C'est ce qui fait qu'une page disparaît quand sa
 * combinaison retombe sous le seuil, sans qu'aucune liste n'ait à être tenue.
 */
export function croisements(parcours: readonly ParcoursListe[]): Croisement[] {
  const retenus: Croisement[] = [];
  for (const axe of axes(parcours)) {
    for (const critere of CRITERES) {
      const filtres: Filtres = { ...FILTRES_VIDES, ...axe.filtres, ...critere.filtres };
      const resultats = filtrer(parcours, filtres);
      if (resultats.length < SEUIL_PARCOURS) continue;
      if (resultats.filter(aUnPrix).length < SEUIL_PRIX) continue;
      retenus.push({
        slug: `${slugifier(axe.cle)}-${critere.cle}`,
        famille: critere.famille,
        axeLibelle: axe.libelle,
        critereLibelle: critere.libelle,
        filtres,
      });
    }
  }
  return retenus;
}

export function croisementParSlug(
  parcours: readonly ParcoursListe[],
  slug: string,
): Croisement | undefined {
  return croisements(parcours).find((c) => c.slug === slug);
}

/** Un prix relevé, quelle que soit sa forme. */
export function aUnPrix(p: ParcoursListe): boolean {
  return p.prixMin !== null || p.prixMax !== null;
}

/**
 * Trois croisements voisins, pour le maillage.
 *
 * VOISIN VEUT DIRE « PARTAGE UN AXE », et non « ressemble ». Depuis
 * « Shopify à distance », on propose les autres pages Shopify puis les autres
 * pages à distance : dans les deux cas, la personne qui suit le lien change une
 * seule dimension de sa recherche. Un lien vers une page sans rapport ne se
 * clique pas, et un maillage qui ne se clique pas ne maille rien.
 */
export function voisins(tous: readonly Croisement[], courant: Croisement, combien = 3): Croisement[] {
  const autres = tous.filter((c) => c.slug !== courant.slug);
  const memeAxe = autres.filter((c) => c.axeLibelle === courant.axeLibelle);
  const memeCritere = autres.filter(
    (c) => c.critereLibelle === courant.critereLibelle && c.axeLibelle !== courant.axeLibelle,
  );
  return [...memeAxe, ...memeCritere].slice(0, combien);
}

/* ------------------------------------------------------------------------ */
/* Ce que la page dit d'elle-même — tout calculé à la lecture.               */
/* ------------------------------------------------------------------------ */

export type ChiffresCroisement = {
  total: number;
  avecPrix: number;
  prixMin: number | null;
  prixMax: number | null;
  organismes: string[];
  certifiants: number;
};

export function chiffres(resultats: readonly ParcoursListe[]): ChiffresCroisement {
  const montants = resultats
    .flatMap((p) => [p.prixMin, p.prixMax])
    .filter((m): m is number => m !== null && m > 0);
  return {
    total: resultats.length,
    avecPrix: resultats.filter(aUnPrix).length,
    prixMin: montants.length > 0 ? Math.min(...montants) : null,
    prixMax: montants.length > 0 ? Math.max(...montants) : null,
    organismes: [...new Set(resultats.map((p) => p.organismeNom))].sort(),
    certifiants: resultats.filter((p) => p.codeRncpRs !== null && p.codeRncpRs !== "").length,
  };
}

/**
 * Ce qu'il faut pour rédiger, et rien de plus.
 *
 * Les fonctions de texte ne prennent pas un `Croisement` entier : le `head()`
 * d'une route ne reçoit que ce que le loader a sérialisé, et les filtres n'ont
 * rien à y faire. Un type étroit évite la conversion de complaisance qui
 * finirait par masquer une vraie erreur de forme.
 */
export type LibellesCroisement = Pick<Croisement, "axeLibelle" | "critereLibelle">;

export function titre(c: LibellesCroisement, ch: ChiffresCroisement): string {
  return `${ch.total} formations ${c.axeLibelle} ${c.critereLibelle} | Formlist`;
}

export function description(c: LibellesCroisement, ch: ChiffresCroisement): string {
  const fourchette =
    ch.prixMin !== null && ch.prixMax !== null
      ? ` De ${formaterNombre(ch.prixMin)} à ${formaterNombre(ch.prixMax)} €.`
      : "";
  return (
    `${ch.total} formations ${c.axeLibelle} ${c.critereLibelle}, ` +
    `chez ${ch.organismes.length} organismes.${fourchette} ` +
    `Prix, durée et certification relevés à la source.`
  );
}

/**
 * Le paragraphe d'introduction — trois à quatre phrases, toutes chiffrées.
 *
 * AUCUNE PHRASE GÉNÉRIQUE RÉPÉTÉE. Un texte identique d'une page à l'autre est
 * précisément ce qui déclenche le motif « page en double » : quarante pages
 * dont seul le titre change ne sont pas quarante pages. Chaque phrase ici porte
 * une valeur lue dans la liste — leur combinaison diffère donc dès que la liste
 * diffère, et `croisements.test.ts` le vérifie sur les pages voisines, celles
 * qui se ressemblent le plus.
 */
export function introduction(c: LibellesCroisement, ch: ChiffresCroisement): string {
  const phrases: string[] = [
    `Formlist recense ${ch.total} formations ${c.axeLibelle} ${c.critereLibelle}, ` +
      `réparties chez ${ch.organismes.length} ${ch.organismes.length > 1 ? "organismes" : "organisme"}.`,
  ];

  if (ch.prixMin !== null && ch.prixMax !== null && ch.prixMin !== ch.prixMax) {
    phrases.push(
      `Les tarifs relevés vont de ${formaterNombre(ch.prixMin)} à ${formaterNombre(ch.prixMax)} €, ` +
        `sur ${ch.avecPrix} parcours dont l'organisme publie un prix.`,
    );
  } else {
    phrases.push(
      `${ch.avecPrix} de ces parcours affichent un prix publié par leur organisme ; ` +
        `les autres ne le communiquent pas.`,
    );
  }

  phrases.push(
    ch.certifiants > 0
      ? `${ch.certifiants} portent un code enregistré au Répertoire national ou au Répertoire ` +
        `spécifique, condition nécessaire à la plupart des financements.`
      : `Aucun de ces parcours ne porte de code RNCP ou RS : ils ne sont pas finançables ` +
        `par les dispositifs qui l'exigent.`,
  );

  const cites = ch.organismes.slice(0, 3);
  phrases.push(
    `Parmi les organismes concernés : ${cites.join(", ")}` +
      (ch.organismes.length > cites.length ? `, et ${ch.organismes.length - cites.length} autres.` : "."),
  );

  return phrases.join(" ");
}
