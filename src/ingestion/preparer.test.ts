import { describe, expect, it } from "vitest";
import { preparerIngestion, slugifier } from "./preparer";
import {
  compterInformations,
  valeursPresentes,
  type EtatsInformation,
} from "@/types/cursus";

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
  it("prépare 211 fiches et 148 organismes à partir de 213 offres", () => {
    // Trois offres fusionnées en une seule fiche : les formules Builder, Premium
    // et Elite d'Amazon Incubator partagent le même programme.
    /*
      230 → 211 fiches et 163 → 148 organismes, 13 août 2026 : retrait des
      dix-neuf plateformes d'apprentissage d'éditeur.

      Dix-neuf fiches mais QUINZE organismes perdus, et l'écart se compte :
      dix-sept organismes distincts (Klaviyo et TikTok en portaient deux
      chacun), dont Google et Shopify restent au catalogue par une autre fiche.
      Le compte a été vérifié plutôt que déduit — la première version de ce
      commentaire disait « un organisme par fiche » et se trompait de quatre.
    */
    expect(preparation.fiches).toHaveLength(211);
    expect(preparation.organismes).toHaveLength(148);
  });

  it("conserve une variante par offre, y compris dans une fiche fusionnée", () => {
    const variantes = preparation.fiches.reduce((s, f) => s + f.variantes.length, 0);
    // 232 → 213 : retrait des dix-neuf plateformes d'éditeur du 13 août 2026.
    expect(variantes).toBe(213);
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

  it("expose 211 entrées de liste, sans repli", () => {
    const entrees = preparation.fiches.filter((f) => f.ancreSlug === null);
    // 230 → 211 : retrait des dix-neuf plateformes d'éditeur du 13 août 2026.
    expect(entrees).toHaveLength(211);
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

  it("écrit 2 769 informations vérifiées", () => {
    // 2 401 → 2 368 : correction des prix nuls non attestés (33 fiches).
    // 2 368 → 2 340 : qualification de la gratuité (28 fiches de plus).
    // 2 340 → 2 320 : fusion des trois formules Amazon Incubator en une fiche,
    // moins deux jeux d'informations comptés en double, plus les corrections
    // vérifiées et la fiche AMZ Révolution.
    // 2 644 → 2 657 : collecte en profondeur, trois pages de détail lues —
    // Dawan PrestaShop Développeurs et Webmasters, ORSYS PrestaShop.
    // 2 657 → 2 638 : retrait de deux pages catalogue d'organisme fichées
    // comme des parcours. Les 19 informations perdues décrivaient une famille
    // de cours, pas un parcours achetable — une baisse qui vaut mieux que le
    // chiffre qu'elle remplace.
    // 2 638 → 2 724 puis 2 769 : passe d'extraction automatisée du 6 août 2026,
    // journalisée dans `journal-extraction.json`. Chaque hausse est adossée à la
    // lecture d'une page de détail citée — c'est le chemin légitime.
    // Ce compteur ne doit monter que par lecture d'une page de détail : une
    // hausse sans passage en collecte signalerait une information déduite.
    const total = preparation.fiches.reduce(
      (s, f) => s + (f.colonnes["infos_renseignees"] as number),
      0,
    );
    /*
      2 769 → 2 527, 13 août 2026. Les dix-neuf plateformes d'éditeur emportent
      242 informations vérifiées avec elles.

      CETTE BAISSE N'EST PAS UNE PERTE D'INFORMATION. Ces 242 valeurs décrivaient
      les champs d'un objet qui n'est pas un parcours — une « durée » de
      « Modules courts », un prix nul qui n'était pas un tarif. Le compteur ne
      comptait pas mal : il comptait le mauvais objet. Les fiches entières sont
      conservées dans `ressources-ecartees.json`, rien n'est effacé.
    */
    expect(total).toBe(2527);
  });

  it("n'admet aucune fiche sans site officiel", () => {
    /*
      LE SITE OFFICIEL EST LA DONNÉE FONDATRICE. Sans URL vérifiée, une fiche
      ne peut ni être ouverte en profondeur, ni être rafraîchie, ni renvoyer
      l'utilisateur vers l'organisme — et la vue Méthode ne peut rien prouver
      de ce qu'elle affiche.

      Le trou constaté le 4 août 2026 est instructif : les 20 fiches sans URL
      étaient **toutes** des créateurs indépendants, c'est-à-dire la catégorie
      que l'agent doit rafraîchir tous les mois. Le segment le plus volatil du
      catalogue était aussi celui dont nous n'avions aucune adresse.

      Les exceptions ci-dessous sont nommées et datées. Cette liste ne doit que
      décroître : y ajouter un nom exige un motif écrit ici, et aucune collecte
      future ne doit créer de fiche sans URL.
    */
    /*
      Les 14 fiches héritées, toutes des créateurs indépendants entrés au
      catalogue avant que cette règle existe. Quatre de leurs pairs ont déjà été
      résolus le 4 août — LiveMentor, Yomi Denzel, Marketing Mania, La Webeuse,
      Antoine BM. Cette liste ne doit que décroître ; aucune collecte future ne
      doit créer de fiche sans URL vérifiée.
    */
    const SANS_URL_HERITEES = new Set<string>([
      "roman-de-czerny-et-maxime-le-morillon-ecom-french-touch-128",
      "guillaume-jacob-dropshipping-exponentiel-129",
      "kamik-dropshipping-seo-de-0-a-600-k-130",
      "oseille-tv-super-seller-academy-131",
      "oseille-tv-mentorat-amazon-190",
      "learnyclub-formations-dropshipping-et-seo-132",
      "bulldozer-formations-growth-et-acquisition-133",
      "formafly-formafly-shopify-et-publicite-135",
      "growth-hackers-mini-ecom-print-on-demand-137",
      "sokona-diaby-martin-business-game-138",
      "booster-d-activite-se-lancer-en-e-commerce-139",
      "wholesaleamz-wholesaleamz-187",
      "sebastien-cerise-fba-accelerateur-de-liberte-digitale-188",
      "je-cree-mon-e-business-coaching-20-semaines-189",
    ]);
    const fautives = preparation.fiches
      .filter((f) => {
        const url = f.colonnes["site_officiel"];
        return url === null || url === undefined || String(url).trim() === "" || url === "—";
      })
      .map((f) => f.slug)
      .filter((slug) => !SANS_URL_HERITEES.has(slug));
    expect(fautives).toEqual([]);
  });

  it("ne fait jamais disparaître une valeur du catalogue", () => {
    /*
      LE GARDE-FOU CENTRAL. Ce plancher ne mesure pas les informations
      vérifiées — c'est le rôle du compteur voisin — mais les valeurs
      **présentes**, confirmées ou non. Il ne doit jamais baisser.

      Une valeur déclassée en « à confirmer » reste présente : la déclasser ne
      fait pas bouger ce nombre. Une valeur effacée le fait tomber, et ce test
      échoue. C'est exactement ce qu'il fallait pour attraper l'incident du
      3 août 2026, où une consigne d'écriture sans règle d'effacement a supprimé
      61 prix — dont trois parcours que Google publie « Free ».

      Le baisser exige donc un motif écrit ici, et vaut autorisation explicite.
      Une disparition d'information est un événement suspect, pas une mise à
      jour : cette règle vaut pour toute correction manuelle comme pour un futur
      agent de rafraîchissement, qui reproduirait le même comportement à
      l'échelle.

      Baisses autorisées à ce jour, chacune avec son motif :
        · 4 août 2026 — les deux pages catalogue d'organisme (M2i, Dawan), qui
          ne décrivaient aucun parcours achetable.
        · 13 août 2026 — les dix-neuf plateformes d'apprentissage d'éditeur,
          2 739 → 2 567, par MODIFICATION DE RÈGLE : le critère « Ressource
          gratuite sans offre payante ni parcours borné » n'existait pas avant.
          Ces fiches ne sont pas effacées mais déplacées, entières, dans
          `ressources-ecartees.json` — et le retrait est publié dans
          `journal-retraits.json`. Le plancher tombe parce que le catalogue
          décrit moins d'objets, pas parce qu'on sait moins de choses sur eux.
    */
    const PLANCHER = 2567;
    const total = preparation.fiches.reduce(
      (s, f) => s + valeursPresentes(compterInformations(f.colonnes["etats"] as EtatsInformation)),
      0,
    );
    expect(total).toBeGreaterThanOrEqual(PLANCHER);
  });

  it("n'affirme jamais un prix nul sans modalité d'accès vérifiée", () => {
    // La gratuité ne s'affirme pas par défaut : un prix à 0 présenté comme
    // vérifié sans qualification serait l'information déduite que l'invariant 2
    // interdit. Mais il ne s'efface pas non plus — il se déclasse. Ce qui est
    // interdit, c'est l'état `renseigne` sans modalité, pas la valeur.
    const affirmes = preparation.fiches.filter(
      (f) =>
        f.colonnes["prix_min"] === 0 &&
        f.colonnes["modalite_acces"] === null &&
        (f.colonnes["etats"] as Record<string, string>)["prix"] === "renseigne",
    );
    expect(affirmes.map((f) => f.slug)).toEqual([]);
  });
});
