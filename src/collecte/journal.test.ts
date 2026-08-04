import { describe, expect, it } from "vitest";
import { annuler, ecritureAutomatique, journaliser, type EcritureJournalisee } from "./journal";

const contexte = {
  le: "2026-08-04",
  origine: "extraction_automatique" as const,
  motif: "Passe d'extraction",
};

const proposition = (p: Partial<Parameters<typeof journaliser>[0]> = {}) =>
  journaliser(
    {
      id: 1,
      champ: "prix",
      ancienne: null,
      nouvelle: 1495,
      extrait: "Tarif : 1 495 € HT",
      urlSource: "https://x.fr/f/a",
      ...p,
    },
    contexte,
  );

describe("journal des écritures", () => {
  it("écrit une valeur nouvelle et conserve son extrait", () => {
    const e = proposition();
    expect(e.sort).toBe("remplace");
    expect(e.valeurNouvelle).toBe(1495);
    expect(e.extrait).toBe("Tarif : 1 495 € HT");
  });

  it("déclasse au lieu d'effacer quand l'extraction ne confirme pas", () => {
    // Le cœur de la règle : une valeur existante que le pipeline ne retrouve
    // pas conserve son contenu. C'est ce qui a manqué le 3 août sur 61 prix.
    const e = proposition({ ancienne: 890, nouvelle: null, extrait: null });
    expect(e.sort).toBe("declasse");
    expect(e.valeurNouvelle).toBe(890);
    expect(e.valeurPrecedente).toBe(890);
  });

  it("n'efface que sur absence constatée par une lecture réussie", () => {
    const e = proposition({ ancienne: 890, nouvelle: null, extrait: null, constateeAbsente: true });
    expect(e.sort).toBe("efface");
    expect(e.valeurNouvelle).toBeNull();
  });

  it("rend la valeur d'avant la première écriture, pas la dernière", () => {
    // Deux passes sur le même champ dans un même lot : annuler doit remonter
    // au point de départ, sinon l'annulation restaure un état intermédiaire
    // qui n'a jamais été validé.
    const lot: EcritureJournalisee[] = [
      proposition({ ancienne: 890, nouvelle: 1000 }),
      proposition({ ancienne: 1000, nouvelle: 1495 }),
    ];
    expect(annuler(lot).get("1.prix")).toBe(890);
  });

  it("n'automatise que l'ajout d'une valeur absente, jamais la modification", () => {
    // Un agent qui réécrit sans supervision dans un catalogue dont l'unique
    // actif est l'exactitude est un risque concentré ; le coût de la
    // validation est faible.
    expect(ecritureAutomatique(proposition())).toBe(true);
    expect(ecritureAutomatique(proposition({ ancienne: 890, nouvelle: 1495 }))).toBe(false);
    // Ni le déclassement ni l'effacement ne passent en automatique.
    expect(ecritureAutomatique(proposition({ ancienne: 890, nouvelle: null, extrait: null }))).toBe(
      false,
    );
  });

  it("n'automatise jamais une écriture sans extrait", () => {
    expect(ecritureAutomatique(proposition({ extrait: "" }))).toBe(false);
  });
});
