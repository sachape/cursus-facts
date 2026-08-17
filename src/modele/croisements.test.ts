import { describe, expect, it } from "vitest";
import type { ParcoursListe } from "@/donnees/requetes";
import { ETATS_PAR_DEFAUT } from "@/types/cursus";
import {
  aUnPrix,
  chiffres,
  croisementParSlug,
  croisements,
  description,
  introduction,
  SEUIL_PARCOURS,
  SEUIL_PRIX,
  titre,
  voisins,
} from "./croisements";
import { filtrer } from "./filtres";
import { formaterNombre } from "./nombres";

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

/** Un lot de `n` parcours dont `avecPrix` portent un montant. */
function lot(n: number, avecPrix: number, base: Partial<ParcoursListe>): ParcoursListe[] {
  return Array.from({ length: n }, (_, i) =>
    p({
      ...base,
      id: `${base.sujetPrincipal ?? "x"}-${base.formats?.[0] ?? "y"}-${i}`,
      slug: `${base.sujetPrincipal ?? "x"}-${i}`,
      nom: `Formation ${i}`,
      organismeNom: `Organisme ${i}`,
      prixMin: i < avecPrix ? 1000 + i * 100 : null,
    }),
  );
}

describe("le seuil décide de l'EXISTENCE de la page", () => {
  it("AUCUNE PAGE GÉNÉRÉE NE DESCEND SOUS LE SEUIL", () => {
    /*
      LE CONTRÔLE CENTRAL DU CHANTIER. Une page de croisement sous le seuil
      n'est pas une page pauvre à corriger plus tard : c'est une page qui
      n'apprend rien qu'un filtre posé à la main n'apprendrait, et qui affiche
      une fourchette de prix calculée sur un ou deux montants.

      Le contrôle porte sur TOUTES les combinaisons rendues, pas sur un
      échantillon : c'est la seule forme qui résiste à l'ajout d'un critère.
    */
    const catalogue = [
      ...lot(9, 5, { sujetPrincipal: "Shopify", formats: ["distanciel"], eligibleCpf: true }),
      ...lot(4, 4, { sujetPrincipal: "Amazon FBA", formats: ["presentiel"] }),
      ...lot(7, 2, { sujetPrincipal: "PrestaShop", formats: ["alternance"] }),
    ];

    const tous = croisements(catalogue);
    expect(tous.length).toBeGreaterThan(0);

    for (const c of tous) {
      const resultats = filtrer(catalogue, c.filtres);
      expect(resultats.length, c.slug).toBeGreaterThanOrEqual(SEUIL_PARCOURS);
      expect(resultats.filter(aUnPrix).length, c.slug).toBeGreaterThanOrEqual(SEUIL_PRIX);
    }
  });

  it("refuse une combinaison assez fournie mais trop peu chiffrée", () => {
    // Sept parcours, deux prix : la liste tiendrait, la fourchette mentirait.
    const catalogue = lot(7, 2, { sujetPrincipal: "PrestaShop", formats: ["alternance"] });
    expect(croisements(catalogue).map((c) => c.slug)).toEqual([]);
  });

  it("ne sert pas une adresse dont la combinaison est retombée", () => {
    const fourni = lot(6, 4, { sujetPrincipal: "Shopify", formats: ["distanciel"] });
    const slug = croisements(fourni).find((c) => c.slug.endsWith("-a-distance"))!.slug;
    expect(croisementParSlug(fourni, slug)).toBeDefined();

    // Deux fiches sortent du catalogue : la page cesse d'exister, sans qu'aucune
    // liste n'ait été mise à jour.
    expect(croisementParSlug(fourni.slice(0, 4), slug)).toBeUndefined();
  });

  it("ne croise jamais un sujet générique, qui passe par son domaine", () => {
    /*
      « E-commerce généraliste à distance » et « E-commerce à distance »
      désigneraient la même liste. Le doublon serait invisible à l'œil : les
      deux pages ont l'air légitimes prises séparément.
    */
    const catalogue = lot(9, 6, {
      sujetPrincipal: "E-commerce généraliste",
      domaine: "ecommerce",
      formats: ["distanciel"],
    });
    const slugs = croisements(catalogue).map((c) => c.slug);
    expect(slugs).toContain("ecommerce-a-distance");
    expect(slugs.filter((s) => s.startsWith("e-commerce-generaliste"))).toEqual([]);
  });
});

