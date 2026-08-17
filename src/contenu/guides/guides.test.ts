/**
 * Les invariants des guides.
 *
 * Un guide est du contenu éditorial, donc le seul endroit du produit où une
 * phrase peut affirmer sans qu'aucune règle ne la produise. C'est exactement là
 * qu'il faut des garde-fous mécaniques : une affirmation fausse dans un guide
 * ne casse rien, ne lève rien, et se lit comme le reste.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { autresGuides, GUIDES, guideParSlug, SEUIL_INDEXATION } from ".";
import { lire, type Guide, type Texte } from "./format";
import { MOTS_INTERDITS } from "@/modele/adequation";
import type { ChiffresGuides } from "@/modele/chiffres-guides";

/* -------------------------------------------------------------------------- */
/* Deux catalogues qui ne se ressemblent en rien                              */
/* -------------------------------------------------------------------------- */

function chiffres(base: number): ChiffresGuides {
  const n = (facteur: number) => Math.round(base * facteur);
  return {
    calculeLe: "2026-08-13T10:00:00.000Z",
    parcours: n(10),
    organismes: n(4),
    prixEtabli: n(4),
    prixNonEtabli: n(6),
    partPrixEtabli: base === 1 ? 42 : 58,
    partPrixNonEtabli: base === 1 ? 58 : 42,
    prixMinPayant: n(1),
    prixMaxPayant: n(900),
    medianePayant: n(120),
    moinsChere: { slug: `bas-${base}`, nom: `Parcours bas ${base}`, organisme: "Organisme A", prix: n(1) },
    plusChere: { slug: `haut-${base}`, nom: `Parcours haut ${base}`, organisme: "Organisme B", prix: n(900) },
    parCategorie: [
      { cle: "universite", libelle: "Universités", nombre: n(3), payants: n(2), gratuits: n(1), mediane: n(80), min: n(1), max: n(300) },
      { cle: "bootcamp", libelle: "Bootcamps", nombre: n(2), payants: n(1), gratuits: n(1), mediane: n(400), min: n(200), max: n(900) },
    ],
    sansFrais: n(3),
    accesPartiel: n(2),
    prixNul: n(3),
    parModalite: [
      { cle: "libre", libelle: "Gratuit, accès libre", nombre: n(2) },
      { cle: "freemium", libelle: "Accès partiel gratuit", nombre: n(1) },
    ],
    modaliteNonQualifiee: n(5),
    etatsModalite: 7,
    eligiblesCpf: n(3),
    cpfNonTranche: n(6),
    financementPublie: n(4),
    alternance: n(2),
    distanciel: n(5),
    presentiel: n(4),
    rncp: n(2),
    rs: n(1),
    certifiants: n(3),
    certificationSansCode: n(5),
    aucuneCertification: n(4),
    interConstate: n(6),
    intraSeul: n(1),
    disponibiliteNonTranchee: n(3),
  };
}

const PETIT = chiffres(1);
const GRAND = chiffres(7);

/** Tous les textes d'un guide, rendus avec un jeu de chiffres donné. */
function textes(guide: Guide, c: ChiffresGuides): string[] {
  const sortis: string[] = [guide.titre, guide.chapo, guide.description, guide.titreMeta];
  const ajouter = (t: Texte) => sortis.push(lire(t, c));

  for (const section of guide.sections) {
    sortis.push(section.titre);
    for (const bloc of section.blocs) {
      if (bloc.type === "paragraphe") ajouter(bloc.texte);
      if (bloc.type === "liste") bloc.items.forEach(ajouter);
      if (bloc.type === "sortie") ajouter(bloc.sortie.libelle);
      if (bloc.type === "sources") bloc.items.forEach((i) => sortis.push(i.libelle));
      if (bloc.type === "donnees") {
        sortis.push(bloc.titre);
        ajouter(bloc.sortie.libelle);
        for (const ligne of bloc.lignes(c)) {
          sortis.push(ligne.libelle, ligne.valeur, ligne.precision ?? "");
        }
      }
    }
  }
  for (const entree of guide.faq) ajouter(entree.reponse);
  return sortis;
}

/** Les seules sorties d'un guide, tous blocs confondus. */
function sorties(guide: Guide): string[] {
  return guide.sections.flatMap((s) =>
    s.blocs.flatMap((b) =>
      b.type === "sortie" ? [b.sortie.to] : b.type === "donnees" ? [b.sortie.to] : [],
    ),
  );
}

/* -------------------------------------------------------------------------- */

describe("registre", () => {
  it("publie au moins le seuil d'indexation", () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(SEUIL_INDEXATION);
  });

  it("n'a ni slug ni ancre en double", () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const guide of GUIDES) {
      const ancres = guide.sections.map((s) => s.ancre);
      expect(new Set(ancres).size, `ancres de ${guide.slug}`).toBe(ancres.length);
    }
  });

  it("retrouve un guide par son slug, et rien par un slug inconnu", () => {
    expect(guideParSlug("combien-coute-formation-ecommerce")?.slug).toBe(
      "combien-coute-formation-ecommerce",
    );
    expect(guideParSlug("inexistant")).toBeUndefined();
  });

  it("propose trois autres guides, jamais le guide courant, dans un ordre stable", () => {
    for (const guide of GUIDES) {
      const autres = autresGuides(guide.slug);
      expect(autres).toHaveLength(3);
      expect(autres.map((a) => a.slug)).not.toContain(guide.slug);
      // Deux rendus de la même page ne doivent pas proposer des liens différents.
      expect(autresGuides(guide.slug).map((a) => a.slug)).toEqual(autres.map((a) => a.slug));
    }
  });
});

