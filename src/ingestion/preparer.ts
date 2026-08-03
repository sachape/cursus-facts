/**
 * Préparation de l'ingestion — étape pure, sans réseau ni base.
 *
 * Transforme le catalogue source en enregistrements prêts à écrire, en
 * appliquant les règles du modèle : classification, regroupement, états des 18
 * champs. Cette étape n'invente rien et ne décide rien qui ne soit publié dans
 * la page Méthode.
 *
 * Elle est séparée de l'écriture pour rester testable sans accès à la base :
 * c'est ici que se vérifie ce qui partira en base, pas dans un log d'insertion.
 */
import type { CategorieOrganisme, EtatsInformation } from "@/types/cursus";
import { compterInformations } from "@/types/cursus";
import { chargerCatalogue, type OffreNormalisee } from "@/donnees/catalogue";
import { classifier, type ResultatClassification } from "@/modele/classification";
import { regrouper } from "@/modele/regroupement";
import { determinerEtats } from "@/modele/completude";
import { LIBELLES_DOMAINES } from "@/modele/vocabulaires";

export type OrganismePrepare = {
  nom: string;
  site: string | null;
  categorie: CategorieOrganisme;
};

export type VariantePreparee = {
  label: string;
  prix: number | null;
  duree: string | null;
  volume_horaire: number | null;
  accompagnement: string | null;
};

export type FichePreparee = {
  /** Clé naturelle : rapproche la fiche de son organisme à l'écriture. */
  organismeNom: string;
  slug: string;
  /**
   * Slug de la fiche d'ancrage pour les groupes ambigus. Les fiches restent
   * distinctes et consultables, mais n'occupent qu'une entrée dans la liste.
   */
  ancreSlug: string | null;
  colonnes: Record<string, unknown>;
  variantes: VariantePreparee[];
};

export type ArbitragePrepare = {
  regle_muette: string;
  preuve_retenue: string;
  parcours_ids: string[];
  decision: null;
  auteur: null;
  date_decision: null;
};

export type Preparation = {
  organismes: OrganismePrepare[];
  fiches: FichePreparee[];
  arbitrages: ArbitragePrepare[];
};

