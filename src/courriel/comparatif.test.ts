/**
 * Les invariants de l'email de comparatif.
 *
 * Un email ne se rattrape pas. Il n'y a ni rechargement, ni correctif à chaud,
 * ni personne devant l'écran pour constater une bêtise : ce qui part est
 * définitif. Ces règles se vérifient donc avant l'envoi, pas après.
 */
import { describe, expect, it } from "vitest";
import {
  motsInterditsDuComparatif,
  objetComparatif,
  rendreHtml,
  rendreTexte,
  type DonneesComparatif,
  type LigneComparatif,
} from "./comparatif";

const LIGNE: LigneComparatif = {
  nom: "Licence pro E-commerce et marketing numérique",
  organisme: "Université Claude Bernard Lyon 1",
  prix: "4 990 € par année",
  conditionPrix: "Sous réserve de signer un contrat d'alternance",
  duree: "1 an",
  format: "Alternance, Présentiel",
  certification: "Diplôme national — RNCP40509",
};

const donnees = (lignes: LigneComparatif[]): DonneesComparatif => ({
  lignes,
  urlComparaison: "https://formlist.fr/comparer?ids=a,b",
  urlDesabonnement: "https://formlist.fr/desabonnement/JETON",
  envoyeLe: "18 août 2026",
});

describe("objet", () => {
  it("nomme le parcours quand il n'y en a qu'un", () => {
    expect(objetComparatif([{ ...LIGNE, nom: "Amazon Incubator" }])).toBe(
      "Votre comparatif — Amazon Incubator",
    );
  });

  it("annonce le reste plutôt que de le taire, au-delà de deux", () => {
    const objet = objetComparatif([
      { ...LIGNE, nom: "Amazon Incubator" },
      { ...LIGNE, nom: "Licence pro" },
      { ...LIGNE, nom: "BTS MCO" },
      { ...LIGNE, nom: "Mastère" },
    ]);
    expect(objet).toBe("Votre comparatif — Amazon Incubator et 3 autres");
  });

  it("abrège en le signalant, plutôt que de laisser le client tronquer", () => {
    const objet = objetComparatif([LIGNE]);
    expect(objet).toContain("…");
    expect(objet.length).toBeLessThan(60);
  });
});

describe("contenu", () => {
  it("porte les six faits de chaque parcours", () => {
    const texte = rendreTexte(donnees([LIGNE]));
    for (const attendu of [
      LIGNE.nom,
      LIGNE.organisme,
      LIGNE.prix,
      LIGNE.duree,
      LIGNE.format,
      LIGNE.certification,
    ]) {
      expect(texte).toContain(attendu);
    }
  });

  it("ne sépare JAMAIS le prix de son unité", () => {
    /*
      LA RÈGLE LA PLUS COÛTEUSE À CASSER. « 4 990 € » et « 4 990 € par année »
      ne décrivent pas la même dépense. Le prix arrive déjà qualifié ; ce test
      refuse toute version qui le recalculerait en chemin et perdrait l'unité.
    */
    for (const rendu of [rendreTexte(donnees([LIGNE])), rendreHtml(donnees([LIGNE]))]) {
      expect(rendu).toContain("4 990 € par année");
      expect(rendu).not.toMatch(/4\s?990\s?€(?!\s?par)/);
    }
  });

  it("restitue la condition qui accompagne un prix", () => {
    expect(rendreTexte(donnees([LIGNE]))).toContain("contrat d'alternance");
  });

  it("dit l'absence au lieu de laisser un blanc", () => {
    const vide: LigneComparatif = { ...LIGNE, certification: "", conditionPrix: null };
    expect(rendreTexte(donnees([vide]))).toContain("Certification : Non communiqué");
  });

  it("porte le lien de retour, la date et le désabonnement", () => {
    const rendu = donnees([LIGNE]);
    for (const sortie of [rendreTexte(rendu), rendreHtml(rendu)]) {
      expect(sortie).toContain("https://formlist.fr/comparer?ids=a,b");
      expect(sortie).toContain("18 août 2026");
      expect(sortie).toContain("désabonner");
      expect(sortie).toContain("JETON");
    }
  });

  it("n'embarque aucune image", () => {
    // Une image distante fuite l'ouverture et se bloque par défaut.
    expect(rendreHtml(donnees([LIGNE]))).not.toMatch(/<img|background-image/i);
  });

  it("échappe le HTML des valeurs venues du catalogue", () => {
    const piege: LigneComparatif = { ...LIGNE, nom: '<script>alert("x")</script>' };
    const html = rendreHtml(donnees([piege]));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("vocabulaire", () => {
  it("ne juge pas, ne classe pas, ne recommande pas", () => {
    expect(motsInterditsDuComparatif(donnees([LIGNE]))).toEqual([]);
  });

  it("détecte un jugement introduit par une donnée du catalogue", () => {
    /*
      Le garde-fou ne protège pas que de NOS phrases : un intitulé d'organisme
      peut porter le mot. « Le meilleur bootcamp e-commerce » est un nom de
      produit possible, et il ferait dire à l'email ce qu'il s'interdit.
    */
    const juge: LigneComparatif = { ...LIGNE, nom: "Le meilleur bootcamp e-commerce" };
    expect(motsInterditsDuComparatif(donnees([juge]))).toContain("meilleur");
  });
});
