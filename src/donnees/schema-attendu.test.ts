import { describe, expect, it } from "vitest";
import { colonneAbsente, colonneManquante, diagnostiquer } from "./schema-attendu";

const MESSAGE = 'column parcours.dispo_inter does not exist';

describe("contrat de schéma", () => {
  it("reconnaît une colonne absente et la nomme", () => {
    expect(colonneAbsente(MESSAGE)).toBe(true);
    expect(colonneManquante(MESSAGE)).toBe("dispo_inter");
  });

  it("produit le prompt à envoyer plutôt qu'un message générique", () => {
    // Le 500 muet du 4 août disait « The app returned 500 while handling GET / »
    // — sans nom de colonne, sans piste. Chercher est ce qui coûte l'heure.
    const d = diagnostiquer("parcours", MESSAGE);
    expect(d).toContain("dispo_inter");
    expect(d).toContain("ALTER TABLE public.parcours");
    expect(d).toContain("boolean");
  });

  it("signale une colonne hors contrat sans inventer de migration", () => {
    // Une colonne absente du contrat signale soit une suppression côté base,
    // soit un contrat non tenu à jour. Proposer un ALTER TABLE au hasard
    // ferait créer une colonne dont personne ne connaît le type.
    const d = diagnostiquer("parcours", "column parcours.inconnue does not exist");
    expect(d).toContain("n'est pas dans le contrat de schéma");
    expect(d).not.toContain("ADD COLUMN inconnue");
  });

  it("ne se déclenche pas sur une erreur ordinaire", () => {
    expect(colonneAbsente("network timeout")).toBe(false);
  });
});
