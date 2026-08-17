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
import { alternanceSansTarifPublie, REGLE_ALTERNANCE, REGLE_PRIX_TOTAL } from "./derivation";

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
  /**
   * L'unité du montant. `null` vaut « total ».
   *
   * Elle produit une CONDITION, pas seulement un suffixe : « 8 600 € par
   * année » sur un cursus de trois ans ne dit pas ce que coûte le parcours, et
   * un lecteur qui compare des totaux doit le savoir sans avoir à le déduire.
   */
  unitePrix?: string | null;
  /**
   * Le palier tarifaire publié — « Année 1 », « 2e année, alternance ».
   *
   * Chez les écoles, le tarif n'est pas publié par programme mais par année
   * d'études : la même ligne vaut pour tous les cursus de ce niveau. Nommer le
   * palier est ce qui rend le montant vérifiable — sans lui, le lecteur ne peut
   * pas retrouver d'où il sort dans la grille.
   */
  prixNiveau?: string | null;
  /** Vrai si le prix ou la modalité vient d'une règle, pas de l'organisme. */
  derive?: boolean;
  /**
   * Laquelle des règles publiées a produit la valeur.
   *
   * Sans elle, `derive` renvoyait toujours à l'alternance : la seule règle qui
   * existait. En ajouter une seconde sans nommer laquelle s'applique aurait
   * affiché « pris en charge en alternance » sous un tarif de MSc — une
   * justification fausse sous une valeur juste.
   */
  regleDerivation?: "alternance" | "prix_sans_unite_lu_comme_total" | undefined;
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
  const derivation =
    entree.derive !== true
      ? null
      : entree.regleDerivation === "prix_sans_unite_lu_comme_total"
        ? REGLE_PRIX_TOTAL
        : REGLE_ALTERNANCE;

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
  //    La question n'est pas reposée ici — elle appartient à la dérivation,
  //    seule autorité sur ce point. C'est en la reposant que l'affichage avait
  //    contourné le garde-fou des deux voies tarifaires.
  if (alternanceSansTarifPublie(entree)) {
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

  /*
    3 bis. L'UNITÉ EST UNE CONDITION, et elle prime sur les autres.

    Un montant annuel, mensuel ou journalier ne dit pas ce que coûte le
    parcours : il dit ce que coûte une année, un mois, un jour. Affiché sans sa
    condition, il se compare à des totaux et le lecteur conclut faux — c'est la
    faute du tarif journalier de Dawan, transposée.

    Elle passe AVANT le CPF et la session collective parce qu'elle porte sur la
    nature même du montant, quand celles-là portent sur son financement.
  */
  const UNITES_CONDITION: Record<string, string> = {
    annuel: "Montant par année d'études, pas pour le parcours entier",
    mensuel: "Montant par mois d'abonnement, sans durée d'engagement publiée",
    journalier: "Tarif par journée — le coût total dépend du nombre de jours",
    horaire: "Tarif horaire — le coût total dépend du volume suivi",
  };
  if (entree.prix !== null && entree.prix > 0 && entree.unitePrix != null) {
    const condition = UNITES_CONDITION[entree.unitePrix];
    if (condition !== undefined) {
      /*
        Le palier vient EN TÊTE quand il est connu : c'est lui qui permet de
        retrouver le montant dans la grille de l'organisme, donc de le
        vérifier. « Montant par année » sans dire laquelle laisse le lecteur
        devant trois lignes et aucun moyen de choisir.
      */
      const niveau = entree.prixNiveau?.trim();
      return {
        valeur: null,
        condition:
          niveau !== undefined && niveau !== ""
            ? `Tarif « ${niveau} » — ${condition.charAt(0).toLowerCase()}${condition.slice(1)}`
            : condition,
        derivation,
        cle: "session_collective",
      };
    }
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

/**
 * Le coût complet d'un parcours de liste — l'unique entrée de l'affichage.
 *
 * La rangée, la fiche et le tableau comparatif appellent ceci et restituent le
 * résultat. Aucun d'eux ne lit `formats`, `modaliteAcces` ou `dispoInter` pour
 * en tirer une conclusion : c'est en le faisant que l'affichage avait contourné
 * le garde-fou des deux voies tarifaires, avec 176 tests au vert.
 */
export function coutDuParcours(p: {
  prixMin: number | null;
  prixMax: number | null;
  modaliteAcces: ModaliteAcces | null;
  formats: readonly FormatParcours[];
  organismeCategorie: CategorieOrganisme;
  eligibleCpf: boolean | null;
  dispoInter: boolean | null;
  dispoIntra: boolean | null;
  unitePrix?: string | null;
  prixNiveau?: string | null;
  etats?: Partial<Record<"prix", string>>;
  /** Nommer la règle : `derive` seul renverrait toujours à l'alternance. */
  regleDerivation?: "alternance" | "prix_sans_unite_lu_comme_total" | null;
}): Cout & { montant: number | null } {
  // Le tarif de groupe n'est jamais le prix d'une personne.
  const montant = p.dispoInter === false ? null : p.prixMin;
  const cout = conditionDuCout({
    prix: montant,
    unitePrix: p.unitePrix ?? null,
    prixNiveau: p.prixNiveau ?? null,
    modaliteAcces: p.modaliteAcces,
    formats: p.formats,
    categorie: p.organismeCategorie,
    eligibleCpf: p.eligibleCpf,
    dispoInter: p.dispoInter,
    dispoIntra: p.dispoIntra,
    derive: p.etats?.prix === "derive",
    regleDerivation: p.regleDerivation ?? undefined,
  });
  return { ...cout, montant };
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
