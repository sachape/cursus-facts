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
 *
 * LE CATALOGUE, LUI, A LE DROIT D'ÉVOLUER. Une donnée corrigée sur le site
 * officiel d'un organisme, ou une fiche ajoutée par la collecte, ne sont pas
 * des régressions de règle — ce sont exactement le travail attendu. Ces offres
 * sont donc exclues de la comparaison, nommément et avec leur motif. Ce qui
 * reste comparé est le socle inchangé depuis le portage : c'est lui qui doit
 * rester identique au prototype.
 */

/**
 * Offres exclues de la parité, avec le motif.
 *
 * 141-143 : les trois formules Amazon Incubator d'AMZ Academy. Prix, volume
 * horaire et programme corrigés le 3 août 2026 d'après le site officiel de
 * l'organisme — le prototype portait un tarif faux de 200 €.
 * 196 : AMZ Révolution, ajoutée par la collecte, absente du prototype.
 */
const HORS_PARITE = new Set([141, 142, 143, 196]);
import { describe, expect, it } from "vitest";
import { chargerCatalogue } from "@/donnees/catalogue";
import { LIBELLES_DOMAINES } from "./vocabulaires";
import { classifier } from "./classification";
import { regrouper } from "./regroupement";
import reference from "@/donnees/reference-prototype.json";

const catalogue = chargerCatalogue();

/** Applique la classification à tout le catalogue, une fois. */
const classes = catalogue
  .filter((offre) => !HORS_PARITE.has(offre.id))
  .map((offre) => ({
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

  it("signale les mêmes écarts de classification sur le socle inchangé", () => {
    const ecarts = classes.filter((c) => c.ecart).map((c) => c.offre.nom);
    expect(ecarts).toHaveLength(3);
  });
});

describe("parité des distributions publiées dans le brief", () => {
  const compter = <T extends string>(valeurs: T[]) =>
    valeurs.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});

  it("reproduit la répartition par domaine sur le socle inchangé", () => {
    expect(compter(classes.map((c) => LIBELLES_DOMAINES[c.domaine]))).toEqual({
      "E-commerce": 65,
      "Marketing digital": 47,
      "Commerce et vente": 28,
      "Publicité payante": 17,
      "Data et conversion": 9,
      Marketplaces: 8,
      Référencement: 7,
      "Création de site": 6,
      "Email et CRM": 5,
    });
  });

  it("reproduit la répartition par catégorie d'organisme sur le socle inchangé", () => {
    expect(
      compter(
        catalogue.filter((o) => !HORS_PARITE.has(o.id)).map((o) => o.categorie),
      ),
    ).toEqual({
      formation_professionnelle: 42,
      ecole: 44,
      universite: 36,
      certification_editeur: 28,
      formation_independante: 23,
      mooc_plateforme: 12,
      bootcamp: 7,
    });
  });

  it("compare 192 offres au prototype, les 4 autres étant tracées hors parité", () => {
    expect(catalogue).toHaveLength(196);
    expect(classes).toHaveLength(192);
    expect(new Set(classes.map((c) => c.sujetPrincipal)).size).toBe(29);
  });

  it("n'utilise que les neuf domaines du vocabulaire fermé", () => {
    expect(new Set(classes.map((c) => c.domaine)).size).toBe(9);
  });
});

describe("parité du regroupement sur le catalogue réel", () => {
  // Le regroupement porte sur TOUT le catalogue, pas seulement le socle :
  // c'est la fusion des fiches corrigées qu'on veut vérifier ici.
  const tout = catalogue.map((offre) => ({
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

  const { groupes, arbitrages } = regrouper(
    tout.map((c) => ({
      nom: c.offre.nom,
      organisme: c.offre.organisme,
      niveauEntree: c.offre.niveauEntree,
      sujetPrincipal: c.sujetPrincipal,
      modules: c.offre.programme ?? [],
      id: c.offre.id,
    })),
  );

  it("ne laisse plus aucun cas en file d'arbitrage", () => {
    // Le cas AMZ Academy est sorti de la file sans arbitrage humain :
    // l'organisme a publié son programme, le tronc est devenu comparable, et
    // la règle de fusion s'est appliquée d'elle-même. La file a fonctionné
    // comme une salle d'attente, pas comme un tribunal.
    expect(arbitrages).toHaveLength(0);
  });

  it("fusionne les trois formules Amazon Incubator en une seule fiche", () => {
    const fusions = groupes.filter((g) => g.issue === "fusion");
    expect(fusions).toHaveLength(1);
    expect(fusions[0]!.socle).toBe("Amazon Incubator");
    expect(fusions[0]!.offres).toHaveLength(3);
  });

  it("ne déclenche aucun refus sur le catalogue actuel", () => {
    // Aucune divergence de programme prouvée à ce jour. Le jour où ce test
    // échoue, le catalogue a changé de nature — et c'est une information.
    expect(groupes.filter((g) => g.issue === "refus")).toHaveLength(0);
  });

  it("ramène 196 offres à 194 entrées de liste", () => {
    expect(catalogue).toHaveLength(196);
    expect(groupes).toHaveLength(194);
  });
});
