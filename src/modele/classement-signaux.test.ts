import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { COMPARATEURS_PAR_TRI, TRIS } from "./classement";

/*
  AUCUN SIGNAL D'UTILISATEUR DANS LE CLASSEMENT.

  Posé pendant que rien n'en dépend : c'est le seul moment où une règle de ce
  genre ne coûte rien. Une fois qu'un compteur de sauvegardes existe, la
  tentation de « remonter ce que les gens regardent » devient une évidence de
  produit, et l'invariant arrive trop tard.

  Le test porte sur DEUX choses distinctes, parce qu'un seul des deux se
  contournerait sans effort :

  1. le TYPE — `ParcoursClassable` n'expose aucun champ d'usage, donc un
     comparateur ne peut pas en lire ;
  2. le TEXTE du module — un développeur pressé peut élargir le type ; le
     contrôle sur la source le dit tout de suite, et nomme le terme fautif.
*/
const TERMES_INTERDITS = [
  "sauvegarde",
  "sauvegardes",
  "comparaisons",
  "alertes",
  "popularite",
  "popularité",
  "vues",
  "tendance",
];

describe("aucun signal d'utilisateur ne remonte dans le classement", () => {
  it("le module de classement ne mentionne aucun compteur d'usage", () => {
    const source = readFileSync("src/modele/classement.ts", "utf8");
    // Les commentaires citent la règle, donc les termes : on ne lit que le code.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    const fautifs = TERMES_INTERDITS.filter((terme) =>
      new RegExp(`\\b${terme}\\b`, "i").test(code),
    );
    expect(fautifs).toEqual([]);
  });

  it("chaque tri n'ordonne que sur des champs de fiche", () => {
    /*
      On exécute chaque comparateur sur deux objets qui portent un compteur
      d'usage élevé d'un côté, nul de l'autre, et RIEN d'autre qui les
      distingue. Si un tri lisait le compteur, il les ordonnerait ; ne lisant
      que des champs de fiche identiques, il doit les déclarer équivalents.

      C'est une mesure sur le comportement, pas sur le code : elle survivrait
      même à un contournement du contrôle textuel ci-dessus.
    */
    const fiche = {
      nom: "Parcours",
      infosRenseignees: 10,
      dateVerification: "2026-08-01",
      prixMin: 100,
      volumeHoraire: 50,
    };
    const populaire = { ...fiche, sauvegardes: 999, comparaisons: 999, alertes: 999 };
    const ignore = { ...fiche, sauvegardes: 0, comparaisons: 0, alertes: 0 };

    const departages = TRIS.filter(
      (tri) => COMPARATEURS_PAR_TRI[tri](populaire, ignore) !== 0,
    );
    expect(departages).toEqual([]);
  });
});
