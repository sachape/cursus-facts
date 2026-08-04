import { describe, expect, it } from "vitest";
import { filtrerParCitation, normaliser, verifierCitation } from "./citation";

const PAGE = `Formation WordPress et WooCommerce — Créez facilement votre boutique en ligne.
Durée : 3 jours (21h00). Tarif inter-entreprises : à partir de 1 495 € HT.
Tarif intra-entreprise : à partir de 4 485 € HT. Prix pour un groupe de 12 personnes max.
Prérequis : connaissances de base de Windows et de l'utilisation du Web.
Au programme : Installer WooCommerce, Configurer le catalogue, Gérer les commandes.
Cette formation est éligible au CPF.`;

describe("citation obligatoire", () => {
  it("accepte une valeur littéralement présente dans son extrait", () => {
    expect(verifierCitation(1495, "à partir de 1 495 € HT", PAGE)).toEqual({ valide: true });
  });

  it("accepte un nombre quelle que soit son écriture des milliers", () => {
    // « 1 495 », « 1495 », « 1.495 » sont le même prix. Un rejet ici coûterait
    // autant qu'une acceptation à tort : il laisserait vide un champ publié.
    for (const forme of ["1 495 € HT", "1495€ HT", "1.495 € HT", "1 495,00 € HT"]) {
      const page = `Tarif : ${forme}`;
      expect(verifierCitation(1495, `Tarif : ${forme}`, page).valide).toBe(true);
    }
  });

  it("rejette une valeur absente de son extrait", () => {
    // Le cas central : le modèle a lu 1 495 ailleurs et cite une autre phrase.
    const verdict = verifierCitation(1495, "Durée : 3 jours (21h00)", PAGE);
    expect(verdict).toMatchObject({ valide: false, motif: "valeur_absente_de_l_extrait" });
  });

  it("rejette un extrait que la page ne contient pas", () => {
    // Un modèle peut fabriquer une citation aussi bien qu'une valeur. Sans
    // ancrage dans le texte réellement récupéré, la citation ne prouve rien.
    const verdict = verifierCitation(890, "Tarif exceptionnel : 890 € HT", PAGE);
    expect(verdict).toMatchObject({ valide: false, motif: "extrait_absent_de_la_page" });
  });

  it("rejette un extrait vide", () => {
    expect(verifierCitation(1495, "   ", PAGE)).toMatchObject({
      valide: false,
      motif: "extrait_vide",
    });
  });

  it("exige que chaque élément d'une liste soit attesté", () => {
    const extrait = "Au programme : Installer WooCommerce, Configurer le catalogue, Gérer les commandes.";
    expect(
      verifierCitation(["Installer WooCommerce", "Configurer le catalogue"], extrait, PAGE).valide,
    ).toBe(true);
    // Un seul module inventé suffit à rejeter la liste entière : un programme
    // à moitié fabriqué est pire qu'un programme absent, il a l'air complet.
    expect(
      verifierCitation(
        ["Installer WooCommerce", "Optimiser le référencement"],
        extrait,
        PAGE,
      ).valide,
    ).toBe(false);
  });

  it("n'accepte un booléen que sur marqueur explicite", () => {
    expect(verifierCitation(true, "Cette formation est éligible au CPF.", PAGE).valide).toBe(true);
    // Sans marqueur, la valeur est une lecture du modèle — une déduction.
    expect(verifierCitation(true, "Durée : 3 jours (21h00)", PAGE).valide).toBe(false);
  });

  it("ignore les variations de rendu, jamais celles de contenu", () => {
    expect(normaliser("L’essentiel — 1 495 €")).toBe("l'essentiel - 1 495 €");
    expect(normaliser("PRÉREQUIS")).toBe("prerequis");
    // Deux valeurs différentes ne deviennent jamais égales.
    expect(normaliser("1495")).not.toBe(normaliser("1496"));
  });

  it("laisse passer ce qui est cité et retient le motif de chaque rejet", () => {
    const { retenus, rejets } = filtrerParCitation(
      {
        prix: { valeur: 1495, extrait: "Tarif inter-entreprises : à partir de 1 495 € HT" },
        duree: { valeur: "3 jours", extrait: "Durée : 3 jours (21h00)" },
        // Valeur plausible, extrait qui ne la porte pas.
        volumeHoraire: { valeur: 21, extrait: "Prérequis : connaissances de base de Windows" },
        // Citation fabriquée de toutes pièces.
        certification: { valeur: "Titre RNCP", extrait: "Formation certifiante RNCP 12345" },
        // Absence légitime : le champ n'est simplement pas extrait.
        region: null,
      },
      PAGE,
    );

    expect(Object.keys(retenus).sort()).toEqual(["duree", "prix"]);
    expect(rejets.map((r) => [r.champ, r.motif])).toEqual([
      ["volumeHoraire", "valeur_absente_de_l_extrait"],
      ["certification", "extrait_absent_de_la_page"],
    ]);
  });

  it("ne laisse jamais passer une valeur sans extrait", () => {
    // Le contrat du pipeline : pas de citation, pas d'écriture. Aucune
    // exception, quel que soit le champ ou la confiance affichée.
    const { retenus, rejets } = filtrerParCitation(
      { prix: { valeur: 1495, extrait: "" } },
      PAGE,
    );
    expect(retenus).toEqual({});
    expect(rejets).toHaveLength(1);
  });
});
