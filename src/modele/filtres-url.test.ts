import { describe, expect, it } from "vitest";
import {
  adresseFiltre,
  depuisParametres,
  memesFiltres,
  normaliserParametres,
  porteUnFiltre,
  versParametres,
} from "./filtres-url";
import { auMoinsUnFiltre, FILTRES_VIDES, type Filtres } from "./filtres";
import { PLAN_PAGES, pageIndexable, pagePlanifiee } from "./plan-pages";
import { SUJETS_OUTILS, SUJET_GENERALISTE } from "./vocabulaires";

const complet: Filtres = {
  ...FILTRES_VIDES,
  recherche: "shopify",
  organisme: "Université de Lille",
  domaine: "ecommerce",
  sujets: ["Shopify", "SEO e-commerce"],
  competences: ["Meta Ads"],
  categories: ["universite", "bootcamp"],
  formats: ["distanciel"],
  niveaux: ["bac2"],
  durees: ["de_20_a_100h"],
  conditionsAcces: ["sans_condition"],
  budgetMin: 500,
  budgetMax: 2500,
  inclurePrixInconnu: false,
  eligibleCpf: true,
  certifiantSeulement: true,
  sansFrais: true,
  accesPartiel: true,
  financementEntreprise: true,
  prixCommunique: true,
  accessibleIndividuellement: true,
};

describe("aller-retour entre filtres et adresse", () => {
  it("restitue à l'identique un état complet", () => {
    // Le contrat public : une adresse partagée doit rouvrir la même liste.
    expect(depuisParametres(versParametres(complet))).toEqual(complet);
  });

  it("n'écrit dans l'adresse que ce qui s'écarte du défaut", () => {
    expect(versParametres(FILTRES_VIDES)).toEqual({});
    expect(versParametres({ ...FILTRES_VIDES, eligibleCpf: true })).toEqual({ cpf: "1" });
  });

  it("n'écrit l'inclusion des prix inconnus que lorsqu'elle est refusée", () => {
    // Cochée par défaut : l'adresse ne porte que le refus explicite.
    expect(versParametres({ ...FILTRES_VIDES, inclurePrixInconnu: true })).toEqual({});
    expect(versParametres({ ...FILTRES_VIDES, inclurePrixInconnu: false })).toEqual({
      prixInconnu: "0",
    });
  });

  it("lit une adresse vide comme l'absence de filtre", () => {
    expect(depuisParametres({})).toEqual(FILTRES_VIDES);
    expect(auMoinsUnFiltre(depuisParametres({}))).toBe(false);
    expect(porteUnFiltre({})).toBe(false);
  });
});

describe("une valeur inventée ne produit pas une liste vide", () => {
  it("ignore une valeur hors vocabulaire fermé", () => {
    const lus = depuisParametres({
      domaine: "inexistant",
      categorie: "licorne,universite",
      format: "teleportation",
      niveau: "bac42",
      duree: "un_siecle",
      condition: "magie",
    });
    expect(lus.domaine).toBeNull();
    expect(lus.categories).toEqual(["universite"]);
    expect(lus.formats).toEqual([]);
    expect(lus.niveaux).toEqual([]);
    expect(lus.durees).toEqual([]);
    expect(lus.conditionsAcces).toEqual([]);
  });

  it("garde en revanche un sujet inconnu", () => {
    /*
      Sujets et organismes viennent du catalogue, qui bouge : une valeur
      inconnue a pu exister hier et partir avec une fiche. Zéro résultat est
      alors la réponse juste, là où l'ignorer afficherait le catalogue entier
      sous une adresse qui promet autre chose.
    */
    expect(depuisParametres({ sujet: "Sujet disparu" }).sujets).toEqual(["Sujet disparu"]);
  });

  it("refuse un budget négatif et intervertit deux bornes inversées", () => {
    expect(depuisParametres({ budgetMin: "-100" }).budgetMin).toBeNull();
    const inverse = depuisParametres({ budgetMin: "2500", budgetMax: "500" });
    expect([inverse.budgetMin, inverse.budgetMax]).toEqual([500, 2500]);
  });

  it("dédoublonne une liste répétée", () => {
    expect(depuisParametres({ format: "distanciel,distanciel" }).formats).toEqual(["distanciel"]);
  });
});

