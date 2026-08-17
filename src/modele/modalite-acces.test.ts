import { describe, expect, it } from "vitest";
import { libellePrixQualifie } from "./modalite-acces";

describe("l'unité est dite à côté du montant", () => {
  /*
    Sept fiches portaient déjà une unité non totale, écrite en base et jamais
    relue : « 49 € » pour un abonnement mensuel, « 690 € » pour un tarif
    journalier. Un montant nu se lit comme le prix du parcours entier.

    Le montant lui-même n'est pas comparé caractère par caractère : son
    séparateur de milliers vient d'`Intl` et varie d'un moteur à l'autre. Ce
    que ce test verrouille, c'est le SUFFIXE.
  */
  it("suffixe le libellé quand l'unité n'est pas un total", () => {
    expect(libellePrixQualifie(8600, null, null, "annuel")).toMatch(/^8.600 € par année$/);
    expect(libellePrixQualifie(49, null, null, "mensuel")).toBe("49 € par mois");
    expect(libellePrixQualifie(690, null, null, "journalier")).toBe("690 € par jour");
    expect(libellePrixQualifie(30, null, null, "horaire")).toBe("30 € par heure");
  });

  it("ne suffixe rien pour un total — c'est l'unité par défaut", () => {
    expect(libellePrixQualifie(1650, null, null, "total")).toMatch(/^1.650 €$/);
    expect(libellePrixQualifie(1650, null, null, null)).toMatch(/^1.650 €$/);
  });

  it("garde la qualification de gratuité, qui prime sur l'unité", () => {
    expect(libellePrixQualifie(0, null, "libre", "annuel")).toBe("Gratuit, accès libre");
    expect(libellePrixQualifie(null, null, null, "mensuel")).toBe("Non communiqué");
  });

  it("compose l'unité avec une prise en charge — les deux sont vraies", () => {
    expect(libellePrixQualifie(8600, null, "pris_en_charge", "annuel")).toContain("par année");
    expect(libellePrixQualifie(8600, null, "pris_en_charge", "annuel")).toContain("financé par un tiers");
  });
});
