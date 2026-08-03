import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Config volontairement séparée de vite.config.ts, verrouillée par Lovable.
// Les tests portent sur les règles du modèle — modules purs, sans DOM ni React.
export default defineConfig({
  resolve: {
    alias: { "@": resolve(import.meta.dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
