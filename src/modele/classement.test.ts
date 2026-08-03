import { describe, expect, it } from "vitest";
import {
  classer,
  LIBELLES_TRIS,
  TRI_PAR_DEFAUT,
  TRIS,
  type ParcoursClassable,
} from "./classement";

const p = (partiel: Partial<ParcoursClassable> & { nom: string }): ParcoursClassable => ({
  infosRenseignees: 0,
  dateVerification: null,
  prixMin: null,
  volumeHoraire: null,
  ...partiel,
});

describe("tri par défaut — trois critères successifs", () => {
  it("classe d'abord par nombre d'informations disponibles", () => {
    const classe = classer([
      p({ nom: "Peu renseigné", infosRenseignees: 7 }),
      p({ nom: "Bien renseigné", infosRenseignees: 17 }),
    ]);
    expect(classe.map((x) => x.nom)).toEqual(["Bien renseigné", "Peu renseigné"]);
  });

  it("départage à égalité par fraîcheur de vérification", () => {
    const classe = classer([
      p({ nom: "Ancien", infosRenseignees: 12, dateVerification: "2026-01-10" }),
      p({ nom: "Récent", infosRenseignees: 12, dateVerification: "2026-08-01" }),
    ]);
    expect(classe.map((x) => x.nom)).toEqual(["Récent", "Ancien"]);
  });

  it("départage ensuite par ordre alphabétique", () => {
    const commun = { infosRenseignees: 12, dateVerification: "2026-08-01" };
    const classe = classer([p({ nom: "Zébu", ...commun }), p({ nom: "Alpha", ...commun })]);
    expect(classe.map((x) => x.nom)).toEqual(["Alpha", "Zébu"]);
  });

  it("respecte l'ordre alphabétique français sur les accents", () => {
    const commun = { infosRenseignees: 5, dateVerification: "2026-08-01" };
    const classe = classer([p({ nom: "Zèbre", ...commun }), p({ nom: "Éclair", ...commun })]);
    expect(classe.map((x) => x.nom)).toEqual(["Éclair", "Zèbre"]);
  });
});

describe("le tri n'est jamais un score", () => {
  it("ordonne sur le nombre absolu, pas sur une part du dénominateur", () => {
    // 8 informations sur 16 applicables « vaudrait » 50 %, contre 60 % pour
    // 9 sur 15. Un tri par ratio inverserait l'ordre — et réintroduirait la
    // note que le produit refuse. Le nombre absolu prime.
    const classe = classer([
      p({ nom: "Neuf informations", infosRenseignees: 9 }),
      p({ nom: "Dix informations", infosRenseignees: 10 }),
    ]);
    expect(classe.map((x) => x.nom)).toEqual(["Dix informations", "Neuf informations"]);
  });

  it("ne retire aucune fiche, même vide", () => {
    const classe = classer([p({ nom: "Vide" }), p({ nom: "Complet", infosRenseignees: 18 })]);
    expect(classe).toHaveLength(2);
    expect(classe.map((x) => x.nom)).toContain("Vide");
  });
});

describe("les informations absentes ne prennent jamais la tête", () => {
  it("renvoie les parcours sans prix public en fin de liste", () => {
    const classe = classer(
      [
        p({ nom: "Sans prix", prixMin: null }),
        p({ nom: "Cher", prixMin: 2490 }),
        p({ nom: "Gratuit", prixMin: 0 }),
      ],
      "prix",
    );
    expect(classe.map((x) => x.nom)).toEqual(["Gratuit", "Cher", "Sans prix"]);
  });

  it("renvoie les parcours sans volume horaire en fin de liste", () => {
    const classe = classer(
      [
        p({ nom: "Sans volume", volumeHoraire: null }),
        p({ nom: "Long", volumeHoraire: 450 }),
        p({ nom: "Court", volumeHoraire: 20 }),
      ],
      "duree",
    );
    expect(classe.map((x) => x.nom)).toEqual(["Court", "Long", "Sans volume"]);
  });

  it("ne confond pas un prix nul avec un prix absent", () => {
    const classe = classer([p({ nom: "Sans prix" }), p({ nom: "Gratuit", prixMin: 0 })], "prix");
    expect(classe[0]!.nom).toBe("Gratuit");
  });
});

describe("publication de la règle de tri", () => {
  it("publie un libellé pour chacun des cinq tris", () => {
    for (const tri of TRIS) {
      expect(LIBELLES_TRIS[tri]).toBeTruthy();
    }
  });

  it("énonce dans le tri par défaut ce qu'il ne signifie pas", () => {
    const libelle = LIBELLES_TRIS[TRI_PAR_DEFAUT];
    expect(libelle).toContain("l'état des fiches");
    expect(libelle).toContain("pas la qualité");
    expect(libelle).toContain("Aucune fiche n'est retirée");
  });

  it("n'emploie aucun vocabulaire de jugement dans les libellés", () => {
    const interdits = /meilleur|top\b|recommand|classement de qualité|note/i;
    for (const tri of TRIS) {
      expect(LIBELLES_TRIS[tri]).not.toMatch(interdits);
    }
  });
});

describe("le classement ne modifie pas la liste d'origine", () => {
  it("renvoie une nouvelle liste", () => {
    const origine = [p({ nom: "B", infosRenseignees: 1 }), p({ nom: "A", infosRenseignees: 9 })];
    const classe = classer(origine);
    expect(origine[0]!.nom).toBe("B");
    expect(classe[0]!.nom).toBe("A");
  });
});
