import { describe, expect, it } from "vitest";
import type { ParcoursListe } from "@/donnees/requetes";
import { ETATS_PAR_DEFAUT } from "@/types/cursus";
import {
  auMoinsUnFiltre,
  BUDGET_PLAFOND,
  compterAvec,
  compterDansPlage,
  compterEcartesFauteInformation,
  compterPrixInconnu,
  correspond,
  filtrer,
  FILTRES_VIDES,
  libelleBudget,
  normaliserBudget,
  TRANCHES_BUDGET,
  trancheDe,
} from "./filtres";

const p = (partiel: Partial<ParcoursListe> = {}): ParcoursListe => ({
  id: "1",
  slug: "parcours",
  nom: "Formation Shopify",
  organismeNom: "Organisme",
  organismeCategorie: "formation_professionnelle",
  sourceInformation: null,
  organismeSite: null,
  organismeCertifications: [],
  domaine: "creation_site",
  sujetPrincipal: "Shopify",
  competencesCouvertes: [],
  prixMin: null,
  prixMax: null,
  unitePrix: null,
  prixNiveau: null,
  modaliteAcces: null,
  dispoInter: null,
  dispoIntra: null,
  prixIntra: null,
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
    expect(correspond(sansPrix, { ...FILTRES_VIDES, budgetMax: 500 })).toBe(true);
  });

  it("écarte tout de même une fiche dont le prix publié dépasse le plafond", () => {
    expect(correspond(p({ prixMin: 2490 }), { ...FILTRES_VIDES, budgetMax: 500 })).toBe(false);
    expect(correspond(p({ prixMin: 490 }), { ...FILTRES_VIDES, budgetMax: 500 })).toBe(true);
  });

  it("ne fait remonter aucune fiche dont la gratuité n'est pas qualifiée", () => {
    // Une gratuité non vérifiée n'est pas une gratuité : elle ne remonte ni
    // dans « sans frais », ni dans « accès partiel ».
    const nonQualifie = p({ prixMin: 0, modaliteAcces: null });
    expect(correspond(nonQualifie, { ...FILTRES_VIDES, sansFrais: true })).toBe(false);
    expect(correspond(nonQualifie, { ...FILTRES_VIDES, accesPartiel: true })).toBe(false);
  });

  it("sépare « sans frais » de « accès partiel gratuit »", () => {
    const libre = p({ prixMin: 0, modaliteAcces: "libre" });
    const priseEnCharge = p({ prixMin: null, modaliteAcces: "pris_en_charge" });
    const freemium = p({ prixMin: null, modaliteAcces: "freemium" });
    const certificat = p({ prixMin: 0, modaliteAcces: "certificat_payant" });

    expect(correspond(libre, { ...FILTRES_VIDES, sansFrais: true })).toBe(true);
    expect(correspond(priseEnCharge, { ...FILTRES_VIDES, sansFrais: true })).toBe(true);
    expect(correspond(freemium, { ...FILTRES_VIDES, sansFrais: true })).toBe(false);
    expect(correspond(certificat, { ...FILTRES_VIDES, sansFrais: true })).toBe(false);

    expect(correspond(freemium, { ...FILTRES_VIDES, accesPartiel: true })).toBe(true);
    expect(correspond(certificat, { ...FILTRES_VIDES, accesPartiel: true })).toBe(true);
    expect(correspond(libre, { ...FILTRES_VIDES, accesPartiel: true })).toBe(false);
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
    expect(auMoinsUnFiltre({ ...FILTRES_VIDES, budgetMax: 1000 })).toBe(true);
    expect(auMoinsUnFiltre({ ...FILTRES_VIDES, budgetMin: 1000 })).toBe(true);
    // Seule, la case ne filtre rien : elle modifie une plage, elle n'en est pas une.
    expect(auMoinsUnFiltre({ ...FILTRES_VIDES, inclurePrixInconnu: false })).toBe(false);
    expect(auMoinsUnFiltre({ ...FILTRES_VIDES, eligibleCpf: true })).toBe(true);
  });
});

