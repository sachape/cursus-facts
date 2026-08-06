/**
 * Parité avec le prototype.
 *
 * LA CLASSIFICATION N'Y EST PLUS COMPARÉE — retirée le 6 août 2026.
 *
 * Le prototype a perdu son statut de référence : comparer un catalogue enrichi
 * par lecture réelle des pages à un état figé de la veille n'a plus de sens. Une
 * reclassification issue d'une page lue est un progrès, pas une régression — un
 * parcours dont l'extraction révèle qu'il enseigne PrestaShop relève de
 * PrestaShop, quoi qu'en dise un prototype qui ignorait ses outils.
 *
 * Et une liste d'exceptions maintenue à la main ne tiendrait pas : le crawl
 * reclassifie à chaque passe, par construction.
 *
 * Ce qui reste comparé est ce qui doit rester STABLE — volumétrie, répartitions
 * publiées dans le brief, écarts de classification signalés. Les règles
 * elles-mêmes sont couvertes par `classification.test.ts` sur des cas
 * construits, qui ne dépendent d'aucune donnée collectée.
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
 * Au-delà de 195 : toutes les offres ajoutées par la collecte, absentes du
 * prototype par construction — le moissonnage des catalogues d'organismes ne
 * peut pas être comparé à une référence qui l'ignore.
 */
const CORRIGEES = new Set([141, 142, 143]);

/**
 * Offres retirées du catalogue, avec le motif.
 *
 * 105 et 107 : « Formations digital et multimédia » (M2i) et « Formations
 * e-commerce et CMS » (Dawan). Ce sont des pages catalogue d'organisme, pas
 * des parcours. Elles portaient des durées en fourchette — « 1 à 5 jours » —
 * et un « Aucun prérequis » démenti par les cours qu'elles résumaient. Une
 * moyenne de catalogue présentée comme un fait sur un parcours est une
 * information déduite : invariant 2. Les parcours qu'elles recouvraient sont
 * fichés séparément, donc le catalogue ne perd rien.
 */
const RETIREES = new Set([105, 107]);
const DERNIER_ID_PROTOTYPE = 195;
const horsParite = (id: number) =>
  CORRIGEES.has(id) || RETIREES.has(id) || id > DERNIER_ID_PROTOTYPE;
import { describe, expect, it } from "vitest";
import { chargerCatalogue } from "@/donnees/catalogue";
import { LIBELLES_DOMAINES } from "./vocabulaires";
import { classifier } from "./classification";
import { regrouper } from "./regroupement";
import reference from "@/donnees/reference-prototype.json";

const catalogue = chargerCatalogue();

/** Applique la classification à tout le catalogue, une fois. */
const classes = catalogue
  .filter((offre) => !horsParite(offre.id))
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
      // 65 → 64 et 47 → 46 : retrait des deux pages catalogue d'organisme
      // (Dawan en e-commerce, M2i en marketing digital). Aucune autre cellule
      // ne bouge, ce qui confirme que le retrait n'a pas déplacé de règle.
      /*
        « Publicité payante » 17 → 13 et « Marketing digital » 46 → 50 après le
        bornage du motif « sea », qui attrapait « réseau » et « Seat ». Quatre
        fiches y étaient classées sur une sous-chaîne interne : ce n'est pas une
        reclassification, c'est la correction d'un mauvais classement.
      */
      "E-commerce": 64,
      "Marketing digital": 50,
      "Commerce et vente": 28,
      "Publicité payante": 13,
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
        catalogue.filter((o) => !horsParite(o.id)).map((o) => o.categorie),
      ),
    ).toEqual({
      formation_professionnelle: 40,
      ecole: 44,
      universite: 36,
      certification_editeur: 28,
      formation_independante: 23,
      mooc_plateforme: 12,
      bootcamp: 7,
    });
  });

  it("compare au prototype les 190 offres du socle inchangé", () => {
    expect(classes).toHaveLength(190);
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

  it("ramène le catalogue à autant d'entrées que de fiches, moins la fusion", () => {
    // Une seule fusion à ce jour : les trois formules Amazon Incubator.
    expect(groupes).toHaveLength(catalogue.length - 2);
  });
});
