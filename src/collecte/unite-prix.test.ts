import { describe, expect, it } from "vitest";
import { convertirJournalier, derivationTotal, joursDeDuree, trancherUnite } from "./unite-prix";

/*
  Les quatre cas réels du 6 août 2026. Chacun portait une citation authentique,
  un nombre exact et la bonne page — et chacun allait dégrader un prix juste.
*/
describe("les tarifs journaliers qui allaient écraser des totaux", () => {
  it("reconnaît l'unité dans le texte de l'organisme", () => {
    expect(trancherUnite(null, "875,00 € HT / jour")).toMatchObject({ unite: "journalier" });
    expect(trancherUnite(null, "690€ à 890€ HT par jour")).toMatchObject({ unite: "journalier" });
  });

  it("convertit en total quand la durée en jours est connue, et garde l'unitaire", () => {
    // Dawan PrestaShop : 875 €/jour sur 2 jours, et non 875 € au lieu de 1 500 €.
    expect(convertirJournalier(875, "journalier", "2 jours")).toMatchObject({
      total: 1750,
      unitaire: 875,
      jours: 2,
    });
  });

  it("ne convertit rien sans durée : un prix journalier reste journalier", () => {
    expect(convertirJournalier(875, "journalier", null)).toBeNull();
    // Semaines et mois ne se convertissent pas en jours de formation : le
    // rythme n'est pas publié, la conversion serait une déduction.
    expect(joursDeDuree("3 semaines")).toBeNull();
    expect(joursDeDuree("6 mois")).toBeNull();
  });
});

describe("l'unité ne se suppose jamais", () => {
  it("rejette un prix dont aucune unité n'est identifiable", () => {
    // Le cœur de la règle : « total » est la lecture la plus fréquente, donc
    // celle dont l'erreur passerait le plus inaperçue.
    expect(trancherUnite(null, "Tarif : 1 490 € HT")).toMatchObject({ motif: "unite_absente" });
  });

  it("rejette quand la page contredit la déclaration du modèle", () => {
    // La page écrit « / jour », le modèle déclare « total » : le modèle a mal
    // lu, et un modèle pris en défaut sur l'unité ne se croit pas sur le nombre.
    expect(trancherUnite("total", "875,00 € HT / jour")).toMatchObject({
      motif: "unite_contredite_par_l_extrait",
    });
  });

  it("lit l'unité dans l'extrait quand le modèle ne l'a pas déclarée", () => {
    expect(trancherUnite(null, "875,00 € HT / jour")).toMatchObject({ source: "extrait" });
  });

  it("accepte un total explicitement qualifié", () => {
    expect(trancherUnite("total par personne", "1 495 € HT par personne")).toMatchObject({
      unite: "total",
    });
  });
});

describe("dérivation « sans mention d'unité = total »", () => {
  /*
    Deux conditions, pas une : l'absence de mention sur le prix NE SUFFIT PAS,
    il faut aussi qu'aucun marqueur de tarification journalière ne figure
    ailleurs sur la page. C'est ce qui sépare la dérivation du défaut silencieux
    qu'elle remplace.
  */
  it("ne dérive pas quand la page facture au jour ailleurs", () => {
    expect(derivationTotal("Formation sur 3 jours. Tarif : 875,00 € HT / jour").derive).toBe(false);
    expect(
      derivationTotal("Le tarif inter-entreprises est de 690€ à 890€ HT par jour et par apprenant")
        .derive,
    ).toBe(false);
    expect(derivationTotal("Prix par stagiaire et par jour : 700 € HT").derive).toBe(false);
  });

  it("dérive un total quand la page ne facture manifestement pas au jour", () => {
    // « 3 jours en entreprise » et « mise à jour » ne disent rien du tarif :
    // un motif non borné les prendrait pour des marqueurs et la dérivation ne
    // se déclencherait jamais — prudente en apparence, sans effet en pratique.
    expect(
      derivationTotal("Frais de scolarité : 11 390 €. Rythme : 3 jours en entreprise.").derive,
    ).toBe(true);
    expect(derivationTotal("Prix : 1 490 € HT. Durée 2 jours. Mise à jour le 12 juin.").derive).toBe(
      true,
    );
  });
});
