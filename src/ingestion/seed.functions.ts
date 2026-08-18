/**
 * Déclenchement de l'ingestion depuis le serveur.
 *
 * La clé `service_role` n'est jamais exposée : Lovable Cloud l'injecte dans
 * l'environnement serveur, et seul ce handler y accède.
 *
 * PROTECTION. Cette fonction réécrit le catalogue. Elle est donc :
 *   1. protégée par un jeton (`SEED_TOKEN`), sans lequel elle refuse de tourner ;
 *   2. non destructive par défaut — elle refuse d'écraser une base déjà peuplée
 *      tant qu'on ne le demande pas explicitement.
 *
 * Le second garde-fou compte surtout pour plus tard : le jour où la
 * revendication de fiche existera, une base peuplée contiendra des corrections
 * d'organismes qu'un seed rejoué à l'aveugle effacerait.
 */
import { createServerFn } from "@tanstack/react-start";
import type { RapportAlertes } from "@/courriel/alertes.server";

export type ResultatSeed =
  | { statut: "refuse"; raison: string }
  | {
      statut: "ok";
      organismesCrees: number;
      organismesTotal: number;
      fichesEcrites: number;
      fichesRepliees: number;
      variantesEcrites: number;
      /** Slugs des fiches retirées : la seule opération destructrice de la passe. */
      fichesRetirees: string[];
      arbitragesEnAttente: number;
      informationsVerifiees: number;
      /** Ce que l'envoi des alertes a produit dans la foulée. */
      alertes: RapportAlertes | { refus: string };
    };

type EntreeSeed = { jeton: string; ecraser?: boolean };

export const lancerIngestion = createServerFn({ method: "POST" })
  .validator((donnees: EntreeSeed) => donnees)
  .handler(async ({ data }): Promise<ResultatSeed> => {
    const attendu = process.env["SEED_TOKEN"];
    if (!attendu) {
      return {
        statut: "refuse",
        raison:
          "SEED_TOKEN n'est pas défini côté serveur. Ajoute-le dans les secrets Lovable avant de lancer l'ingestion.",
      };
    }
    if (data.jeton !== attendu) {
      return { statut: "refuse", raison: "Jeton invalide." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ecrireIngestion, compterParcours } = await import("./ecrire.server");

    const existants = await compterParcours(supabaseAdmin);
    if (existants > 0 && !data.ecraser) {
      return {
        statut: "refuse",
        raison: `La base contient déjà ${existants} parcours. Relance en cochant « écraser » pour les mettre à jour.`,
      };
    }

    const rapport = await ecrireIngestion(supabaseAdmin);

    /*
      LES ALERTES PARTENT ICI, ET NULLE PART AILLEURS.

      Les valeurs ne changent QUE quand l'ingestion tourne : notifier dans la
      foulée ne demande aucun job planifié, et surtout aucun second chemin vers
      le même envoi — deux chemins, c'est un doublon le jour où l'idempotence a
      le moindre trou.

      Un échec d'envoi ne fait PAS échouer l'ingestion. Le catalogue est écrit,
      c'est le résultat qui compte ; les alertes se rattrapent d'elles-mêmes à
      la passe suivante, puisqu'elles comparent l'historique aux envois faits.
    */
    let alertes: RapportAlertes | { refus: string } = { refus: "non tenté" };
    try {
      const { envoyerAlertes } = await import("@/courriel/alertes.server");
      alertes = await envoyerAlertes(supabaseAdmin, process.env["RESEND_API_KEY"]);
    } catch (erreur) {
      console.error("[seed] envoi des alertes en échec", erreur);
      alertes = { refus: "Envoi des alertes en échec — le catalogue, lui, est écrit." };
    }

    return { statut: "ok", ...rapport, alertes };
  });
