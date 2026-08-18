/**
 * Les invariants de l'email de changement.
 *
 * C'est le seul email que la personne n'a pas demandé au moment où il arrive.
 * Il doit donc porter son motif, son contenu et sa sortie — sans quoi il se
 * classe en indésirables, et à raison.
 */
import { describe, expect, it } from "vitest";
import {
  motsInterditsDuChangement,
  objetChangement,
  rendreHtml,
  rendreTexte,
  type DonneesChangement,
  type ParcoursChange,
} from "./changement";

const PARCOURS: ParcoursChange = {
  nom: "Amazon Incubator",
  organisme: "AMZ Academy",
  changements: [{ champ: "Prix", avant: "1 890 €", apres: "1 690 €" }],
  url: "https://formlist.fr/parcours/amz-academy-incubator",
};

const donnees = (parcours: ParcoursChange[]): DonneesChangement => ({
  parcours,
  urlDesabonnement: "https://formlist.fr/desabonnement/JETON",
  envoyeLe: "18 août 2026",
});

describe("objet", () => {
  it("nomme le parcours et tient sous le plafond", () => {
    for (const nombre of [1, 2, 3, 4]) {
      const objet = objetChangement(
        Array.from({ length: nombre }, () => ({
          ...PARCOURS,
          nom: "Mastère Spécialisé Marketing Digital & Data appliqué au commerce",
        })),
      );
      expect(objet.length, `${nombre} → « ${objet} »`).toBeLessThanOrEqual(70);
    }
  });
});

describe("contenu", () => {
  it("montre l'avant ET l'après", () => {
    /*
      « Le prix a changé » oblige à rouvrir le site pour savoir dans quel sens.
      Les deux valeurs se lisent dans la notification et suffisent à décider.
    */
    for (const rendu of [rendreTexte(donnees([PARCOURS])), rendreHtml(donnees([PARCOURS]))]) {
      expect(rendu).toContain("1 890 €");
      expect(rendu).toContain("1 690 €");
    }
  });

  it("porte le motif de réception, la sortie et la date", () => {
    const rendu = rendreTexte(donnees([PARCOURS]));
    expect(rendu).toContain("parce que vous suivez");
    expect(rendu).toContain("JETON");
    expect(rendu).toContain("18 août 2026");
  });

  it("mène à la fiche concernée", () => {
    expect(rendreTexte(donnees([PARCOURS]))).toContain(
      "https://formlist.fr/parcours/amz-academy-incubator",
    );
  });

  it("n'embarque aucune image", () => {
    expect(rendreHtml(donnees([PARCOURS]))).not.toMatch(/<img|background-image/i);
  });

  it("échappe les valeurs venues du catalogue", () => {
    const piege = { ...PARCOURS, nom: "<script>alert(1)</script>" };
    const html = rendreHtml(donnees([piege]));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("vocabulaire", () => {
  it("n'interprète pas le changement", () => {
    /*
      Une baisse de prix n'est pas une bonne nouvelle : elle peut accompagner un
      programme raccourci. On énonce le fait, jamais son sens.
    */
    expect(motsInterditsDuChangement(donnees([PARCOURS]))).toEqual([]);
  });
});
