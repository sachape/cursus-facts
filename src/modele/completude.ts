/**
 * État des 18 informations d'une fiche.
 *
 * Le compteur décrit l'état de la fiche. Il n'évalue ni la formation ni
 * l'organisme. C'est un rapport de deux entiers — « 12 informations sur 15
 * applicables » — jamais un pourcentage, jamais une note : un chiffre sur 100
 * se lit comme un jugement.
 *
 * TROIS ÉTATS, PAS DEUX. Un champ vide n'est pas toujours un manque :
 *   - `non_communique`  l'organisme ne publie pas l'information
 *   - `non_applicable`  le champ n'a pas de sens pour ce parcours
 *   - `a_confirmer`     valeur connue mais vérification datée
 *
 * Sans le troisième état, le compteur pénalise mécaniquement les fiches sur des
 * champs qui ne les concernent pas : le paiement fractionné d'une licence pro
 * gratuite, le lieu d'une formation qui n'en a pas. La correction consiste à
 * bouger le dénominateur, pas à remplir les champs.
 *
 * Les règles d'inapplicabilité ci-dessous sont déterministes et publiées. Elles
 * ne reposent sur aucune appréciation : un organisme peut les contester en tant
 * que règles, pas en tant que décisions le concernant.
 *
 * PROFONDEUR DE COLLECTE. Un champ vide ne dit pas la même chose selon qu'on a
 * lu la page de détail du parcours ou seulement la page catalogue de
 * l'organisme. Tant que le détail n'a pas été ouvert, l'absence est
 * `non_collecte` — un fait sur nous. Une fois ouvert, elle devient
 * `non_communique` — un fait sur l'organisme, et un critère de comparaison
 * légitime.
 */
import {
  CHAMPS_INFORMATION,
  type ChampInformation,
  type EtatInformation,
  type EtatsInformation,
} from "@/types/cursus";
import type { OffreNormalisee } from "@/donnees/catalogue";
import { deriver } from "./derivation";

/** Vrai si une valeur collectée compte comme publiée. */
function estRenseigne(valeur: unknown): boolean {
  if (valeur === null || valeur === undefined) return false;
  if (typeof valeur === "string") return valeur.trim() !== "";
  if (Array.isArray(valeur)) return valeur.length > 0;
  return true;
}

/**
 * Le lieu n'a pas de sens pour un parcours exclusivement à distance.
 *
 * Restreint au cas exclusif : dès qu'une modalité présentielle ou en
 * alternance existe, le lieu redevient une information attendue, et son
 * absence redevient un manque.
 */
export function lieuApplicable(offre: OffreNormalisee): boolean {
  const formats = offre.formats;
  if (formats.length === 0) return true;
  return !formats.every((f) => f === "distanciel");
}

/**
 * Les modalités de paiement n'ont pas de sens quand il n'y a rien à payer.
 *
 * Un prix nul est un prix connu — celui d'un BTS public ou d'un MOOC gratuit.
 * À ne pas confondre avec un prix non communiqué, qui reste un manque.
 */
export function paiementApplicable(offre: OffreNormalisee): boolean {
  return offre.prix !== 0;
}

/** Valeur collectée pour chacun des 18 champs suivis. */
function valeurDuChamp(offre: OffreNormalisee, champ: ChampInformation): unknown {
  switch (champ) {
    // Un prix nul est une information, pas une absence : `estRenseigne(0)` vaut
    // vrai, et « Gratuit » ne s'affiche jamais à la place d'un prix inconnu.
    case "prix":
      return offre.prix;
    // Dérivé des financements déjà collectés, jamais supposé au-delà : on ne
    // retient que ce que l'organisme énonce lui-même sur l'échelonnement.
    case "modalites_paiement":
      return offre.financements?.find((f) => /Paiement|échelonné|fois/i.test(f)) ?? null;
    case "duree":
      return offre.duree;
    case "volume_horaire":
      return offre.volumeHoraire;
    case "format":
      return offre.formats;
    case "lieu":
      return offre.region;
    case "niveau_entree":
      return offre.niveauEntree;
    case "prerequis":
      return offre.prerequis;
    case "eligible_cpf":
      // Le booléen collecté ne distingue pas « vérifié non éligible » de « non
      // vérifié ». Tant que la collecte ne tranche pas, l'état suit la valeur
      // telle quelle — écart connu, tracé, non corrigé par déduction.
      return offre.cpf;
    case "financements_acceptes":
      return offre.financements;
    case "certification":
      return offre.certification;
    case "code_rncp_rs":
      return offre.certification?.match(/RNCP\d+|RS\d+/)?.[0] ?? null;
    case "outils_enseignes":
      return offre.outils;
    case "programme":
      return offre.programme;
    case "non_couvert":
      return offre.nonCouvert;
    case "site_officiel":
      return offre.url && offre.url !== "—" ? offre.url : null;
    case "source_information":
      return offre.source;
    case "date_verification":
      return offre.dateVerification;
  }
}

