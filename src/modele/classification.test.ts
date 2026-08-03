import { describe, expect, it } from "vitest";
import {
  classifier,
  detecterCompetences,
  determinerDomaine,
  determinerSujetPrincipal,
  type EntreeClassification,
} from "./classification";

const offre = (partiel: Partial<EntreeClassification> = {}): EntreeClassification => ({
  nom: "Parcours sans vocabulaire reconnaissable",
  organisme: "Organisme Neutre",
  categorie: "formation_professionnelle",
  ...partiel,
});

describe("détection des compétences", () => {
  it("ne retient que ce qui est publié", () => {
    const sans = detecterCompetences(offre({ nom: "Programme d'accompagnement" }));
    expect(sans).toEqual([]);
  });

  it("lit l'intitulé, les outils et les modules", () => {
    const competences = detecterCompetences(
      offre({
        nom: "Formation Shopify",
        outils: ["Klaviyo"],
        modules: ["Expédition et gestion des stocks"],
      }),
    );
    expect(competences).toContain("Shopify");
    expect(competences).toContain("Klaviyo");
    expect(competences).toContain("Logistique");
  });

  it("n'invente aucune compétence à partir d'un programme absent", () => {
    const avecProgramme = detecterCompetences(
      offre({ nom: "Vendre en ligne", modules: ["Publicité Meta", "Google Ads"] }),
    );
    const sansProgramme = detecterCompetences(offre({ nom: "Vendre en ligne" }));
    expect(avecProgramme.length).toBeGreaterThan(0);
    expect(sansProgramme).toEqual([]);
  });
});

describe("détermination du domaine", () => {
  it("1. reconnaît un motif dans l'intitulé", () => {
    const resultat = determinerDomaine(offre({ nom: "Formation SEO avancée" }));
    expect(resultat.domaine).toBe("referencement");
  });

  it("2. se rabat sur l'intitulé + le nom de l'organisme", () => {
    const resultat = determinerDomaine(
      offre({ nom: "Programme complet", organisme: "Academy Amazon FBA" }),
    );
    expect(resultat.domaine).toBe("marketplaces");
  });

  it("3. se rabat sur un module publié", () => {
    const resultat = determinerDomaine(
      offre({ nom: "Programme complet", modules: ["Mesure et analytics", "GA4"] }),
    );
    expect(resultat.domaine).toBe("data_conversion");
  });

  it("4. applique le défaut « Commerce et vente » aux universités et aux écoles", () => {
    expect(determinerDomaine(offre({ categorie: "universite" })).domaine).toBe("commerce_vente");
    expect(determinerDomaine(offre({ categorie: "ecole" })).domaine).toBe("commerce_vente");
  });

  it("4. applique le défaut « Marketing digital » aux autres catégories", () => {
    expect(determinerDomaine(offre({ categorie: "bootcamp" })).domaine).toBe("marketing_digital");
    expect(determinerDomaine(offre({ categorie: "formation_independante" })).domaine).toBe(
      "marketing_digital",
    );
  });

  it("respecte l'ordre de priorité : l'intitulé prime sur le module", () => {
    const resultat = determinerDomaine(
      offre({ nom: "Formation SEO", modules: ["Publicité Meta Ads"] }),
    );
    expect(resultat.domaine).toBe("referencement");
  });

  it("trace l'écart quand la déclaration manuelle contredit la règle", () => {
    const resultat = determinerDomaine(
      offre({ nom: "Système Sphère", domaineDeclare: "ecommerce" }),
    );
    expect(resultat.domaine).toBe("ecommerce");
    expect(resultat.domaineAutomatique).toBe("marketing_digital");
    expect(resultat.ecart).toBe(true);
  });

  it("ne signale aucun écart quand la déclaration confirme la règle", () => {
    const resultat = determinerDomaine(
      offre({ nom: "Formation SEO", domaineDeclare: "referencement" }),
    );
    expect(resultat.ecart).toBe(false);
  });
});

describe("détermination du sujet principal", () => {
  it("1. retient la compétence citée dans l'intitulé", () => {
    const entree = offre({ nom: "Formation Shopify complète", modules: ["Publicité Meta Ads"] });
    const resultat = determinerSujetPrincipal(entree, detecterCompetences(entree), "creation_site");
    expect(resultat.sujetPrincipal).toBe("Shopify");
    expect(resultat.regleAppliquee).toBe("intitule");
  });

  it("2. retient une compétence présente dans au moins 40 % des modules", () => {
    const entree = offre({
      nom: "Parcours vendeur en ligne",
      modules: [
        "Prise en main de Shopify",
        "Thèmes Shopify",
        "Applications Shopify",
        "Fiches produits",
        "Service client",
      ],
    });
    const resultat = determinerSujetPrincipal(entree, detecterCompetences(entree), "ecommerce");
    expect(resultat.sujetPrincipal).toBe("Shopify");
    expect(resultat.regleAppliquee).toBe("modules");
  });

  it("2. écarte une compétence sous le seuil — sept modules dont deux sur le SEO ne font pas une formation SEO", () => {
    const entree = offre({
      nom: "Parcours vendeur en ligne",
      modules: [
        "Bases du référencement",
        "Search Console",
        "Fiches produits",
        "Service client",
        "Expédition",
        "Facturation",
        "Relation fournisseur",
      ],
    });
    const resultat = determinerSujetPrincipal(entree, detecterCompetences(entree), "ecommerce");
    // 2 modules sur 7 = 28 % : au-dessus de l'ancien seuil de 25 %, sous celui de 40 %.
    expect(resultat.sujetPrincipal).toBe("E-commerce généraliste");
    expect(resultat.regleAppliquee).toBe("generaliste");
  });

  it("3. retient un outil, mais seulement si aucun programme n'est publié", () => {
    const entree = offre({ nom: "Parcours vendeur en ligne", outils: ["Klaviyo"] });
    const resultat = determinerSujetPrincipal(entree, detecterCompetences(entree), "ecommerce");
    expect(resultat.sujetPrincipal).toBe("Klaviyo");
    expect(resultat.regleAppliquee).toBe("outils");
  });

  it("3. ignore les outils dès qu'un programme est publié", () => {
    const entree = offre({
      nom: "Parcours vendeur en ligne",
      outils: ["Klaviyo"],
      modules: ["Service client", "Facturation", "Expédition"],
    });
    const resultat = determinerSujetPrincipal(entree, detecterCompetences(entree), "ecommerce");
    expect(resultat.sujetPrincipal).toBe("E-commerce généraliste");
  });

  it("4. retombe sur le sujet généraliste du domaine", () => {
    const entree = offre({ nom: "Mastère management" });
    const resultat = determinerSujetPrincipal(entree, [], "commerce_vente");
    expect(resultat.sujetPrincipal).toBe("Commerce et vente");
    expect(resultat.regleAppliquee).toBe("generaliste");
  });

  it("attribue toujours un sujet principal, y compris sans aucune information", () => {
    for (const categorie of ["universite", "bootcamp", "mooc_plateforme"] as const) {
      const resultat = classifier(offre({ categorie }));
      expect(resultat.sujetPrincipal).toBeTruthy();
    }
  });

  it("exclut le sujet principal des compétences couvertes", () => {
    const entree = offre({
      nom: "Formation Shopify",
      modules: ["Publicité Meta Ads", "Expédition et stocks"],
    });
    const resultat = classifier(entree);
    expect(resultat.sujetPrincipal).toBe("Shopify");
    expect(resultat.competencesCouvertes).not.toContain("Shopify");
    expect(resultat.competencesCouvertes).toContain("Meta Ads");
  });
});
