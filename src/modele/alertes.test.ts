/**
 * Les invariants de la sélection des alertes.
 *
 * Ce module décide À QUI on écrit. Une erreur ici ne produit ni exception ni
 * page cassée : elle produit un email de trop dans la boîte de quelqu'un, ou
 * un email manquant que personne ne réclamera. Les deux se constatent trop
 * tard, et le premier ne se reprend pas.
 */
import { describe, expect, it } from "vitest";
import {
  changementNotifiable,
  cleEnvoi,
  notificationsAPreparer,
  type ChangementHistorique,
  type Destinataire,
} from "./alertes";

const CHANGEMENT: ChangementHistorique = {
  id: "h1",
  parcoursId: "amz-academy-incubator",
  champ: "cout_apprenant",
  valeurPrecedente: "1 890 €",
  valeurNouvelle: "1 690 €",
  etatPrecedent: "renseigne",
  etatNouveau: "renseigne",
};

const ALERTE: Destinataire = {
  type: "alerte",
  id: "a1",
  email: "compte@exemple.fr",
  parcoursId: "amz-academy-incubator",
  champsSurveilles: ["cout_apprenant", "duree", "programme", "certification"],
  active: true,
};

const ABONNEMENT: Destinataire = {
  type: "abonnement",
  id: "b1",
  email: "visiteur@exemple.fr",
  parcoursIds: ["amz-academy-incubator", "autre-parcours"],
  consentement: true,
  desabonneLe: null,
};

const preparer = (
  changements: ChangementHistorique[],
  destinataires: Destinataire[],
  dejaEnvoyees: string[] = [],
) => notificationsAPreparer({ changements, destinataires, dejaEnvoyees: new Set(dejaEnvoyees) });

describe("ce qui mérite un email", () => {
  it("retient un prix qui change de valeur", () => {
    expect(changementNotifiable(CHANGEMENT)).toBe(true);
  });

  it("REFUSE un changement d'état seul", () => {
    /*
      LE CŒUR DE LA RÈGLE. « pas encore collecté » → « non publié par
      l'organisme » : notre connaissance a progressé, rien de ce que la personne
      lit n'a bougé. Sans ce refus, chaque passage de la file de collecte
      enverrait des centaines d'emails sans une information neuve.
    */
    expect(
      changementNotifiable({
        ...CHANGEMENT,
        valeurPrecedente: null,
        valeurNouvelle: null,
        etatPrecedent: "non_collecte",
        etatNouveau: "non_communique",
      }),
    ).toBe(false);
  });

  it("refuse un champ hors de la liste surveillée", () => {
    expect(changementNotifiable({ ...CHANGEMENT, champ: "lieu" })).toBe(false);
  });

  it("retient une valeur qui apparaît, et une qui disparaît", () => {
    // Les deux changent ce que la personne lira sur la fiche.
    expect(changementNotifiable({ ...CHANGEMENT, valeurPrecedente: null })).toBe(true);
    expect(changementNotifiable({ ...CHANGEMENT, valeurNouvelle: null })).toBe(true);
  });
});

describe("qui reçoit", () => {
  it("prévient un compte et un visiteur consentant sur le même changement", () => {
    const notifications = preparer([CHANGEMENT], [ALERTE, ABONNEMENT]);
    expect(notifications.map((n) => n.destinataire.email)).toEqual([
      "compte@exemple.fr",
      "visiteur@exemple.fr",
    ]);
  });

  it("n'écrit jamais à quelqu'un qui s'est désabonné, même consentant", () => {
    /*
      Une ligne peut porter les deux : on a consenti, puis changé d'avis. Écrire
      quand même est la faute la plus grave du mécanisme — et la seule qui
      expose juridiquement.
    */
    const revoque: Destinataire = { ...ABONNEMENT, desabonneLe: "2026-08-18T10:00:00Z" };
    expect(preparer([CHANGEMENT], [revoque])).toEqual([]);
  });

  it("n'écrit pas sans consentement", () => {
    expect(preparer([CHANGEMENT], [{ ...ABONNEMENT, consentement: false }])).toEqual([]);
  });

  it("n'écrit pas sur une alerte désactivée", () => {
    expect(preparer([CHANGEMENT], [{ ...ALERTE, active: false }])).toEqual([]);
  });

  it("respecte les champs restreints d'une alerte", () => {
    const prixSeul: Destinataire = { ...ALERTE, champsSurveilles: ["cout_apprenant"] };
    const surDuree = { ...CHANGEMENT, id: "h2", champ: "duree", valeurNouvelle: "6 mois" };
    expect(preparer([surDuree], [prixSeul])).toEqual([]);
  });

  it("N'ÉCRIT AU VISITEUR QUE SUR LE PRIX", () => {
    /*
      LA CASE PROMET LE PRIX, ET RIEN D'AUTRE. Lui écrire sur la durée, le
      programme ou la certification serait tenir une promesse qu'il n'a pas
      faite — et lui donner la meilleure raison de se désabonner.

      Le compte, lui, a créé son alerte depuis une fiche : geste explicite,
      promesse plus large. Le même changement traite donc les deux autrement.
    */
    const surDuree = { ...CHANGEMENT, id: "h9", champ: "duree", valeurNouvelle: "6 mois" };
    const notifications = preparer([surDuree], [ALERTE, ABONNEMENT]);
    expect(notifications.map((n) => n.destinataire.type)).toEqual(["alerte"]);
  });

  it("ignore un parcours que le destinataire ne suit pas", () => {
    const ailleurs = { ...CHANGEMENT, id: "h3", parcoursId: "parcours-inconnu" };
    expect(preparer([ailleurs], [ALERTE, ABONNEMENT])).toEqual([]);
  });
});

describe("idempotence et groupement", () => {
  it("ne prévient jamais deux fois du même changement", () => {
    const deja = [cleEnvoi("alerte", "a1", "h1")];
    expect(preparer([CHANGEMENT], [ALERTE], deja)).toEqual([]);
  });

  it("distingue les destinataires : l'envoi de l'un ne dispense pas l'autre", () => {
    const deja = [cleEnvoi("alerte", "a1", "h1")];
    const notifications = preparer([CHANGEMENT], [ALERTE, ABONNEMENT], deja);
    expect(notifications.map((n) => n.destinataire.email)).toEqual(["visiteur@exemple.fr"]);
  });

  it("groupe en UN email les changements d'une même personne", () => {
    /*
      Quatre champs corrigés en une ingestion feraient quatre emails en une
      minute — ce qui se lit comme une panne, puis comme du spam.
    */
    const changements: ChangementHistorique[] = [
      CHANGEMENT,
      { ...CHANGEMENT, id: "h2", champ: "duree", valeurNouvelle: "6 mois" },
      { ...CHANGEMENT, id: "h3", champ: "certification", valeurNouvelle: "RNCP12345" },
    ];
    const notifications = preparer(changements, [ALERTE]);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.changements.map((c) => c.champ)).toEqual([
      "cout_apprenant",
      "duree",
      "certification",
    ]);
  });

  it("ne prépare rien quand aucun changement n'est notifiable", () => {
    const etatSeul = { ...CHANGEMENT, valeurPrecedente: null, valeurNouvelle: null };
    expect(preparer([etatSeul], [ALERTE, ABONNEMENT])).toEqual([]);
  });
});