describe("aucun chiffre du catalogue écrit en dur", () => {
  /*
    LA RÈGLE QUI REND CES GUIDES IMPOSSIBLES À COPIER. Un chiffre recopié dans
    une phrase devient faux au premier ajout au catalogue, sans que rien ne le
    signale — et le guide devient alors ce qu'il prétend dénoncer : un contenu
    qui affirme une fourchette que rien ne soutient.

    Le contrôle porte sur la SOURCE, pas sur le rendu : c'est à l'écriture que
    la faute se commet, et une chaîne comme « 233 parcours » se repère là où
    aucun test de rendu ne la distinguerait d'un chiffre calculé.
  */
  const DOSSIER = new URL(".", import.meta.url).pathname;
  const FICHIERS = readdirSync(DOSSIER).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "format.ts" && f !== "index.ts",
  );

  /** Un nombre suivi d'une unité du catalogue : la forme exacte de la faute. */
  const CHIFFRE_CATALOGUE = /\d[\d\s ]*\s*(%|€|parcours|organismes|formations|fiches)/i;

  it("couvre bien les quatre guides", () => {
    expect(FICHIERS).toHaveLength(GUIDES.length);
  });

  for (const fichier of FICHIERS) {
    it(`n'écrit aucun chiffre du catalogue dans ${fichier}`, () => {
      const brut = readFileSync(join(DOSSIER, fichier), "utf8");
      // Les commentaires expliquent souvent une règle en citant un ordre de
      // grandeur : un invariant qui signale du bruit finit par être ignoré.
      const nu = brut.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

      const fautifs = nu
        .split("\n")
        .map((ligne, rang) => ({ ligne, rang: rang + 1 }))
        .filter(({ ligne }) => CHIFFRE_CATALOGUE.test(ligne));

      expect(
        fautifs.map((f) => `${fichier}:${f.rang} ${f.ligne.trim().slice(0, 70)}`),
      ).toEqual([]);
    });
  }
});

describe("les textes suivent le catalogue", () => {
  it("change de contenu quand le catalogue change", () => {
    /*
      Le contrôle complémentaire du précédent : celui-ci interdit d'écrire un
      chiffre, celui-là vérifie qu'on en lit bien un. Un guide dont aucune
      phrase ne bouge entre deux catalogues très différents n'a plus de données
      dedans — il est redevenu un article.
    */
    for (const guide of GUIDES) {
      const petit = textes(guide, PETIT).join("\n");
      const grand = textes(guide, GRAND).join("\n");
      expect(petit, `${guide.slug} ne dépend d'aucun chiffre`).not.toEqual(grand);
    }
  });

  it("n'affiche jamais NaN ni undefined, même sur un catalogue vide", () => {
    const vide: ChiffresGuides = {
      ...PETIT,
      parcours: 0,
      prixEtabli: 0,
      prixNonEtabli: 0,
      partPrixEtabli: 0,
      partPrixNonEtabli: 0,
      prixMinPayant: null,
      prixMaxPayant: null,
      medianePayant: null,
      moinsChere: null,
      plusChere: null,
      parCategorie: [],
      parModalite: [],
    };
    for (const guide of GUIDES) {
      const rendu = textes(guide, vide).join("\n");
      expect(rendu, guide.slug).not.toMatch(/NaN|undefined|null/);
    }
  });
});

describe("un guide qualifie, il ne conclut pas", () => {
  it("porte au moins une sortie vers le catalogue par guide", () => {
    // Un guide sans lien de sortie a coûté une lecture et n'a rien qualifié.
    for (const guide of GUIDES) {
      expect(sorties(guide).length, guide.slug).toBeGreaterThan(0);
    }
  });

  it("n'emploie aucun vocabulaire de jugement dans ce qu'il affirme", () => {
    /*
      L'invariant 6 ne s'arrête pas à la porte du contenu éditorial.

      LES QUESTIONS DE LA FAQ EN SONT EXCLUES, et c'est délibéré : « Une
      formation Qualiopi est-elle de meilleure qualité ? » est la question que
      le lecteur pose, pas une affirmation que nous portons. La lui interdire
      reviendrait à ne pas y répondre. La règle porte sur nos réponses.
    */
    for (const guide of GUIDES) {
      const affirme = textes(guide, PETIT).join("\n").toLowerCase();
      for (const mot of MOTS_INTERDITS) {
        expect(affirme, `${guide.slug} emploie « ${mot} »`).not.toContain(mot);
      }
    }
  });

  it("annonce une FAQ de trois à cinq questions réelles", () => {
    for (const guide of GUIDES) {
      expect(guide.faq.length, guide.slug).toBeGreaterThanOrEqual(3);
      expect(guide.faq.length, guide.slug).toBeLessThanOrEqual(5);
      for (const entree of guide.faq) {
        expect(entree.question.endsWith("?"), entree.question).toBe(true);
      }
    }
  });

  it("ne renvoie jamais hors du produit depuis une sortie", () => {
    for (const guide of GUIDES) {
      for (const to of sorties(guide)) expect(to.startsWith("/"), `${guide.slug} → ${to}`).toBe(true);
    }
  });
});
