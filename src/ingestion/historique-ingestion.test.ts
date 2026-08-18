/**
 * L'historique écrit par l'ingestion, vérifié sans base.
 *
 * L'INVARIANT QUI COMPTE EST L'IDEMPOTENCE. L'ingestion est rejouée à chaque
 * collecte ; si rejouer une préparation inchangée produisait des lignes
 * d'historique, chaque passage enverrait des emails annonçant que rien n'a
 * changé. C'est le mécanisme qui apprend à un abonné à ignorer l'expéditeur —
 * et il ne se constaterait qu'après le premier envoi de masse.
 */
import { describe, expect, it } from "vitest";
import { etatsChamps, sourceDepuisColonnes, titresProgramme } from "./ecrire.server";
import { changementsEntre, etatSuiviDepuis } from "@/modele/historique";

/** Une ligne de parcours plausible, dans la forme que produit la préparation. */
const COLONNES: Record<string, unknown> = {
  slug: "amz-academy-incubator",
  prix_min: 1690,
  prix_max: 2490,
  modalite_acces: null,
  unite_prix: null,
  prix_niveau: null,
  formats: ["distanciel", "presentiel"],
  eligible_cpf: true,
  dispo_inter: null,
  dispo_intra: null,
  duree: "Accompagnement individuel",
  certification: "Qualiopi — NDA 84380730538",
  programme: [{ titre: "Amazon FBA" }, { titre: "Marketplace" }],
  etats: { cout_apprenant: "renseigne", duree: "renseigne" },
};

const diff = (avant: Record<string, unknown>, apres: Record<string, unknown>) =>
  changementsEntre(
    "amz-academy-incubator",
    {
      valeurs: etatSuiviDepuis(sourceDepuisColonnes(avant, "formation_professionnelle")),
      etats: etatsChamps(avant["etats"]),
    },
    {
      valeurs: etatSuiviDepuis(sourceDepuisColonnes(apres, "formation_professionnelle")),
      etats: etatsChamps(apres["etats"]),
    },
  );

describe("rejouer l'ingestion", () => {
  it("NE PRODUIT AUCUNE LIGNE sur une préparation inchangée", () => {
    expect(diff(COLONNES, { ...COLONNES })).toEqual([]);
  });

  it("ne produit rien quand seul l'état de complétude bouge", () => {
    const apres = { ...COLONNES, etats: { cout_apprenant: "a_confirmer", duree: "renseigne" } };
    expect(diff(COLONNES, apres)).toEqual([]);
  });
});

describe("ce qui déclenche vraiment", () => {
  it("attrape une baisse de prix", () => {
    const lignes = diff(COLONNES, { ...COLONNES, prix_min: 1490 });
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({ champ: "cout_apprenant" });
    expect(lignes[0]!.valeur_precedente).not.toBe(lignes[0]!.valeur_nouvelle);
  });

  it("attrape l'apparition d'une unité de prix", () => {
    /*
      « 1 690 € » et « 1 690 € par année » ne décrivent pas la même dépense.
      La colonne prix n'a pas bougé — c'est bien la valeur AFFICHÉE qu'on
      compare, et c'est tout l'intérêt de ne pas comparer les colonnes.
    */
    const lignes = diff(COLONNES, { ...COLONNES, unite_prix: "annuel" });
    expect(lignes.map((l) => l.champ)).toEqual(["cout_apprenant"]);
    expect(lignes[0]!.valeur_nouvelle).toContain("par année");
  });

  it("attrape un programme qui s'étoffe", () => {
    const apres = { ...COLONNES, programme: [...(COLONNES["programme"] as unknown[]), { titre: "SEO" }] };
    expect(diff(COLONNES, apres).map((l) => l.champ)).toEqual(["programme"]);
  });
});

describe("formes du programme", () => {
  it("lit indifféremment des chaînes ou des objets à titre", () => {
    /*
      D'anciennes lignes portent des chaînes nues, l'ingestion écrit
      `[{ titre }]`. Voir une différence là où seul le CONTENANT a changé
      enverrait un email pour une migration de format.
    */
    expect(titresProgramme(["a", "b"])).toEqual(titresProgramme([{ titre: "a" }, { titre: "b" }]));
    const enChaines = { ...COLONNES, programme: ["Amazon FBA", "Marketplace"] };
    expect(diff(enChaines, COLONNES)).toEqual([]);
  });

  it("traite un programme vide comme une absence", () => {
    expect(titresProgramme([])).toBeNull();
    expect(titresProgramme(null)).toBeNull();
  });
});

describe("lecture des états", () => {
  it("accepte l'ancien nom `prix` comme l'actuel `cout_apprenant`", () => {
    expect(etatsChamps({ prix: "renseigne" }).cout_apprenant).toBe("renseigne");
    expect(etatsChamps({ cout_apprenant: "derive" }).cout_apprenant).toBe("derive");
  });

  it("ne lève pas sur un JSON absent ou mal formé", () => {
    expect(etatsChamps(null)).toEqual({});
    expect(etatsChamps("texte")).toEqual({});
  });
});
