import { describe, expect, it } from "vitest";
import { synthetiser } from "./synthese-comparaison";
import type { ParcoursFiche } from "@/donnees/requetes";
import { CHAMPS_INFORMATION, type EtatsInformation } from "@/types/cursus";

const etats = (surcharge: Partial<EtatsInformation> = {}): EtatsInformation =>
  CHAMPS_INFORMATION.reduce(
    (acc, c) => ({ ...acc, [c]: surcharge[c] ?? "renseigne" }),
    {} as EtatsInformation,
  );

const p = (partiel: Partial<ParcoursFiche> = {}): ParcoursFiche =>
  ({
    slug: "x", nom: "Parcours", organismeNom: "Organisme",
    prixMin: 0, prixMax: 0, duree: "3 mois", volumeHoraire: 100,
    formats: ["distanciel"], lieu: null, niveauEntree: "aucun_prerequis",
    eligibleCpf: true, certification: null, codeRncpRs: null,
    etats: etats(), ...partiel,
  }) as unknown as ParcoursFiche;

describe("synthèse de comparaison", () => {
  it("énonce un écart de prix sans nommer aucun parcours", () => {
    const s = synthetiser([
      p({ nom: "LiveMentor", prixMin: 0 }),
      p({ nom: "ORSYS", prixMin: 1980 }),
    ]);
    const prix = s.decisifs.find((e) => e.attribut === "Coût pour l'apprenant");
    expect(prix).toBeDefined();
    expect(prix!.enonce).toContain("écart de");
    // La règle non négociable : aucun nom de parcours dans un énoncé.
    for (const e of s.decisifs) {
      expect(e.enonce).not.toContain("LiveMentor");
      expect(e.enonce).not.toContain("ORSYS");
    }
  });

  it("ne produit jamais de superlatif ni de classement", () => {
    const s = synthetiser([p({ prixMin: 0 }), p({ prixMin: 1980, duree: "1 an" })]);
    const texte = s.decisifs.map((e) => `${e.attribut} ${e.enonce}`).join(" ").toLowerCase();
    for (const interdit of ["meilleur", "moins cher", "plus complet", "top", "recommand"]) {
      expect(texte).not.toContain(interdit);
    }
  });

  it("distingue une divergence réelle d'une information absente", () => {
    /*
      C'est la distinction que le tableau ne faisait pas. Deux parcours dont
      l'un ne publie pas son volume : la ligne diffère, mais pas parce que les
      offres divergent.
    */
    const s = synthetiser([
      p({ volumeHoraire: 100 }),
      p({ volumeHoraire: null, etats: etats({ volume_horaire: "non_communique" }) }),
    ]);
    expect(s.incomparables).toBeGreaterThan(0);
    // Le champ absent n'est pas compté comme une divergence.
    expect(s.divergences).toBe(0);
  });

  it("n'énonce aucun écart quand les parcours ne diffèrent pas", () => {
    expect(synthetiser([p(), p()]).decisifs).toEqual([]);
  });
});
