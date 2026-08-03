/**
 * Parité avec le prototype.
 *
 * Le prototype `cursus-comparateur.html` sert de spécification exécutable. Ce
 * test verrouille le portage : toute divergence sur les 195 parcours est une
 * régression de règle, pas un détail d'implémentation.
 *
 * Les corrections identifiées par le brief — troisième état, dénominateur par
 * fiche — sont volontairement HORS de ce fichier. Elles seront introduites
 * ailleurs, une par une, pour que ce test continue de mesurer ce qu'il mesure :
 * l'écart entre le prototype et son portage, et rien d'autre.
 */
import { describe, expect, it } from "vitest";
import { chargerCatalogue } from "@/donnees/catalogue";
import { LIBELLES_DOMAINES } from "./vocabulaires";
import { classifier } from "./classification";
import { regrouper } from "./regroupement";
import reference from "@/donnees/reference-prototype.json";

const catalogue = chargerCatalogue();

/** Applique la classification à tout le catalogue, une fois. */
const classes = catalogue.map((offre) => ({
  offre,
  ...classifier({
    nom: offre.nom,
    organisme: offre.organisme,
    categorie: offre.categorie,
    outils: offre.outils ?? [],
    modules: offre.programme ?? [],
    domaineDeclare: offre.domaineDeclare,
    competencesDeclarees: offre.competencesDeclarees,
    classificationManuelle: offre.classificationManuelle,
  }),
}));

const parReference = new Map(reference.parcours.map((p) => [p.id, p]));

describe("parité de la classification sur les 195 parcours", () => {
  it("attribue le même domaine à chaque parcours", () => {
    const divergences = classes.filter(
      (c) => LIBELLES_DOMAINES[c.domaine] !== parReference.get(c.offre.id)!.domaine,
    );
    expect(divergences.map((d) => d.offre.nom)).toEqual([]);
  });

  it("attribue le même sujet principal à chaque parcours", () => {
    const divergences = classes.filter(
      (c) => c.sujetPrincipal !== parReference.get(c.offre.id)!.sujet,
    );
    expect(divergences.map((d) => d.offre.nom)).toEqual([]);
  });

  it("attribue les mêmes compétences couvertes à chaque parcours", () => {
    const divergences = classes.filter((c) => {
      const attendu = parReference.get(c.offre.id)!.couvertes;
      return JSON.stringify([...c.competencesCouvertes].sort()) !== JSON.stringify(attendu);
    });
    expect(divergences.map((d) => d.offre.nom)).toEqual([]);
  });

  it("signale les mêmes écarts de classification", () => {
    const ecarts = classes.filter((c) => c.ecart).map((c) => c.offre.nom);
    const attendus = reference.parcours.filter((p) => p.ecart).length;
    expect(ecarts).toHaveLength(attendus);
    expect(ecarts).toHaveLength(3);
  });
});

describe("parité des distributions publiées dans le brief", () => {
  const compter = <T extends string>(valeurs: T[]) =>
    valeurs.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});

  it("reproduit la répartition par domaine", () => {
    expect(compter(classes.map((c) => LIBELLES_DOMAINES[c.domaine]))).toEqual({
      "E-commerce": 65,
      "Marketing digital": 47,
      "Commerce et vente": 28,
      "Publicité payante": 17,
      Marketplaces: 11,
      "Data et conversion": 9,
      Référencement: 7,
      "Création de site": 6,
      "Email et CRM": 5,
    });
  });

  it("reproduit la répartition par catégorie d'organisme", () => {
    expect(compter(catalogue.map((o) => o.categorie))).toEqual({
      formation_professionnelle: 45,
      ecole: 44,
      universite: 36,
      certification_editeur: 28,
      formation_independante: 23,
      mooc_plateforme: 12,
      bootcamp: 7,
    });
  });

  it("compte 195 parcours, 161 organismes et 29 sujets", () => {
    expect(catalogue).toHaveLength(195);
    expect(new Set(catalogue.map((o) => o.organisme)).size).toBe(161);
    expect(new Set(classes.map((c) => c.sujetPrincipal)).size).toBe(29);
  });

  it("n'utilise que les neuf domaines du vocabulaire fermé", () => {
    expect(new Set(classes.map((c) => c.domaine)).size).toBe(9);
  });
});

describe("parité du regroupement sur le catalogue réel", () => {
  const { groupes, arbitrages } = regrouper(
    classes.map((c) => ({
      nom: c.offre.nom,
      organisme: c.offre.organisme,
      niveauEntree: c.offre.niveauEntree,
      sujetPrincipal: c.sujetPrincipal,
      modules: c.offre.programme ?? [],
      id: c.offre.id,
    })),
  );

  it("produit une seule file d'arbitrage, portant sur AMZ Academy", () => {
    expect(arbitrages).toHaveLength(1);
    expect(arbitrages[0]!.organisme).toBe("AMZ Academy");
    expect(arbitrages[0]!.socle).toBe("Amazon Incubator");
    expect(arbitrages[0]!.offres).toBe(3);
    expect(arbitrages[0]!.programmesPublies).toBe(1);
  });

  it("laisse 192 parcours autonomes et replie les 3 offres ambiguës", () => {
    const ambigus = groupes.filter((g) => g.issue === "ambigu");
    expect(ambigus).toHaveLength(1);
    expect(ambigus[0]!.offres).toHaveLength(3);
    expect(groupes.filter((g) => g.issue === "unique")).toHaveLength(192);
  });

  it("ne déclenche aucune fusion ni aucun refus sur le catalogue actuel", () => {
    // Constat, pas objectif : la règle de fusion n'a encore jamais eu de quoi
    // s'appliquer. Elle reste couverte par les cas construits de
    // regroupement.test.ts. Le jour où ce test échoue, le catalogue a changé de
    // nature — et c'est une information, pas une panne.
    expect(groupes.filter((g) => g.issue === "fusion")).toHaveLength(0);
    expect(groupes.filter((g) => g.issue === "refus")).toHaveLength(0);
  });

  it("le repli ramène le catalogue de 195 offres à 193 entrées de liste", () => {
    expect(catalogue).toHaveLength(195);
    expect(groupes).toHaveLength(193);
  });
});
