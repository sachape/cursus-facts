/**
 * Modalité d'accès — qualifier la gratuité au lieu de l'affirmer.
 *
 * « Gratuit » recouvre au moins cinq réalités très différentes, et les écraser
 * en un prix valant zéro induit l'utilisateur en erreur au moment précis où il
 * compare des budgets. Un cours en accès libre, un cours réservé aux clients
 * d'un produit, un contenu libre à certification payante et une formation
 * portée par un OPCO ne sont pas la même offre.
 *
 * RÈGLE D'ASSERTION. La gratuité ne s'affirme jamais par défaut. Elle n'est
 * renseignée que si l'organisme la publie explicitement sur son propre site, et
 * la modalité est alors précisée. En l'absence de source officielle, le prix
 * reste « Non communiqué » : un prix absent n'est pas un prix nul.
 *
 * C'est l'application directe de l'invariant 2. Sans cette règle codée, une
 * ingestion automatisée reproduira l'erreur en masse.
 */

export const MODALITES_ACCES = [
  "libre",
  "compte_requis",
  "compte_produit_requis",
  "certificat_payant",
  "freemium",
  "pris_en_charge",
] as const;

export type ModaliteAcces = (typeof MODALITES_ACCES)[number];

/** Ce que chaque modalité signifie, tel que publié dans la page Méthode. */
export const DEFINITIONS_MODALITES: Record<ModaliteAcces, string> = {
  libre: "Accessible sans compte, sans condition",
  compte_requis: "Gratuit après création d'un compte sur la plateforme",
  compte_produit_requis: "Gratuit, mais suppose de détenir un compte du produit concerné",
  certificat_payant: "Contenu libre, attestation ou certification payante",
  freemium: "Une partie libre, une partie payante",
  pris_en_charge: "Coût nul pour l'apprenant, porté par un tiers",
};

/**
 * Libellé affiché à la place du prix.
 *
 * NE JAMAIS ÉCRIRE « Gratuit » SEUL. La qualification fait partie de
 * l'information : sans elle, la fiche affirme une gratuité qu'elle n'a pas
 * vérifiée sous cette forme.
 */
export const LIBELLES_MODALITES: Record<ModaliteAcces, string> = {
  libre: "Gratuit, accès libre",
  compte_requis: "Gratuit, compte requis",
  compte_produit_requis: "Gratuit, compte produit requis",
  certificat_payant: "Gratuit, certificat payant",
  freemium: "Accès partiel gratuit",
  pris_en_charge: "Gratuit pour l'apprenant, financé par un tiers",
};

/**
 * Modalités où l'apprenant ne débourse rien pour le parcours lui-même.
 * Alimente le filtre « Sans frais pour l'apprenant ».
 */
export const SANS_FRAIS: readonly ModaliteAcces[] = [
  "libre",
  "compte_requis",
  "compte_produit_requis",
  "pris_en_charge",
] as const;

/**
 * Modalités où une partie seulement est gratuite.
 * Alimente le filtre « Accès partiel gratuit ».
 */
export const PARTIELLEMENT_GRATUIT: readonly ModaliteAcces[] = [
  "freemium",
  "certificat_payant",
] as const;

/**
 * Rang de prix employé pour le tri croissant.
 *
 * Une fiche en accès partiel ne doit pas se retrouver en tête comme si elle ne
 * coûtait rien : seul son contenu d'appel est gratuit. Elle est classée après
 * les parcours réellement sans frais, avant les parcours au tarif publié.
 */
export function rangPrix(prix: number | null, modalite: ModaliteAcces | null): number {
  if (modalite !== null && PARTIELLEMENT_GRATUIT.includes(modalite)) {
    // Entre le gratuit réel et le premier tarif publié.
    return prix ?? 0.5;
  }
  return prix ?? Number.POSITIVE_INFINITY;
}

/**
 * Libellé de prix qualifié.
 *
 * Un prix nul sans modalité vérifiée n'est pas affiché comme gratuit : il
 * n'aurait pas dû être saisi ainsi, et le dire « Non communiqué » est plus
 * exact que de le dire gratuit.
 */
export function libellePrixQualifie(
  prixMin: number | null,
  prixMax: number | null,
  modalite: ModaliteAcces | null,
): string {
  const format = (n: number) => `${n.toLocaleString("fr-FR")} €`;

  if (modalite === "freemium") {
    if (prixMin === null) return "Accès partiel gratuit · parcours complet non communiqué";
    return `Accès partiel gratuit · parcours complet à partir de ${format(prixMin)}`;
  }

  if (prixMin === 0 || prixMin === null) {
    if (modalite === null) return "Non communiqué";
    return LIBELLES_MODALITES[modalite];
  }

  const tarif =
    prixMax !== null && prixMax !== prixMin
      ? `${format(prixMin)} – ${format(prixMax)}`
      : format(prixMin);

  // Un tarif publié coexiste avec une prise en charge : les deux sont vrais.
  if (modalite === "pris_en_charge") return `${tarif} · ${LIBELLES_MODALITES[modalite]}`;
  return tarif;
}
