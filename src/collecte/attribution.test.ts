import { describe, expect, it } from "vitest";
import { attribuerExtrait, SEUIL_ATTRIBUTION } from "./attribution";

/*
  Le cas qui donne son sens au module : une page tarifs porte le prix de
  plusieurs formations, et rien dans le nombre ne dit à laquelle il appartient.
*/
const PAGE_TARIFS = `
Nos tarifs 2026

Bachelor Marketing Digital — 8 900 € par an
MSc in AI Marketing and Business — 15 500 € par an
Mastère Ressources Humaines — 9 200 € par an

Ces montants s'entendent hors frais de dossier.
`;

describe("attribuerExtrait", () => {
  it("attribue un prix dont la ligne porte le nom du parcours", () => {
    const verdict = attribuerExtrait(
      "MSc in AI Marketing & Business",
      PAGE_TARIFS,
      "MSc in AI Marketing and Business — 15 500 € par an",
    );
    expect(verdict.attribue).toBe(true);
    expect(verdict.score).toBeGreaterThanOrEqual(SEUIL_ATTRIBUTION);
  });

  /*
    LE TEST QUI COMPTE. Le prix est authentique, la citation est exacte, la page
    existe — et la valeur appartient à une autre formation. C'est le mode de
    défaillance le plus dangereux du produit, et il est silencieux.
  */
  it("refuse un prix authentique appartenant à une autre formation", () => {
    const verdict = attribuerExtrait(
      "MSc in AI Marketing & Business",
      PAGE_TARIFS,
      "Mastère Ressources Humaines — 9 200 € par an",
      { fenetre: 30 },
    );
    expect(verdict.attribue).toBe(false);
    expect(verdict.manquants).toContain("msc");
  });

  it("refuse quand le nom du parcours est hors du voisinage", () => {
    const page = `Titre de la formation : Formation WooCommerce avancée.
      ${"texte de remplissage sans rapport. ".repeat(60)}
      Le tarif est de 1 490 € net de taxe.`;
    const verdict = attribuerExtrait(
      "Formation WooCommerce avancée",
      page,
      "Le tarif est de 1 490 € net de taxe.",
      { fenetre: 100 },
    );
    expect(verdict.attribue).toBe(false);
  });

  it("tolère accents, casse et apostrophes typographiques", () => {
    const page = "Le Mastère Spécialisé E-commerce coûte 12 000 € l’année.";
    const verdict = attribuerExtrait(
      "Mastere Specialise E-commerce",
      page,
      "Le Mastère Spécialisé E-commerce coûte 12 000 € l’année.",
    );
    expect(verdict.attribue).toBe(true);
  });

  /*
    Un nom réduit à des mots vides ne peut rien attester. On ne conclut pas —
    l'absence de preuve n'autorise jamais l'écriture.
  */
  it("refuse quand le nom ne porte aucun mot discriminant", () => {
    const verdict = attribuerExtrait("Les formations", PAGE_TARIFS, "Nos tarifs 2026");
    expect(verdict.attribue).toBe(false);
    expect(verdict.score).toBe(0);
  });

  it("refuse et le signale quand la citation est introuvable dans la page", () => {
    const verdict = attribuerExtrait(
      "MSc in AI Marketing & Business",
      PAGE_TARIFS,
      "Cette phrase ne figure nulle part.",
    );
    expect(verdict.attribue).toBe(false);
    expect(verdict.contexte).toBeNull();
  });
});
