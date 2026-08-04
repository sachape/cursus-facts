import { describe, expect, it } from "vitest";
import { horsPerimetre, prixAffichable } from "./modalite-commerciale";
import { chargerCatalogue } from "@/donnees/catalogue";

describe("modalité commerciale", () => {
  it("n'affiche jamais un tarif de groupe comme prix", () => {
    // Le cas qui a motivé le champ : M2i affiche 2 670 € en intra et 890 € en
    // inter pour le même parcours. Retenir le premier triple le prix affiché
    // et sort la fiche de tout filtre budget où elle avait sa place.
    expect(prixAffichable(2670, "intra")).toBeNull();
    expect(prixAffichable(890, "les_deux")).toBe(890);
    expect(prixAffichable(890, "inter")).toBe(890);
  });

  it("garde le prix tant que la modalité n'est pas tranchée", () => {
    // Une modalité inconnue n'autorise pas à supprimer une information
    // publiée : ce serait déduire, et l'invariant 2 l'interdit.
    expect(prixAffichable(1500, null)).toBe(1500);
  });

  it("sort du périmètre les parcours réservés aux entreprises", () => {
    expect(horsPerimetre("intra")).toBe(true);
    expect(horsPerimetre("les_deux")).toBe(false);
    expect(horsPerimetre(null)).toBe(false);
  });

  it("ne laisse aucun parcours intra seul au catalogue", () => {
    // Un parcours qu'un particulier ne peut pas acheter n'a rien à faire dans
    // un comparateur destiné aux particuliers. S'il en apparaît un, il doit
    // être signalé et retiré, pas affiché avec un prix de groupe.
    const intraSeuls = chargerCatalogue()
      .filter((o) => o.modaliteCommerciale === "intra")
      .map((o) => `${o.organisme} — ${o.nom}`);
    expect(intraSeuls).toEqual([]);
  });

  it("n'attribue un tarif intra qu'à une fiche vérifiée en profondeur", () => {
    // Le tarif de groupe ne se lit que sur la page de détail. En trouver un sur
    // une fiche issue de la seule page catalogue signalerait une donnée reprise
    // sans vérification.
    const suspects = chargerCatalogue()
      .filter((o) => o.prixIntra !== null && o.profondeur !== "detail_verifie")
      .map((o) => o.nom);
    expect(suspects).toEqual([]);
  });
});
