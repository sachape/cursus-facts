import { describe, expect, it } from "vitest";
import {
  intitulesProches,
  motsSignificatifs,
  regrouper,
  socle,
  tauxTroncCommun,
  type OffreRegroupable,
} from "./regroupement";

const offre = (
  partiel: Omit<Partial<OffreRegroupable>, "modules"> & {
    nom: string;
    modules?: readonly string[] | undefined;
  },
): OffreRegroupable => ({
  organisme: "AMZ Academy",
  niveauEntree: "aucun_prerequis",
  sujetPrincipal: "Amazon FBA",
  ...partiel,
  modules: partiel.modules ?? [],
});

const PROGRAMME = ["Sourcing produit", "Création de la fiche", "Publicité Amazon", "Logistique FBA"];

describe("socle d'un intitulé", () => {
  it("retire les suffixes de formule", () => {
    expect(socle("Amazon Incubator — Premium")).toBe("Amazon Incubator");
    expect(socle("Amazon Incubator - Elite")).toBe("Amazon Incubator");
    expect(socle("Amazon Incubator Builder")).toBe("Amazon Incubator");
    expect(socle("Formation e-commerce — Niveau 2")).toBe("Formation e-commerce");
    expect(socle("Bootcamp Growth Part-time")).toBe("Bootcamp Growth");
  });

  it("laisse intact un intitulé sans suffixe de formule", () => {
    expect(socle("Licence pro E-commerce et marketing numérique")).toBe(
      "Licence pro E-commerce et marketing numérique",
    );
  });

  it("ne retient que les mots de plus de deux caractères", () => {
    expect(motsSignificatifs("Vendre et se former en ligne")).toEqual(
      new Set(["vendre", "former", "ligne"]),
    );
  });
});

describe("proximité des intitulés", () => {
  it("rapproche deux déclinaisons du même socle", () => {
    expect(intitulesProches("Amazon Incubator — Premium", "Amazon Incubator — Elite")).toBe(true);
  });

  it("sépare deux parcours réellement différents", () => {
    expect(intitulesProches("Formation Shopify", "Mastère marketing digital")).toBe(false);
  });

  it("exige au moins 70 % de mots communs", () => {
    // 3 mots communs sur 4 = 75 %
    expect(intitulesProches("Formation vente ligne Amazon", "Formation vente ligne Etsy")).toBe(
      true,
    );
    // 2 mots communs sur 4 = 50 %
    expect(intitulesProches("Formation vente Amazon Premium", "Formation vente Etsy boutique")).toBe(
      false,
    );
  });
});

describe("tronc pédagogique commun", () => {
  it("renvoie null quand un programme n'est pas publié", () => {
    expect(tauxTroncCommun(offre({ nom: "A", modules: PROGRAMME }), offre({ nom: "B" }))).toBeNull();
    expect(tauxTroncCommun(offre({ nom: "A" }), offre({ nom: "B" }))).toBeNull();
  });

  it("mesure la part de modules partagés, casse ignorée", () => {
    const a = offre({ nom: "A", modules: ["Sourcing produit", "Logistique FBA"] });
    const b = offre({ nom: "B", modules: ["SOURCING PRODUIT", "Logistique FBA"] });
    expect(tauxTroncCommun(a, b)).toBe(1);
  });

  it("rapporte au programme le plus long", () => {
    const a = offre({ nom: "A", modules: ["M1", "M2"] });
    const b = offre({ nom: "B", modules: ["M1", "M2", "M3", "M4"] });
    expect(tauxTroncCommun(a, b)).toBe(0.5);
  });
});

describe("hiérarchie de preuves — les trois issues", () => {
  it("laisse une offre isolée en fiche unique", () => {
    const { groupes, arbitrages } = regrouper([offre({ nom: "Amazon Incubator" })]);
    expect(groupes).toHaveLength(1);
    expect(groupes[0]!.issue).toBe("unique");
    expect(arbitrages).toHaveLength(0);
  });

  it("fusionne quand les quatre conditions sont réunies sans divergence", () => {
    const { groupes, arbitrages } = regrouper([
      offre({ nom: "Amazon Incubator — Builder", modules: PROGRAMME }),
      offre({ nom: "Amazon Incubator — Premium", modules: PROGRAMME }),
      offre({ nom: "Amazon Incubator — Elite", modules: PROGRAMME }),
    ]);
    expect(groupes).toHaveLength(1);
    expect(groupes[0]!.issue).toBe("fusion");
    expect(groupes[0]!.offres).toHaveLength(3);
    expect(groupes[0]!.socle).toBe("Amazon Incubator");
    expect(arbitrages).toHaveLength(0);
  });

  it("refuse la fusion quand les programmes publiés divergent réellement", () => {
    const { groupes, arbitrages } = regrouper([
      offre({ nom: "Amazon Incubator — Builder", modules: PROGRAMME }),
      offre({
        nom: "Amazon Incubator — Premium",
        modules: ["Tout autre chose", "Et encore autre chose", "Rien en commun", "Vraiment rien"],
      }),
    ]);
    expect(groupes).toHaveLength(2);
    expect(groupes.every((g) => g.issue === "refus")).toBe(true);
    expect(arbitrages).toHaveLength(0);
  });

  it("envoie en arbitrage dès qu'un programme n'est pas publié", () => {
    const { groupes, arbitrages } = regrouper([
      offre({ nom: "Amazon Incubator — Builder", modules: PROGRAMME }),
      offre({ nom: "Amazon Incubator — Premium" }),
      offre({ nom: "Amazon Incubator — Elite" }),
    ]);
    expect(groupes).toHaveLength(1);
    expect(groupes[0]!.issue).toBe("ambigu");
    expect(arbitrages).toHaveLength(1);
    expect(arbitrages[0]!.offres).toBe(3);
    expect(arbitrages[0]!.programmesPublies).toBe(1);
    expect(arbitrages[0]!.motif).toContain("2 programme(s) non publié(s)");
    expect(groupes[0]!.arbitrageId).toBe(arbitrages[0]!.id);
  });
});

