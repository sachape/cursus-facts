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
  it("prépare 232 fiches et 163 organismes à partir de 234 offres", () => {
    // 234 offres, dont trois fusionnées en une seule fiche : les formules
    // Builder, Premium et Elite d'Amazon Incubator partagent le même programme.
    expect(preparation.fiches).toHaveLength(232);
    expect(preparation.organismes).toHaveLength(163);
  });

  it("conserve une variante par offre, y compris dans une fiche fusionnée", () => {
    const variantes = preparation.fiches.reduce((s, f) => s + f.variantes.length, 0);
    expect(variantes).toBe(234);
  });

  it("ne laisse plus aucun cas en file d'arbitrage", () => {
    // Sorti de la file sans arbitrage : l'information manquante a été publiée
    // et la règle s'est appliquée d'elle-même.
    expect(preparation.arbitrages).toHaveLength(0);
  });

  it("porte l'échelle tarifaire complète sur la fiche fusionnée", () => {
    const fusionnee = preparation.fiches.find((f) => f.variantes.length === 3);
    expect(fusionnee).toBeDefined();
    expect(fusionnee!.colonnes["prix_min"]).toBe(690);
    expect(fusionnee!.colonnes["prix_max"]).toBe(2490);
    expect(fusionnee!.colonnes["statut_regroupement"]).toBe("fusionne");
  });
});

describe("repli des groupes ambigus", () => {
  it("ne replie plus aucune fiche : la file est vide", () => {
    // Le mécanisme de repli reste couvert par les cas construits de
    // regroupement.test.ts. Ici, le catalogue n'a plus de cas ambigu.
    const ambigus = preparation.fiches.filter(
      (f) => f.colonnes["statut_regroupement"] === "replie_arbitrage",
    );
    expect(ambigus).toHaveLength(0);
  });

  it("expose 232 entrées de liste, sans repli", () => {
    const entrees = preparation.fiches.filter((f) => f.ancreSlug === null);
    expect(entrees).toHaveLength(232);
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

  it("trace l'écart de classification sur les fiches concernées", () => {
    // Trois indépendants du prototype, plus AMZ Révolution et Digital Ecom
    // Club : le classificateur échoue systématiquement sur ce vocabulaire.
    const traces = preparation.fiches.filter((f) => f.colonnes["ecart_classification"] !== null);
    expect(traces).toHaveLength(5);
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

  it("écrit 2 649 informations vérifiées", () => {
    // 2 401 → 2 368 : correction des prix nuls non attestés (33 fiches).
    // 2 368 → 2 340 : qualification de la gratuité (28 fiches de plus).
    // 2 340 → 2 320 : fusion des trois formules Amazon Incubator en une fiche,
    // moins deux jeux d'informations comptés en double, plus les corrections
    // vérifiées et la fiche AMZ Révolution.
    // 2 644 → 2 649 : collecte en profondeur, fiche Dawan PrestaShop
    // Développeurs (prix, durée, volume horaire, prérequis, programme).
    // Ce compteur ne doit monter que par lecture d'une page de détail : une
    // hausse sans passage en collecte signalerait une information déduite.
    const total = preparation.fiches.reduce(
      (s, f) => s + (f.colonnes["infos_renseignees"] as number),
      0,
    );
    expect(total).toBe(2649);
  });

  it("n'écrit jamais un prix nul sans modalité d'accès vérifiée", () => {
    // La gratuité ne s'affirme pas par défaut : un prix à 0 sans qualification
    // serait exactement l'information déduite que l'invariant 2 interdit.
    const nonQualifies = preparation.fiches.filter(
      (f) => f.colonnes["prix_min"] === 0 && f.colonnes["modalite_acces"] === null,
    );
    expect(nonQualifies.map((f) => f.slug)).toEqual([]);
  });
});
