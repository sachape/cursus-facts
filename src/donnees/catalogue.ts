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
import type { ChampInformation } from "@/types/cursus";
import type { ChangementValeur } from "@/modele/provenance";
import type { ModaliteAcces } from "@/modele/modalite-acces";
import type { UnitePrix } from "@/collecte/unite-prix";
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
  /**
   * Profondeur de collecte atteinte sur ce parcours.
   * `catalogue_seul` : seule la page catalogue de l'organisme a été lue.
   * `detail_verifie` : la page de détail du parcours a été ouverte.
   */
  profondeur?: ProfondeurCollecte;
  /** Date du passage sur la page de détail. */
  profondeurVerifieeLe?: string | null;
  /** URL de la page de détail, alimentée par la file de collecte. */
  urlDetail?: string | null;
  /** Sessions collectives ouvertes à une inscription individuelle. */
  dispoInter?: boolean | null;
  /** Intervention en entreprise, facturée au groupe. */
  dispoIntra?: boolean | null;
  /** Tarif de groupe, affiché sur la fiche mais jamais dans la liste. */
  prixIntra?: number | null;
  /**
   * UNITÉ DU PRIX, obligatoire dès qu'un prix existe.
   *
   * `null` ne veut pas dire « total » : il veut dire que l'unité n'a pas été
   * établie, et un prix dont l'unité n'est pas établie n'est pas affichable.
   * Deux prix ENACO annuels ont été présentés comme des totaux faute de ce
   * champ, et un abonnement à 49 €/mois voisine un diplôme à 4 990 € dans le
   * même filtre budget.
   */
  unitePrix?: UnitePrix | null;
  /** Palier tarifaire publié par l'organisme — « Année 1 ». */
  prixNiveau?: string | null;
  /**
   * Champs dont la valeur est conservée mais non reconfirmée.
   * Ils s'affichent avec leur valeur et passent en tête de file de collecte.
   */
  aConfirmer?: ChampInformation[];
  /** Changements de valeur conservés, pour que toute correction soit annulable. */
  historique?: ChangementValeur[];
};

/** Niveau de vérification atteint sur une fiche. */
export const PROFONDEURS = ["catalogue_seul", "detail_verifie"] as const;
export type ProfondeurCollecte = (typeof PROFONDEURS)[number];

export const LIBELLES_PROFONDEUR: Record<ProfondeurCollecte, string> = {
  catalogue_seul: "Page catalogue seulement",
  detail_verifie: "Page de détail vérifiée",
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
  // Optionnels dans la source, toujours renseignés après normalisation : les
  // règles peuvent donc les lire sans avoir à distinguer `undefined` de `null`,
  // distinction qui n'a aucun sens ici — les deux veulent dire « non tranché ».
  dispoInter: boolean | null;
  dispoIntra: boolean | null;
  prixIntra: number | null;
  unitePrix: UnitePrix | null;
  prixNiveau: string | null;
  aConfirmer: ChampInformation[];
  historique: ChangementValeur[];
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
    // Par défaut, une fiche n'a été vue qu'au niveau du catalogue.
    profondeur: offre.profondeur ?? "catalogue_seul",
    // Tant que la page de détail n'a pas tranché, la disponibilité reste
    // inconnue : le prix affiché est alors à vérifier, pas à supprimer.
    dispoInter: offre.dispoInter ?? null,
    dispoIntra: offre.dispoIntra ?? null,
    prixIntra: offre.prixIntra ?? null,
    unitePrix: offre.unitePrix ?? null,
    prixNiveau: offre.prixNiveau ?? null,
    aConfirmer: offre.aConfirmer ?? [],
    historique: offre.historique ?? [],
    domaineDeclare: domaineDeclareLibelle
      ? traduire(DOMAINE_PAR_LIBELLE, domaineDeclareLibelle, "domaine déclaré")
      : null,
  };
}

/** Le catalogue source complet, traduit dans le vocabulaire du schéma. */
export function chargerCatalogue(): OffreNormalisee[] {
  return (offresSources as OffreSource[]).map(normaliserOffre);
}
