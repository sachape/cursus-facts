/**
 * Les invariants du diff d'ingestion.
 *
 * Ce que cette fonction écrit devient un email. Une ligne de trop est un
 * message non sollicité ; une ligne manquante est une promesse non tenue.
 */
import { describe, expect, it } from "vitest";
import { changementsEntre, resumerProgramme, type EtatSuivi } from "./historique";

const VALEURS: EtatSuivi = {
  coutApprenant: "1 890 €",
  duree: "3 mois",
  programme: "10 modules publiés",
  certification: "Titre RNCP — RNCP12345",
};

const ETATS = {
  cout_apprenant: "renseigne",
  duree: "renseigne",
  programme: "renseigne",
  certification: "renseigne",
} as const;

const diff = (apres: Partial<EtatSuivi>, etatsApres: Record<string, string> = { ...ETATS }) =>
  changementsEntre(
    "amz-incubator",
    { valeurs: VALEURS, etats: { ...ETATS } },
    { valeurs: { ...VALEURS, ...apres }, etats: etatsApres },
  );

describe("ce qui produit une ligne", () => {
  it("n'écrit rien quand rien ne bouge", () => {
    expect(diff({})).toEqual([]);
  });

  it("écrit une ligne par champ qui bouge, et seulement ceux-là", () => {
    const lignes = diff({ coutApprenant: "1 690 €", duree: "4 mois" });
    expect(lignes.map((l) => l.champ)).toEqual(["cout_apprenant", "duree"]);
    expect(lignes[0]).toMatchObject({
      parcours_id: "amz-incubator",
      valeur_precedente: "1 890 €",
      valeur_nouvelle: "1 690 €",
      origine: "extraction_automatique",
    });
  });

  it("N'ÉCRIT RIEN quand seul l'état bouge", () => {
    /*
      LE REFUS CENTRAL, POSÉ ICI ET NON EN AVAL. Un champ qui passe de « non
      collecté » à « non communiqué » n'intéresse que la file de collecte. En
      écrire une ligne reviendrait à confier au module d'alertes le soin de
      l'ignorer — deux endroits pour une règle, donc un jour deux règles.
    */
    const lignes = changementsEntre(
      "amz-incubator",
      { valeurs: { ...VALEURS, certification: null }, etats: { certification: "non_collecte" } },
      { valeurs: { ...VALEURS, certification: null }, etats: { certification: "non_communique" } },
    );
    expect(lignes).toEqual([]);
  });

  it("conserve les deux états quand la valeur bouge", () => {
    const lignes = changementsEntre(
      "amz-incubator",
      { valeurs: { ...VALEURS, coutApprenant: null }, etats: { cout_apprenant: "non_collecte" } },
      { valeurs: VALEURS, etats: { cout_apprenant: "renseigne" } },
    );
    expect(lignes[0]).toMatchObject({
      valeur_precedente: null,
      valeur_nouvelle: "1 890 €",
      etat_precedent: "non_collecte",
      etat_nouveau: "renseigne",
    });
  });

  it("traite une chaîne vide comme une absence, jamais comme une valeur", () => {
    // Sinon « » → null produirait une ligne, et un email disant que rien a changé.
    expect(diff({ duree: "   " })).toEqual([
      expect.objectContaining({ champ: "duree", valeur_nouvelle: null }),
    ]);
    const depuisVide = changementsEntre(
      "x",
      { valeurs: { ...VALEURS, duree: "" }, etats: {} },
      { valeurs: { ...VALEURS, duree: null }, etats: {} },
    );
    expect(depuisVide).toEqual([]);
  });
});

describe("résumé du programme", () => {
  it("compte les modules, et accorde le singulier", () => {
    expect(resumerProgramme(["a"])).toBe("1 module publié");
    expect(resumerProgramme(["a", "b"])).toBe("2 modules publiés");
  });

  it("rend null sur un programme absent ou vide", () => {
    expect(resumerProgramme(null)).toBeNull();
    expect(resumerProgramme([])).toBeNull();
  });

  it("ne bouge pas quand seuls les intitulés sont réécrits", () => {
    /*
      DÉCISION ASSUMÉE. Une reformulation d'intitulé se produit à chaque
      relecture d'une page d'organisme et ne change rien pour qui compare.
      Le coût : douze modules réécrits, toujours douze, ne préviennent personne.
    */
    expect(resumerProgramme(["Intro", "SEO"])).toBe(resumerProgramme(["Introduction", "Référencement"]));
  });
});
