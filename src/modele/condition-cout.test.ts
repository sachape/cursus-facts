import { describe, expect, it } from "vitest";
import { conditionDuCout, filtreDe, type EntreeCout } from "./condition-cout";

const e = (p: Partial<EntreeCout> = {}): EntreeCout => ({
  prix: null,
  modaliteAcces: null,
  formats: [],
  categorie: "formation_professionnelle",
  eligibleCpf: null,
  dispoInter: null,
  dispoIntra: null,
  ...p,
});

describe("condition d'obtention du coût", () => {
  it("distingue quatre situations que « 0 € » confondait", () => {
    expect(conditionDuCout(e({ prix: 0, formats: ["alternance"] })).condition).toBe(
      "Sous réserve de signer un contrat d'alternance",
    );
    expect(conditionDuCout(e({ prix: 0, modaliteAcces: "compte_requis" })).condition).toBe(
      "Après création d'un compte",
    );
    expect(conditionDuCout(e({ prix: 0, modaliteAcces: "certificat_payant" })).valeur).toBe(
      "Gratuit à suivre",
    );
    expect(conditionDuCout(e({ modaliteAcces: "freemium" })).valeur).toBe("Accès partiel gratuit");
  });

  it("affiche la condition la plus restrictive pour l'accès", () => {
    // Alternance ET éligible CPF : c'est le contrat qui conditionne l'entrée.
    // Pour beaucoup, trouver un contrat est plus difficile que payer.
    const cout = conditionDuCout(e({ prix: 0, formats: ["alternance"], eligibleCpf: true }));
    expect(cout.cle).toBe("alternance_requise");
  });

  it("place « réservé aux entreprises » avant toute autre condition", () => {
    // Si la personne ne peut pas acheter du tout, aucune autre condition ne
    // l'intéresse.
    const cout = conditionDuCout(
      e({ prix: 1500, dispoInter: false, dispoIntra: true, eligibleCpf: true }),
    );
    expect(cout.valeur).toBe("Réservé aux entreprises");
  });

  it("réduit un diplôme public à ses droits d'inscription, pas à zéro", () => {
    const cout = conditionDuCout(e({ prix: 0, categorie: "universite" }));
    expect(cout.valeur).toBe("Frais d'inscription universitaires");
    expect(cout.condition).toBe("Montant fixé chaque année par arrêté");
  });

  it("n'invente aucune condition quand la modalité est inconnue", () => {
    // Un parcours dont on ignore la modalité affiche sa valeur sans condition.
    expect(conditionDuCout(e({ prix: 1690 }))).toMatchObject({ valeur: null, condition: null });
  });

  it("accompagne un montant sans jamais le remplacer", () => {
    // La condition CPF ou « session collective » ne masque pas le prix : elle
    // s'ajoute dessous.
    expect(conditionDuCout(e({ prix: 1690, eligibleCpf: true })).valeur).toBeNull();
    expect(conditionDuCout(e({ prix: 1690, dispoInter: true })).condition).toBe(
      "Tarif par personne, session collective",
    );
  });

  it("ne signale une dérivation que lorsque la valeur en vient d'une", () => {
    // Sans cette mention, le catalogue affirmerait en son nom une information
    // que personne n'a publiée.
    expect(conditionDuCout(e({ prix: 0, formats: ["alternance"] })).derivation).toBeNull();
    expect(
      conditionDuCout(e({ prix: 0, formats: ["alternance"], derive: true })).derivation,
    ).toContain("alternant");
  });

  it("regroupe les conditions voisines sous une valeur de filtre unique", () => {
    expect(filtreDe("compte_produit_requis")).toBe("compte_requis");
    expect(filtreDe("cpf")).toBe("sans_condition");
    expect(filtreDe("frais_inscription")).toBeNull();
  });
});

describe("garde-fou des deux voies tarifaires", () => {
  it("n'annonce jamais « aucun frais » quand un tarif est publié", () => {
    // INSEEC vend son MSc 8 175 € en initial et le propose en alternance.
    // L'afficher « aucun frais pour l'alternant » serait faux pour la moitié
    // des candidats. Le garde-fou existait dans la dérivation et manquait dans
    // l'affichage, qui l'aurait donc contourné.
    const cout = conditionDuCout(e({ prix: 8175, formats: ["alternance", "presentiel"] }));
    expect(cout.valeur).not.toBe("Aucun frais pour l'alternant");
    expect(cout.cle).not.toBe("alternance_requise");
  });

  it("l'annonce quand aucun tarif n'est publié", () => {
    expect(conditionDuCout(e({ prix: 0, formats: ["alternance"] })).cle).toBe("alternance_requise");
    expect(conditionDuCout(e({ prix: null, formats: ["alternance"] })).cle).toBe("alternance_requise");
  });
});
