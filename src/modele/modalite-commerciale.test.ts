import { describe, expect, it } from "vitest";
import {
  accessibleIndividuellement,
  marqueurAccessibilite,
  prixAffichable,
  reserveAuxEntreprises,
} from "./modalite-commerciale";
import { chargerCatalogue } from "@/donnees/catalogue";

const inter = { dispoInter: true, dispoIntra: false };
const intraSeul = { dispoInter: false, dispoIntra: true };
const lesDeux = { dispoInter: true, dispoIntra: true };
const inconnu = { dispoInter: null, dispoIntra: null };

describe("disponibilité commerciale", () => {
  it("n'affiche jamais un tarif de groupe comme prix", () => {
    // Le cas qui a motivé le champ : M2i affiche 2 670 € en intra et 890 € en
    // inter pour le même parcours. Retenir le premier triple le prix affiché
    // et sort la fiche de tout filtre budget où elle avait sa place.
    expect(prixAffichable(2670, intraSeul)).toBeNull();
    expect(prixAffichable(890, lesDeux)).toBe(890);
    expect(prixAffichable(890, inter)).toBe(890);
  });

  it("garde le prix tant que la disponibilité n'est pas tranchée", () => {
    // Une disponibilité inconnue n'autorise pas à supprimer une information
    // publiée : ce serait déduire, et l'invariant 2 l'interdit.
    expect(prixAffichable(1500, inconnu)).toBe(1500);
  });

  it("ne promet un accès individuel que s'il est constaté", () => {
    expect(accessibleIndividuellement(inter)).toBe(true);
    expect(accessibleIndividuellement(lesDeux)).toBe(true);
    expect(accessibleIndividuellement(intraSeul)).toBe(false);
    // Non tranché ne vaut pas disponible : le filtre ne promet rien.
    expect(accessibleIndividuellement(inconnu)).toBe(false);
  });

  it("n'étiquette « réservé aux entreprises » que sur double constat", () => {
    expect(reserveAuxEntreprises(intraSeul)).toBe(true);
    expect(reserveAuxEntreprises(lesDeux)).toBe(false);
    // Une fiche non collectée n'est pas réservée aux entreprises : elle est
    // inconnue. L'étiqueter serait porter au vendeur une opacité qui est la
    // nôtre.
    expect(reserveAuxEntreprises(inconnu)).toBe(false);
    expect(reserveAuxEntreprises({ dispoInter: false, dispoIntra: null })).toBe(false);
  });

  it("n'affiche un marqueur que quand il apprend quelque chose", () => {
    // La grande majorité des organismes de formation continue proposent les
    // deux. Étiqueter ce cas alourdirait chaque rangée sans rien apprendre.
    expect(marqueurAccessibilite(lesDeux)).toBeNull();
    expect(marqueurAccessibilite(inconnu)).toBeNull();
    expect(marqueurAccessibilite(intraSeul)).toBe("Réservé aux entreprises");
  });

  it("garde au catalogue les parcours réservés aux entreprises", () => {
    // L'exhaustivité prime : ces parcours existent et intéressent un dirigeant
    // qui forme son équipe. Ils sont fichés et marqués, pas écartés — les
    // écarter reviendrait à laisser un trou dans le catalogue au motif qu'une
    // partie du public n'est pas concernée.
    const catalogue = chargerCatalogue();
    for (const offre of catalogue) {
      if (reserveAuxEntreprises(offre)) {
        expect(marqueurAccessibilite(offre)).not.toBeNull();
      }
    }
    expect(catalogue.length).toBeGreaterThan(0);
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