describe("filtres restaurés et nouveaux", () => {
  it("filtre sur le financement par l'entreprise", () => {
    const opco = p({ financements: ["OPCO", "CPF"] });
    const sans = p({ financements: ["Paiement comptant"] });
    expect(correspond(opco, { ...FILTRES_VIDES, financementEntreprise: true })).toBe(true);
    expect(correspond(sans, { ...FILTRES_VIDES, financementEntreprise: true })).toBe(false);
  });

  it("filtre sur le prix effectivement publié", () => {
    expect(correspond(p({ prixMin: 490 }), { ...FILTRES_VIDES, prixCommunique: true })).toBe(true);
    expect(correspond(p({ prixMin: null }), { ...FILTRES_VIDES, prixCommunique: true })).toBe(
      false,
    );
  });

  it("range les volumes horaires dans les bonnes tranches", () => {
    expect(trancheDe(null)).toBe("non_communique");
    expect(trancheDe(12)).toBe("moins_20h");
    expect(trancheDe(20)).toBe("de_20_a_100h");
    expect(trancheDe(100)).toBe("de_20_a_100h");
    expect(trancheDe(450)).toBe("de_100_a_500h");
    expect(trancheDe(900)).toBe("plus_500h");
  });

  it("rend la tranche « non communiqué » sélectionnable", () => {
    // Une fiche sans volume publié doit pouvoir être cherchée, pas seulement
    // subie : c'est un état légitime du catalogue.
    const sansVolume = p({ volumeHoraire: null });
    expect(correspond(sansVolume, { ...FILTRES_VIDES, durees: ["non_communique"] })).toBe(true);
    expect(correspond(sansVolume, { ...FILTRES_VIDES, durees: ["moins_20h"] })).toBe(false);
  });
});

describe("un filtre n'efface jamais silencieusement les fiches sans information", () => {
  it("compte les fiches écartées faute d'information publiée", () => {
    const parcours = [
      p({ nom: "Éligible", eligibleCpf: true }),
      p({ nom: "Non éligible", eligibleCpf: false }),
      p({ nom: "Inconnu", eligibleCpf: null }),
    ];
    const filtres = { ...FILTRES_VIDES, eligibleCpf: true };
    expect(filtrer(parcours, filtres)).toHaveLength(1);
    // « Non éligible » est écarté sur un fait ; « Inconnu » sur un silence.
    expect(compterEcartesFauteInformation(parcours, filtres)).toBe(1);
  });

  it("ne compte pas une fiche qui serait écartée de toute façon", () => {
    // Elle échoue aussi sur le domaine : ce n'est pas le silence de
    // l'organisme qui l'exclut.
    const parcours = [p({ nom: "Autre domaine", domaine: "referencement", eligibleCpf: null })];
    const filtres = { ...FILTRES_VIDES, eligibleCpf: true, domaine: "ecommerce" as const };
    expect(compterEcartesFauteInformation(parcours, filtres)).toBe(0);
  });

  it("ne compte rien quand aucun filtre silencieux n'est actif", () => {
    const parcours = [p({ eligibleCpf: null })];
    expect(compterEcartesFauteInformation(parcours, FILTRES_VIDES)).toBe(0);
  });
});

