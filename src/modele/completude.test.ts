import { describe, expect, it } from "vitest";
import { compterInformations } from "@/types/cursus";
import type { OffreNormalisee } from "@/donnees/catalogue";
import { chargerCatalogue } from "@/donnees/catalogue";
import referenceProto from "@/donnees/reference-prototype.json";
import { determinerEtats, lieuApplicable, paiementApplicable } from "./completude";

const offre = (partiel: Partial<OffreNormalisee> = {}): OffreNormalisee => ({
  id: 1,
  nom: "Parcours",
  organisme: "Organisme",
  categorie: "formation_professionnelle",
  sousFamille: null,
  region: null,
  url: null,
  prix: null,
  duree: null,
  volumeHoraire: null,
  formats: [],
  niveauEntree: null,
  prerequis: null,
  cpf: null,
  financements: null,
  certification: null,
  outils: null,
  programme: null,
  nonCouvert: null,
  dateVerification: null,
  source: null,
  domaineDeclare: null,
  competencesDeclarees: [],
  classificationManuelle: false,
  modaliteAcces: null,
  ...partiel,
});

describe("applicabilité du lieu", () => {
  it("est inapplicable pour un parcours exclusivement à distance", () => {
    expect(lieuApplicable(offre({ formats: ["distanciel"] }))).toBe(false);
  });

  it("redevient applicable dès qu'une modalité physique existe", () => {
    expect(lieuApplicable(offre({ formats: ["distanciel", "presentiel"] }))).toBe(true);
    expect(lieuApplicable(offre({ formats: ["alternance"] }))).toBe(true);
  });

  it("reste applicable quand aucun format n'est publié", () => {
    // Format inconnu : on ne peut pas conclure que le lieu n'a pas de sens.
    expect(lieuApplicable(offre({ formats: [] }))).toBe(true);
  });

  it("ne retire jamais un lieu effectivement publié", () => {
    // Une licence pro « VAE uniquement » à distance qui publie sa région a bien
    // un lieu : la publication prouve la pertinence, la règle s'efface.
    const etats = determinerEtats(
      offre({ formats: ["distanciel"], region: "Île-de-France" }),
    );
    expect(etats.lieu).toBe("renseigne");
  });
});

describe("applicabilité des modalités de paiement", () => {
  it("est inapplicable quand il n'y a rien à payer", () => {
    expect(paiementApplicable(offre({ prix: 0 }))).toBe(false);
  });

  it("reste applicable quand le prix est inconnu", () => {
    // Un prix non communiqué n'autorise aucune conclusion sur le paiement.
    expect(paiementApplicable(offre({ prix: null }))).toBe(true);
  });

  it("reste applicable pour un parcours payant", () => {
    expect(paiementApplicable(offre({ prix: 1890 }))).toBe(true);
  });
});

describe("un prix nul n'est jamais un prix manquant", () => {
  it("compte un prix à zéro comme renseigné", () => {
    expect(determinerEtats(offre({ prix: 0 })).prix).toBe("renseigne");
  });

  it("compte un prix absent comme non communiqué", () => {
    expect(determinerEtats(offre({ prix: null })).prix).toBe("non_communique");
  });

  it("distingue les deux dans le compteur", () => {
    const gratuit = compterInformations(determinerEtats(offre({ prix: 0 })));
    const inconnu = compterInformations(determinerEtats(offre({ prix: null })));
    expect(gratuit.renseignees).toBe(1);
    expect(inconnu.renseignees).toBe(0);
    // Le gratuit perd aussi le champ paiement du dénominateur : rien à échelonner.
    expect(gratuit.applicables).toBe(17);
    expect(inconnu.applicables).toBe(18);
  });
});

