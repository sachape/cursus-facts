/**
 * Lecture du catalogue.
 *
 * Les 193 entrées tiennent largement en mémoire : on charge tout une fois et on
 * filtre côté client. C'est ce qui rend le filtrage instantané, et ce qui
 * permet d'afficher le décompte de chaque filtre avant de le cocher — un filtre
 * dont on ignore le rendement se coche à l'aveugle.
 *
 * Les fiches repliées derrière une ancre d'arbitrage ne sont pas chargées dans
 * la liste : elles restent consultables par leur adresse propre.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  lireEtats,
  type CategorieOrganisme,
  type DomaineParcours,
  type EtatsInformation,
  type FormatParcours,
  type ModuleProgramme,
  type NiveauEntree,
  type StatutRegroupement,
} from "@/types/cursus";
import type { ModaliteAcces } from "@/modele/modalite-acces";
import { colonneAbsente, diagnostiquer } from "./schema-attendu";

export type ParcoursListe = {
  id: string;
  slug: string;
  nom: string;
  organismeNom: string;
  organismeCategorie: CategorieOrganisme;
  /** Source retenue pour cette fiche. Alimente la provenance de l'organisme. */
  sourceInformation: string | null;
  /** Site de l'organisme. `null` tant que la colonne n'est pas déployée. */
  organismeSite: string | null;
  /** Qualiopi, déclaration d'activité… Vide si rien n'est publié. */
  organismeCertifications: string[];
  domaine: DomaineParcours;
  sujetPrincipal: string;
  competencesCouvertes: string[];
  prixMin: number | null;
  prixMax: number | null;
  /** Qualification de la gratuité. `null` = non vérifiée. */
  modaliteAcces: ModaliteAcces | null;
  /** Sessions individuelles disponibles. `null` = non tranché. */
  dispoInter: boolean | null;
  /** Intervention en entreprise disponible. `null` = non tranché. */
  dispoIntra: boolean | null;
  /** Tarif de groupe. Affiché sur la fiche, jamais dans la liste. */
  prixIntra: number | null;
  duree: string | null;
  volumeHoraire: number | null;
  formats: FormatParcours[];
  lieu: string | null;
  niveauEntree: NiveauEntree | null;
  eligibleCpf: boolean | null;
  financements: string[] | null;
  certification: string | null;
  codeRncpRs: string | null;
  dateVerification: string | null;
  etats: EtatsInformation;
  infosRenseignees: number;
  infosApplicables: number;
  statutRegroupement: StatutRegroupement;
  motifRegroupement: string | null;
  /** Nombre d'offres repliées derrière cette entrée, arbitrage en attente. */
  offresRepliees: number;
};

export type ParcoursFiche = ParcoursListe & {
  prerequis: string | null;
  outils: string[] | null;
  programme: ModuleProgramme[] | null;
  nonCouvert: string[] | null;
  siteOfficiel: string | null;
  sourceInformation: string | null;
  ecartClassification: string | null;
  modalitesPaiement: string | null;
  /** Source ayant permis d'établir la modalité d'accès. */
  sourceModaliteAcces: string | null;
  /* Provenance — historique de la fiche. */
  creeeLe: string | null;
  misAJourLe: string | null;
  /** Champ concerné par le dernier changement de valeur. */
  champModifie: string | null;
  /** Vérification interne, correction signalée, ou déclaration de l'organisme. */
  origineChangement: string | null;
  variantes: Array<{
    label: string;
    prix: number | null;
    duree: string | null;
    volumeHoraire: number | null;
    accompagnement: string | null;
  }>;
};

const COLONNES_LISTE = `
  id, slug, nom, domaine, sujet_principal, competences_couvertes,
  prix_min, prix_max, duree, volume_horaire, formats, lieu, niveau_entree,
  eligible_cpf, financements_acceptes, certification, code_rncp_rs,
  date_verification, source_information, etats, infos_renseignees, infos_applicables, modalite_acces,
  statut_regroupement, motif_regroupement, parcours_parent_id,
  organismes ( nom, categorie )
`;

/**
 * Le même en-tête, avec les champs d'organisme que la page dédiée réclame.
 *
 * `site` et `certifications_qualite` existent au schéma, mais la règle de la
 * maison vaut aussi pour eux : une colonne absente doit dégrader, jamais faire
 * tomber le catalogue. Ils sont donc tentés d'abord et abandonnés ensemble si
 * la base ne les porte pas encore.
 */
