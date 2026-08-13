import { describe, expect, it } from "vitest";
import { CAUSES, CAUSES_ORGANISME, imputer, LIBELLES_CAUSE, type Cause } from "./verdict-prix";

describe("imputation d'une absence de prix", () => {
  /*
    L'INVARIANT CENTRAL, et il est écrit comme une interdiction plutôt que
    comme une liste : aucune cause qui décrit un rejet de NOTRE pipeline ne
    peut produire une conclusion sur l'organisme.

    Il tient même si quelqu'un ajoute une cause demain sans lire ce fichier :
    le test énumère `CAUSES`, pas une liste recopiée.
  */
  it("n'impute à l'organisme que l'absence de prix cité", () => {
    const surOrganisme = CAUSES.filter((c) => imputer(c) === "non_publie_par_organisme");
    expect(surOrganisme).toEqual(["aucun_prix_cite"]);
  });

  it("impute à nous tout rejet venu de notre propre pipeline", () => {
    const nôtres: Cause[] = [
      "citation_invalide",
      "unite_indeterminee",
      "unite_non_comparable",
      "journalier_sans_duree",
      "attribution_refusee",
    ];
    for (const c of nôtres) expect(imputer(c)).toBe("non_collecte");
  });

  /*
    LE CAS ENACO, EN TEST. Un prix publié en euros par année est un prix
    PUBLIÉ : l'organisme a fait son travail, c'est notre modèle de comparaison
    qui ne sait pas le représenter. L'imputer à l'organisme lui ferait porter
    une opacité imaginaire.
  */
  it("ne conclut pas à un silence de l'organisme sur un prix annuel", () => {
    expect(imputer("unite_non_comparable")).toBe("non_collecte");
  });

  it("retombe sur « non collecté » face à une cause imprévue", () => {
    // Le défaut protège dans le bon sens : s'attribuer une limite qu'on n'a
    // pas coûte un point de couverture ; l'attribuer à tort à un organisme
    // publie une information fausse sur lui.
    expect(imputer("cause_inventee" as Cause)).toBe("non_collecte");
  });

  it("garde la liste des causes imputables à l'organisme minimale", () => {
    // Elle ne doit pas s'allonger sans que quelqu'un le voie.
    expect(CAUSES_ORGANISME).toHaveLength(1);
  });

  it("donne un libellé lisible à chaque cause, sans exception", () => {
    for (const c of CAUSES) {
      expect(LIBELLES_CAUSE[c]).toBeTruthy();
      expect(LIBELLES_CAUSE[c].length).toBeGreaterThan(20);
    }
  });
});
