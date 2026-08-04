/**
 * Route d'ingestion du catalogue.
 *
 * POST /api/ingestion
 *   en-tête : x-seed-token: <SEED_TOKEN>
 *   corps   : { "ecraser"?: boolean }
 *
 * Mêmes garde-fous que la page d'administration : jeton obligatoire, et refus
 * d'écraser une base déjà peuplée sans demande explicite.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ingestion")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const attendu = process.env["SEED_TOKEN"];
        const fourni = request.headers.get("x-seed-token");

        if (!attendu || !fourni || fourni !== attendu) {
          return Response.json({ erreur: "Jeton d'ingestion absent ou invalide." }, { status: 401 });
        }

        let ecraser = false;
        try {
          const corps = (await request.json()) as { ecraser?: unknown } | null;
          ecraser = corps?.ecraser === true;
        } catch {
          // Corps vide ou non JSON : on garde le comportement non destructif.
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { ecrireIngestion, compterParcours } = await import("@/ingestion/ecrire.server");

        const existants = await compterParcours(supabaseAdmin);
        if (existants > 0 && !ecraser) {
          return Response.json(
            {
              erreur: `La base contient déjà ${existants} parcours.`,
              indice: 'Relancer avec {"ecraser": true} pour les mettre à jour.',
              parcoursExistants: existants,
            },
            { status: 409 },
          );
        }

        const rapport = await ecrireIngestion(supabaseAdmin);
        return Response.json(rapport);
      },
    },
  },
});
