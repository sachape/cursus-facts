/**
 * Seed du catalogue vers Lovable Cloud.
 *
 *   bun run seed
 *
 * Idempotent : rejouable autant de fois que nécessaire. Les organismes sont
 * rapprochés par leur nom, les parcours par leur slug. Ce script est la
 * première brique du pipeline d'ingestion — celui qui portera plus tard les
 * fiches France Compétences.
 *
 * Il applique les règles du modèle, il n'en invente aucune : classification,
 * regroupement et états proviennent de `src/modele`. Un champ non publié entre
 * en base à `null`, avec l'état `non_communique`.
 *
 * Nécessite SUPABASE_SERVICE_ROLE_KEY dans un fichier `.env.local`, que
 * `.gitignore` exclut déjà via le motif `*.local`.
 */
import { createClient } from "@supabase/supabase-js";
import { chargerCatalogue, type OffreNormalisee } from "../src/donnees/catalogue";
import { classifier } from "../src/modele/classification";
import { regrouper, type GroupeRegroupe } from "../src/modele/regroupement";
import { determinerEtats } from "../src/modele/completude";
import { compterInformations } from "../src/types/cursus";
import { LIBELLES_DOMAINES } from "../src/modele/vocabulaires";

const URL = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
const CLE = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!URL || !CLE) {
  console.error(
    "Il manque SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Crée un fichier .env.local à la racine :\n\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=<la clé service_role du projet Lovable>\n",
  );
  process.exit(1);
}

const db = createClient(URL, CLE, { auth: { persistSession: false } });

/* -------------------------------------------------------------------------- */
/* Préparation des fiches                                                     */
/* -------------------------------------------------------------------------- */

type OffreClassee = OffreNormalisee & {
  domaine: ReturnType<typeof classifier>["domaine"];
  sujetPrincipal: string;
  competencesCouvertes: string[];
  ecart: boolean;
  domaineAutomatique: ReturnType<typeof classifier>["domaineAutomatique"];
  niveauEntree: OffreNormalisee["niveauEntree"];
};