describe("les quatre conditions de la fusion", () => {
  const base = { modules: PROGRAMME };

  it("ne fusionne jamais deux organismes différents", () => {
    const { groupes } = regrouper([
      offre({ nom: "Amazon Incubator — Builder", organisme: "AMZ Academy", ...base }),
      offre({ nom: "Amazon Incubator — Premium", organisme: "Autre Academy", ...base }),
    ]);
    expect(groupes).toHaveLength(2);
    expect(groupes.every((g) => g.issue === "unique")).toBe(true);
  });

  it("ne fusionne jamais deux publics différents", () => {
    const { groupes } = regrouper([
      offre({ nom: "Amazon Incubator — Builder", niveauEntree: "aucun_prerequis", ...base }),
      offre({ nom: "Amazon Incubator — Premium", niveauEntree: "bac3", ...base }),
    ]);
    expect(groupes).toHaveLength(2);
  });

  it("ne fusionne jamais deux sujets principaux différents", () => {
    const { groupes } = regrouper([
      offre({ nom: "Amazon Incubator — Builder", sujetPrincipal: "Amazon FBA", ...base }),
      offre({ nom: "Amazon Incubator — Premium", sujetPrincipal: "Etsy", ...base }),
    ]);
    expect(groupes).toHaveLength(2);
  });

  it("ne fusionne jamais deux intitulés éloignés", () => {
    const { groupes } = regrouper([
      offre({ nom: "Amazon Incubator", ...base }),
      offre({ nom: "Mastère management international", ...base }),
    ]);
    expect(groupes).toHaveLength(2);
  });
});

describe("l'invariant d'incitation — l'opacité ne doit jamais rapporter", () => {
  const deuxOffres = (modulesDuSecond?: string[]) => [
    offre({ nom: "Amazon Incubator — Builder", modules: PROGRAMME }),
    offre({ nom: "Amazon Incubator — Premium", modules: modulesDuSecond }),
  ];

  it("ne publier aucun programme ne fait gagner aucune entrée dans la liste", () => {
    const transparent = regrouper(deuxOffres(PROGRAMME)); // fusion
    const opaque = regrouper(deuxOffres(undefined)); // ambigu, replié

    // Une entrée dans la liste dans les deux cas : l'ambiguïté n'achète pas de visibilité.
    expect(transparent.groupes).toHaveLength(1);
    expect(opaque.groupes).toHaveLength(1);
  });

  it("seule une divergence prouvée produit des fiches supplémentaires", () => {
    const divergent = regrouper(deuxOffres(["Rien", "En", "Commun", "Ici"]));
    expect(divergent.groupes).toHaveLength(2);
    // La preuve exigée est celle de la divergence, jamais celle de la similarité.
    expect(divergent.groupes.every((g) => g.issue === "refus")).toBe(true);
  });

  it("le cas ambigu reste consultable fiche par fiche malgré le repli", () => {
    const { groupes } = regrouper(deuxOffres(undefined));
    expect(groupes[0]!.issue).toBe("ambigu");
    // Les offres restent distinctes dans le groupe : le repli est un fait
    // d'affichage dans la liste, pas une fusion des données.
    expect(groupes[0]!.offres).toHaveLength(2);
  });

  it("un organisme opaque n'occupe jamais plus de lignes qu'un organisme transparent", () => {
    const quinzeOffresOpaques = Array.from({ length: 15 }, (_, i) =>
      offre({ nom: `Amazon Incubator — Niveau ${i % 9}` }),
    );
    const { groupes } = regrouper(quinzeOffresOpaques);
    expect(groupes).toHaveLength(1);
    expect(groupes[0]!.offres).toHaveLength(15);
  });
});
