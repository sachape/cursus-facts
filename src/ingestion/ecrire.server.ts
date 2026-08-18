/**
 * Écriture de l'ingestion vers Lovable Cloud.
 *
 * Serveur uniquement : utilise le client `service_role`, qui contourne les
 * règles RLS. Ce module ne doit jamais être importé depuis du code client.
 *
 * Idempotent : les organismes sont rapprochés par leur nom, les parcours par
 * leur slug. Rejouer l'ingestion met à jour les fiches existantes sans les
 * dupliquer.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { preparerIngestion, type Preparation } from "./preparer";
import {
  changementsEntre,
  etatSuiviDepuis,
  type EtatsChamps,
  type SourceSuivi,
} from "@/modele/historique";
import type { CategorieOrganisme } from "@/types/cursus";

/**
 * Nombre maximal de fiches retirées en une passe, sans forçage.
 *
 * IL NE PROTÈGE PAS D'UN RETRAIT VOULU, IL PROTÈGE D'UN CATALOGUE CASSÉ. Si la
 * source cesse d'être lisible — un JSON tronqué, une règle de regroupement qui
 * s'emballe — la préparation rend peu de fiches et TOUT le reste devient
 * « obsolète ». Sans plafond, l'ingestion viderait la base en un passage, sans
 * rien signaler d'autre qu'un rapport optimiste.
 *
 * Quarante : au-dessus de la plus grande vague de retraits connue — les
 * dix-neuf plateformes d'éditeur plus les familles éclatées — et très en
 * dessous d'un accident.
 */
export const PLAFOND_RETRAIT = 40;

/**
 * Les fiches présentes en base que le catalogue ne produit plus.
 *
 * Fonction PURE, et c'est délibéré : c'est la seule décision destructrice de
 * l'ingestion, et elle doit pouvoir être vérifiée sans base de données.
 *
 * Elle refuse de conclure sur une préparation vide. Zéro fiche préparée ne
 * signifie pas « tout le catalogue est retiré », ça signifie que la source n'a
 * pas été lue — et c'est exactement le cas où le retrait ferait le plus de
 * dégâts.
 */
export function retraitsAFaire(
  slugsEnBase: readonly string[],
  slugsPrepares: readonly string[],
): string[] {
  if (slugsPrepares.length === 0) {
    throw new Error(
      "Aucune fiche préparée : la source n'a pas été lue. Aucun retrait ne sera fait.",
    );
  }
  const attendus = new Set(slugsPrepares);
  return slugsEnBase.filter((slug) => !attendus.has(slug));
}

export type RapportIngestion = {
  organismesCrees: number;
  organismesTotal: number;
  fichesEcrites: number;
  fichesRepliees: number;
  variantesEcrites: number;
  /** Fiches retirées de la base parce que le catalogue ne les produit plus. */
  fichesRetirees: string[];
  arbitragesEnAttente: number;
  informationsVerifiees: number;
};

type Client = SupabaseClient<Database>;

/** Les colonnes strictement nécessaires au diff — rien de plus ne se lit. */
const COLONNES_SUIVI =
  "slug, prix_min, prix_max, modalite_acces, unite_prix, prix_niveau, formats, " +
  "eligible_cpf, dispo_inter, dispo_intra, duree, certification, programme, etats, " +
  "organismes ( categorie )";

/** Les états de complétude, quelle que soit la forme du JSON stocké. */
export function etatsChamps(brut: unknown): EtatsChamps {
  if (brut === null || typeof brut !== "object") return {};
  const source = brut as Record<string, unknown>;
  const lire = (cle: string) => (typeof source[cle] === "string" ? (source[cle] as string) : null);
  return {
    cout_apprenant: lire("cout_apprenant") ?? lire("prix"),
    duree: lire("duree"),
    programme: lire("programme"),
    certification: lire("certification"),
  };
}

/**
 * Les titres de modules, quelle que soit leur forme.
 *
 * L'ingestion écrit `[{ titre }]` ; d'anciennes lignes portent des chaînes
 * nues. Le diff ne doit pas voir une différence là où seul le CONTENANT a
 * changé — ce serait un email pour une migration de format.
 */
export function titresProgramme(brut: unknown): string[] | null {
  if (!Array.isArray(brut) || brut.length === 0) return null;
  return brut.map((entree) =>
    typeof entree === "string" ? entree : String((entree as { titre?: unknown })?.titre ?? ""),
  );
}