function slugifier(...parties: string[]): string {
  return parties
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const catalogue = chargerCatalogue();

const classees: OffreClassee[] = catalogue.map((offre) => {
  const c = classifier({
    nom: offre.nom,
    organisme: offre.organisme,
    categorie: offre.categorie,
    outils: offre.outils ?? [],
    modules: offre.programme ?? [],
    domaineDeclare: offre.domaineDeclare,
    competencesDeclarees: offre.competencesDeclarees,
    classificationManuelle: offre.classificationManuelle,
  });
  return { ...offre, ...c };
});

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

/** Le statut de regroupement tel qu'il est stocké, pour chaque issue. */
function statutDe(issue: GroupeRegroupe<unknown>["issue"]) {
  switch (issue) {
    case "fusion":
      return "fusionne" as const;
    case "ambigu":
      return "replie_arbitrage" as const;
    default:
      return "autonome" as const;
  }
}

const motifParArbitrage = new Map(arbitrages.map((a) => [a.id, a.motif]));

/* -------------------------------------------------------------------------- */
/* Écriture                                                                   */
/* -------------------------------------------------------------------------- */

async function seed() {
  // 1. Organismes — rapprochés par leur nom.
  const organismes = new Map<string, { categorie: OffreNormalisee["categorie"]; site: string | null }>();
  for (const o of catalogue) {
    if (!organismes.has(o.organisme)) {
      organismes.set(o.organisme, {
        categorie: o.categorie,
        site: o.url && o.url !== "—" ? o.url : null,
      });
    }
  }

  const { data: existants, error: erreurLecture } = await db
    .from("organismes")
    .select("id, nom");
  if (erreurLecture) throw erreurLecture;

  const idParNom = new Map((existants ?? []).map((o) => [o.nom, o.id]));
  const aCreer = [...organismes.entries()].filter(([nom]) => !idParNom.has(nom));

  if (aCreer.length > 0) {
    const { data, error } = await db
      .from("organismes")
      .insert(aCreer.map(([nom, o]) => ({ nom, site: o.site, categorie: o.categorie })))
      .select("id, nom");
    if (error) throw error;
    for (const o of data ?? []) idParNom.set(o.nom, o.id);
  }
  console.log(`organismes : ${aCreer.length} créés, ${idParNom.size} au total`);

  // 2. Parcours — une fiche par groupe, sauf refus et ambigu qui restent
  //    distincts. L'ambigu se replie à l'affichage, pas en base.
  const fiches: Array<Record<string, unknown>> = [];
  const variantesParSlug = new Map<string, OffreClassee[]>();
  const parentParSlug = new Map<string, string>();

  for (const groupe of groupes) {
    const membres = groupe.offres.map((o) => (o as { source: OffreClassee }).source);
    const statut = statutDe(groupe.issue);

    // Une fusion produit une fiche unique ; les autres issues produisent une
    // fiche par offre, l'ambiguïté ne fusionnant jamais les données.
    const lots = groupe.issue === "fusion" ? [membres] : membres.map((m) => [m]);
    let slugAncre: string | null = null;

    for (const lot of lots) {
      const tete = lot[0]!;
      const nom = groupe.issue === "fusion" ? groupe.socle : tete.nom;
      const slug = slugifier(tete.organisme, nom, String(tete.id));
      const etats = determinerEtats(tete);
      const compteur = compterInformations(etats);
      const prix = lot.map((m) => m.prix).filter((p): p is number => p !== null);

      if (groupe.issue === "ambigu") {
        if (slugAncre === null) slugAncre = slug;
        else parentParSlug.set(slug, slugAncre);
      }

      fiches.push({
        organisme_id: idParNom.get(tete.organisme),
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
        motif_regroupement:
          groupe.arbitrageId !== undefined
            ? (motifParArbitrage.get(groupe.arbitrageId) ?? null)
            : null,
        // Trace l'écart entre le domaine déclaré et celui qu'aurait produit la
        // règle automatique. Affiché sur la fiche.
        ecart_classification: tete.ecart
          ? `Domaine déclaré manuellement. La règle automatique proposait « ${LIBELLES_DOMAINES[tete.domaineAutomatique]} ».`
          : null,
      });

      variantesParSlug.set(slug, lot);
    }
  }

  const { data: parcoursEcrits, error: erreurParcours } = await db
    .from("parcours")
    .upsert(fiches, { onConflict: "slug" })
    .select("id, slug");
  if (erreurParcours) throw erreurParcours;
  console.log(`parcours : ${parcoursEcrits?.length ?? 0} écrits`);

  const idParSlug = new Map((parcoursEcrits ?? []).map((p) => [p.slug, p.id]));

  // 3. Repli des groupes ambigus : les fiches restent distinctes et
  //    consultables, mais pointent vers une ancre commune pour n'occuper
  //    qu'une seule entrée dans la liste.
  for (const [slug, ancre] of parentParSlug) {
    const { error } = await db
      .from("parcours")
      .update({ parcours_parent_id: idParSlug.get(ancre) })
      .eq("slug", slug);
    if (error) throw error;
  }
  console.log(`repli d'arbitrage : ${parentParSlug.size} fiches rattachées`);

  // 4. Variantes — reconstruites à chaque passage, faute de clé naturelle.
  const idsParcours = [...idParSlug.values()];
  const { error: erreurPurge } = await db
    .from("variantes")
    .delete()
    .in("parcours_id", idsParcours);
  if (erreurPurge) throw erreurPurge;

  const variantes = [...variantesParSlug.entries()].flatMap(([slug, lot]) => {
    const parcoursId = idParSlug.get(slug);
    if (!parcoursId) return [];
    const socleNom = lot.length > 1 ? lot[0]!.nom : null;
    return lot.map((m) => ({
      parcours_id: parcoursId,
      label:
        lot.length === 1
          ? "Formule unique"
          : (m.nom.replace(socleNom ?? "", "").replace(/^\s*[—-]\s*/, "").trim() || m.nom),
      prix: m.prix,
      duree: m.duree,
      volume_horaire: m.volumeHoraire,
      accompagnement: null,
    }));
  });

  const { error: erreurVariantes } = await db.from("variantes").insert(variantes);
  if (erreurVariantes) throw erreurVariantes;
  console.log(`variantes : ${variantes.length} écrites`);

  // 5. File d'arbitrage — publique, rejouée à l'identique.
  const { error: erreurPurgeArb } = await db
    .from("arbitrages")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (erreurPurgeArb) throw erreurPurgeArb;

  if (arbitrages.length > 0) {
    const { error } = await db.from("arbitrages").insert(
      arbitrages.map((a) => ({
        parcours_ids: [],
        regle_muette: `Fusion automatique : ${a.offres} offres « ${a.socle} » de ${a.organisme}, sujet ${a.sujetPrincipal}.`,
        preuve_retenue: a.motif,
        decision: null,
        auteur: null,
        date_decision: null,
      })),
    );
    if (error) throw error;
  }
  console.log(`arbitrages : ${arbitrages.length} en attente`);

  const totalRenseignees = fiches.reduce((s, f) => s + (f["infos_renseignees"] as number), 0);
  console.log(
    `\n${fiches.length} fiches · ${idParNom.size} organismes · ${totalRenseignees} informations vérifiées`,
  );
}

seed().catch((erreur: unknown) => {
  const message = erreur instanceof Error ? erreur.message : String(erreur);
  if (/formats/.test(message)) {
    console.error(
      "\nLa colonne `formats` est absente. La migration du champ Format n'a pas\n" +
        "encore été appliquée dans Lovable — voir le prompt de migration.\n",
    );
  }
  console.error(erreur);
  process.exit(1);
});
