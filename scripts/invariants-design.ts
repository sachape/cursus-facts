/**
 * Invariants du design system.
 *
 * Même principe que les invariants du catalogue : une règle qui compte se
 * vérifie sur l'ensemble, pas sur un exemple. Une valeur en dur ne casse rien —
 * elle diverge en silence, et c'est comme ça qu'un système se délite.
 *
 * La vérification porte sur les composants, pas sur la définition des jetons :
 * `fondations.css` est le seul endroit où une valeur littérale est légitime.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const RACINES = ["src/composants", "src/routes"];
const DEFINITION_JETONS = "src/design/fondations.css";

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((entree) => {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(tsx|ts|css)$/.test(chemin) && chemin !== DEFINITION_JETONS ? [chemin] : [];
  });
}

type Infraction = { fichier: string; ligne: number; extrait: string; regle: string };
const infractions: Infraction[] = [];

/** Couleurs littérales : hex, rgb(), hsl(), oklch(). */
const COULEUR = /#[0-9a-f]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch)\s*\(/i;

/**
 * Espacements et tailles arbitraires dans les classes Tailwind.
 *
 * La notation entre crochets — `p-[13px]`, `text-[17px]` — est la porte par
 * laquelle une valeur hors échelle entre sans bruit. Elle est interdite pour
 * les dimensions ; les fractions d'unité relative (`w-[calc(...)]`) restent
 * hors de portée de cette règle, faute de pouvoir les rattacher à une échelle.
 */
const ARBITRAIRE = /\b(p|m|gap|w|h|text|leading|top|left|right|bottom|inset)[a-z]*-\[[\d.]+(px|rem)\]/;

/** Durées d'animation littérales. */
const DUREE = /duration-\[?\d+m?s?\]?|transition-duration:\s*\d/;

for (const racine of RACINES) {
  for (const fichier of fichiers(racine)) {
    const lignes = readFileSync(fichier, "utf8").split("\n");
    lignes.forEach((ligne, index) => {
      // Les commentaires citent souvent des valeurs pour expliquer une règle.
      const nu = ligne.replace(/\/\/.*$|\/\*[\s\S]*?\*\//g, "");
      const ajouter = (regle: string) =>
        infractions.push({
          fichier,
          ligne: index + 1,
          extrait: ligne.trim().slice(0, 76),
          regle,
        });
      if (COULEUR.test(nu)) ajouter("couleur littérale hors jeton");
      if (ARBITRAIRE.test(nu)) ajouter("dimension arbitraire hors échelle");
      if (DUREE.test(nu)) ajouter("durée littérale hors jeton");
    });
  }
}

console.log(`\nINVARIANTS DU DESIGN SYSTEM\n`);
const parRegle = new Map<string, Infraction[]>();
for (const i of infractions) {
  parRegle.set(i.regle, [...(parRegle.get(i.regle) ?? []), i]);
}

for (const regle of ["couleur littérale hors jeton", "dimension arbitraire hors échelle", "durée littérale hors jeton"]) {
  const liste = parRegle.get(regle) ?? [];
  console.log(`${liste.length === 0 ? "  ✓" : "  ✗"} ${regle}`);
  console.log(`      ${liste.length} occurrence(s)`);
  for (const i of liste.slice(0, 10)) console.log(`        · ${i.fichier}:${i.ligne}  ${i.extrait}`);
  if (liste.length > 10) console.log(`        … et ${liste.length - 10} autre(s)`);
}

console.log(`\n  TOTAL : ${infractions.length} valeur(s) en dur\n`);
process.exit(infractions.length > 0 ? 1 : 0);
