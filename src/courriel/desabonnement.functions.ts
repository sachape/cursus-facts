/**
 * Se désabonner — serveur uniquement.
 *
 * ON NE SUPPRIME PAS LA LIGNE, ON LA DATE. `desabonne_le` conserve la trace du
 * consentement passé et de sa révocation : effacer rendrait impossible de
 * prouver qu'on avait le droit d'écrire, et de constater qu'on ne l'a plus.
 * C'est la règle « on n'efface pas une valeur, on la déclasse », appliquée à
 * une adresse.
 *
 * IDEMPOTENT. Un lien de désabonnement est cliqué deux fois, préchargé par une
 * messagerie, rejoué par un antivirus : la deuxième fois doit répondre la même
 * chose que la première, jamais une erreur.
 */
import { createServerFn } from "@tanstack/react-start";

export type ResultatDesabonnement =
  | { statut: "ok" }
  /** Jeton inconnu ou mal formé — on ne dit pas lequel des deux. */
  | { statut: "introuvable" }
  | { statut: "echec" };

const JETON = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const desabonner = createServerFn({ method: "POST" })
  .validator((donnees: { jeton: string }) => donnees)
  .handler(async ({ data }): Promise<ResultatDesabonnement> => {
    if (!JETON.test(data.jeton)) return { statut: "introuvable" };

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      /*
        `desabonne_le` n'est écrit que s'il est vide : repasser la date à chaque
        clic ferait mentir la chronologie, en datant la révocation du dernier
        préchargement plutôt que du geste réel.
      */
      const { data: lignes, error } = await supabaseAdmin
        .from("abonnements")
        .update({ desabonne_le: new Date().toISOString(), consentement: false })
        .eq("jeton_desabonnement", data.jeton)
        .is("desabonne_le", null)
        .select("id");

      if (error !== null) {
        console.error("[courriel] désabonnement refusé", error);
        return { statut: "echec" };
      }

      // Zéro ligne touchée : soit le jeton n'existe pas, soit c'est déjà fait.
      if ((lignes?.length ?? 0) > 0) return { statut: "ok" };

      /*
        DEUX SOURCES D'ABONNEMENT, DONC DEUX ENDROITS OÙ CHERCHER. Un visiteur
        porte un `jeton_desabonnement` dans `abonnements` ; une alerte de compte
        n'en a pas — c'est son propre identifiant qui sert de jeton, puisqu'il
        est déjà un UUID imprévisible et qu'il ne désigne qu'elle.

        Sans ce second chemin, le lien de désabonnement des alertes répondait
        « ce lien n'est plus valide » : un email obligatoirement muni d'une
        sortie, dont la sortie ne fonctionnait pas.
      */
      const { data: alertes, error: erreurAlerte } = await supabaseAdmin
        .from("alertes")
        .update({ active: false })
        .eq("id", data.jeton)
        .eq("active", true)
        .select("id");

      if (erreurAlerte !== null) {
        console.error("[courriel] désactivation d'alerte refusée", erreurAlerte);
        return { statut: "echec" };
      }
      if ((alertes?.length ?? 0) > 0) return { statut: "ok" };

      /*
        Zéro ligne touchée des deux côtés : soit le jeton n'existe pas, soit le
        désabonnement a déjà eu lieu. On répond « c'est fait » dans le second
        cas — un lien recliqué ne doit pas inquiéter.
      */
      const [{ data: abonnement }, { data: alerte }] = await Promise.all([
        supabaseAdmin
          .from("abonnements")
          .select("id")
          .eq("jeton_desabonnement", data.jeton)
          .maybeSingle(),
        supabaseAdmin.from("alertes").select("id").eq("id", data.jeton).maybeSingle(),
      ]);

      return abonnement === null && alerte === null ? { statut: "introuvable" } : { statut: "ok" };
    } catch (erreur) {
      console.error("[courriel] désabonnement, échec inattendu", erreur);
      return { statut: "echec" };
    }
  });
