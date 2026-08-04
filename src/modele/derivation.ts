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

/**
 * Organismes ayant publié une déclaration de portée générale sur leur
 * catalogue, avec le libellé exact de cette déclaration.
 *
 * Liste fermée et nominative. Une déclaration à portée générale n'est pas une
 * supposition : ORSYS écrit sur son site que *toutes* ses formations peuvent
 * être organisées en intra. La reporter sur ses fiches est légitime ; la
 * présenter comme une déclaration parcours par parcours serait faux, et c'est
 * la mention de dérivation qui fait la différence.
 */
export const DECLARATIONS_GENERALES: Record<string, { dispoIntra: true; source: string }> = {
  ORSYS: {
    dispoIntra: true,
    source: "orsys.fr — « Toutes nos formations peuvent être organisées en intra »",
  },
};

export const REGLE_DECLARATION_GENERALE =
  "Dérivé : déclaration de portée générale publiée par l'organisme sur son " +
  "catalogue, et non déclaration propre à ce parcours.";

export type Derivation = {
  champ: "prix" | "modalite_acces" | "dispo_intra";
  valeur: number | string | boolean;
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
export function deuxVoiesTarifaires(offre: { prix: number | null }): boolean {
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
  if (!alternanceSansTarifPublie(offre)) return null;
  return { champ: "prix", valeur: 0, regle: REGLE_ALTERNANCE };
}

/**
 * LA décision d'alternance, en un seul endroit.
 *
 * Elle avait été dupliquée : la dérivation vérifiait qu'aucun tarif n'était
 * publié, l'affichage se contentait de `formats.includes("alternance")`. INSEEC,
 * master à 8 175 € proposé aussi en alternance, affichait donc « aucun frais
 * pour l'alternant » — avec 176 tests au vert, parce que chaque module avait
 * raison de son côté.
 *
 * Aucune couche en aval ne doit reposer cette question. Si une couche de
 * présentation peut interroger `formats` par elle-même, la divergence
 * reviendra sur un autre champ.
 */
export function alternanceSansTarifPublie(entree: {
  formats: readonly string[];
  prix: number | null;
}): boolean {
  return entree.formats.includes("alternance") && !deuxVoiesTarifaires(entree);
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
  if (!alternanceSansTarifPublie(offre)) return null;
  return { champ: "modalite_acces", valeur: "pris_en_charge", regle: REGLE_ALTERNANCE };
}

/**
 * Dérive la disponibilité intra d'une déclaration de portée générale.
 *
 * Ne dérive jamais par-dessus une valeur collectée sur la page du parcours :
 * une déclaration générale ne prime pas sur une information spécifique.
 */
export function deriverDispoIntra(offre: OffreNormalisee): Derivation | null {
  if (offre.dispoIntra !== null) return null;
  const declaration = DECLARATIONS_GENERALES[offre.organisme];
  if (!declaration) return null;
  return {
    champ: "dispo_intra",
    valeur: true,
    regle: `${REGLE_DECLARATION_GENERALE} Source : ${declaration.source}`,
  };
}

/** Toutes les dérivations applicables à une offre. */
export function deriver(offre: OffreNormalisee): Derivation[] {
  return [deriverPrix(offre), deriverModaliteAcces(offre), deriverDispoIntra(offre)].filter(
    (d): d is Derivation => d !== null,
  );
}
