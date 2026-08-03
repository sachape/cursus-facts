/**
 * Types métier Cursus.
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
  "non_communique",
  "non_applicable",
  "a_confirmer",
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
};

/** Calcule le compteur à partir des états, sans jamais produire de ratio. */
export function compterInformations(etats: EtatsInformation): CompteurInformations {
  const valeurs = CHAMPS_INFORMATION.map((champ) => etats[champ]);
  return {
    renseignees: valeurs.filter((etat) => etat === "renseigne").length,
    applicables: valeurs.filter((etat) => etat !== "non_applicable").length,
  };
}
