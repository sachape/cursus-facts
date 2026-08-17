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

describe("l'unité du montant est une condition", () => {
  /*
    « 8 600 € » sur un cursus de trois ans ne dit pas ce que coûte le parcours.
    Affiché sans condition, ce montant se compare à des totaux et le lecteur
    conclut faux — la faute du tarif journalier, transposée à l'année.
  */
  const base = {
    modaliteAcces: null,
    formats: [] as const,
    categorie: "ecole" as const,
    eligibleCpf: null,
    dispoInter: true,
    dispoIntra: null,
  };

  it("dit qu'un montant annuel porte sur une année", () => {
    const c = conditionDuCout({ ...base, prix: 8600, unitePrix: "annuel" });
    expect(c.condition).toContain("par année d'études");
    expect(c.condition).toContain("pas pour le parcours entier");
  });

  it("distingue l'abonnement mensuel et le tarif journalier", () => {
    expect(conditionDuCout({ ...base, prix: 49, unitePrix: "mensuel" }).condition).toContain("par mois");
    expect(conditionDuCout({ ...base, prix: 690, unitePrix: "journalier" }).condition).toContain("par journée");
  });

  it("ne dit rien de plus sur un total — c'est l'unité par défaut", () => {
    const c = conditionDuCout({ ...base, prix: 1650, unitePrix: "total" });
    expect(c.condition).not.toContain("par année");
    expect(conditionDuCout({ ...base, prix: 1650 }).condition).not.toContain("par année");
  });

  it("laisse la gratuité qualifiée primer sur l'unité", () => {
    // Un accès libre reste un accès libre, quelle que soit l'unité écrite.
    const c = conditionDuCout({ ...base, prix: 0, modaliteAcces: "libre", unitePrix: "annuel" });
    expect(c.valeur).toBe("Gratuit");
  });
});

describe("le palier tarifaire rend le montant vérifiable", () => {
  const base = {
    modaliteAcces: null,
    formats: [] as const,
    categorie: "ecole" as const,
    eligibleCpf: null,
    dispoInter: true,
    dispoIntra: null,
  };

  it("nomme le palier en tête de la condition", () => {
    /*
      « Montant par année » sans dire laquelle laisse le lecteur devant trois
      lignes de grille et aucun moyen de choisir. Le palier est ce qui permet
      de retrouver le montant chez l'organisme.
    */
    const c = conditionDuCout({ ...base, prix: 8600, unitePrix: "annuel", prixNiveau: "Année 1" });
    expect(c.condition).toBe(
      "Tarif « Année 1 » — montant par année d'études, pas pour le parcours entier",
    );
  });

  it("retombe sur la condition d'unité seule quand le palier est inconnu", () => {
    const c = conditionDuCout({ ...base, prix: 8600, unitePrix: "annuel", prixNiveau: null });
    expect(c.condition).toBe("Montant par année d'études, pas pour le parcours entier");
    expect(conditionDuCout({ ...base, prix: 8600, unitePrix: "annuel", prixNiveau: "  " }).condition)
      .toBe("Montant par année d'études, pas pour le parcours entier");
  });

  it("ne dit rien du palier sur un total — il n'y a pas de grille", () => {
    expect(
      conditionDuCout({ ...base, prix: 1650, unitePrix: "total", prixNiveau: "Année 1" }).condition,
    ).not.toContain("Année 1");
  });
});