export function sourceDepuisColonnes(
  colonnes: Record<string, unknown>,
  categorie: CategorieOrganisme,
): SourceSuivi {
  const nombre = (cle: string) =>
    typeof colonnes[cle] === "number" ? (colonnes[cle] as number) : null;
  const chaine = (cle: string) =>
    typeof colonnes[cle] === "string" ? (colonnes[cle] as string) : null;

  return {
    prixMin: nombre("prix_min"),
    prixMax: nombre("prix_max"),
    modaliteAcces: (colonnes["modalite_acces"] ?? null) as SourceSuivi["modaliteAcces"],
    formats: (colonnes["formats"] ?? []) as SourceSuivi["formats"],
    organismeCategorie: categorie,
    eligibleCpf: typeof colonnes["eligible_cpf"] === "boolean" ? colonnes["eligible_cpf"] : null,
    dispoInter: typeof colonnes["dispo_inter"] === "boolean" ? colonnes["dispo_inter"] : null,
    dispoIntra: typeof colonnes["dispo_intra"] === "boolean" ? colonnes["dispo_intra"] : null,
    unitePrix: chaine("unite_prix"),
    prixNiveau: chaine("prix_niveau"),
    etats: etatsChamps(colonnes["etats"]),
    duree: chaine("duree"),
    certification: chaine("certification"),
    programme: titresProgramme(colonnes["programme"]),
  };
}

/** L'état d'avant, par slug. Les fiches absentes de la base n'y figurent pas. */
async function lireEtatSuivi(
  db: Client,
  slugs: readonly string[],
): Promise<Map<string, { source: SourceSuivi; etats: EtatsChamps }>> {
  const etat = new Map<string, { source: SourceSuivi; etats: EtatsChamps }>();

  // Par tranches : une clause `in` de plusieurs centaines de slugs dépasse la
  // longueur d'URL admise par la passerelle.
  const TRANCHE = 100;
  for (let debut = 0; debut < slugs.length; debut += TRANCHE) {
    const { data, error } = await db
      .from("parcours")
      .select(COLONNES_SUIVI)
      .in("slug", slugs.slice(debut, debut + TRANCHE));

    if (error) throw new Error(`Lecture de l'état précédent : ${error.message}`);

    for (const ligne of (data ?? []) as unknown as Array<Record<string, unknown>>) {
      const categorie = (ligne["organismes"] as { categorie?: CategorieOrganisme } | null)
        ?.categorie;
      if (categorie === undefined) continue;
      etat.set(String(ligne["slug"]), {
        source: sourceDepuisColonnes(ligne, categorie),
        etats: etatsChamps(ligne["etats"]),
      });
    }
  }

  return etat;
}

/**
 * Écrit une préparation en base.
 *
 * L'ordre compte : les organismes d'abord, car les parcours les référencent ;
 * le repli d'arbitrage ensuite, car il référence des parcours déjà écrits.
 */
