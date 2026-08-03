import { describe, expect, it } from "vitest";
import type { ParcoursListe } from "@/donnees/requetes";
import { ETATS_PAR_DEFAUT } from "@/types/cursus";
import { auMoinsUnFiltre, compterAvec, correspond, filtrer, FILTRES_VIDES } from "./filtres";

const p = (partiel: Partial<ParcoursListe> = {}): ParcoursListe => ({
  id: "1",
  slug: "parcours",
  nom: "Formation Shopify",
  organismeNom: "Organisme",
  organismeCategorie: "formation_professionnelle",
  domaine: "creation_site",
  sujetPrincipal: "Shopify",
  competencesCouvertes: [],
  prixMin: null,
  prixMax: null,
  duree: null,
  volumeHoraire: null,
  formats: [],
  lieu: null,
  niveauEntree: null,
  eligibleCpf: null,
  financements: null,
  certification: null,
  codeRncpRs: null,
  dateVerification: null,
  etats: ETATS_PAR_DEFAUT,
  infosRenseignees: 0,
  infosApplicables: 18,
  statutRegroupement: "autonome",
  motifRegroupement: null,
  offresRepliees: 0,
  ...partiel,
});

describe("recherche plein texte", () => {
  it("cherche dans l'intitulé et l'organisme", () => {
    const parcours = p({ nom: "Licence pro E-commerce", organismeNom: "Université de Lille" });
    expect(correspond(parcours, { ...FILTRES_VIDES, recherche: "lille" })).toBe(true);
    expect(correspond(parcours, { ...FILTRES_VIDES, recherche: "licence" })).toBe(true);
  });

  it("exige que tous les termes correspondent", () => {
    const parcours = p({ nom: "Licence pro E-commerce", organismeNom: "Université de Lille" });
    expect(correspond(parcours, { ...FILTRES_VIDES, recherche: "licence lille" })).toBe(true);
    expect(correspond(parcours, { ...FILTRES_VIDES, recherche: "licence marseille" })).toBe(false);
  });

  it("cherche aussi dans le code RNCP", () => {
    const parcours = p({ codeRncpRs: "RNCP40509" });
    expect(correspond(parcours, { ...FILTRES_VIDES, recherche: "rncp40509" })).toBe(true);
  });
});

describe("le filtre principal est le sujet, pas la compétence", () => {
  const seoObjet = p({ nom: "Formation SEO", sujetPrincipal: "SEO e-commerce" });
  const seoAborde = p({
    nom: "Mastère marketing",
    sujetPrincipal: "Marketing digital généraliste",
    competencesCouvertes: ["SEO e-commerce", "Meta Ads"],
  });

  it("le filtre sujet ne remonte que les parcours dont c'est l'objet", () => {
    const resultat = filtrer([seoObjet, seoAborde], {
      ...FILTRES_VIDES,
      sujets: ["SEO e-commerce"],
    });
    expect(resultat).toHaveLength(1);
    expect(resultat[0]!.nom).toBe("Formation SEO");
  });

  it("le filtre compétence remonte ceux qui l'abordent", () => {
    const resultat = filtrer([seoObjet, seoAborde], {
      ...FILTRES_VIDES,
      competences: ["SEO e-commerce"],
    });
    expect(resultat).toHaveLength(1);
    expect(resultat[0]!.nom).toBe("Mastère marketing");
  });
});

describe("un filtre ne punit jamais une fiche incomplète", () => {
  it("garde une fiche sans prix publié sous un plafond de budget", () => {
    // Sinon, ne pas publier son prix deviendrait un moyen d'échapper au filtre.
    const sansPrix = p({ prixMin: null });
    expect(correspond(sansPrix, { ...FILTRES_VIDES, budget: 500 })).toBe(true);
  });

  it("écarte tout de même une fiche dont le prix publié dépasse le plafond", () => {
    expect(correspond(p({ prixMin: 2490 }), { ...FILTRES_VIDES, budget: 500 })).toBe(false);
    expect(correspond(p({ prixMin: 490 }), { ...FILTRES_VIDES, budget: 500 })).toBe(true);
  });

  it("ne confond pas un prix nul avec un prix absent sur le filtre gratuit", () => {
    expect(correspond(p({ prixMin: 0 }), { ...FILTRES_VIDES, gratuitSeulement: true })).toBe(true);
    expect(correspond(p({ prixMin: null }), { ...FILTRES_VIDES, gratuitSeulement: true })).toBe(
      false,
    );
  });

  it("n'assimile pas une éligibilité CPF inconnue à une non-éligibilité affirmée", () => {
    expect(correspond(p({ eligibleCpf: null }), { ...FILTRES_VIDES, eligibleCpf: true })).toBe(
      false,
    );
    expect(correspond(p({ eligibleCpf: true }), { ...FILTRES_VIDES, eligibleCpf: true })).toBe(true);
  });
});

describe("filtres multivalués", () => {
  it("le format correspond dès qu'une modalité correspond", () => {
    const mixte = p({ formats: ["presentiel", "alternance"] });
    expect(correspond(mixte, { ...FILTRES_VIDES, formats: ["alternance"] })).toBe(true);
    expect(correspond(mixte, { ...FILTRES_VIDES, formats: ["distanciel"] })).toBe(false);
  });

  it("combine les filtres en les cumulant", () => {
    const parcours = [
      p({ nom: "A", domaine: "referencement", organismeCategorie: "universite" }),
      p({ nom: "B", domaine: "referencement", organismeCategorie: "bootcamp" }),
    ];
    const resultat = filtrer(parcours, {
      ...FILTRES_VIDES,
      domaine: "referencement",
      categories: ["bootcamp"],
    });
    expect(resultat.map((x) => x.nom)).toEqual(["B"]);
  });
});

describe("décompte des options", () => {
  it("compte en gardant les autres filtres actifs", () => {
    const parcours = [
      p({ nom: "A", domaine: "referencement", organismeCategorie: "universite" }),
      p({ nom: "B", domaine: "referencement", organismeCategorie: "bootcamp" }),
      p({ nom: "C", domaine: "ecommerce", organismeCategorie: "bootcamp" }),
    ];
    const filtres = { ...FILTRES_VIDES, domaine: "referencement" as const };
    expect(compterAvec(parcours, filtres, { categories: ["bootcamp"] })).toBe(1);
    expect(compterAvec(parcours, filtres, { categories: ["universite"] })).toBe(1);
  });
});

describe("état des filtres", () => {
  it("détecte l'absence de filtre actif", () => {
    expect(auMoinsUnFiltre(FILTRES_VIDES)).toBe(false);
  });

  it("ignore une recherche réduite à des espaces", () => {
    expect(auMoinsUnFiltre({ ...FILTRES_VIDES, recherche: "   " })).toBe(false);
  });

  it("détecte chaque filtre actif", () => {
    expect(auMoinsUnFiltre({ ...FILTRES_VIDES, domaine: "ecommerce" })).toBe(true);
    expect(auMoinsUnFiltre({ ...FILTRES_VIDES, budget: 1000 })).toBe(true);
    expect(auMoinsUnFiltre({ ...FILTRES_VIDES, eligibleCpf: true })).toBe(true);
  });
});
