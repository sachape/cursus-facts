import { describe, expect, it } from "vitest";
import { CHAMPS_INFORMATION, compterInformations } from "@/types/cursus";
import type { OffreNormalisee } from "@/donnees/catalogue";
import { chargerCatalogue } from "@/donnees/catalogue";
import referenceProto from "@/donnees/reference-prototype.json";
import { determinerEtats, lieuApplicable, paiementApplicable } from "./completude";

const offre = (partiel: Partial<OffreNormalisee> = {}): OffreNormalisee => ({
  id: 1,
  nom: "Parcours",
  organisme: "Organisme",
  categorie: "formation_professionnelle",
  dispoInter: null,
  dispoIntra: null,
  prixIntra: null,
  aConfirmer: [],
  historique: [],
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
  // Par défaut on teste une fiche dont la page de détail a été lue : c'est le
  // seul cas où une absence peut être imputée à l'organisme.
  profondeur: "detail_verifie",
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

  it("compte un prix absent comme non publié quand le détail a été vérifié", () => {
    expect(determinerEtats(offre({ prix: null })).prix).toBe("non_communique");
  });

  it("compte un prix absent comme non collecté tant que le détail n'a pas été lu", () => {
    // C'est un fait sur nous, pas sur l'organisme : le confondre avec « non
    // publié » ferait porter au vendeur une opacité qui est la nôtre.
    expect(determinerEtats(offre({ prix: null, profondeur: "catalogue_seul" })).prix).toBe(
      "non_collecte",
    );
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
    expect(Object.keys(compteur).sort()).toEqual([
      "aConfirmer",
      "applicables",
      "nonCollectes",
      "renseignees",
    ]);
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

describe("profondeur de collecte", () => {
  it("sort les champs non collectés du dénominateur", () => {
    // On ne peut pas reprocher à un organisme une absence qu'on n'a pas
    // vérifiée : elle ne doit donc pas peser dans son compteur.
    const surface = compterInformations(determinerEtats(offre({ profondeur: "catalogue_seul" })));
    expect(surface.renseignees).toBe(0);
    expect(surface.applicables).toBe(0);
    expect(surface.nonCollectes).toBeGreaterThan(0);
  });

  it("ne pénalise pas une fiche non collectée comme une fiche opaque", () => {
    const opaque = compterInformations(determinerEtats(offre({ profondeur: "detail_verifie" })));
    const nonCollectee = compterInformations(
      determinerEtats(offre({ profondeur: "catalogue_seul" })),
    );
    // La fiche opaque a un dénominateur plein : son silence est constaté.
    expect(opaque.applicables).toBeGreaterThan(nonCollectee.applicables);
  });
});

describe("effet du troisième état sur le catalogue réel", () => {
  // Seules les offres présentes dans la référence du prototype sont comparables :
  // les fiches corrigées depuis, et celles ajoutées par la collecte, ne le sont
  // pas — et n'ont pas à l'être.
  const catalogue = chargerCatalogue().filter((o) =>
    referenceProto.parcours.some((p) => p.id === o.id),
  );
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
    expect(compteurs).toHaveLength(193);
    // 195 offres du prototype, moins les deux pages catalogue d'organisme
    // retirées ; les suivantes sont postérieures à la référence.
    expect(compteurs.every((c) => c.applicables > 0)).toBe(true);
  });

  it("n'écrit jamais non_collecte sur une fiche vérifiée en profondeur", () => {
    // L'invariant qui remplace la comparaison au prototype, devenue caduque
    // avec la profondeur de collecte. Une fiche dont la page de détail a été
    // lue ne peut plus avoir de champ « pas encore collecté » : chaque absence
    // y a été constatée, et doit donc être imputée à l'organisme.
    const verifiees = chargerCatalogue().filter((o) => o.profondeur === "detail_verifie");
    expect(verifiees.length).toBeGreaterThan(0);

    const fautives = verifiees.flatMap((offre) => {
      const etats = determinerEtats(offre);
      return CHAMPS_INFORMATION.filter((champ) => etats[champ] === "non_collecte").map(
        (champ) => `${offre.nom} → ${champ}`,
      );
    });
    expect(fautives).toEqual([]);
  });

  it.skip("ne baisse par rapport au prototype que sur les prix corrigés", () => {
    // Remplacé par le garde-fou ci-dessus : la comparaison au prototype est
    // caduque depuis la profondeur de collecte, puisque les champs vides d'une
    // fiche non collectée sortent désormais du dénominateur.
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

  it("n'affirme un prix nul que s'il est attesté, et le déclasse sinon", () => {
    // Un prix nul est une information ; un prix pris en charge par un tiers
    // n'en est pas une. « France Travail », « POEI » ou « OPCO » désignent qui
    // paie, pas l'absence de prix.
    //
    // La règle a changé le 4 août 2026 sur ce qu'on fait du non-attesté. Elle
    // disait « efface » ; elle dit maintenant « déclasse ». Effacer avait
    // supprimé 61 prix, dont trois parcours que Google publie « Free » : la
    // consigne était appliquée à la lettre et le résultat était faux. Un prix
    // nul non attesté conserve donc sa valeur en `a_confirmer` — visible,
    // signalé, en tête de file — au lieu de disparaître.
    for (const offre of catalogue.filter((o) => o.prix === 0)) {
      const financements = (offre.financements ?? []).join(" ");
      const gratuiteDeclaree = /gratuit/i.test(financements);
      const alternanceExclusive = offre.formats.length === 1 && offre.formats[0] === "alternance";
      const declasse = offre.aConfirmer.includes("prix");
      expect(gratuiteDeclaree || alternanceExclusive || declasse).toBe(true);
      // Et l'état suit : jamais « renseigné » sans attestation.
      if (!gratuiteDeclaree && !alternanceExclusive) {
        expect(determinerEtats(offre).prix).toBe("a_confirmer");
      }
    }
  });
});
