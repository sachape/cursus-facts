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
    DEUX SOURCES D'ABONNEMENT, ET ELLES NE SE RESSEMBLENT PAS.

    Un compte suit UN parcours avec ses champs ; un visiteur a coché la case du
    comparatif et suit les parcours qu'il comparait. Le module de sélection les
    distingue par leur `type`, parce que c'est là que se joue l'idempotence :
    l'envoi de l'un s'enregistre sous `alerte_id`, celui de l'autre sous
    `abonnement_id`, et les deux index uniques rendent le doublon impossible en
    base — pas seulement improbable dans le code.
  */
  const [
    { data: alertes, error: erreurAlertes },
    { data: abonnements, error: erreurAbonnements },
  ] = await Promise.all([
    db.from("alertes").select("id, parcours_id, champs_surveilles, active, profils ( email )").eq("active", true),
    /*
      Le désabonnement est filtré EN BASE autant que dans le module : une
      requête qui ramènerait les désabonnés ferait dépendre leur protection
      d'un filtre applicatif, et un filtre s'oublie. La règle est appliquée
      deux fois, volontairement.
    */
    db.from("abonnements").select("id, email, parcours_ids, consentement, desabonne_le, jeton_desabonnement").eq("consentement", true).is("desabonne_le", null),
  ]);
  if (erreurAlertes) throw new Error(`Lecture des alertes : ${erreurAlertes.message}`);
  if (erreurAbonnements) throw new Error(`Lecture des abonnements : ${erreurAbonnements.message}`);

  const destinataires: Destinataire[] = [
    ...(alertes ?? []).map((a) => ({
      type: "alerte" as const,
      id: a.id,
      email: (a.profils as { email?: string } | null)?.email ?? "",
      parcoursId: a.parcours_id,
      champsSurveilles: a.champs_surveilles,
      active: a.active,
    })),
    ...(abonnements ?? []).map((b) => ({
      type: "abonnement" as const,
      id: b.id,
      email: b.email,
      parcoursIds: b.parcours_ids,
      consentement: b.consentement,
      desabonneLe: b.desabonne_le,
    })),
  ].filter((d) => d.email.trim() !== "");

  const jetonParAbonnement = new Map(
    (abonnements ?? []).map((b) => [b.id, b.jeton_desabonnement]),
  );

  if (destinataires.length === 0) return vide;

  const { data: envoyees, error: erreurEnvoyees } = await db
    .from("notifications_envoyees")
    .select("alerte_id, abonnement_id, historique_id");
  if (erreurEnvoyees) throw new Error(`Lecture des envois : ${erreurEnvoyees.message}`);

  /*
    UNE LIGNE PORTE L'UNE OU L'AUTRE SOURCE, jamais les deux — la contrainte
    CHECK l'impose. On lit donc les deux colonnes et on ignore celle qui est
    nulle, plutôt que de supposer laquelle est renseignée.
  */
  const dejaEnvoyees = new Set(
    (envoyees ?? []).flatMap((e) => {
      if (e.alerte_id !== null) return [cleEnvoi("alerte", e.alerte_id, e.historique_id)];
      if (e.abonnement_id !== null) return [cleEnvoi("abonnement", e.abonnement_id, e.historique_id)];
      return [];
    }),
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

    /*
      LE JETON N'EST PAS L'IDENTIFIANT, SAUF POUR UNE ALERTE. Une alerte de
      compte se désabonne par son propre id — déjà un UUID imprévisible, et il
      ne désigne qu'elle. Un abonnement porte un `jeton_desabonnement` distinct,
      justement pour que son identifiant de ligne ne circule pas par email.

      Sans jeton, on N'ENVOIE PAS : un email dont le lien de désabonnement ne
      fonctionne pas est pire que pas d'email du tout.
    */
    const jeton =
      notification.destinataire.type === "alerte"
        ? notification.destinataire.id
        : jetonParAbonnement.get(notification.destinataire.id);

    if (jeton === undefined) {
      console.error("[alertes] jeton de désabonnement introuvable", notification.destinataire.id);
      rapport.emailsEchoues += 1;
      continue;
    }

    const donnees: DonneesChangement = {
      parcours,
      urlDesabonnement: `${SITE}/desabonnement/${jeton}`,
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
      const source =
        notification.destinataire.type === "alerte"
          ? { alerte_id: notification.destinataire.id }
          : { abonnement_id: notification.destinataire.id };

      const { error } = await db.from("notifications_envoyees").insert(
        notification.changements.map((c) => ({ ...source, historique_id: c.id })),
      );
      if (error) {
        // L'email EST parti : on le signale, mais on ne le compte pas en échec.
        console.error("[alertes] envoi non enregistré, doublon possible", error);
      }

      // `derniere_notification` n'existe que sur une alerte de compte.
      if (notification.destinataire.type === "alerte") {
        await db
          .from("alertes")
          .update({ derniere_notification: new Date().toISOString() })
          .eq("id", notification.destinataire.id);
      }

      rapport.emailsEnvoyes += 1;
    } catch (erreur) {
      console.error("[alertes] échec inattendu", erreur);
      rapport.emailsEchoues += 1;
    }
  }

  return rapport;
}