describe("les textes sont écrits par la donnée", () => {
  const catalogue = [
    ...lot(8, 6, {
      sujetPrincipal: "Shopify",
      domaine: "creation_site",
      formats: ["distanciel"],
      codeRncpRs: "RS1234",
    }),
    ...lot(6, 5, { sujetPrincipal: "Shopify", domaine: "creation_site", formats: ["presentiel"] }),
  ];

  it("DEUX PAGES VOISINES ÉCRIVENT DEUX INTRODUCTIONS DISTINCTES", () => {
    /*
      L'exigence des fiches de licences pro, transposée : quarante pages dont
      seul le titre change ne sont pas quarante pages, et c'est exactement ce
      que le motif « page en double » sanctionne.

      Le contrôle porte sur les pages VOISINES — celles qui partagent un axe et
      se ressemblent donc le plus. Si deux pages arbitraires diffèrent, cela ne
      prouve rien ; si les deux plus proches diffèrent, la famille entière tient.
    */
    const tous = croisements(catalogue);
    const distanciel = tous.find((c) => c.slug === "shopify-a-distance")!;
    const presentiel = tous.find((c) => c.slug === "shopify-presentiel")!;

    const texte = (c: typeof distanciel) =>
      introduction(c, chiffres(filtrer(catalogue, c.filtres)));

    expect(texte(distanciel)).not.toBe(texte(presentiel));
    // Et pas seulement par le critère glissé dans la première phrase : les
    // chiffres eux-mêmes diffèrent, sinon le texte serait un gabarit.
    expect(texte(distanciel)).toContain("8 formations");
    expect(texte(presentiel)).toContain("6 formations");
  });

  it("écrit trois à quatre phrases, jamais un gabarit vide", () => {
    const c = croisements(catalogue).find((x) => x.slug === "shopify-a-distance")!;
    const texte = introduction(c, chiffres(filtrer(catalogue, c.filtres)));
    const phrases = texte.split(". ").filter((x) => x.trim() !== "");
    expect(phrases.length).toBeGreaterThanOrEqual(3);
    expect(phrases.length).toBeLessThanOrEqual(4);
  });

  it("n'écrit aucun chiffre qui ne vienne de la liste", () => {
    /*
      Le même parcours retiré doit changer le titre. Sans ce contrôle, un
      « 12 formations » finirait écrit en dur le jour où quelqu'un trouve le
      calcul verbeux — et la page mentirait sans jamais échouer.
    */
    const c = croisements(catalogue).find((x) => x.slug === "shopify-a-distance")!;
    const complet = filtrer(catalogue, c.filtres);
    expect(titre(c, chiffres(complet))).toContain("8 formations");
    expect(titre(c, chiffres(complet.slice(0, 7)))).toContain("7 formations");
  });

  it("annonce une fourchette prise dans les montants relevés", () => {
    const c = croisements(catalogue).find((x) => x.slug === "shopify-a-distance")!;
    const ch = chiffres(filtrer(catalogue, c.filtres));
    expect(ch.prixMin).toBe(1000);
    expect(ch.prixMax).toBe(1500);
    /* Comparé au séparateur PRODUIT par `formaterNombre`, jamais à un espace
       tapé à la main : celui de `Intl` est une espace fine insécable, et
       l'assertion échouerait sur un texte pourtant juste. */
    expect(description(c, ch)).toContain(`De ${formaterNombre(1000)} à ${formaterNombre(1500)} €`);
  });

  it("dit l'absence de certification plutôt que de la taire", () => {
    // Une page qui ne parle des codes RNCP que lorsqu'il y en a laisse croire
    // que la question ne se pose pas — alors que c'est la condition d'un
    // financement.
    const sans = lot(6, 5, { sujetPrincipal: "Shopify", formats: ["alternance"] });
    const c = croisements(sans).find((x) => x.slug === "shopify-alternance")!;
    expect(introduction(c, chiffres(filtrer(sans, c.filtres)))).toContain("Aucun");
  });
});

describe("maillage", () => {
  it("propose des voisins qui partagent un axe, jamais des pages sans rapport", () => {
    const catalogue = [
      ...lot(8, 6, { sujetPrincipal: "Shopify", domaine: "creation_site", formats: ["distanciel"] }),
      ...lot(6, 5, { sujetPrincipal: "Shopify", domaine: "creation_site", formats: ["presentiel"] }),
      ...lot(7, 5, { sujetPrincipal: "Amazon FBA", domaine: "marketplaces", formats: ["distanciel"] }),
    ];
    const tous = croisements(catalogue);
    const courant = tous.find((c) => c.slug === "shopify-a-distance")!;
    const proches = voisins(tous, courant);

    expect(proches.length).toBeGreaterThan(0);
    expect(proches.map((v) => v.slug)).not.toContain(courant.slug);
    for (const v of proches) {
      const partage =
        v.axeLibelle === courant.axeLibelle || v.critereLibelle === courant.critereLibelle;
      expect(partage, v.slug).toBe(true);
    }
  });
});
