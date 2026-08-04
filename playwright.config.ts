/**
 * Tests de rendu — le seul dispositif qui regarde ce que l'utilisateur voit.
 *
 * Séparé de vitest à dessein : les tests de règles n'ont besoin d'aucun
 * navigateur, et les faire dépendre d'un binaire de 95 Mo les rendrait plus
 * lents et plus fragiles pour rien.
 */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./rendu",
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: process.env["URL_TEST"] ?? "http://localhost:3000" },
  webServer: process.env["URL_TEST"]
    ? undefined
    : {
        command: "bun run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
