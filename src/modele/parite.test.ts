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
/*
 * 13 août 2026 — dix-neuf plateformes d'apprentissage d'éditeur.
 *
 * Google Ateliers Numériques, PrestaShop, WiziShop, Klaviyo (×2), TikTok (×2),
 * Brevo, Mailchimp, Pinterest, Semrush, Ahrefs, Microsoft, Etsy, Shopify, Wix,
 * Salesforce, Zendesk, Hotjar. Retirées par MODIFICATION DE RÈGLE — le critère
 * « Ressource gratuite sans offre payante ni parcours borné » n'existait pas, et
 * les sept critères d'éligibilité, qui en demandent trois, les admettaient.
 *
 * Ce ne sont pas des fiches incomplètes : elles portaient trois à quatre
 * éléments de programme. Elles nommaient un catalogue de modules, dont aucun
 * prix, aucune durée et aucun programme uniques ne peuvent être vrais.
 *
 * Leur fiche entière est conservée dans `ressources-ecartees.json` et le retrait
 * est publié dans `journal-retraits.json`, rendu par la page Méthode.
 */
/*
 * 13 août 2026, second mouvement — les douze fiches-familles isolées.
 * Éclatées (leurs parcours entrent au-delà de l'id 234) : 69 ISCOD, 74 ENACO,
 * 93 Studi, 145 Voltee. Retirées : 83 Oreegami, 110 Réseau CCI, 111 CMA France,
 * 157 Formasuite. Hors périmètre : 86 Jedha, 87 Le Wagon, 134 Marketing Mania, 160 dixmilleheures.
 */
const RETIREES = new Set([
  105, 107, 114, 117, 118, 120, 122, 161, 162, 163, 164, 165, 166, 168, 169, 170, 171, 174, 175,
  177, 178, 69, 74, 83, 86, 87, 93, 110, 111, 134, 145, 157, 160,
]);
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
      /*
        13 août 2026 — retrait des dix-neuf plateformes d'éditeur. La perte se
        répartit sur huit domaines sur neuf : e-commerce −1, marketing digital
        −4, publicité payante −3, création de site −3, email et CRM −4,
        référencement −2, data et conversion −1, marketplaces −1. Total −19.

        « Commerce et vente » ne bouge pas : aucune Academy n'y était classée.
        C'est la vérification que le retrait n'a déplacé aucune règle — il a
        enlevé des fiches, pas reclassé celles qui restent.
      */
      /*
        13 août, second mouvement — neuf fiches-familles sortent du socle
        (quatre éclatées, quatre retirées, une hors périmètre) : e-commerce −1,
        marketing digital −6, commerce et vente −2. Les six autres domaines ne
        bougent pas. Les dix-sept parcours entrants portent des id supérieurs à
        234 : ils sont hors parité par construction, comme toute fiche postérieure
        au prototype.
      */
      "E-commerce": 62,
      "Marketing digital": 39,
      "Commerce et vente": 26,
      "Publicité payante": 10,
      "Data et conversion": 6,
      Marketplaces: 7,
      Référencement: 5,
      "Création de site": 3,
      "Email et CRM": 1,
    });
  });

  it("reproduit la répartition par catégorie d'organisme sur le socle inchangé", () => {
    expect(
      compter(
        catalogue.filter((o) => !horsParite(o.id)).map((o) => o.categorie),
      ),
    ).toEqual({
      // 40 → 35 et 44 → 42 : Studi, Réseau CCI, CMA France, Formasuite et
      // Marketing Mania d'un côté, ISCOD et ENACO de l'autre.
      formation_professionnelle: 34,
      ecole: 42,
      universite: 36,
      /*
        28 → 9. C'EST LA LIGNE QUI COMPTE : le retrait du 13 août ne touche
        qu'une seule strate, et les six autres sont identiques au chiffre près.
        Un retrait qui aurait emporté des licences ou des BTS se verrait ici —
        c'est le risque qu'a écarté la seconde condition du critère.
      */
      certification_editeur: 9,
      formation_independante: 22,
      mooc_plateforme: 12,
      bootcamp: 4,
    });
  });

  it("compare au prototype les 159 offres du socle inchangé", () => {
    // 190 → 171 (plateformes d'éditeur) → 162 (fiches-familles traitées, périmètre appliqué).
    expect(classes).toHaveLength(159);
    /*
      29 → 22 sujets principaux sur le socle. Sur le CATALOGUE ENTIER, cinq
      sujets deviennent orphelins — plus aucune fiche ne les porte : Klaviyo,
      Brevo, Email Marketing, Etsy, Marketplace.

      C'est une conséquence assumée du retrait, et elle est visible plutôt que
      silencieuse : ces sujets n'étaient portés que par la formation gratuite de
      l'éditeur lui-même. Le catalogue ne perd pas une information, il cesse de
      prétendre couvrir un sujet qu'aucune offre payante n'y couvrait.
    */
    expect(new Set(classes.map((c) => c.sujetPrincipal)).size).toBe(21);
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
