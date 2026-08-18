/**
 * L'envoi des alertes — serveur uniquement, appelé après une ingestion.
 *
 * IL NE REGARDE PAS « CE QUI VIENT D'ÊTRE ÉCRIT ». Il compare l'historique aux
 * envois déjà faits, et rattrape donc tout seul une ingestion dont l'envoi
 * aurait échoué. Se fier au lot courant rendrait un échec définitivement muet :
 * personne ne saurait qu'un email n'est pas parti.
 *
 * LE PLAFOND EST UN GARDE-FOU DE VOLUME, pas une limite de débit. Il ne protège
 * pas d'un envoi voulu, il protège d'un catalogue qui aurait bougé en masse —
 * une règle changée, une réingestion complète — et qui ferait partir des
 * centaines d'emails en une passe. Même esprit que `PLAFOND_RETRAIT` : au-delà,
 * on s'arrête et on rend la main plutôt que d'agir.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ADRESSE_CONTACT } from "@/modele/contact";
import {
  cleEnvoi,
  notificationsAPreparer,
  type ChangementHistorique,
  type Destinataire,
} from "@/modele/alertes";
import {
  LIBELLES_CHAMPS,
  ABSENT,
  motsInterditsDuChangement,
  objetChangement,
  rendreHtml,
  rendreTexte,
  type DonneesChangement,
  type ParcoursChange,
} from "./changement";

type Client = SupabaseClient<Database>;

const SITE = "https://formlist.fr";
const EXPEDITEUR = `Formlist <${ADRESSE_CONTACT}>`;

/**
 * Au-delà, on n'envoie rien et on le dit.
 *
 * Vingt-cinq : au-dessus de ce qu'une collecte ordinaire produit — quelques
 * prix relevés, une certification corrigée — et très en dessous d'une
 * réingestion qui toucherait tout le catalogue.
 */
export const PLAFOND_ENVOIS = 25;

export type RapportAlertes = {
  changementsNotifiables: number;
  emailsEnvoyes: number;
  emailsEchoues: number;
  /** Renseigné quand le plafond a stoppé l'envoi : rien n'est parti. */
  refus: string | null;
};

/** Ce que l'email doit montrer, à partir d'une ligne d'historique. */
function lisible(changement: ChangementHistorique) {
  return {
    champ: LIBELLES_CHAMPS[changement.champ] ?? changement.champ,
    avant: changement.valeurPrecedente ?? ABSENT,
    apres: changement.valeurNouvelle ?? ABSENT,
  };
}

