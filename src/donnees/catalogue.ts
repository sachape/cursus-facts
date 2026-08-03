/**
 * Chargement du catalogue source.
 *
 * `offres-sources.json` contient les 195 offres telles qu'elles ont été
 * collectées, avec le vocabulaire d'origine. Ce fichier est la matière première :
 * il n'est jamais corrigé pour arranger une règle. Un champ non publié y vaut
 * `null` et le restera.
 *
 * Ce module se contente de traduire ce vocabulaire vers les énumérations du
 * schéma. Aucune information n'y est déduite, complétée ni normalisée au-delà
 * d'une correspondance terme à terme.
 */
import type {
  CategorieOrganisme,
  DomaineParcours,
  FormatParcours,
  NiveauEntree,
} from "@/types/cursus";
import type { ModaliteAcces } from "@/modele/modalite-acces";
import offresSources from "./offres-sources.json";

/** Une offre telle que collectée, avant classification et regroupement. */
export type OffreSource = {
  id: number;
  nom: string;
  organisme: string;
  categorieLibelle: string;
  sousFamille: string | null;
  region: string | null;
  url: string | null;
  prix: number | null;
  duree: string | null;
  volumeHoraire: number | null;
  formats: string[] | null;
  niveauLibelle: string | null;
  prerequis: string | null;
  cpf: number | null;
  financements: string[] | null;
  certification: string | null;
  outils: string[] | null;
  programme: string[] | null;
  nonCouvert: string[] | null;
  dateVerification: string | null;
  source: string | null;
  domaineDeclareLibelle: string | null;
  /** Compétences relevées à la main lors de la collecte. */
  competencesDeclarees: string[];
  /**
   * Vrai pour les acteurs dont le vocabulaire échappe au classificateur.
   * Sur ces fiches, la déclaration remplace la détection automatique.
   */
  classificationManuelle: boolean;
  /**
   * Qualification de la gratuité. `null` tant qu'aucune source officielle ne
   * l'a établie — la gratuité ne s'affirme jamais par défaut.
   */
  modaliteAcces: ModaliteAcces | null;
  /** Source ayant permis d'établir la modalité, affichée sur la fiche. */
  sourceModalite?: string | null;
};

/* -------------------------------------------------------------------------- */
/* Correspondances de vocabulaire                                             */
/* -------------------------------------------------------------------------- */

const CATEGORIE_PAR_LIBELLE: Record<string, CategorieOrganisme> = {
  Universités: "universite",
  Écoles: "ecole",
  Bootcamps: "bootcamp",
  "Formations professionnelles": "formation_professionnelle",
  "Certifications éditeurs": "certification_editeur",
  "MOOC et plateformes": "mooc_plateforme",
  "Formations indépendantes": "formation_independante",
};

const NIVEAU_PAR_LIBELLE: Record<string, NiveauEntree> = {
  "Aucun prérequis": "aucun_prerequis",
  "Bac+2": "bac2",
  "Bac+3": "bac3",
  Expérience: "experience",
};

const FORMAT_PAR_LIBELLE: Record<string, FormatParcours> = {
  Distanciel: "distanciel",
  Présentiel: "presentiel",
  Alternance: "alternance",
};

const DOMAINE_PAR_LIBELLE: Record<string, DomaineParcours> = {
  "E-commerce": "ecommerce",
  Marketplaces: "marketplaces",
  "Publicité payante": "publicite_payante",
  Référencement: "referencement",
  "Email et CRM": "email_crm",
  "Data et conversion": "data_conversion",
  "Création de site": "creation_site",
  "Marketing digital": "marketing_digital",
  "Commerce et vente": "commerce_vente",
};

/** Traduit un libellé de vocabulaire, en échouant bruyamment sur l'inconnu. */
function traduire<T>(table: Record<string, T>, libelle: string, champ: string): T {
  const valeur = table[libelle];
  if (valeur === undefined) {
    throw new Error(`Vocabulaire inconnu pour ${champ} : « ${libelle} »`);
  }
  return valeur;
}

/* -------------------------------------------------------------------------- */
/* Offre normalisée                                                           */
/* -------------------------------------------------------------------------- */

/** Une offre source traduite dans le vocabulaire du schéma. */
export type OffreNormalisee = Omit<
  OffreSource,
  "categorieLibelle" | "niveauLibelle" | "formats" | "domaineDeclareLibelle"
> & {
  categorie: CategorieOrganisme;
  niveauEntree: NiveauEntree | null;
  formats: FormatParcours[];
  domaineDeclare: DomaineParcours | null;
};

export function normaliserOffre(offre: OffreSource): OffreNormalisee {
  const {
    categorieLibelle,
    niveauLibelle,
    formats,
    domaineDeclareLibelle,
    ...reste
  } = offre;

  return {
    ...reste,
    categorie: traduire(CATEGORIE_PAR_LIBELLE, categorieLibelle, "catégorie"),
    niveauEntree: niveauLibelle
      ? traduire(NIVEAU_PAR_LIBELLE, niveauLibelle, "niveau d'entrée")
      : null,
    formats: (formats ?? []).map((f) => traduire(FORMAT_PAR_LIBELLE, f, "format")),
    domaineDeclare: domaineDeclareLibelle
      ? traduire(DOMAINE_PAR_LIBELLE, domaineDeclareLibelle, "domaine déclaré")
      : null,
  };
}

/** Le catalogue source complet, traduit dans le vocabulaire du schéma. */
export function chargerCatalogue(): OffreNormalisee[] {
  return (offresSources as OffreSource[]).map(normaliserOffre);
}