/** Identifiant lisible et stable d'une fiche. */
export function slugifier(...parties: string[]): string {
  return parties
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

type OffreClassee = OffreNormalisee & ResultatClassification;

/** Colonnes de la table `parcours` pour une fiche donnée. */
function colonnesDe(
  tete: OffreClassee,
  nom: string,
  slug: string,
  lot: OffreClassee[],
  etats: EtatsInformation,
  statut: "autonome" | "fusionne" | "replie_arbitrage",
  motif: string | null,
): Record<string, unknown> {
  const compteur = compterInformations(etats);
  const prix = lot.map((m) => m.prix).filter((p): p is number => p !== null);

  return {
    nom,
    slug,
    domaine: tete.domaine,
    sujet_principal: tete.sujetPrincipal,
    competences_couvertes: tete.competencesCouvertes,
    prix_min: prix.length > 0 ? Math.min(...prix) : null,
    prix_max: prix.length > 0 ? Math.max(...prix) : null,
    modalites_paiement:
      tete.financements?.find((f) => /Paiement|échelonné|fois/i.test(f)) ?? null,
    duree: tete.duree,
    volume_horaire: tete.volumeHoraire,
    formats: tete.formats,
    lieu: tete.region,
    niveau_entree: tete.niveauEntree,
    prerequis: tete.prerequis,
    // Le booléen collecté ne distingue pas « vérifié non éligible » de « non
    // vérifié ». Dette connue et tracée : on ne la corrige pas par déduction.
    eligible_cpf: tete.cpf === null ? null : tete.cpf === 1,
    financements_acceptes: tete.financements,
    certification: tete.certification,
    code_rncp_rs: tete.certification?.match(/RNCP\d+|RS\d+/)?.[0] ?? null,
    outils_enseignes: tete.outils,
    programme: tete.programme?.map((titre) => ({ titre })) ?? null,
    non_couvert: tete.nonCouvert,
    site_officiel: tete.url && tete.url !== "—" ? tete.url : null,
    source_information: tete.source,
    date_verification: tete.dateVerification,
    etats,
    infos_renseignees: compteur.renseignees,
    infos_applicables: compteur.applicables,
    statut_regroupement: statut,
    motif_regroupement: motif,
    ecart_classification: tete.ecart
      ? `Domaine déclaré manuellement. La règle automatique proposait « ${LIBELLES_DOMAINES[tete.domaineAutomatique]} ».`
      : null,
  };
}

/** Étiquette d'une variante à l'intérieur d'une fiche fusionnée. */
function libelleVariante(offre: OffreClassee, socle: string, seule: boolean): string {
  if (seule) return "Formule unique";
  const reste = offre.nom.replace(socle, "").replace(/^\s*[—-]\s*/, "").trim();
  return reste || offre.nom;
}

/**
 * Applique l'ensemble du modèle au catalogue source.
 *
 * Une fusion produit une fiche unique portant plusieurs variantes. Les autres
 * issues produisent une fiche par offre : l'ambiguïté ne fusionne jamais les
 * données, elle ne replie que l'affichage.
 */
export function preparerIngestion(catalogue = chargerCatalogue()): Preparation {
  const classees: OffreClassee[] = catalogue.map((offre) => ({
    ...offre,
    ...classifier({
      nom: offre.nom,
      organisme: offre.organisme,
      categorie: offre.categorie,
      outils: offre.outils ?? [],
      modules: offre.programme ?? [],
      domaineDeclare: offre.domaineDeclare,
      competencesDeclarees: offre.competencesDeclarees,
      classificationManuelle: offre.classificationManuelle,
    }),
  }));

  const organismes = new Map<string, OrganismePrepare>();
  for (const o of classees) {
    if (!organismes.has(o.organisme)) {
      organismes.set(o.organisme, {
        nom: o.organisme,
        site: o.url && o.url !== "—" ? o.url : null,
        categorie: o.categorie,
      });
    }
  }

  const { groupes, arbitrages } = regrouper(
    classees.map((o) => ({
      nom: o.nom,
      organisme: o.organisme,
      niveauEntree: o.niveauEntree,
      sujetPrincipal: o.sujetPrincipal,
      modules: o.programme ?? [],
      source: o,
    })),
  );

  const motifParArbitrage = new Map(arbitrages.map((a) => [a.id, a.motif]));
  const fiches: FichePreparee[] = [];

  for (const groupe of groupes) {
    const membres = groupe.offres.map((o) => o.source);
    const motif =
      groupe.arbitrageId !== undefined
        ? (motifParArbitrage.get(groupe.arbitrageId) ?? null)
        : null;

    // Seule la fusion regroupe les données. Le refus et l'ambiguïté laissent
    // une fiche par offre.
    const lots = groupe.issue === "fusion" ? [membres] : membres.map((m) => [m]);
    const statut =
      groupe.issue === "fusion"
        ? ("fusionne" as const)
        : groupe.issue === "ambigu"
          ? ("replie_arbitrage" as const)
          : ("autonome" as const);

    let ancre: string | null = null;

    for (const lot of lots) {
      const tete = lot[0]!;
      const nom = groupe.issue === "fusion" ? groupe.socle : tete.nom;
      const slug = slugifier(tete.organisme, nom, String(tete.id));
      const etats = determinerEtats(tete);

      const ancreSlug = groupe.issue === "ambigu" && ancre !== null ? ancre : null;
      if (groupe.issue === "ambigu" && ancre === null) ancre = slug;

      fiches.push({
        organismeNom: tete.organisme,
        slug,
        ancreSlug,
        colonnes: colonnesDe(tete, nom, slug, lot, etats, statut, motif),
        variantes: lot.map((m) => ({
          label: libelleVariante(m, groupe.socle, lot.length === 1),
          prix: m.prix,
          duree: m.duree,
          volume_horaire: m.volumeHoraire,
          accompagnement: null,
        })),
      });
    }
  }

  return {
    organismes: [...organismes.values()],
    fiches,
    arbitrages: arbitrages.map((a) => ({
      regle_muette: `Fusion automatique : ${a.offres} offres « ${a.socle} » de ${a.organisme}, sujet ${a.sujetPrincipal}.`,
      preuve_retenue: a.motif,
      parcours_ids: [],
      decision: null,
      auteur: null,
      date_decision: null,
    })),
  };
}
