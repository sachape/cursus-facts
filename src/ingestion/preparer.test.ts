import { describe, expect, it } from "vitest";
import { preparerIngestion, slugifier } from "./preparer";

const preparation = preparerIngestion();

describe("slug", () => {
  it("produit un identifiant lisible, sans accent ni ponctuation", () => {
    expect(slugifier("Université de Lille — IUT", "Licence pro E-commerce", "12")).toBe(
      "universite-de-lille-iut-licence-pro-e-commerce-12",
    );
  });

  it("reste unique sur tout le catalogue", () => {
    const slugs = preparation.fiches.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("volume ingéré", () => {
  it("prépare 195 fiches et 161 organismes", () => {
    expect(preparation.fiches).toHaveLength(195);
    expect(preparation.organismes).toHaveLength(161);
  });

  it("prépare une variante par offre, jamais moins", () => {
    const variantes = preparation.fiches.reduce((s, f) => s + f.variantes.length, 0);
    expect(variantes).toBe(195);
  });

  it("laisse un seul cas en file d'arbitrage", () => {
    expect(preparation.arbitrages).toHaveLength(1);
    expect(preparation.arbitrages[0]!.preuve_retenue).toContain("non publié");
  });
});

describe("repli des groupes ambigus", () => {
  const ambigus = preparation.fiches.filter(
    (f) => f.colonnes["statut_regroupement"] === "replie_arbitrage",
  );

  it("garde les trois offres comme fiches distinctes", () => {
    expect(ambigus).toHaveLength(3);
  });

  it("rattache deux d'entre elles à une ancre commune", () => {
    const rattachees = ambigus.filter((f) => f.ancreSlug !== null);
    expect(rattachees).toHaveLength(2);
    const ancres = new Set(rattachees.map((f) => f.ancreSlug));
    expect(ancres.size).toBe(1);
    // L'ancre est bien l'une des trois fiches du groupe.
    expect(ambigus.map((f) => f.slug)).toContain([...ancres][0]);
  });

  it("affiche le motif du repli sur chacune", () => {
    for (const fiche of ambigus) {
      expect(fiche.colonnes["motif_regroupement"]).toContain("Tronc pédagogique incomparable");
    }
  });

  it("ramène le catalogue à 193 entrées de liste", () => {
    // 195 fiches, dont 2 repliées derrière une ancre.
    const entrees = preparation.fiches.filter((f) => f.ancreSlug === null);
    expect(entrees).toHaveLength(193);
  });
});

describe("ce qui part en base respecte les invariants", () => {
  it("n'écrit aucune colonne de score, de note ou de pourcentage", () => {
    const interdits = /score|note|moyenne|pourcent|rating|rank/i;
    for (const fiche of preparation.fiches) {
      const suspectes = Object.keys(fiche.colonnes).filter((c) => interdits.test(c));
      expect(suspectes).toEqual([]);
    }
  });

  it("écrit le compteur comme deux entiers cohérents", () => {
    for (const fiche of preparation.fiches) {
      const renseignees = fiche.colonnes["infos_renseignees"] as number;
      const applicables = fiche.colonnes["infos_applicables"] as number;
      expect(Number.isInteger(renseignees)).toBe(true);
      expect(renseignees).toBeLessThanOrEqual(applicables);
      expect(applicables).toBeLessThanOrEqual(18);
    }
  });

  it("attribue toujours un domaine et un sujet principal", () => {
    for (const fiche of preparation.fiches) {
      expect(fiche.colonnes["domaine"]).toBeTruthy();
      expect(fiche.colonnes["sujet_principal"]).toBeTruthy();
    }
  });

  it("n'invente aucune valeur : un champ non publié part à null", () => {
    // Une fiche connue pour ne publier ni programme ni prix.
    const sansProgramme = preparation.fiches.filter(
      (f) => f.colonnes["programme"] === null && f.colonnes["prix_min"] === null,
    );
    expect(sansProgramme.length).toBeGreaterThan(0);
    for (const fiche of sansProgramme.slice(0, 20)) {
      expect(fiche.colonnes["programme"]).toBeNull();
      expect(fiche.colonnes["prix_min"]).toBeNull();
    }
  });

  it("trace l'écart de classification sur les trois fiches concernées", () => {
    const traces = preparation.fiches.filter((f) => f.colonnes["ecart_classification"] !== null);
    expect(traces).toHaveLength(3);
    for (const fiche of traces) {
      expect(fiche.colonnes["ecart_classification"]).toContain("règle automatique proposait");
    }
  });

  it("n'écrit que les trois formats du vocabulaire", () => {
    const autorises = new Set(["distanciel", "presentiel", "alternance"]);
    for (const fiche of preparation.fiches) {
      for (const format of fiche.colonnes["formats"] as string[]) {
        expect(autorises.has(format)).toBe(true);
      }
    }
  });

  it("conserve les 2 401 informations vérifiées du catalogue", () => {
    const total = preparation.fiches.reduce(
      (s, f) => s + (f.colonnes["infos_renseignees"] as number),
      0,
    );
    expect(total).toBe(2401);
  });
});
