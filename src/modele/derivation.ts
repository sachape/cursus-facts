/**
 * Informations dérivées — le seul cas où une valeur non publiée est écrite.
 *
 * L'invariant 2 interdit de déduire. Une dérivation n'est pas une déduction :
 * elle applique une règle de droit, publiée, vérifiable, et identique pour tous
 * les parcours qu'elle vise. Un lecteur peut la contester **en tant que règle**,
 * jamais en tant que décision le concernant — c'est ce qui la distingue d'une
 * estimation.
 *
 * Trois conditions, toutes obligatoires :
 *   1. la règle est publiée dans la vue Méthode ;
 *   2. la valeur porte l'état `derive`, jamais `renseigne` ;
 *   3. la fiche affiche la règle qui a produit la valeur.
 *
 * Sans la troisième, une dérivation devient indiscernable d'une information
 * publiée par l'organisme — et le catalogue se met à affirmer en son nom.
 */
import type { OffreNormalisee } from "@/donnees/catalogue";

export type Derivation = {
  champ: "prix" | "modalite_acces";
  valeur: number | string;
  /** La règle appliquée, affichée telle quelle sur la fiche. */
  regle: string;
};

/**
 * Règle du contrat en alternance.
 *
 * En contrat d'apprentissage comme en contrat de professionnalisation, les
 * frais de formation sont pris en charge par l'opérateur de compétences et ne
 * peuvent pas être demandés à l'alternant. Le coût pour l'apprenant est donc
 * nul, et ce n'est pas une supposition sur l'organisme : c'est une règle qui
 * s'impose à lui.
 */
export const REGLE_ALTERNANCE =
  "Coût dérivé : en contrat d'apprentissage ou de professionnalisation, " +
  "les frais de formation sont pris en charge et ne peuvent pas être " +
  "demandés à l'alternant.";

/**
 * Le garde-fou : deux voies tarifaires coexistantes.
 *
 * Le cas à bloquer est celui d'une école privée qui vend le même mastère
 * 8 500 € en formation initiale et gratuitement en alternance. Y dériver un
 * coût nul afficherait un prix faux pour la moitié des candidats.
 *
 * CE N'EST PAS LA PRÉSENCE DE « PRÉSENTIEL » QUI LE SIGNALE. « Alternance,
 * Présentiel » sur une licence pro décrit une modalité d'enseignement — un
 * alternant qui suit ses cours en salle — pas deux offres. Lire cette
 * combinaison comme un doublon tarifaire bloquerait la dérivation sur
 * l'essentiel des diplômes publics, qui sont précisément ceux où la règle ne
 * souffre aucune exception.
 *
 * Le signal est ailleurs : un prix déjà publié pour ce parcours. S'il existe,
 * l'organisme vend bien une voie payante, et c'est lui qui a raison.
 */
export function deuxVoiesTarifaires(offre: OffreNormalisee): boolean {
  return offre.prix !== null && offre.prix > 0;
}

/**
 * Dérive le coût pour l'apprenant, ou rien.
 *
 * Ne dérive jamais par-dessus une valeur publiée : une dérivation comble une
 * absence, elle ne corrige pas un organisme.
 */
export function deriverPrix(offre: OffreNormalisee): Derivation | null {
  if (offre.prix !== null) return null;
  if (!offre.formats.includes("alternance")) return null;
  if (deuxVoiesTarifaires(offre)) return null;
  return { champ: "prix", valeur: 0, regle: REGLE_ALTERNANCE };
}

/**
 * Dérive la modalité d'accès d'un parcours en alternance.
 *
 * Le cas le plus visible à l'écran, et le plus déroutant : une licence pro
 * porte bien un prix de 0, mais sans modalité qualifiée l'affichage refuse
 * d'écrire « Gratuit » — la fiche annonce donc « Non communiqué » alors que la
 * valeur existe. La règle d'alternance qualifie précisément cette gratuité :
 * elle est *prise en charge*, elle n'est pas une absence de prix.
 */
export function deriverModaliteAcces(offre: OffreNormalisee): Derivation | null {
  if (offre.modaliteAcces !== null) return null;
  if (!offre.formats.includes("alternance")) return null;
  if (deuxVoiesTarifaires(offre)) return null;
  return { champ: "modalite_acces", valeur: "pris_en_charge", regle: REGLE_ALTERNANCE };
}

/** Toutes les dérivations applicables à une offre. */
export function deriver(offre: OffreNormalisee): Derivation[] {
  return [deriverPrix(offre), deriverModaliteAcces(offre)].filter(
    (d): d is Derivation => d !== null,
  );
}
