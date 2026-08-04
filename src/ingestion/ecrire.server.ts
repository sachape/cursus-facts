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

export type RapportIngestion = {
  organismesCrees: number;
  organismesTotal: number;
  fichesEcrites: number;
  fichesRepliees: number;
  variantesEcrites: number;
  arbitragesEnAttente: number;
  informationsVerifiees: number;
};

type Client = SupabaseClient<Database>;

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

  // 5. File d'arbitrage — publique, rejouée à l'identique.
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
