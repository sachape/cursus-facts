import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { EVENEMENTS, SOURCES_VUE } from "./mesure";

/*
  LE PLAN DE NOMMAGE EST FIGÉ, ET CE FICHIER EST CE QUI LE FIGE.

  La liste fermée de `mesure.ts` empêche déjà un nom libre à la compilation.
  Elle n'empêche pas ce qui arrive vraiment : quelqu'un ajoute une ligne à
  l'union parce qu'il lui faut un événement, et six mois plus tard personne ne
  sait plus lequel des quarante mesure quoi.

  La liste ci-dessous est le PLAN, recopié. Un événement qui s'ajoute au code
  doit s'ajouter ici — c'est-à-dire passer par une décision, pas par une
  autocomplétion.
*/
const PLAN = [
  "fiche_ouverte",
  "filtre_applique",
  "recherche_effectuee",
  "tri_change",
  "page_organisme_vue",
  "comparaison_ajoutee",
  "comparaison_lancee",
  "comparaison_enregistree",
  "aide_au_choix_demarree",
  "aide_au_choix_question_repondue",
  "aide_au_choix_terminee",
  "compte_cree",
  "connexion_effectuee",
  "sauvegarde_ajoutee",
  "sauvegarde_retiree",
  "intention_rejouee",
  "site_officiel_ouvert",
  "correction_signalee",
];

/** Tous les fichiers de `src/`, hors tests. */
function sources(racine: string): string[] {
  return readdirSync(racine, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(racine, entree.name);
    if (entree.isDirectory()) return sources(chemin);
    if (!/\.tsx?$/.test(entree.name)) return [];
    if (/\.test\.tsx?$/.test(entree.name)) return [];
    return [chemin];
  });
}

describe("plan de nommage de la mesure", () => {
  it("la liste des événements est exactement celle du plan", () => {
    /*
      Deux assertions, et non une seule dans les deux sens : quand le test
      casse, on veut lire QUEL nom est en trop et QUEL nom manque, pas
      « les tableaux diffèrent ».
    */
    const enTrop = EVENEMENTS.filter((e) => !PLAN.includes(e));
    const manquants = PLAN.filter((e) => !(EVENEMENTS as readonly string[]).includes(e));
    expect({ enTrop, manquants }).toEqual({ enTrop: [], manquants: [] });
  });

  it("aucun nom ne décrit un composant plutôt qu'un fait", () => {
    /*
      `bouton_comparer_clique` devient faux le jour où le bouton devient un
      menu. `comparaison_lancee` reste juste. Les termes ci-dessous nomment un
      élément d'interface ou un geste de souris, jamais ce qui s'est passé.
    */
    const TERMES_INTERDITS = ["bouton", "clique", "click", "clic", "lien", "champ", "modale"];
    const fautifs = EVENEMENTS.filter((e) =>
      TERMES_INTERDITS.some((terme) => e.includes(terme)),
    );
    expect(fautifs).toEqual([]);
  });

  it("tous les noms sont en minuscules séparées par des tirets bas", () => {
    expect(EVENEMENTS.filter((e) => !/^[a-z]+(_[a-z]+)*$/.test(e))).toEqual([]);
    expect(SOURCES_VUE.filter((s) => !/^[a-z]+(_[a-z]+)*$/.test(s))).toEqual([]);
  });

  it("aucun appel n'émet un événement absent du plan", () => {
    /*
      TypeScript refuse déjà un nom hors de l'union. Ce contrôle attrape ce que
      le typage ne voit pas : un appel construit ailleurs, ou une union élargie
      sans que le plan le soit. Il nomme le fichier et le nom fautif.
    */
    const appels = sources("src").flatMap((fichier) => {
      const source = readFileSync(fichier, "utf8");
      return [...source.matchAll(/\bmesurer\(\s*"([^"]+)"/g)].map((m) => ({
        fichier,
        nom: m[1] as string,
      }));
    });

    // Un contrôle qui ne trouve rien à contrôler ne protège rien : si le
    // balayage casse, c'est ici qu'on l'apprend, pas dans six mois.
    expect(appels.length).toBeGreaterThan(0);
    expect(appels.filter((a) => !PLAN.includes(a.nom))).toEqual([]);
  });

  it("AUCUN ÉVÉNEMENT NE PEUT PARTIR DU RENDU SERVEUR", () => {
    /*
      LE CONTRÔLE LE PLUS IMPORTANT DU FICHIER. Googlebot parcourt nos quatre
      cents pages ; un seul événement émis au rendu et la courbe d'audience
      mesure notre référencement au lieu de nos utilisateurs — sans que rien ne
      le signale, puisque les chiffres montent.

      Deux barrières, vérifiées ici :
        - `mixpanel-browser` n'est importé QUE par `mesure.ts`. Un import
          ailleurs contournerait tous les garde-fous d'un coup ;
        - chacun des points d'entrée de `mesure.ts` sort avant tout appel quand
          `window` n'existe pas.
    */
    const importateurs = sources("src").filter((f) =>
      /from "mixpanel-browser"/.test(readFileSync(f, "utf8")),
    );
    expect(importateurs).toEqual(["src/composants/mesure.ts"]);

    const source = readFileSync("src/composants/mesure.ts", "utf8");
    const POINTS_ENTREE = ["initialiser", "mesurer", "declarerVue", "declarerConnecte"];
    const sansGarde = POINTS_ENTREE.filter((nom) => {
      const debut = source.indexOf(`function ${nom}(`);
      if (debut === -1) return true;
      // Le garde doit venir dans les premières lignes du corps, avant tout usage.
      const corps = source.slice(debut, debut + 400);
      return !/typeof window === "undefined"/.test(corps);
    });
    expect(sansGarde).toEqual([]);
  });

  it("aucune propriété fourre-tout ne compte deux grandeurs différentes", () => {
    /*
      `nombre` a servi à cinq choses : parcours comparés, résultats d'aide au
      choix, parcours d'un organisme, rang d'une question, taille d'une
      sélection. Le code tournait, les chiffres arrivaient, et aucun rapport ne
      pouvait les croiser — on ne sait pas, à la lecture, laquelle des cinq
      grandeurs une valeur désigne.

      Ces noms sont donc bannis à la déclaration, y compris s'ils reviennent
      « juste pour un événement de plus ».
    */
    const BANNIS = ["nombre", "valeur", "longueur", "resultats", "tri", "filtre"];
    const source = readFileSync("src/composants/mesure.ts", "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const declarees = [...code.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1] as string);

    expect(declarees.filter((c) => BANNIS.includes(c))).toEqual([]);
  });

  it("aucune propriété ne peut porter une donnée identifiant une personne", () => {
    /*
      La règle est absolue : pas d'email, pas de nom, pas de texte de recherche
      stocké tel quel. `recherche_effectuee` remonte `longueur`, jamais la
      requête — et c'est exactement le genre de propriété qu'on rajoute « juste
      pour voir » un vendredi.

      Le contrôle porte sur la déclaration des propriétés, seul endroit où une
      clé peut naître : le type `Proprietes` est fermé, tout passe par lui.
    */
    const INTERDITS = ["email", "requete", "recherche_texte", "texte", "query", "utilisateur_id"];
    const source = readFileSync("src/composants/mesure.ts", "utf8");
    // Les commentaires citent la règle, donc les termes : on ne lit que le code.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const declarees = [...code.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1] as string);

    expect(declarees.filter((c) => INTERDITS.includes(c))).toEqual([]);
  });
});
