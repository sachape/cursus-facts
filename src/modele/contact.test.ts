import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ADRESSE_CONTACT, lienContact, lienCorrection } from "./contact";

/*
  UNE SEULE ADRESSE, ÉCRITE À UN SEUL ENDROIT.

  Elle vivait en clair dans quatre fichiers, et trois portaient
  `corrections@formlist.fr` — une boîte qui n'existe pas. Rien ne pouvait le
  signaler : un `mailto` ne renvoie aucune erreur, il ouvre le client mail et le
  message part dans le vide. C'est le pire défaut qu'un lien puisse avoir, parce
  qu'il fonctionne à l'écran et perd ce qu'on lui confie.

  Le contrôle porte sur le TEXTE des sources, pas sur le rendu : c'est la
  duplication qu'on interdit, et elle ne se voit qu'à la lecture.
*/

function sources(racine: string): string[] {
  return readdirSync(racine, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(racine, entree.name);
    if (entree.isDirectory()) return sources(chemin);
    if (!/\.tsx?$/.test(entree.name)) return [];
    if (/\.test\.tsx?$/.test(entree.name)) return [];
    return [chemin];
  });
}

describe("adresse de contact", () => {
  it("aucune adresse `mailto` n'est construite hors du module de contact", () => {
    /*
      Le motif vise `mailto:` SUIVI D'UNE ADRESSE, pas le mot seul : le
      collecteur écarte les liens `mailto:` en explorant les pages, et
      l'interdire lui aurait fait échouer un test qui ne le concerne pas. Un
      contrôle qui attrape des innocents finit désactivé.
    */
    const fautifs = sources("src")
      .filter((f) => f !== join("src", "modele", "contact.ts"))
      .filter((f) => /mailto:[\w.+-]*@/.test(readFileSync(f, "utf8")));

    expect(fautifs).toEqual([]);
  });

  it("aucune source ne mentionne une autre boîte que celle du module", () => {
    /*
      `corrections@` est nommé explicitement : c'est l'adresse qui a réellement
      été employée pendant des semaines, et la nommer fait échouer le test avec
      le mot qu'on cherche plutôt qu'avec une expression générique.
    */
    const fautifs = sources("src")
      .filter((f) => f !== join("src", "modele", "contact.ts"))
      .flatMap((f) => {
        const source = readFileSync(f, "utf8");
        const adresses = [...source.matchAll(/[\w.+-]+@formlist\.fr/g)].map((m) => m[0]);
        return adresses.map((a) => `${f} → ${a}`);
      });

    expect(fautifs).toEqual([]);
  });

  it("les liens produits portent bien l'adresse, et un objet", () => {
    // Un contrôle qui ne trouve rien à contrôler ne protège rien.
    expect(ADRESSE_CONTACT).toBe("contact@formlist.fr");

    const contact = lienContact("Ajout d'un organisme au catalogue");
    expect(contact.startsWith(`mailto:${ADRESSE_CONTACT}?subject=`)).toBe(true);
    expect(decodeURIComponent(contact)).toContain("Ajout d'un organisme");

    // Sans fiche : un objet générique, aucun corps.
    expect(lienCorrection()).toBe(
      `mailto:${ADRESSE_CONTACT}?subject=${encodeURIComponent("Correction — Formlist")}`,
    );

    /*
      Avec une fiche : le slug voyage dans le corps. Un signalement qui ne dit
      pas de quoi il parle oblige à le renvoyer pour le savoir.
    */
    const correction = decodeURIComponent(lienCorrection("Formation X", "formation-x-12"));
    expect(correction).toContain("Correction — Formation X");
    expect(correction).toContain("formation-x-12");
  });
});