const COLONNES_LISTE_ORGANISME = COLONNES_LISTE.replace(
  "organismes ( nom, categorie )",
  "organismes ( nom, categorie, site, certifications_qualite )",
);

/**
 * Colonnes déployées par une migration plus récente que ce code.
 *
 * Le schéma et le code ne franchissent jamais la même porte au même instant :
 * une migration Lovable s'applique quand elle s'applique, et un déploiement
 * front qui la précède fait tomber tout le catalogue en 500 pour une colonne
 * manquante. Ce qui doit céder, c'est la colonne — pas la page.
 *
 * Ces champs sont donc demandés à part, et leur absence dégrade au lieu de
 * casser : `null` avant migration, la vraie valeur après, sans second
 * déploiement.
 */
const COLONNES_DIFFEREES = "dispo_inter, dispo_intra, prix_intra";



type LigneBrute = Record<string, unknown> & {
  organismes:
    | {
        nom: string;
        categorie: CategorieOrganisme;
        site?: string | null;
        certifications_qualite?: string[] | null;
      }
    | null;
};

function versListe(ligne: LigneBrute, replieesParId: Map<string, number>): ParcoursListe {
  return {
    id: ligne["id"] as string,
    slug: ligne["slug"] as string,
    nom: ligne["nom"] as string,
    organismeNom: ligne.organismes?.nom ?? "Organisme inconnu",
    organismeCategorie: ligne.organismes?.categorie ?? "formation_professionnelle",
    sourceInformation: (ligne["source_information"] as string | null) ?? null,
    organismeSite: ligne.organismes?.site ?? null,
    organismeCertifications: ligne.organismes?.certifications_qualite ?? [],
    domaine: ligne["domaine"] as DomaineParcours,
    sujetPrincipal: ligne["sujet_principal"] as string,
    competencesCouvertes: (ligne["competences_couvertes"] as string[]) ?? [],
    prixMin: ligne["prix_min"] as number | null,
    prixMax: ligne["prix_max"] as number | null,
    modaliteAcces: (ligne["modalite_acces"] as ModaliteAcces | null) ?? null,
    dispoInter: (ligne["dispo_inter"] as boolean | null) ?? null,
    dispoIntra: (ligne["dispo_intra"] as boolean | null) ?? null,
    prixIntra: (ligne["prix_intra"] as number | null) ?? null,
    duree: ligne["duree"] as string | null,
    volumeHoraire: ligne["volume_horaire"] as number | null,
    formats: (ligne["formats"] as FormatParcours[]) ?? [],
    lieu: ligne["lieu"] as string | null,
    niveauEntree: ligne["niveau_entree"] as NiveauEntree | null,
    eligibleCpf: ligne["eligible_cpf"] as boolean | null,
    financements: ligne["financements_acceptes"] as string[] | null,
    certification: ligne["certification"] as string | null,
    codeRncpRs: ligne["code_rncp_rs"] as string | null,
    dateVerification: ligne["date_verification"] as string | null,
    etats: lireEtats(ligne["etats"]),
    infosRenseignees: ligne["infos_renseignees"] as number,
    infosApplicables: ligne["infos_applicables"] as number,
    statutRegroupement: ligne["statut_regroupement"] as StatutRegroupement,
    motifRegroupement: ligne["motif_regroupement"] as string | null,
    offresRepliees: replieesParId.get(ligne["id"] as string) ?? 0,
  };
}