export async function envoyerAlertes(db: Client, cle: string | undefined): Promise<RapportAlertes> {
  const vide: RapportAlertes = {
    changementsNotifiables: 0,
    emailsEnvoyes: 0,
    emailsEchoues: 0,
    refus: null,
  };
  if (!cle) return { ...vide, refus: "RESEND_API_KEY absente : aucun envoi tenté." };

  const { data: historique, error: erreurHistorique } = await db
    .from("historique_champs")
    .select("id, parcours_id, champ, valeur_precedente, valeur_nouvelle, etat_precedent, etat_nouveau")
    .order("modifie_le", { ascending: true });
  if (erreurHistorique) throw new Error(`Lecture de l'historique : ${erreurHistorique.message}`);

  const changements: ChangementHistorique[] = (historique ?? []).map((h) => ({
    id: h.id,
    parcoursId: h.parcours_id,
    champ: h.champ,
    valeurPrecedente: h.valeur_precedente,
    valeurNouvelle: h.valeur_nouvelle,
    etatPrecedent: h.etat_precedent,
    etatNouveau: h.etat_nouveau,
  }));
  if (changements.length === 0) return vide;

  /*
    LES ALERTES DE COMPTE SEULEMENT, POUR L'INSTANT. Les visiteurs consentants
    ne peuvent pas encore être suivis : `notifications_envoyees.alerte_id` est
    NOT NULL vers `alertes`, donc leur envoi ne pourrait pas être enregistré, et
    ils seraient renotifiés à chaque ingestion. Écrire sans pouvoir tracer est
    pire que ne pas écrire — la migration ouvre ce chemin, pas ce fichier.
  */
  const { data: alertes, error: erreurAlertes } = await db
    .from("alertes")
    .select("id, parcours_id, champs_surveilles, active, profils ( email )")
    .eq("active", true);
  if (erreurAlertes) throw new Error(`Lecture des alertes : ${erreurAlertes.message}`);

  const destinataires: Destinataire[] = (alertes ?? [])
    .map((a) => ({
      type: "alerte" as const,
      id: a.id,
      email: (a.profils as { email?: string } | null)?.email ?? "",
      parcoursId: a.parcours_id,
      champsSurveilles: a.champs_surveilles,
      active: a.active,
    }))
    .filter((d) => d.email !== "");

  if (destinataires.length === 0) return vide;

  const { data: envoyees, error: erreurEnvoyees } = await db
    .from("notifications_envoyees")
    .select("alerte_id, historique_id");
  if (erreurEnvoyees) throw new Error(`Lecture des envois : ${erreurEnvoyees.message}`);

  const dejaEnvoyees = new Set(
    (envoyees ?? []).map((e) => cleEnvoi("alerte", e.alerte_id, e.historique_id)),
  );

  const notifications = notificationsAPreparer({ changements, destinataires, dejaEnvoyees });
  const rapport: RapportAlertes = { ...vide, changementsNotifiables: notifications.length };
  if (notifications.length === 0) return rapport;

  if (notifications.length > PLAFOND_ENVOIS) {
    return {
      ...rapport,
      refus:
        `${notifications.length} emails à envoyer, plafond à ${PLAFOND_ENVOIS} : rien n'a été ` +
        `envoyé. Un volume pareil vient d'un changement de règle ou d'une réingestion, pas d'une ` +
        `collecte. Vérifie l'historique avant de relancer.`,
    };
  }

  // Les intitulés, pour nommer les parcours dans l'email.
  const parcoursIds = [...new Set(notifications.flatMap((n) => n.changements.map((c) => c.parcoursId)))];
  const { data: fiches } = await db
    .from("parcours")
    .select("slug, nom, organismes ( nom )")
    .in("slug", parcoursIds);
  const ficheParSlug = new Map(
    (fiches ?? []).map((f) => [
      f.slug,
      { nom: f.nom, organisme: (f.organismes as { nom?: string } | null)?.nom ?? "" },
    ]),
  );

  const envoyeLe = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  for (const notification of notifications) {
    const parcours: ParcoursChange[] = parcoursIds
      .filter((slug) => notification.changements.some((c) => c.parcoursId === slug))
      .map((slug) => ({
        nom: ficheParSlug.get(slug)?.nom ?? slug,
        organisme: ficheParSlug.get(slug)?.organisme ?? "",
        changements: notification.changements.filter((c) => c.parcoursId === slug).map(lisible),
        url: `${SITE}/parcours/${slug}`,
      }));

    const donnees: DonneesChangement = {
      parcours,
      // Le jeton de désabonnement d'une alerte de compte est l'alerte elle-même.
      urlDesabonnement: `${SITE}/desabonnement/${notification.destinataire.id}`,
      envoyeLe,
    };

    if (motsInterditsDuChangement(donnees).length > 0) {
      console.error("[alertes] vocabulaire de jugement, envoi refusé", notification.destinataire.id);
      rapport.emailsEchoues += 1;
      continue;
    }

    try {
      const reponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: EXPEDITEUR,
          to: [notification.destinataire.email],
          subject: objetChangement(parcours),
          html: rendreHtml(donnees),
          text: rendreTexte(donnees),
          headers: {
            "List-Unsubscribe": `<${donnees.urlDesabonnement}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });

      if (!reponse.ok) {
        console.error(`[alertes] Resend a refusé (${reponse.status})`, await reponse.text());
        rapport.emailsEchoues += 1;
        continue;
      }

      /*
        L'ENREGISTREMENT SUIT L'ENVOI, JAMAIS L'INVERSE. Enregistrer d'abord
        rendrait un échec définitif : la clé d'idempotence existerait, et la
        prochaine passe considérerait la personne comme prévenue.
      */
      const { error } = await db.from("notifications_envoyees").insert(
        notification.changements.map((c) => ({
          alerte_id: notification.destinataire.id,
          historique_id: c.id,
        })),
      );
      if (error) {
        // L'email EST parti : on le signale, mais on ne le compte pas en échec.
        console.error("[alertes] envoi non enregistré, doublon possible", error);
      }

      await db
        .from("alertes")
        .update({ derniere_notification: new Date().toISOString() })
        .eq("id", notification.destinataire.id);

      rapport.emailsEnvoyes += 1;
    } catch (erreur) {
      console.error("[alertes] échec inattendu", erreur);
      rapport.emailsEchoues += 1;
    }
  }

  return rapport;
}