describe("le compteur, rapport de deux entiers", () => {
  it("retire les champs inapplicables du dénominateur, jamais du numérateur", () => {
    const distanciel = determinerEtats(offre({ formats: ["distanciel"], prix: 0 }));
    const compteur = compterInformations(distanciel);
    expect(distanciel.lieu).toBe("non_applicable");
    expect(distanciel.modalites_paiement).toBe("non_applicable");
    expect(compteur.applicables).toBe(16);
  });

  it("ne produit jamais de pourcentage ni de score", () => {
    const compteur = compterInformations(determinerEtats(offre()));
    expect(Object.keys(compteur).sort()).toEqual(["applicables", "renseignees"]);
    expect(Number.isInteger(compteur.renseignees)).toBe(true);
    expect(Number.isInteger(compteur.applicables)).toBe(true);
  });

  it("n'invente jamais d'information : une fiche vide reste une fiche", () => {
    const compteur = compterInformations(determinerEtats(offre()));
    expect(compteur.renseignees).toBe(0);
    // L'absence totale d'information ne retire pas la fiche du catalogue.
    expect(compteur.applicables).toBeGreaterThan(0);
  });
});

describe("effet du troisième état sur le catalogue réel", () => {
  const catalogue = chargerCatalogue();
  const compteurs = catalogue.map((o) => compterInformations(determinerEtats(o)));
  /** Nombre d'informations que le prototype comptait, fiche par fiche. */
  const reference = catalogue.map(
    (o) => referenceProto.parcours.find((p) => p.id === o.id)!.filled,
  );

  it("rend le dénominateur variable d'une fiche à l'autre", () => {
    const denominateurs = new Set(compteurs.map((c) => c.applicables));
    expect(denominateurs.size).toBeGreaterThan(1);
    // Plus aucune fiche n'est évaluée sur des champs qui ne la concernent pas.
    expect(Math.max(...denominateurs)).toBeLessThanOrEqual(18);
  });

  it("ne renseigne jamais plus de champs qu'il n'y en a d'applicables", () => {
    const incoherentes = compteurs.filter((c) => c.renseignees > c.applicables);
    expect(incoherentes).toHaveLength(0);
  });

  it("laisse toutes les fiches au catalogue, même les moins renseignées", () => {
    expect(compteurs).toHaveLength(195);
    expect(compteurs.every((c) => c.applicables > 0)).toBe(true);
  });

  it("ne baisse par rapport au prototype que sur les prix corrigés", () => {
    // Garde-fou du troisième état : il bouge le dénominateur, jamais le
    // numérateur. Une fiche ne doit pas perdre une information publiée parce
    // qu'une règle d'applicabilité s'est révélée trop large.
    //
    // Seule exception admise, et tracée : la correction des prix nuls non
    // attestés. Le prototype comptait un prix de 0 € pour 33 parcours qui
    // déclaraient par ailleurs des frais universitaires ou un financement par
    // un tiers — un prix nul y était déduit, pas publié. Ces fiches perdent
    // exactement une information, celle du prix, et aucune autre.
    const perdantes = catalogue
      .map((o, i) => ({
        nom: o.nom,
        perte: reference[i]! - compteurs[i]!.renseignees,
        etatPrix: determinerEtats(o).prix,
      }))
      .filter((x) => x.perte > 0);

    for (const fiche of perdantes) {
      expect(fiche.perte).toBe(1);
      expect(fiche.etatPrix).toBe("non_communique");
    }
  });

  it("ne retient un prix nul que s'il est attesté", () => {
    // Un prix nul est une information ; un prix pris en charge par un tiers
    // n'en est pas une. « France Travail », « POEI » ou « OPCO » désignent qui
    // paie, pas l'absence de prix.
    const gratuits = catalogue.filter((o) => o.prix === 0);
    for (const offre of gratuits) {
      const financements = (offre.financements ?? []).join(" ");
      const gratuiteDeclaree = /gratuit/i.test(financements);
      const alternanceExclusive = offre.formats.length === 1 && offre.formats[0] === "alternance";
      expect(gratuiteDeclaree || alternanceExclusive).toBe(true);
    }
  });
});
