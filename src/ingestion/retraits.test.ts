import { describe, expect, it } from "vitest";
import { PLAFOND_RETRAIT, retraitsAFaire } from "./ecrire.server";

/*
  LA SEULE DÉCISION DESTRUCTRICE DE L'INGESTION.

  L'upsert ajoute et met à jour ; il n'enlève rien. La base gardait donc
  vingt-deux fiches que le catalogue avait retirées — plateformes d'éditeur,
  pages catalogue de M2i et Dawan, familles ISCOD et ENACO depuis éclatées —
  affichées au public et en doublon avec leurs remplaçantes.

  Le retrait corrige cela, et c'est précisément pour ça qu'il doit être tenu :
  une suppression qui part en vrille ne se voit pas dans un rapport, elle se
  voit dans un catalogue vide.
*/
describe("retraits d'ingestion", () => {
  it("retire ce que le catalogue ne produit plus", () => {
    const retires = retraitsAFaire(
      ["shopify-partner-academy-12", "iim-bachelor-58", "dawan-formations-e-commerce-9"],
      ["iim-bachelor-58"],
    );
    expect(retires).toEqual(["shopify-partner-academy-12", "dawan-formations-e-commerce-9"]);
  });

  it("ne retire rien quand la base et la préparation coïncident", () => {
    expect(retraitsAFaire(["a-1", "b-2"], ["a-1", "b-2"])).toEqual([]);
  });

  it("ne compte pas comme retrait une fiche nouvelle, absente de la base", () => {
    // L'arrivée d'une fiche est un ajout, jamais un retrait.
    expect(retraitsAFaire(["a-1"], ["a-1", "nouvelle-2"])).toEqual([]);
  });

  it("REFUSE DE CONCLURE SUR UNE PRÉPARATION VIDE", () => {
    /*
      Zéro fiche préparée ne signifie pas « tout le catalogue est retiré », mais
      « la source n'a pas été lue » — un JSON tronqué, une règle qui s'emballe.
      C'est exactement le cas où le retrait ferait le plus de dégâts, donc le
      seul où il doit refuser de s'exécuter plutôt que de rendre une liste.
    */
    expect(() => retraitsAFaire(["a-1", "b-2"], [])).toThrow(/n'a pas été lue/);
  });

  it("laisse le plafond très au-dessus de la plus grande vague connue", () => {
    // Dix-neuf plateformes d'éditeur plus les familles éclatées : vingt-deux.
    expect(PLAFOND_RETRAIT).toBeGreaterThan(22);
  });
});
