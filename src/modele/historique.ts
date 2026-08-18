/**
 * Ce qui a changé sur un parcours, entre deux ingestions.
 *
 * PURE, ET C'EST LA CONDITION POUR Y TOUCHER. Cette fonction décide ce qui
 * s'écrit dans `historique_champs`, donc ce qui déclenchera de vrais emails
 * dans de vraies boîtes. Elle doit pouvoir être vérifiée sans base, sans
 * réseau, et sans envoyer quoi que ce soit.
 *
 * ELLE COMPARE CE QUI EST AFFICHÉ, PAS LES COLONNES. Le coût pour l'apprenant
 * n'est pas une colonne : il naît de `prix_min`, `prix_max`, `unite_prix`, la
 * modalité et les formats. Comparer les colonnes ferait annoncer un changement
 * là où l'écran ne bouge pas — un `prix_max` qui passe de null à la valeur de
 * `prix_min` n'change rien à ce qu'on lit. C'est le patron du §8 : écrire
 * l'invariant sur la restitution, jamais sur le calcul.
 */

/** L'origine d'un changement, telle que la contrainte de la table l'exige. */
export const ORIGINE_INGESTION = "extraction_automatique";

/**
 * L'état d'un parcours réduit aux champs suivis, tels qu'ils s'affichent.
 *
 * `null` signifie « rien à lire » — ni valeur, ni promesse. L'état, lui, dit
 * POURQUOI il n'y a rien à lire, et c'est ce qui permet de ne pas confondre
 * « pas encore collecté » avec « l'organisme ne publie pas ».
 */
export type EtatSuivi = {
  coutApprenant: string | null;
  duree: string | null;
  programme: string | null;
  certification: string | null;
};

/** L'état de complétude par champ, tel que `parcours.etats` le porte. */
export type EtatsChamps = Partial<Record<ChampHistorique, string | null>>;

export type ChampHistorique = "cout_apprenant" | "duree" | "programme" | "certification";

/** Une ligne prête pour `historique_champs`. */
export type LigneHistorique = {
  parcours_id: string;
  champ: ChampHistorique;
  valeur_precedente: string | null;
  valeur_nouvelle: string | null;
  etat_precedent: string | null;
  etat_nouveau: string | null;
  origine: string;
};

const CHAMPS: Array<{ champ: ChampHistorique; lire: (e: EtatSuivi) => string | null }> = [
  { champ: "cout_apprenant", lire: (e) => e.coutApprenant },
  { champ: "duree", lire: (e) => e.duree },
  { champ: "programme", lire: (e) => e.programme },
  { champ: "certification", lire: (e) => e.certification },
];

/** Normalise avant comparaison : une chaîne vide ne dit rien de plus que `null`. */
function valeur(brut: string | null): string | null {
  if (brut === null) return null;
  const propre = brut.trim();
  return propre === "" ? null : propre;
}

/**
 * Les lignes d'historique à écrire pour un parcours.
 *
 * UNE LIGNE PAR CHAMP QUI BOUGE, et rien quand rien ne bouge. Écrire une ligne
 * « identique » à chaque ingestion gonflerait la table de bruit et, surtout,
 * la sélection des alertes devrait ensuite trier ce que cette fonction aurait
 * dû ne pas écrire.
 *
 * L'ÉTAT SEUL NE PRODUIT PAS DE LIGNE. Un champ qui passe de « non collecté »
 * à « non communiqué » sans que la valeur bouge n'intéresse que notre file de
 * collecte. En écrire une ligne reviendrait à confier au module d'alertes le
 * soin de l'ignorer — deux endroits pour une règle, donc un jour deux règles.
 */
export function changementsEntre(
  parcoursId: string,
  avant: { valeurs: EtatSuivi; etats: EtatsChamps },
  apres: { valeurs: EtatSuivi; etats: EtatsChamps },
): LigneHistorique[] {
  const lignes: LigneHistorique[] = [];

  for (const { champ, lire } of CHAMPS) {
    const precedente = valeur(lire(avant.valeurs));
    const nouvelle = valeur(lire(apres.valeurs));
    if (precedente === nouvelle) continue;

    lignes.push({
      parcours_id: parcoursId,
      champ,
      valeur_precedente: precedente,
      valeur_nouvelle: nouvelle,
      etat_precedent: avant.etats[champ] ?? null,
      etat_nouveau: apres.etats[champ] ?? null,
      origine: ORIGINE_INGESTION,
    });
  }

  return lignes;
}

/**
 * Le programme, résumé par son nombre de modules.
 *
 * DÉCISION, ET ELLE MÉRITE D'ÊTRE DISCUTÉE. Comparer le contenu ferait
 * notifier la reformulation d'un intitulé de module — un changement réel, mais
 * qui ne change rien pour qui compare, et qui se produit à chaque relecture
 * d'une page d'organisme. Comparer le NOMBRE de modules attrape ce qui se
 * décide : un programme qui s'étoffe ou qui se raccourcit.
 *
 * Le coût de ce choix est assumé : douze modules réécrits de fond en comble,
 * toujours douze, ne préviendront personne.
 */
export function resumerProgramme(modules: readonly string[] | null | undefined): string | null {
  if (!modules || modules.length === 0) return null;
  return modules.length === 1 ? "1 module publié" : `${modules.length} modules publiés`;
}
