/**
 * Tests de rendu — le seul dispositif qui regarde ce que l'utilisateur voit.
 *
 * Séparé de vitest à dessein : les tests de règles n'ont besoin d'aucun
 * navigateur, et les faire dépendre d'un binaire de 95 Mo les rendrait plus
 * lents et plus fragiles pour rien.
 */
import { defineConfig } from "@playwright/test";

/** Port dédié : aucun autre projet ne l'occupe. */
const BASE = "http://localhost:4317";

export default defineConfig({
  testDir: "./rendu",
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: process.env["URL_TEST"] ?? BASE },
  webServer: process.env["URL_TEST"]
    ? undefined
    : {
        /*
          UN BUILD, PAS LE SERVEUR DE DÉVELOPPEMENT.

          Le 6 août 2026, ces invariants ont validé une AUTRE APPLICATION : le
          port 3000 était occupé par le serveur de dev d'un autre projet, et
          `reuseExistingServer` s'y est rattaché au lieu de démarrer Formlist.
          Le hook de pré-poussée rendait des verdicts sur autre chose, sans rien
          signaler. Même forme que le plafond de découverte à 400.

          Trois changements, chacun pour une raison distincte :

          - Un port DÉDIÉ, hors des ports usuels, pour ne croiser aucun autre
            projet.
          - `strictPort` — un port occupé fait échouer bruyamment au lieu de se
            rattacher en silence à ce qui répond.
          - `reuseExistingServer: false` — c'est la ligne qui a produit le
            défaut. Se rattacher à un serveur inconnu n'est jamais ce qu'on veut
            d'un garde-fou.

          MESURER SUR UN BUILD RESTE À FAIRE, et ce n'est pas un oubli.
          `vite preview` ne convient pas : Nitro construit ici avec le préréglage
          `cloudflare-module`, donc la sortie est un worker et non un serveur
          Node — `dist/server/server.js` n'existe pas, et `node
          .output/server/index.mjs` ne démarrera pas davantage. Le servir demande
          `wrangler dev` avec ses liaisons et les identifiants de `.env.local`.

          Ce qu'il en coûte en attendant : le serveur compile à la demande, et
          cette latence variable est la cause probable — non prouvée — du
          timeout observé une fois sur cinq sur le test de suggestions.
        */
        command: "bun run dev --port 4317 --strictPort",
        url: BASE,
        reuseExistingServer: false,
        timeout: 180_000,
      },
});
