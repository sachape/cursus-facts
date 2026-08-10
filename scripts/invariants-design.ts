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
 * `src/composants/marque/` est dispensé de la règle de COULEUR, et d'elle
 * seule : une marque porte ses propres couleurs, qui sont une identité et non
 * une décision d'interface.
 *
 * L'exception portait sur le FICHIER, pas sur la règle — il sortait donc de
 * TOUS les contrôles. C'est ce qui a laissé passer dix-huit attributs SVG en
 * kebab-case pendant des mois : React les ignore en silence, le logo se rendait
 * sans ses épaisseurs de trait ni ses masques, et rien ne pouvait le dire.
 *
 * Une exception doit être aussi étroite que son motif.
 */
const DISPENSE_COULEUR = (fichier: string) => fichier.includes("composants/marque/");

/**
 * Attributs SVG écrits en kebab-case dans du JSX.
 *
 * React n'applique QUE les propriétés qu'il reconnaît : `stroke-width` n'est
 * pas `strokeWidth`, il est écarté sans erreur. L'attribut est déclaré, il ne
 * produit rien, et le rendu est subtilement faux — un trait à l'épaisseur par
 * défaut, un groupe non rogné. Exactement la syntaxe de variable Tailwind du
 * 4 août, transposée au SVG.
 *
 * Cette classe de défaut ne se voit qu'à l'œil, donc jamais. Elle se vérifie en
 * revanche mécaniquement.
 */
const SVG_KEBAB =
  /\b(stroke-width|stroke-linecap|stroke-linejoin|stroke-dasharray|stroke-dashoffset|stroke-opacity|fill-rule|fill-opacity|clip-path|clip-rule|stop-color|stop-opacity|text-anchor|dominant-baseline|vector-effect)=/;

/**
 * Espacements et tailles arbitraires dans les classes Tailwind.
 *
 * La notation entre crochets — `p-[13px]`, `text-[17px]` — est la porte par
 * laquelle une valeur hors échelle entre sans bruit. Elle est interdite pour
 * les dimensions ; les fractions d'unité relative (`w-[calc(...)]`) restent
 * hors de portée de cette règle, faute de pouvoir les rattacher à une échelle.
 */
const ARBITRAIRE = /\b(p|m|gap|w|h|text|leading|top|left|right|bottom|inset)[a-z]*-\[[\d.]+(px|rem)\](?!:)/;

/**
 * Syntaxe de variable invalide en Tailwind v4.
 *
 * `mr-[--space-6]` n'est pas une valeur : entre crochets, le double tiret est
 * lu comme une déclaration de propriété personnalisée. La classe est
 * silencieusement ignorée et l'élément perd tout style — c'est ce qui a collé
 * les onglets de domaines les uns aux autres, avec sept invariants au vert.
 *
 * La forme correcte est `mr-(--space-6)`. Cet invariant existe parce que
 * l'erreur ne produit aucun message : ni erreur de compilation, ni avertissement,
 * ni style. Elle ne se voit qu'à l'écran.
 */
const VARIABLE_INVALIDE = /\b[a-z][a-z0-9:-]*-\[--[a-z0-9-]+\]/;

/** Durées d'animation littérales. */
const DUREE = /duration-\[?\d+m?s?\]?|transition-duration:\s*\d/;

for (const racine of RACINES) {
  for (const fichier of fichiers(racine)) {
    /*
      Les commentaires sont retirés sur le FICHIER entier, pas ligne par ligne :
      un bloc `/* … *\/` sur plusieurs lignes échappait au dépouillement, et
      citer une classe pour l'expliquer déclenchait une infraction. Un invariant
      qui signale du bruit finit par être ignoré.

      Les lignes sont conservées — remplacées par du vide — pour que les
      numéros restent justes.
    */
    const brut = readFileSync(fichier, "utf8");
    const lignes = brut
      .replace(/\/\*[\s\S]*?\*\//g, (bloc) => bloc.replace(/[^\n]/g, " "))
      .split("\n");
    lignes.forEach((ligne, index) => {
      // Les commentaires citent souvent des valeurs pour expliquer une règle.
      const nu = ligne.replace(/\/\/.*$/, "");
      const ajouter = (regle: string) =>
        infractions.push({
          fichier,
          ligne: index + 1,
          extrait: brut.split("\n")[index]?.trim().slice(0, 76) ?? "",
          regle,
        });
      if (COULEUR.test(nu) && !DISPENSE_COULEUR(fichier)) ajouter("couleur littérale hors jeton");
      if (ARBITRAIRE.test(nu)) ajouter("dimension arbitraire hors échelle");
      if (DUREE.test(nu)) ajouter("durée littérale hors jeton");
      if (VARIABLE_INVALIDE.test(nu)) ajouter("syntaxe de variable invalide (crochets au lieu de parenthèses)");
      // Le JSX seulement : en CSS, `stroke-width` est la forme correcte.
      if (/\.tsx$/.test(fichier) && SVG_KEBAB.test(nu)) ajouter("attribut SVG en kebab-case (ignoré par React)");
    });
  }
}

console.log(`\nINVARIANTS DU DESIGN SYSTEM\n`);
const parRegle = new Map<string, Infraction[]>();
for (const i of infractions) {
  parRegle.set(i.regle, [...(parRegle.get(i.regle) ?? []), i]);
}

for (const regle of [
  "couleur littérale hors jeton",
  "dimension arbitraire hors échelle",
  "durée littérale hors jeton",
  "syntaxe de variable invalide (crochets au lieu de parenthèses)",
  "attribut SVG en kebab-case (ignoré par React)",
]) {
  const liste = parRegle.get(regle) ?? [];
  console.log(`${liste.length === 0 ? "  ✓" : "  ✗"} ${regle}`);
  console.log(`      ${liste.length} occurrence(s)`);
  for (const i of liste.slice(0, 10)) console.log(`        · ${i.fichier}:${i.ligne}  ${i.extrait}`);
  if (liste.length > 10) console.log(`        … et ${liste.length - 10} autre(s)`);
}

console.log(`\n  TOTAL : ${infractions.length} valeur(s) en dur\n`);
process.exit(infractions.length > 0 ? 1 : 0);
