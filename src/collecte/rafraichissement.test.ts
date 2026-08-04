import { describe, expect, it } from "vitest";
import { echeance, fileDeRafraichissement, moisEcoules, type Candidat } from "./rafraichissement";

const AUJOURDHUI = "2026-08-04";
const candidat = (p: Partial<Candidat> = {}): Candidat => ({
  id: 1,
  categorie: "formation_independante",
  verifieeLe: AUJOURDHUI,
  sitemapLastmod: null,
  ...p,
});

describe("agent de rafraîchissement", () => {
  it("respecte une cadence différente selon la catégorie", () => {
    // Revérifier un BTS tous les mois gaspille des requêtes ; laisser un an à
    // une formation indépendante publie un prix périmé.
    const ilYaSixMois = "2026-02-04";
    expect(echeance(candidat({ categorie: "universite", verifieeLe: ilYaSixMois }), AUJOURDHUI)).toBeNull();
    expect(
      echeance(candidat({ categorie: "formation_independante", verifieeLe: ilYaSixMois }), AUJOURDHUI),
    ).toMatchObject({ declencheur: "cadence" });
  });

  it("fait passer un sitemap modifié devant la cadence", () => {
    // Le seul signal qui porte une information sur le changement lui-même,
    // là où la cadence ne fait que présumer.
    const e = echeance(
      candidat({ verifieeLe: "2026-08-01", sitemapLastmod: "2026-08-03" }),
      AUJOURDHUI,
    );
    expect(e).toMatchObject({ declencheur: "sitemap_modifie" });
  });

  it("ignore un sitemap plus ancien que notre lecture", () => {
    expect(
      echeance(candidat({ verifieeLe: "2026-08-01", sitemapLastmod: "2026-07-01" }), AUJOURDHUI),
    ).toBeNull();
  });

  it("place une revendication d'organisme avant tout le reste", () => {
    const file = fileDeRafraichissement(
      [
        candidat({ id: 1, verifieeLe: null }),
        candidat({ id: 2, signale: true }),
        candidat({ id: 3, revendique: true }),
        candidat({ id: 4, verifieeLe: "2026-08-01", sitemapLastmod: "2026-08-03" }),
      ],
      AUJOURDHUI,
    );
    expect(file.map((e) => e.id)).toEqual([3, 2, 4, 1]);
  });

  it("considère toujours une fiche jamais vérifiée", () => {
    expect(echeance(candidat({ verifieeLe: null, categorie: "universite" }), AUJOURDHUI)).not.toBeNull();
  });

  it("ne compte que les mois entiers écoulés", () => {
    // Un mois « presque écoulé » ne déclenche pas : sinon la cadence dérive
    // d'un jour à chaque passage et finit par tourner en continu.
    expect(moisEcoules("2026-07-05", "2026-08-04")).toBe(0);
    expect(moisEcoules("2026-07-04", "2026-08-04")).toBe(1);
    expect(moisEcoules("2025-08-04", "2026-08-04")).toBe(12);
  });
});
