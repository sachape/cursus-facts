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
  it("prépare 230 fiches et 161 organismes à partir de 232 offres", () => {
    // 234 offres, dont trois fusionnées en une seule fiche : les formules
    // Builder, Premium et Elite d'Amazon Incubator partagent le même programme.
    expect(preparation.fiches).toHaveLength(230);
    expect(preparation.organismes).toHaveLength(163);
  });

  it("conserve une variante par offre, y compris dans une fiche fusionnée", () => {
    const variantes = preparation.fiches.reduce((s, f) => s + f.variantes.length, 0);
    expect(variantes).toBe(232);
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

  it("expose 230 entrées de liste, sans repli", () => {
    const entrees = preparation.fiches.filter((f) => f.ancreSlug === null);
    expect(entrees).toHaveLength(230);
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

  it("écrit 2 724 informations vérifiées", () => {
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
    // Ce compteur ne doit monter que par lecture d'une page de détail : une
    // hausse sans passage en collecte signalerait une information déduite.
    const total = preparation.fiches.reduce(
      (s, f) => s + (f.colonnes["infos_renseignees"] as number),
      0,
    );
    expect(total).toBe(2724);
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

      Seule baisse autorisée à ce jour : le retrait des deux pages catalogue
      d'organisme du 4 août 2026, qui ne décrivaient aucun parcours achetable.
    */
    const PLANCHER = 2739;
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