export async function ecrireIngestion(
  db: Client,
  preparation: Preparation = preparerIngestion(),
): Promise<RapportIngestion> {
  // 1. Organismes — rapprochés par leur nom.
  const { data: existants, error: erreurLecture } = await db.from("organismes").select("id, nom");
  if (erreurLecture) throw new Error(`Lecture des organismes : ${erreurLecture.message}`);

  const idParNom = new Map((existants ?? []).map((o) => [o.nom, o.id]));
  const aCreer = preparation.organismes.filter((o) => !idParNom.has(o.nom));

  if (aCreer.length > 0) {
    const { data, error } = await db.from("organismes").insert(aCreer).select("id, nom");
    if (error) throw new Error(`Création des organismes : ${error.message}`);
    for (const o of data ?? []) idParNom.set(o.nom, o.id);
  }

  /*
    2 bis. L'ÉTAT D'AVANT, LU AVANT D'ÉCRIRE.

    L'upsert écrase sans rien lire : après lui, l'ancienne valeur n'existe nulle
    part. C'est pour ça que cette lecture est ici et pas ailleurs — c'est le
    dernier instant où le « avant » est encore observable.

    Une fiche absente de la base n'a pas d'avant : elle ne produit aucun
    changement. Une création n'est pas une modification, et prévenir de la
    « nouveauté » d'un parcours que personne ne suivait encore n'a pas de sens.
  */
  const categorieParNom = new Map(preparation.organismes.map((o) => [o.nom, o.categorie]));
  const avantParSlug = await lireEtatSuivi(
    db,
    preparation.fiches.map((f) => f.slug),
  );

  // 2. Parcours — une ligne par fiche, rapprochées par slug.
  const lignes = preparation.fiches.map((fiche) => ({
    ...fiche.colonnes,
    organisme_id: idParNom.get(fiche.organismeNom),
  }));

  /*
    ÉCRITURE PAR LOTS.

    Un upsert unique de 232 fiches à dix-huit colonnes dépassait le délai de la
    passerelle : la requête n'échouait pas, elle était coupée, et le client
    recevait une page d'erreur HTML au lieu d'une réponse. Rien dans le rapport
    ne l'indiquait — la base restait simplement en retard.

    Chaque lot est une transaction pour lui-même. Un lot qui échoue interrompt,
    et les précédents restent écrits : ce n'est pas de l'atomicité, mais un
    catalogue partiellement à jour vaut mieux qu'un catalogue jamais à jour, et
    l'ingestion est idempotente — la rejouer reprend là où elle en était.
  */
  const TAILLE_LOT = 50;
  const ecrits: { id: string; slug: string }[] = [];

  for (let debut = 0; debut < lignes.length; debut += TAILLE_LOT) {
    const lot = lignes.slice(debut, debut + TAILLE_LOT);
    const { data, error } = await db
      .from("parcours")
      // @ts-expect-error — colonnes construites dynamiquement par la préparation,
      // dont le contenu est verrouillé par preparer.test.ts.
      .upsert(lot, { onConflict: "slug" })
      .select("id, slug");
    if (error) {
      throw new Error(
        `Écriture des parcours, lot ${debut / TAILLE_LOT + 1} ` +
          `(fiches ${debut + 1} à ${debut + lot.length}) : ${error.message}`,
      );
    }
    ecrits.push(...((data ?? []) as { id: string; slug: string }[]));
  }

  const idParSlug = new Map(ecrits.map((p) => [p.slug, p.id]));

  /*
    2 ter. L'HISTORIQUE — écrit APRÈS l'upsert, et seulement pour ce qui l'a été.

    L'ordre n'est pas cosmétique : consigner un changement que l'écriture aurait
    ensuite refusé annoncerait par email une valeur qui n'est pas en base. On
    n'inscrit donc que les slugs réellement revenus de l'upsert.
  */
  const changements = preparation.fiches.flatMap((fiche) => {
    const avant = avantParSlug.get(fiche.slug);
    // Ni fiche nouvelle, ni fiche dont l'écriture a été coupée.
    if (avant === undefined || !idParSlug.has(fiche.slug)) return [];

    const categorie = categorieParNom.get(fiche.organismeNom);
    if (categorie === undefined) return [];

    const apres = sourceDepuisColonnes(fiche.colonnes, categorie);
    return changementsEntre(
      fiche.slug,
      { valeurs: etatSuiviDepuis(avant.source), etats: avant.etats },
      { valeurs: etatSuiviDepuis(apres), etats: etatsChamps(fiche.colonnes["etats"]) },
    );
  });

  if (changements.length > 0) {
    // Par lots, comme les parcours : la passerelle coupe les requêtes longues.
    for (let debut = 0; debut < changements.length; debut += TAILLE_LOT) {
      const { error } = await db
        .from("historique_champs")
        .insert(changements.slice(debut, debut + TAILLE_LOT));
      if (error) throw new Error(`Écriture de l'historique : ${error.message}`);
    }
  }

  // 3. Repli d'arbitrage — les fiches restent distinctes et consultables, mais
  //    n'occupent qu'une seule entrée dans la liste.
  const aReplier = preparation.fiches.filter((f) => f.ancreSlug !== null);
  for (const fiche of aReplier) {
    const ancreId = idParSlug.get(fiche.ancreSlug!);
    if (!ancreId) continue;
    const { error } = await db
      .from("parcours")
      .update({ parcours_parent_id: ancreId })
      .eq("slug", fiche.slug);
    if (error) throw new Error(`Repli de ${fiche.slug} : ${error.message}`);
  }

  // 4. Variantes — reconstruites à chaque passage, faute de clé naturelle.
  const idsParcours = [...idParSlug.values()];
  if (idsParcours.length > 0) {
    const { error } = await db.from("variantes").delete().in("parcours_id", idsParcours);
    if (error) throw new Error(`Purge des variantes : ${error.message}`);
  }

  const variantes = preparation.fiches.flatMap((fiche) => {
    const parcoursId = idParSlug.get(fiche.slug);
    if (!parcoursId) return [];
    return fiche.variantes.map((v) => ({ ...v, parcours_id: parcoursId }));
  });

  // Même découpage que les parcours : les variantes sont plus nombreuses
  // qu'eux, et c'est cette insertion qui coupait en second.
  for (let debut = 0; debut < variantes.length; debut += TAILLE_LOT) {
    const lot = variantes.slice(debut, debut + TAILLE_LOT);
    const { error } = await db.from("variantes").insert(lot);
    if (error) {
      throw new Error(
        `Écriture des variantes, lot ${debut / TAILLE_LOT + 1} : ${error.message}`,
      );
    }
  }

  /*
    5. RETRAITS — les fiches que le catalogue ne produit plus.

    L'upsert seul ne suffit pas : il ajoute et met à jour, il n'enlève rien. La
    base gardait donc les dix-neuf plateformes d'éditeur retirées, les deux
    pages catalogue de M2i et Dawan retirées le 4 août, et les familles ISCOD,
    ENACO et Studi depuis éclatées en fiches individuelles — soit vingt-deux
    fiches affichées au public que le catalogue considère comme retirées, et des
    doublons avec leurs remplaçantes.

    L'ORDRE DE SUPPRESSION SUIT LES RÉFÉRENCES. Un repli d'arbitrage pointe vers
    une fiche ancre : si l'ancre part la première, la suppression échoue sur la
    contrainte. On délie, on purge les variantes, puis on retire.

    Les sauvegardes et alertes des utilisateurs référencent un parcours par son
    identifiant textuel, sans contrainte : elles survivent au retrait et
    désignent une fiche disparue. C'est le comportement déjà en place pour toute
    fiche retirée, et il vaut mieux qu'une suppression silencieuse de données
    qui appartiennent à quelqu'un.
  */
  const { data: toutesEnBase, error: erreurInventaire } = await db
    .from("parcours")
    .select("id, slug");
  if (erreurInventaire) throw new Error(`Inventaire des parcours : ${erreurInventaire.message}`);

  const parSlugEnBase = new Map((toutesEnBase ?? []).map((p) => [p.slug, p.id]));
  const retires = retraitsAFaire(
    [...parSlugEnBase.keys()],
    preparation.fiches.map((f) => f.slug),
  );

  if (retires.length > PLAFOND_RETRAIT) {
    throw new Error(
      `${retires.length} fiches seraient retirées, au-dessus du plafond de ${PLAFOND_RETRAIT}. ` +
        `Une préparation qui retire autant décrit un défaut de source, pas un retrait. ` +
        `Rien n'a été retiré ; vérifier le catalogue avant de relancer.`,
    );
  }

  if (retires.length > 0) {
    const idsRetires = retires.map((slug) => parSlugEnBase.get(slug)!).filter(Boolean);

    // Délier les replis qui pointent vers une fiche retirée.
    const { error: erreurDelier } = await db
      .from("parcours")
      .update({ parcours_parent_id: null })
      .in("parcours_parent_id", idsRetires);
    if (erreurDelier) throw new Error(`Déliaison des replis : ${erreurDelier.message}`);

    const { error: erreurVariantes } = await db
      .from("variantes")
      .delete()
      .in("parcours_id", idsRetires);
    if (erreurVariantes) throw new Error(`Purge des variantes retirées : ${erreurVariantes.message}`);

    const { error: erreurRetrait } = await db.from("parcours").delete().in("id", idsRetires);
    if (erreurRetrait) throw new Error(`Retrait des fiches : ${erreurRetrait.message}`);
  }

  // 6. File d'arbitrage — publique, rejouée à l'identique.
  const { error: erreurPurgeArb } = await db
    .from("arbitrages")
    .delete()
    .not("id", "is", null);
  if (erreurPurgeArb) throw new Error(`Purge des arbitrages : ${erreurPurgeArb.message}`);

  if (preparation.arbitrages.length > 0) {
    const { error } = await db.from("arbitrages").insert(preparation.arbitrages);
    if (error) throw new Error(`Écriture des arbitrages : ${error.message}`);
  }

  return {
    organismesCrees: aCreer.length,
    organismesTotal: idParNom.size,
    fichesEcrites: ecrits?.length ?? 0,
    fichesRepliees: aReplier.length,
    variantesEcrites: variantes.length,
    fichesRetirees: retires,
    arbitragesEnAttente: preparation.arbitrages.length,
    informationsVerifiees: preparation.fiches.reduce(
      (s, f) => s + (f.colonnes["infos_renseignees"] as number),
      0,
    ),
  };
}

/** Nombre de parcours déjà en base — sert de garde-fou avant réécriture. */
export async function compterParcours(db: Client): Promise<number> {
  const { count, error } = await db
    .from("parcours")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(`Comptage des parcours : ${error.message}`);
  return count ?? 0;
}
