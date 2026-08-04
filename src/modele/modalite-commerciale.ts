/**
 * Modalité commerciale — inter-entreprises ou intra-entreprise.
 *
 * C'est une distinction structurante de tout le marché de la formation
 * professionnelle, et ce ne sont PAS deux tarifs d'un même produit :
 *
 *   - **inter** : une personne s'inscrit à une session collective. C'est ce que
 *     notre utilisateur cherche.
 *   - **intra** : une entreprise fait venir le formateur pour ses équipes. Le
 *     tarif est celui du groupe entier, souvent trois à cinq fois le tarif
 *     inter, et l'offre ne s'adresse pas à un particulier.
 *
 * Confondre les deux fait afficher des prix trois fois trop élevés et écarte
 * ces parcours du filtre budget où ils avaient leur place. ORSYS, Cegos, M2i,
 * ISM et Dawan publient tous les deux tarifs.
 *
 * RÈGLE. Le prix affiché, le tri et le filtre budget portent toujours sur le
 * tarif inter. Le tarif intra figure sur la fiche, clairement étiqueté, jamais
 * dans la liste. Un parcours proposé uniquement en intra sort du périmètre :
 * il ne concerne pas un particulier qui cherche à se former.
 */

export const MODALITES_COMMERCIALES = ["inter", "intra", "les_deux"] as const;
export type ModaliteCommerciale = (typeof MODALITES_COMMERCIALES)[number];

export const LIBELLES_MODALITES_COMMERCIALES: Record<ModaliteCommerciale, string> = {
  inter: "Inter-entreprises",
  intra: "Intra-entreprise",
  les_deux: "Inter et intra-entreprises",
};

export const DEFINITIONS_MODALITES_COMMERCIALES: Record<ModaliteCommerciale, string> = {
  inter: "Session collective à laquelle une personne s'inscrit individuellement",
  intra: "L'organisme intervient chez une entreprise pour ses équipes ; le tarif est celui du groupe",
  les_deux: "Proposé en session collective comme en intervention chez le client",
};

/**
 * Le prix retenu pour l'affichage, le tri et le filtre budget.
 *
 * Toujours le tarif inter. Un parcours dont seul le tarif intra est connu n'a
 * pas de prix affichable pour un particulier : renvoyer `null` est plus exact
 * que d'afficher un tarif de groupe.
 */
export function prixAffichable(
  prixInter: number | null,
  modalite: ModaliteCommerciale | null,
): number | null {
  if (modalite === "intra") return null;
  return prixInter;
}

/** Vrai si le parcours sort du périmètre : réservé aux entreprises. */
export function horsPerimetre(modalite: ModaliteCommerciale | null): boolean {
  return modalite === "intra";
}
