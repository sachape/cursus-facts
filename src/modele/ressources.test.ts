import { describe, expect, it } from "vitest";
import {
  LIBELLES_TYPES_RESSOURCE,
  RESSOURCES,
  ressourceValide,
  ressourcesDuSujet,
  ressourcesParSujet,
  TYPES_RESSOURCE,
  type Ressource,
} from "./ressources";
import { SUJETS } from "./vocabulaires";

describe("ressources gratuites", () => {
  it("transforme les dix-neuf fiches retirées, pas une de plus", () => {
    expect(RESSOURCES).toHaveLength(19);
  });

  it("n'emploie aucun sujet hors du vocabulaire fermé du catalogue", () => {
    /*
      LE POINT LE PLUS IMPORTANT DE CE FICHIER. Le vocabulaire décrit le
      catalogue de FORMATIONS. Y ajouter « WiziShop » ou « Salesforce Commerce
      Cloud » parce que trois ressources gratuites en parlent ferait grandir le
      vocabulaire par le mauvais bout : le sujet naîtra le jour où une formation
      payante portera dessus. Ces trois ressources restent donc sur un sujet
      générique, avec moins de précision — et c'est la bonne perte.
    */
    const hors = RESSOURCES.flatMap((r) => r.sujets).filter((s) => !SUJETS.includes(s));
    expect(hors).toEqual([]);
  });

  it("donne à chaque ressource au moins un sujet", () => {
    // Une ressource sans sujet serait invisible sur une page groupée par sujet :
    // elle disparaîtrait sans que rien ne le signale.
    expect(RESSOURCES.filter((r) => r.sujets.length === 0)).toEqual([]);
  });

  it("ne porte que des ressources valides au sens du modèle", () => {
    expect(RESSOURCES.filter((r) => !ressourceValide(r)).map((r) => r.nom)).toEqual([]);
  });

  it("ne porte aucun champ de catalogue", () => {
    /*
      Prix, durée, certification, CPF, code-barres, compteur d'informations : le
      moindre de ces champs rouvrirait la comparaison, et une ressource
      comparable finirait par être comparée. Le contrôle porte sur les CLÉS
      elles-mêmes — c'est ce qui rend l'erreur impossible plutôt qu'interdite.
    */
    const attendues = [
      "id",
      "nom",
      "editeurOuAuteur",
      "type",
      "sujets",
      "langue",
      "url",
      "description",
      "verifieeLe",
    ].sort();
    for (const r of RESSOURCES) expect(Object.keys(r).sort()).toEqual(attendues);
  });

  it("ne porte aucun jugement comparatif dans ses descriptions", () => {
    /*
      Les mots qu'on ne s'autorise pas. « Alternative » et « avant de payer »
      diraient que la ressource remplace un parcours payant ; « meilleur » et
      « incontournable » seraient une note. Nous ne notons rien.
    */
    const interdits =
      /moins cher|avant de payer|alternative|meilleur|incontournable|au lieu de|plutôt que de payer|économis/i;
    const fautives = RESSOURCES.filter((r) => interdits.test(r.description)).map((r) => r.nom);
    expect(fautives).toEqual([]);
  });

  it("accueille une chaîne vidéo sans modification du modèle", () => {
    /*
      DEMANDÉ AVANT D'EN AJOUTER AUCUNE. Les cinq types existent, deux sont vides
      — `chaine_video` et `cours_en_ligne_gratuit` — et le recensement n'est pas
      fait. Ce test vérifie que le jour où une chaîne arrivera, rien n'aura à
      changer : le champ auteur existe déjà (`editeurOuAuteur` porte les deux
      cas), le type est déjà au vocabulaire, et la langue peut rester non
      établie.
    */
    const chaine: Ressource = {
      id: 9001,
      nom: "Exemple de chaîne",
      editeurOuAuteur: "Une autrice indépendante",
      type: "chaine_video",
      sujets: ["Shopify"],
      langue: null,
      url: "https://exemple.test/chaine",
      description: "Vidéos sur la prise en main de Shopify.",
      verifieeLe: "2026-08-16",
    };
    expect(ressourceValide(chaine)).toBe(true);
  });

  it("garde un libellé pour chacun des cinq types, y compris les vides", () => {
    for (const t of TYPES_RESSOURCE) expect(LIBELLES_TYPES_RESSOURCE[t]).toBeTruthy();
    expect(TYPES_RESSOURCE).toHaveLength(5);
  });

  it("couvre les cinq sujets restés orphelins après les retraits", () => {
    /*
      La raison d'être de cette page. Les 19 « Academies » retirées du catalogue
      laissaient cinq sujets du vocabulaire sans aucun parcours : ce qui est
      sorti du catalogue revient là où il a du sens.
    */
    for (const sujet of ["Klaviyo", "Brevo", "Email Marketing", "Etsy", "Marketplace"]) {
      expect(ressourcesDuSujet(sujet).length).toBeGreaterThan(0);
    }
  });

  it("limite à trois ce que la fiche affiche", () => {
    expect(ressourcesDuSujet("Email Marketing").length).toBeGreaterThan(3 - 1);
    expect(ressourcesDuSujet("Email Marketing", 3)).toHaveLength(3);
  });

  it("ne rend aucun groupe vide, et range chaque groupe par ordre alphabétique", () => {
    const groupes = ressourcesParSujet();
    expect(groupes.filter((g) => g.ressources.length === 0)).toEqual([]);
    for (const g of groupes) {
      const noms = g.ressources.map((r) => r.nom);
      expect(noms).toEqual([...noms].sort((a, b) => a.localeCompare(b, "fr")));
    }
  });

  it("ne renvoie rien pour un sujet que personne ne couvre — la fiche n'affiche alors pas de bloc", () => {
    expect(ressourcesDuSujet("Logistique")).toEqual([]);
  });
});