describe("normalisation", () => {
  it("produit la même adresse pour deux écritures du même état", () => {
    const a = normaliserParametres({ format: "distanciel,inconnu", cpf: "1", vide: "" });
    const b = normaliserParametres({ cpf: "1", format: "distanciel" });
    expect(memesFiltres(a, b)).toBe(true);
    expect(a).toEqual(b);
  });

  it("écrit les paramètres dans un ordre stable", () => {
    // Un canonique auto-référent doit être la même chaîne à chaque rendu.
    const params = versParametres(complet);
    expect(adresseFiltre(params)).toBe(adresseFiltre(params));
    expect(adresseFiltre({})).toBe("/catalogue");
    expect(adresseFiltre({ cpf: "1" }, "https://formlist.fr")).toBe(
      "https://formlist.fr/catalogue?cpf=1",
    );
  });

  it("encode les valeurs qui contiennent un espace", () => {
    expect(adresseFiltre({ sujet: "SEO e-commerce" })).toBe("/catalogue?sujet=SEO%20e-commerce");
  });
});

describe("plan de pages", () => {
  it("ne reconnaît un croisement qu'à l'identique", () => {
    /*
      Sans quoi tout filtre ajouté à une page planifiée hériterait de son
      indexabilité, et le plan cesserait d'être un plan.
    */
    expect(pagePlanifiee({ cpf: "1" })).toBeDefined();
    expect(pagePlanifiee({ cpf: "1", format: "distanciel" })).toBeUndefined();
    expect(pagePlanifiee({})).toBeUndefined();
  });

  it("N'INDEXE AUCUNE ADRESSE À PARAMÈTRES, planifiée ou non", () => {
    /*
      La règle a changé de nature avec les pages de croisement : un croisement
      s'indexe maintenant à son adresse lisible — `/formations/shopify-cpf` —
      et l'adresse à paramètres qui sert le même contenu redevient `noindex`
      sans exception.

      Deux adresses pour un contenu, c'est un doublon ; et le doublon serait
      d'autant plus coûteux ici qu'il opposerait deux pages à nous.
    */
    expect(pageIndexable()).toBe(false);
  });

  it("décrit chaque page du plan par des paramètres déjà normalisés", () => {
    // Sinon `pagePlanifiee` ne retrouverait jamais sa propre entrée.
    for (const page of PLAN_PAGES) {
      expect(normaliserParametres(page.parametres), page.titre).toEqual(page.parametres);
    }
  });

  it("ne planifie que des sujets qui existent dans le vocabulaire", () => {
    /*
      Un sujet mal orthographié produirait une page planifiée, indexable dès
      qu'elle franchirait un seuil qu'elle ne franchira jamais — donc une entrée
      morte au plan, invisible et silencieuse. Les sujets sont un vocabulaire
      fermé côté modèle : c'est vérifiable.
    */
    const connus = new Set([...SUJETS_OUTILS, ...Object.values(SUJET_GENERALISTE)]);
    for (const page of PLAN_PAGES) {
      for (const sujet of (page.parametres.sujet ?? "").split(",").filter((v) => v !== "")) {
        expect(connus.has(sujet), `sujet inconnu au plan : « ${sujet} »`).toBe(true);
      }
    }
  });

  it("n'a ni croisement en double ni intitulé vide", () => {
    const adresses = PLAN_PAGES.map((p) => adresseFiltre(p.parametres));
    expect(new Set(adresses).size).toBe(adresses.length);
    for (const page of PLAN_PAGES) {
      expect(page.intitule.length).toBeGreaterThan(0);
      expect(page.titre).toContain("Formlist");
    }
  });
});
