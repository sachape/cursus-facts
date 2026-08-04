/**
 * Types métier Formlist.
 *
 * Principe non négociable : aucun score, aucune note, aucune moyenne, aucun
 * pourcentage. La complétude d'une fiche est un rapport de deux entiers
 * (`infos_renseignees` / `infos_applicables`) et rien d'autre.
 *
 * Aucune information n'est déduite : un champ non publié reste vide et son
 * état vaut `non_communique`.
 */
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const CATEGORIES_ORGANISME = [
  "universite",
  "ecole",
  "bootcamp",
  "formation_professionnelle",
  "certification_editeur",
  "mooc_plateforme",
  "formation_independante",
] as const;
export type CategorieOrganisme = (typeof CATEGORIES_ORGANISME)[number];

export const DOMAINES_PARCOURS = [
  "ecommerce",
  "marketplaces",
  "publicite_payante",
  "referencement",
  "email_crm",
  "data_conversion",
  "creation_site",
  "marketing_digital",
  "commerce_vente",
] as const;
export type DomaineParcours = (typeof DOMAINES_PARCOURS)[number];

export const FORMATS_PARCOURS = ["distanciel", "presentiel", "alternance"] as const;
export type FormatParcours = (typeof FORMATS_PARCOURS)[number];

export const NIVEAUX_ENTREE = ["aucun_prerequis", "bac2", "bac3", "experience"] as const;
export type NiveauEntree = (typeof NIVEAUX_ENTREE)[number];

export const ETATS_INFORMATION = [
  "renseigne",
  /** Page de détail ouverte et vérifiée : l'organisme ne publie pas ce champ. */
  "non_communique",
  /** Le champ n'a pas de sens pour ce parcours. */
  "non_applicable",
  /**
   * La page de détail n'a pas encore été lue. C'est un fait sur NOUS, jamais
   * sur l'organisme : le confondre avec « non publié » ferait porter au vendeur
   * une opacité qui est la nôtre.
   */
  "non_collecte",
  "a_confirmer",
  /**
   * Valeur produite par une règle publiée, pas par l'organisme.
   *
   * Ce n'est pas une déduction : la règle est publiée, vérifiable, et identique
   * pour tous les parcours qu'elle vise — un lecteur peut la contester en tant
   * que règle, jamais en tant que décision le concernant. Mais elle ne doit
   * jamais s'afficher comme une information publiée : la fiche porte la mention
   * de dérivation, sans quoi le catalogue affirmerait en son propre nom.
   */
  "derive",
  /**
   * Information que l'organisme ne publie pas et ne publiera pas — elle
   * s'obtient sur demande, par devis ou par contact commercial.
   *
   * Distincte de « non publié » et de « non collecté », et pour la même raison
   * que ces deux-là ont été séparés : ne pas faire porter à un organisme une
   * absence qui ne lui est pas imputable. Un tarif intra sur devis est une
   * pratique commerciale normale, pas de l'opacité — et aucune lecture de page
   * ne le produira jamais. Sans cet état, la file de collecte contiendrait
   * indéfiniment des champs impossibles à remplir.
   *
   * Sort du dénominateur, comme `non_applicable`.
   */
  "communique_sur_demande",
] as const;
export type EtatInformation = (typeof ETATS_INFORMATION)[number];

export const STATUTS_REGROUPEMENT = ["autonome", "fusionne", "replie_arbitrage"] as const;
export type StatutRegroupement = (typeof STATUTS_REGROUPEMENT)[number];

/* -------------------------------------------------------------------------- */
/* Les 18 champs d'information                                                */
/* -------------------------------------------------------------------------- */

/** Les 18 informations comparées, dans l'ordre du référentiel. */
export const CHAMPS_INFORMATION = [
  "prix", // prix_min + prix_max
  "modalites_paiement",
  "duree",
  "volume_horaire",
  "format",
  "lieu",
  "niveau_entree",
  "prerequis",
  "eligible_cpf",
  "financements_acceptes",
  "certification",
  "code_rncp_rs",
  "outils_enseignes",
  "programme",
  "non_couvert",
  "site_officiel",
  "source_information",
  "date_verification",
] as const;
export type ChampInformation = (typeof CHAMPS_INFORMATION)[number];

/** Libellés d'affichage des 18 informations. */
export const LIBELLES_CHAMPS_INFORMATION: Record<ChampInformation, string> = {
  prix: "Prix",
  modalites_paiement: "Modalités de paiement",
  duree: "Durée",
  volume_horaire: "Volume horaire",
  format: "Format",
  lieu: "Lieu",
  niveau_entree: "Niveau d'entrée",
  prerequis: "Prérequis",
  eligible_cpf: "Éligible CPF",
  financements_acceptes: "Financements acceptés",
  certification: "Certification",
  code_rncp_rs: "Code RNCP / RS",
  outils_enseignes: "Outils enseignés",
  programme: "Programme",
  non_couvert: "Non couvert",
  site_officiel: "Site officiel",
  source_information: "Source de l'information",
  date_verification: "Date de vérification",
};