/** Charge les entrées de la liste : tout le catalogue, replis exclus. */
export async function chargerListe(): Promise<ParcoursListe[]> {
  /*
    Candidats du plus riche au plus pauvre, tentés dans l'ordre. Généralise le
    repli qui n'existait que pour `COLONNES_DIFFEREES` : chaque groupe de
    colonnes récentes se retire à son tour, et la page tient jusqu'au socle.
  */
  const candidats = [
    `${COLONNES_LISTE_ORGANISME}, ${COLONNES_DIFFEREES}`,
    `${COLONNES_LISTE}, ${COLONNES_DIFFEREES}`,
    COLONNES_LISTE_ORGANISME,
    COLONNES_LISTE,
  ];
  let { data, error } = await supabase.from("parcours").select(candidats[0]!);
  for (const suivant of candidats.slice(1)) {
    if (!(error && colonneAbsente(error.message))) break;
    ({ data, error } = await supabase.from("parcours").select(suivant));
  }
  if (error) {
    // Le message nomme la colonne et porte le prompt à envoyer : un 500 muet
    // coûte une heure, une erreur qui dit quoi faire coûte une minute.
    if (colonneAbsente(error.message)) throw new Error(diagnostiquer("parcours", error.message));
    throw new Error(`Chargement du catalogue : ${error.message}`);
  }

  const lignes = (data ?? []) as unknown as LigneBrute[];

  // Compte les fiches repliées derrière chaque ancre d'arbitrage, pour que la
  // liste puisse annoncer « 3 offres, arbitrage en attente » sur une ligne.
  const replieesParId = new Map<string, number>();
  for (const ligne of lignes) {
    const parent = ligne["parcours_parent_id"] as string | null;
    if (parent) replieesParId.set(parent, (replieesParId.get(parent) ?? 0) + 1);
  }

  return lignes
    .filter((l) => l["parcours_parent_id"] === null)
    .map((l) => versListe(l, replieesParId));
}

/** Charge une fiche complète par son slug. */
export async function chargerFiche(slug: string): Promise<ParcoursFiche | null> {
  const champsFiche = `prerequis, outils_enseignes, programme, non_couvert,
       site_officiel, source_information, ecart_classification, modalites_paiement,
       source_modalite_acces, created_at, updated_at,
       variantes ( label, prix, duree, volume_horaire, accompagnement )`;

  let { data, error } = await supabase
    .from("parcours")
    .select(`${COLONNES_LISTE}, ${COLONNES_DIFFEREES}, ${champsFiche}`)
    .eq("slug", slug)
    .maybeSingle();
  if (error && colonneAbsente(error.message)) {
    ({ data, error } = await supabase
      .from("parcours")
      .select(`${COLONNES_LISTE}, ${champsFiche}`)
      .eq("slug", slug)
      .maybeSingle());
  }

  if (error) {
    if (colonneAbsente(error.message)) throw new Error(diagnostiquer("parcours", error.message));
    throw new Error(`Chargement de la fiche : ${error.message}`);
  }
  if (!data) return null;

  const ligne = data as unknown as LigneBrute & {
    variantes: Array<Record<string, unknown>>;
  };

  return {
    ...versListe(ligne, new Map()),
    prerequis: ligne["prerequis"] as string | null,
    outils: ligne["outils_enseignes"] as string[] | null,
    programme: (ligne["programme"] as ModuleProgramme[] | null) ?? null,
    nonCouvert: ligne["non_couvert"] as string[] | null,
    siteOfficiel: ligne["site_officiel"] as string | null,
    sourceInformation: ligne["source_information"] as string | null,
    ecartClassification: ligne["ecart_classification"] as string | null,
    modalitesPaiement: ligne["modalites_paiement"] as string | null,
    sourceModaliteAcces: ligne["source_modalite_acces"] as string | null,
    creeeLe: ligne["created_at"] as string | null,
    misAJourLe: ligne["updated_at"] as string | null,
    // Colonnes prévues pour la revendication de fiche ; absentes du schéma
    // tant que la migration n'est pas appliquée, d'où la lecture défensive.
    champModifie: (ligne["champ_modifie"] as string | null) ?? null,
    origineChangement: (ligne["origine_changement"] as string | null) ?? null,
    variantes: (ligne.variantes ?? []).map((v) => ({
      label: v["label"] as string,
      prix: v["prix"] as number | null,
      duree: v["duree"] as string | null,
      volumeHoraire: v["volume_horaire"] as number | null,
      accompagnement: v["accompagnement"] as string | null,
    })),
  };
}

export type ArbitrageLigne = {
  id: string;
  regle_muette: string | null;
  preuve_retenue: string | null;
  decision: string | null;
  auteur: string | null;
  date_decision: string | null;
  created_at: string;
};

/** Charge la file d'arbitrage, publique par principe. */
export async function chargerArbitrages(): Promise<ArbitrageLigne[]> {
  const { data, error } = await supabase
    .from("arbitrages")
    .select("id, regle_muette, preuve_retenue, decision, auteur, date_decision, created_at");
  if (error) throw new Error(`Chargement des arbitrages : ${error.message}`);
  return (data ?? []) as ArbitrageLigne[];
}
