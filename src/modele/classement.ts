/**
 * Classement des résultats.
 *
 * Aucun critère n'est achetable. Le tri décrit l'état des fiches, jamais la
 * qualité des formations — et son libellé est toujours affiché sous la liste
 * (invariant 4). Un tri dont on ne publie pas la règle est un classement
 * éditorial déguisé.
 *
 * NE JAMAIS TRIER PAR RATIO. Ordonner sur `renseignees / applicables`
 * produirait un chiffre sur 100 qui se lit comme une note, et rétablirait par
 * la bande le score que le produit refuse. Le critère est le NOMBRE
 * d'informations disponibles, en valeur absolue.
 *
 * Effet recherché, assumé : un organisme mal classé n'a pas à négocier, il a à
 * remplir sa fiche. C'est ce mécanisme qui alimentera la revendication de fiche
 * en V2.
 *
 * Effet pervers, non résolu : avec une pagination par 25, une fiche à 7
 * informations atterrit en page 4. Le référencement est préservé, la visibilité
 * non.
 */
import { rangPrix, type ModaliteAcces } from "./modalite-acces";
import { prixAffichable } from "./modalite-commerciale";

/** Ce dont le classement a besoin de connaître d'un parcours. */
export type ParcoursClassable = {
  nom: string;
  /** Nombre d'informations renseignées. Jamais rapporté au dénominateur ici. */
  infosRenseignees: number;
  /** Date de dernière vérification, au format ISO. */
  dateVerification: string | null;
  prixMin: number | null;
  dispoInter?: boolean | null;
  volumeHoraire: number | null;
  /** Qualifie la gratuité : une fiche en accès partiel n'est pas gratuite. */
  modaliteAcces?: ModaliteAcces | null;
};

export const TRIS = ["informations", "verification", "alphabetique", "prix", "duree"] as const;
export type Tri = (typeof TRIS)[number];

/** Le tri appliqué par défaut. */
export const TRI_PAR_DEFAUT: Tri = "informations";

/**
 * Libellés publiés sous la liste. Ils énoncent la règle, pas une promesse de
 * pertinence, et disent explicitement ce que le tri ne signifie pas.
 */
export const LIBELLES_TRIS: Record<Tri, string> = {
  informations:
    "Tri par défaut : les parcours dont le plus d'informations sont disponibles apparaissent en premier, puis les plus récemment vérifiés. Ce tri décrit l'état des fiches, pas la qualité des formations. Aucune fiche n'est retirée du catalogue parce qu'elle est incomplète.",
  verification: "Tri par date de dernière vérification des informations.",
  alphabetique: "Tri alphabétique sur l'intitulé du parcours.",
  prix: "Tri par prix croissant. Les parcours sans prix public sont renvoyés en fin de liste.",
  duree:
    "Tri par volume horaire croissant. Les parcours sans volume publié sont renvoyés en fin de liste.",
};

/** Compare deux textes selon l'ordre alphabétique français. */
const parIntitule = (a: ParcoursClassable, b: ParcoursClassable) =>
  a.nom.localeCompare(b.nom, "fr");

/** Compare deux dates de vérification, la plus fraîche d'abord. */
const parFraicheur = (a: ParcoursClassable, b: ParcoursClassable) =>
  (b.dateVerification ?? "").localeCompare(a.dateVerification ?? "");

/**
 * Renvoie les parcours sans valeur publiée en fin de liste.
 *
 * Une information absente ne doit ni être devinée, ni faire passer la fiche
 * devant celles qui publient. Elle la place en fin de tri, sans la retirer.
 */
const absentsEnDernier = (a: number | null, b: number | null, comparaison: number) =>
  Number(a === null) - Number(b === null) || comparaison;

const tarifIndividuel = (p: ParcoursClassable) =>
  prixAffichable(p.prixMin, { dispoInter: p.dispoInter ?? null, dispoIntra: null });

const COMPARATEURS: Record<Tri, (a: ParcoursClassable, b: ParcoursClassable) => number> = {
  // Les trois critères successifs du modèle : informations, fraîcheur, alphabétique.
  informations: (a, b) =>
    b.infosRenseignees - a.infosRenseignees || parFraicheur(a, b) || parIntitule(a, b),
  verification: parFraicheur,
  alphabetique: parIntitule,
  // Le rang tient compte de la modalité : une fiche en accès partiel gratuit
  // ne remonte pas en tête comme si le parcours complet ne coûtait rien.
  prix: (a, b) => {
    // Le tri porte sur le tarif individuel. Un parcours réservé aux entreprises
    // n'a pas de prix comparable pour une personne : il rejoint les prix
    // inconnus en fin de tri, plutôt que de s'insérer avec un tarif de groupe.
    const prixA = tarifIndividuel(a);
    const prixB = tarifIndividuel(b);
    return absentsEnDernier(
      prixA,
      prixB,
      rangPrix(prixA, a.modaliteAcces ?? null) - rangPrix(prixB, b.modaliteAcces ?? null),
    );
  },
  duree: (a, b) =>
    absentsEnDernier(a.volumeHoraire, b.volumeHoraire, (a.volumeHoraire ?? 0) - (b.volumeHoraire ?? 0)),
};

/** Classe une liste de parcours, sans la modifier sur place. */
export function classer<T extends ParcoursClassable>(
  parcours: readonly T[],
  tri: Tri = TRI_PAR_DEFAUT,
): T[] {
  return [...parcours].sort(COMPARATEURS[tri]);
}
