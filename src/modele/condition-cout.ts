/**
 * Condition d'obtention du coût — le second niveau d'une valeur de prix.
 *
 * Un montant nu ne permet pas de décider. « 0 € » recouvre quatre situations
 * que rien ne distingue à l'écran : aucun frais pour un alternant qui a signé
 * un contrat, gratuit après création d'un compte, gratuit à suivre mais
 * certification payante, accès partiel gratuit. Ce n'est pas le montant qui
 * décide, c'est sa condition.
 *
 * PRINCIPE : toute valeur de coût s'affiche sur deux niveaux — la valeur, puis
 * sa condition. Jamais l'une sans l'autre.
 *
 * LA VALEUR NUMÉRIQUE NE CHANGE PAS. Le filtre budget et le tri ont besoin d'un
 * nombre : stocker « Alternance » à la place de 0 ferait disparaître le
 * parcours d'une recherche à moins de 500 €, alors qu'il devrait y figurer en
 * tête. La richesse va dans l'affichage, pas dans la donnée.
 *
 * AUCUNE CONDITION INVENTÉE. Chaque condition découle d'un champ renseigné ou
 * d'une règle de dérivation publiée. Un parcours dont on ignore la modalité
 * affiche sa valeur sans condition — jamais une condition supposée.
 */
import type { CategorieOrganisme, FormatParcours } from "@/types/cursus";
import type { ModaliteAcces } from "./modalite-acces";
import { REGLE_ALTERNANCE } from "./derivation";

export const CONDITIONS_ACCES = [
  "alternance_requise",
  "reserve_entreprises",
  "compte_produit_requis",
  "compte_requis",
  "acces_partiel",
  "certificat_payant",
  "frais_inscription",
  "session_collective",
  "cpf",
  "sans_condition",
] as const;
export type ConditionAcces = (typeof CONDITIONS_ACCES)[number];

/** Les valeurs proposées au filtre, plus courtes que la liste interne. */
export const FILTRES_CONDITION = [
  "sans_condition",
  "alternance_requise",
  "compte_requis",
  "reserve_entreprises",
  "acces_partiel",
] as const;
export type FiltreCondition = (typeof FILTRES_CONDITION)[number];

export const LIBELLES_FILTRES_CONDITION: Record<FiltreCondition, string> = {
  sans_condition: "Sans condition",
  alternance_requise: "Contrat d'alternance requis",
  compte_requis: "Compte requis",
  reserve_entreprises: "Réservé aux entreprises",
  acces_partiel: "Accès partiel gratuit",
};

export type Cout = {
  /** Ce qui remplace le montant quand celui-ci ne se suffit pas. */
  valeur: string | null;
  /** La condition, affichée immédiatement sous la valeur. */
  condition: string | null;
  /** La règle de dérivation, quand la valeur n'a pas été publiée. */
  derivation: string | null;
  cle: ConditionAcces;
};

export type EntreeCout = {
  prix: number | null;
  modaliteAcces: ModaliteAcces | null;
  formats: readonly FormatParcours[];
  categorie: CategorieOrganisme;
  eligibleCpf: boolean | null;
  dispoInter: boolean | null;
  dispoIntra: boolean | null;
  /** Vrai si le prix ou la modalité vient d'une règle, pas de l'organisme. */
  derive?: boolean;
};

/**
 * Détermine la condition d'obtention du coût.
 *
 * L'ORDRE EST LA RÈGLE. Quand plusieurs conditions s'appliquent, la plus
 * restrictive pour l'accès l'emporte : un parcours en alternance **et**
 * éligible au CPF affiche la condition d'alternance, parce que c'est elle qui
 * conditionne l'entrée. Pour beaucoup, trouver un contrat d'alternance est plus
 * difficile que payer.
 */
export function conditionDuCout(entree: EntreeCout): Cout {
  const derivation = entree.derive === true ? REGLE_ALTERNANCE : null;

  // 1. Réservé aux entreprises : aucune autre condition ne compte si la
  //    personne ne peut pas acheter du tout.
  if (entree.dispoInter === false && entree.dispoIntra === true) {
    return {
      valeur: "Réservé aux entreprises",
      condition: "Non accessible à titre individuel — tarif sur devis",
      derivation: null,
      cle: "reserve_entreprises",
    };
  }

  // 2. Alternance : conditionne l'entrée, pas seulement le paiement.
  if (entree.formats.includes("alternance")) {
    return {
      valeur: "Aucun frais pour l'alternant",
      condition: "Sous réserve de signer un contrat d'alternance",
      derivation,
      cle: "alternance_requise",
    };
  }

  switch (entree.modaliteAcces) {
    case "compte_produit_requis":
      return {
        valeur: "Gratuit",
        condition: "Suppose un compte actif sur le produit concerné",
        derivation: null,
        cle: "compte_produit_requis",
      };
    case "compte_requis":
      return {
        valeur: "Gratuit",
        condition: "Après création d'un compte",
        derivation: null,
        cle: "compte_requis",
      };
    case "freemium":
      return {
        valeur: "Accès partiel gratuit",
        condition: "Parcours complet payant — montant non communiqué",
        derivation: null,
        cle: "acces_partiel",
      };
    case "certificat_payant":
      return {
        valeur: "Gratuit à suivre",
        condition: "Attestation ou certification payante",
        derivation: null,
        cle: "certificat_payant",
      };
    case "pris_en_charge":
      return {
        valeur: "Aucun frais pour l'apprenant",
        condition: "Coût pris en charge par un tiers",
        derivation,
        cle: "sans_condition",
      };
    case "libre":
      return { valeur: "Gratuit", condition: "Accès libre, sans compte", derivation: null, cle: "sans_condition" };
    case null:
      break;
  }

  // 3. Diplôme public en formation initiale : le coût n'est pas nul, il est
  //    réduit aux droits d'inscription, qu'un arrêté fixe chaque année.
  if (entree.categorie === "universite" && entree.prix === 0) {
    return {
      valeur: "Frais d'inscription universitaires",
      condition: "Montant fixé chaque année par arrêté",
      derivation: null,
      cle: "frais_inscription",
    };
  }

  // 4. Conditions qui accompagnent un montant, sans le remplacer.
  if (entree.prix !== null && entree.prix > 0) {
    if (entree.eligibleCpf === true) {
      return {
        valeur: null,
        condition: "Reste à charge selon vos droits CPF",
        derivation: null,
        cle: "cpf",
      };
    }
    if (entree.dispoInter === true) {
      return {
        valeur: null,
        condition: "Tarif par personne, session collective",
        derivation: null,
        cle: "session_collective",
      };
    }
  }

  return { valeur: null, condition: null, derivation: null, cle: "sans_condition" };
}

/** Rattache une condition à la valeur proposée au filtre, ou `null`. */
export function filtreDe(cle: ConditionAcces): FiltreCondition | null {
  if (cle === "compte_produit_requis") return "compte_requis";
  if (cle === "certificat_payant" || cle === "frais_inscription") return null;
  if (cle === "session_collective" || cle === "cpf") return "sans_condition";
  return (FILTRES_CONDITION as readonly string[]).includes(cle)
    ? (cle as FiltreCondition)
    : null;
}