/*
  RÉVOQUÉE — 4 août 2026. Une règle « volume horaire sans objet si la durée est
  sur mesure » a été écrite ici puis retirée le jour même.

  Elle déduisait `non_applicable` d'un autre champ, sur des fiches en
  `catalogue_seul` dont la page n'avait jamais été lue. Digital Study publie
  « 10 h » et « 1 200 € » : « Sur mesure » qualifiait l'adaptation du contenu,
  pas l'absence de durée.

  Et l'erreur était d'une classe pire que celles qui l'ont précédée. Laisser un
  champ vide à tort le laisse collectable ; écrire `non_applicable` affirme
  qu'il n'y a rien à collecter — le champ sort du dénominateur, sort de la file,
  et n'est jamais revérifié. C'est une information rendue définitivement
  invisible.

  RÈGLE : `non_applicable` ne se déduit jamais d'un autre champ. Il exige une
  lecture de page constatant l'absence d'objet, ou une règle de la liste fermée
  publiée dans la vue Méthode.
*/

/** Les champs dont l'applicabilité dépend du parcours. */
const APPLICABILITE: Partial<Record<ChampInformation, (offre: OffreNormalisee) => boolean>> = {
  lieu: lieuApplicable,
  modalites_paiement: paiementApplicable,
};

/**
 * Détermine l'état des 18 champs d'une offre.
 *
 * Aucune information n'est déduite : un champ non publié vaut
 * `non_communique`, et cette absence ne retire jamais la fiche du catalogue.
 */
export function determinerEtats(offre: OffreNormalisee): EtatsInformation {
  const detailVerifie = offre.profondeur === "detail_verifie";

  return CHAMPS_INFORMATION.reduce((etats, champ) => {
    let etat: EtatInformation;
    // Un champ publié est toujours applicable : la publication prouve la
    // pertinence. Une licence pro à distance qui publie sa région a bien un
    // lieu, quoi qu'en dise la règle. L'inapplicabilité ne peut donc retirer
    // qu'un champ vide — elle bouge le dénominateur, jamais le numérateur.
    // Une valeur conservée mais non reconfirmée reste affichée : elle sert
    // encore à décider. Elle ne compte pas comme vérifiée pour autant — ce
    // serait affirmer un contrôle qui n'a pas eu lieu.
    if (estRenseigne(valeurDuChamp(offre, champ))) {
      etat = offre.aConfirmer?.includes(champ) ? "a_confirmer" : "renseigne";
    }
    // Une règle publiée comble l'absence. La valeur est exacte, mais elle vient
    // de nous : l'état le dit, et la fiche affiche la règle.
    else if (deriver(offre).some((d) => d.champ === champ)) etat = "derive";
    /*
      `non_applicable` EXIGE LES DEUX : la page lue ET une règle publiée.

      C'est le seul état qui **ferme** un champ — il sort du dénominateur, sort
      de la file de collecte, et n'est jamais revérifié. Le fermer sans avoir
      regardé est ce qui a produit l'erreur Digital Study, où « Sur mesure »
      avait été lu comme une absence de durée alors que la page publie 10 h.

      Une règle publiée ne suffit pas seule. Les deux règles de la liste fermée
      déduisent depuis un autre champ : le lieu depuis `formats`, le paiement
      depuis `prix`. Sur une fiche jamais lue, `formats` est peut-être
      incomplet — le vice est identique, la publication le rend contestable,
      pas vrai.
    */
    else if (detailVerifie && !(APPLICABILITE[champ]?.(offre) ?? true)) etat = "non_applicable";
    // Sans lecture de la page de détail, l'absence n'est pas constatée.
    else if (!detailVerifie) etat = "non_collecte";
    else etat = "non_communique";
    etats[champ] = etat;
    return etats;
  }, {} as EtatsInformation);
}
