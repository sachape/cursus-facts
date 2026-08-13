/**
 * Pourquoi un prix n'a pas été retenu — et à qui l'absence appartient.
 *
 * L'INVERSION QUE CE MODULE EXISTE POUR EMPÊCHER.
 *
 * Le 13 août 2026, le crawl a classé le Mastère E-business d'ENACO en « prix
 * non publié par l'organisme ». Sa page portait « Cette formation est proposée
 * à partir de 4990 € TTC », la phrase exacte que le même pipeline avait
 * extraite sans peine sur quatre pages voisines du même organisme.
 *
 * Le rejet venait de nous ; le motif le faisait porter à ENACO.
 *
 * C'est l'inversion que tout le modèle interdit — « confondre les deux fait
 * porter au vendeur une opacité qui est peut-être la nôtre » — réintroduite
 * dans le code qui l'applique. Elle a été possible parce qu'une seule fonction
 * rendait `null` pour cinq raisons différentes, et que la restitution les
 * écrasait toutes dans un seul motif.
 *
 * LA RÈGLE : une seule cause autorise à conclure sur l'organisme.
 *
 *   aucun_prix_cite        → le modèle n'a rien proposé sur une page lue.
 *                            FAIT SUR L'ORGANISME. C'est la seule.
 *
 *   citation_invalide      → il a proposé une valeur qu'il n'a pas su citer.
 *   unite_indeterminee     → prix trouvé, unité non tranchée.
 *   unite_non_comparable   → mensuel, annuel, horaire : non ramenable à un total.
 *   journalier_sans_duree  → tarif journalier, durée en jours inconnue.
 *   attribution_refusee    → prix trouvé hors page de détail, voisinage muet.
 *                            FAITS SUR NOUS. Aucun ne conclut sur l'organisme.
 *
 * Un prix annuel n'est pas un prix absent : l'organisme l'a publié, c'est notre
 * modèle de comparaison qui ne sait pas encore le représenter.
 */

/** Les six causes de non-rétention, exhaustives et distinctes. */
export const CAUSES = [
  "aucun_prix_cite",
  "citation_invalide",
  "unite_indeterminee",
  "unite_non_comparable",
  "journalier_sans_duree",
  "attribution_refusee",
] as const;
export type Cause = (typeof CAUSES)[number];

/**
 * La seule cause qui autorise à écrire une absence sur le compte de
 * l'organisme. Déclarée en dur, et vérifiée par `invariants.ts` : c'est une
 * liste qui ne doit jamais s'allonger sans que quelqu'un le voie.
 */
export const CAUSES_ORGANISME: readonly Cause[] = ["aucun_prix_cite"];

export type Imputation = "non_publie_par_organisme" | "non_collecte";

/**
 * À qui appartient cette absence ?
 *
 * `non_collecte` est le défaut, et c'est délibéré : face à une cause qu'on
 * n'aurait pas prévue, l'absence nous revient. L'asymétrie des coûts va dans ce
 * sens — s'attribuer une limite qu'on n'a pas coûte un point de couverture,
 * l'attribuer à tort à un organisme lui fait porter une opacité imaginaire.
 */
export function imputer(cause: Cause): Imputation {
  return CAUSES_ORGANISME.includes(cause) ? "non_publie_par_organisme" : "non_collecte";
}

/** Libellés de restitution, pour que le motif se lise sans décodeur. */
export const LIBELLES_CAUSE: Record<Cause, string> = {
  aucun_prix_cite: "aucun prix cité sur les pages lues — l'organisme ne le publie pas",
  citation_invalide: "prix proposé mais non cité littéralement — rejet de notre garde-fou",
  unite_indeterminee: "prix trouvé, unité non tranchée — notre limite",
  unite_non_comparable: "prix publié dans une unité non ramenable à un total — notre limite",
  journalier_sans_duree: "tarif journalier sans durée en jours connue — notre limite",
  attribution_refusee: "prix trouvé hors page de détail, non rattachable à ce parcours",
};