describe("plage de budget", () => {
  it("retient une borne basse et une borne haute, incluses toutes les deux", () => {
    const filtres = { ...FILTRES_VIDES, budgetMin: 500, budgetMax: 2500 };
    expect(correspond(p({ prixMin: 500 }), filtres)).toBe(true);
    expect(correspond(p({ prixMin: 2500 }), filtres)).toBe(true);
    expect(correspond(p({ prixMin: 499 }), filtres)).toBe(false);
    expect(correspond(p({ prixMin: 2501 }), filtres)).toBe(false);
  });

  it("laisse chaque borne facultative", () => {
    // « à » seul redonne le plafond d'avant, « de » seul donne un plancher.
    expect(correspond(p({ prixMin: 3000 }), { ...FILTRES_VIDES, budgetMax: 2500 })).toBe(false);
    expect(correspond(p({ prixMin: 3000 }), { ...FILTRES_VIDES, budgetMin: 2500 })).toBe(true);
    expect(correspond(p({ prixMin: 100 }), { ...FILTRES_VIDES, budgetMin: 2500 })).toBe(false);
  });

  it("fait entrer un parcours à zéro dans toute plage contenant zéro", () => {
    // Un alternant ne débourse rien : sa fiche appartient à « moins de 500 € ».
    const alternance = p({ prixMin: 0, formats: ["alternance"] });
    expect(correspond(alternance, { ...FILTRES_VIDES, budgetMin: 0, budgetMax: 500 })).toBe(true);
    expect(correspond(alternance, { ...FILTRES_VIDES, budgetMin: 0, budgetMax: 0 })).toBe(true);
    expect(correspond(alternance, { ...FILTRES_VIDES, budgetMin: 500, budgetMax: 2500 })).toBe(
      false,
    );
  });

  it("traite un parcours en intra seul comme un prix inconnu, jamais comme un prix élevé", () => {
    // Son tarif est celui du groupe : le filtrer dessus ferait renoncer sur un
    // chiffre qui ne concerne pas l'acheteur.
    const intra = p({ prixMin: 8000, dispoInter: false, dispoIntra: true });
    expect(correspond(intra, { ...FILTRES_VIDES, budgetMax: 500 })).toBe(true);
    expect(
      correspond(intra, { ...FILTRES_VIDES, budgetMax: 500, inclurePrixInconnu: false }),
    ).toBe(false);
  });

  it("n'écarte les prix inconnus que si la case est décochée", () => {
    const sansPrix = p({ prixMin: null });
    expect(correspond(sansPrix, { ...FILTRES_VIDES, budgetMax: 500 })).toBe(true);
    expect(
      correspond(sansPrix, { ...FILTRES_VIDES, budgetMax: 500, inclurePrixInconnu: false }),
    ).toBe(false);
    // Hors plage, la case ne retire rien : elle modifie une plage.
    expect(correspond(sansPrix, { ...FILTRES_VIDES, inclurePrixInconnu: false })).toBe(true);
  });

  it("intervertit silencieusement deux bornes inversées", () => {
    expect(normaliserBudget(2500, 500)).toEqual({ budgetMin: 500, budgetMax: 2500 });
  });

  it("refuse une valeur négative et plafonne à 50 000 €", () => {
    expect(normaliserBudget(-100, null)).toEqual({ budgetMin: null, budgetMax: null });
    expect(normaliserBudget(null, 999_999)).toEqual({
      budgetMin: null,
      budgetMax: BUDGET_PLAFOND,
    });
    expect(BUDGET_PLAFOND).toBe(50_000);
  });

  it("compte séparément la fourchette et les prix inconnus", () => {
    const parcours = [
      p({ id: "a", prixMin: 300 }),
      p({ id: "b", prixMin: 800 }),
      p({ id: "c", prixMin: null }),
      p({ id: "d", prixMin: 9000, dispoInter: false, dispoIntra: true }),
    ];
    const filtres = { ...FILTRES_VIDES, budgetMax: 500 };
    expect(compterDansPlage(parcours, filtres)).toBe(1);
    // Le prix absent et l'intra seul, pas la fiche à 800 € qui, elle, est hors plage.
    expect(compterPrixInconnu(parcours, filtres)).toBe(2);
    // Le décompte ne dépend pas de l'état de la case qu'il sert à expliquer.
    expect(compterPrixInconnu(parcours, { ...filtres, inclurePrixInconnu: false })).toBe(2);
  });

  it("ne compte aucun prix inconnu hors plage posée", () => {
    expect(compterPrixInconnu([p({ prixMin: null })], FILTRES_VIDES)).toBe(0);
  });

  it("n'énonce une plage que lorsqu'une borne est posée", () => {
    expect(libelleBudget(null, null)).toBeNull();
    // Espace FINE INSÉCABLE (U+202F) : le séparateur de `formaterNombre`, et
    // non celui de `toLocaleString`, qui varie d'un moteur à l'autre.
    expect(libelleBudget(500, 2500)).toBe("500 € – 2 500 €");
    expect(libelleBudget(null, 2500)).toBe("Jusqu'à 2 500 €");
    expect(libelleBudget(500, null)).toBe("À partir de 500 €");
  });

  it("aligne ses tranches sur le vocabulaire de l'assistant", () => {
    // Deux découpages concurrents du même axe feraient dire deux choses
    // différentes au même produit.
    expect(TRANCHES_BUDGET.map((t) => t.cle)).toEqual([
      "zero",
      "moins_500",
      "de_500_a_2500",
      "plus_2500",
    ]);
  });
});
