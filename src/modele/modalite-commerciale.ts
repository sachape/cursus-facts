/**
 * Disponibilité commerciale — inter-entreprises, intra-entreprise, ou les deux.
 *
 * C'est une distinction structurante de tout le marché de la formation
 * professionnelle, et ce ne sont PAS deux tarifs d'un même produit :
 *
 *   - **inter** : une personne s'inscrit à une session collective.
 *   - **intra** : une entreprise fait venir le formateur pour ses équipes. Le
 *     tarif est celui du groupe entier, souvent trois à cinq fois le tarif
 *     inter, et il ne s'adresse pas à un particulier.
 *
 * DEUX BOOLÉENS, PAS UNE ÉNUMÉRATION. La plupart des organismes de formation
 * continue proposent les deux : une valeur `les_deux` serait la réponse par
 * défaut de fait et n'apprendrait rien. La question qui décide est unique —
 * **existe-t-il un tarif inter, oui ou non** — et elle mérite son propre champ.
 * `null` signifie non tranché : la page de détail n'a pas été lue.
 *
 * CE N'EST PAS UN ATTRIBUT DE PRIX, C'EST UN CRITÈRE D'ACCESSIBILITÉ, du même
 * ordre que l'éligibilité CPF. Un parcours en intra seul n'est pas achetable
 * par une personne, quel que soit son budget. L'information s'affiche donc sur
 * la rangée, pas seulement dans la fiche.
 */

export type DisponibiliteCommerciale = {
  /** Sessions collectives ouvertes à une inscription individuelle. */
  dispoInter: boolean | null;
  /** Intervention chez le client, facturée au groupe. */
  dispoIntra: boolean | null;
};

/**
 * Vrai si une personne peut s'inscrire elle-même.
 *
 * Prudent par construction : une disponibilité non tranchée ne vaut pas une
 * disponibilité constatée. Le filtre « Accessible à titre individuel » ne doit
 * jamais promettre ce qui n'a pas été vérifié.
 */
export function accessibleIndividuellement(d: DisponibiliteCommerciale): boolean {
  return d.dispoInter === true;
}

/**
 * Vrai si le parcours est réservé aux entreprises.
 *
 * Exige les deux constats : l'absence d'inter **et** la présence d'intra. Un
 * parcours dont rien n'est tranché n'est pas réservé aux entreprises, il est
 * simplement non collecté — et l'étiqueter serait déduire.
 */
export function reserveAuxEntreprises(d: DisponibiliteCommerciale): boolean {
  return d.dispoInter === false && d.dispoIntra === true;
}

/**
 * Le prix retenu pour l'affichage, le tri et le filtre budget.
 *
 * Toujours le tarif inter. Un parcours sans tarif individuel n'a pas de prix
 * comparable pour une personne : renvoyer `null` est plus exact que d'afficher
 * un tarif de groupe, qui la ferait renoncer sur un chiffre qui ne la concerne
 * pas.
 */
export function prixAffichable(
  prix: number | null,
  d: DisponibiliteCommerciale,
  unite: string | null = null,
): number | null {
  if (d.dispoInter === false) return null;
  /*
    UN MONTANT DANS UNE AUTRE UNITÉ N'EST PAS COMPARABLE À UN TOTAL, et la
    question posée par le filtre budget porte sur un total : « moins de 500 € »
    ne se répond pas par « 49 € par mois ». Le prix reste AFFICHÉ sur la fiche,
    avec son unité ; il sort seulement des comparaisons — exactement comme un
    tarif intra, qui existe mais ne s'adresse pas à un particulier.

    Les confondre revenait à classer Speed Ecom à 49 € par mois devant toutes
    les formations du catalogue.
  */
  if (unite !== null && unite !== "total") return null;
  return prix;
}

/**
 * Libellé porté par la rangée et par la fiche.
 *
 * `null` quand rien n'est à signaler — inutile d'étiqueter le cas courant, qui
 * n'apprendrait rien et alourdirait chaque rangée.
 */
export function marqueurAccessibilite(d: DisponibiliteCommerciale): string | null {
  if (reserveAuxEntreprises(d)) return "Réservé aux entreprises";
  return null;
}

export const DETAIL_RESERVE_AUX_ENTREPRISES =
  "Réservé aux entreprises — non accessible à titre individuel. " +
  "L'organisme intervient chez le client et facture le groupe.";