/** Mappe chacun des 18 champs à son état. */
export type EtatsInformation = Record<ChampInformation, EtatInformation>;

/** État par défaut : rien n'est déduit, tout est `non_communique`. */
export const ETATS_PAR_DEFAUT: EtatsInformation = CHAMPS_INFORMATION.reduce(
  (acc, champ) => ({ ...acc, [champ]: "non_communique" as const }),
  {} as EtatsInformation,
);

/** Lecture défensive de la colonne `etats` (jsonb) d'un parcours. */
export function lireEtats(etats: unknown): EtatsInformation {
  const source = (etats ?? {}) as Record<string, unknown>;
  return CHAMPS_INFORMATION.reduce((acc, champ) => {
    const valeur = source[champ];
    acc[champ] = (ETATS_INFORMATION as readonly string[]).includes(valeur as string)
      ? (valeur as EtatInformation)
      : "non_communique";
    return acc;
  }, {} as EtatsInformation);
}

/* -------------------------------------------------------------------------- */
/* Programme (jsonb)                                                          */
/* -------------------------------------------------------------------------- */

export type ModuleProgramme = {
  titre: string;
  contenu?: string;
  duree?: string;
};

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

export type Organisme = Tables<"organismes">;
export type OrganismeInsert = TablesInsert<"organismes">;
export type OrganismeUpdate = TablesUpdate<"organismes">;

export type ParcoursRow = Tables<"parcours">;
export type ParcoursInsert = TablesInsert<"parcours">;
export type ParcoursUpdate = TablesUpdate<"parcours">;

/** Parcours avec les colonnes jsonb typées côté application. */
export type Parcours = Omit<ParcoursRow, "etats" | "programme"> & {
  etats: EtatsInformation;
  programme: ModuleProgramme[] | null;
};

export type Variante = Tables<"variantes">;
export type VarianteInsert = TablesInsert<"variantes">;
export type VarianteUpdate = TablesUpdate<"variantes">;

export type SessionParcours = Tables<"sessions">;
export type SessionParcoursInsert = TablesInsert<"sessions">;
export type SessionParcoursUpdate = TablesUpdate<"sessions">;

export type Arbitrage = Tables<"arbitrages">;
export type ArbitrageInsert = TablesInsert<"arbitrages">;
export type ArbitrageUpdate = TablesUpdate<"arbitrages">;

/** Normalise une ligne `parcours` brute en `Parcours`. */
export function normaliserParcours(row: ParcoursRow): Parcours {
  return {
    ...row,
    etats: lireEtats(row.etats),
    programme: Array.isArray(row.programme) ? (row.programme as unknown as ModuleProgramme[]) : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Compteur d'informations                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Rapport de deux entiers, jamais un pourcentage, jamais un score.
 * Se lit « 12 informations renseignées sur 17 applicables ».
 */
export type CompteurInformations = {
  renseignees: number;
  applicables: number;
  /** Champs dont l'absence n'a pas encore été vérifiée. */
  nonCollectes: number;
  /** Champs dont la valeur est conservée mais non reconfirmée. */
  aConfirmer: number;
};

/**
 * Valeurs présentes, confirmées ou non.
 *
 * C'est ce compteur, et non `renseignees`, qui ne doit jamais baisser sans
 * autorisation explicite : déclasser une valeur en « à confirmer » la conserve,
 * l'effacer la perd. Le premier est une mise à jour honnête, le second est un
 * incident.
 */
export const valeursPresentes = (c: CompteurInformations) => c.renseignees + c.aConfirmer;

/**
 * Calcule le compteur à partir des états, sans jamais produire de ratio.
 *
 * Un champ non collecté sort du dénominateur au même titre qu'un champ sans
 * objet : on ne peut pas reprocher à un organisme une absence qu'on n'a pas
 * vérifiée. Il est compté à part, pour que la fiche puisse dire ce qui reste
 * à vérifier plutôt que de le passer sous silence.
 */
export function compterInformations(etats: EtatsInformation): CompteurInformations {
  const valeurs = CHAMPS_INFORMATION.map((champ) => etats[champ]);
  return {
    // Une valeur dérivée compte comme renseignée : elle est exacte et
    // opposable. C'est son affichage qui doit la distinguer, pas le compteur.
    renseignees: valeurs.filter((etat) => etat === "renseigne" || etat === "derive").length,
    applicables: valeurs.filter(
      (etat) =>
        etat !== "non_applicable" &&
        etat !== "non_collecte" &&
        etat !== "communique_sur_demande",
    ).length,
    nonCollectes: valeurs.filter((etat) => etat === "non_collecte").length,
    // Valeurs présentes mais non reconfirmées. Elles ne comptent pas comme
    // renseignées — ce serait affirmer une vérification qui n'a pas eu lieu —
    // mais elles restent affichées : une valeur ancienne et signalée comme
    // telle est plus utile qu'un vide.
    aConfirmer: valeurs.filter((etat) => etat === "a_confirmer").length,
  };
}
