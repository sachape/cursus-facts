/**
 * L'état d'une conversation d'aide au choix — dérivé, jamais stocké deux fois.
 *
 * LE FIL SE RECONSTRUIT À PARTIR DES SEULES RÉPONSES. Rien d'autre n'est
 * persisté : ni le rang, ni la liste des messages, ni les compteurs. Un fil
 * mémorisé à côté des réponses finirait par diverger d'elles — c'est le même
 * défaut que le compteur d'informations stocké en colonne, qui a menti pendant
 * six jours.
 *
 * LE SAUT DE QUESTION EST RESPECTÉ PAR CONSTRUCTION. Viser un diplôme retire la
 * question du canal de vente ; la reconstruction ne parcourt que les questions
 * APPLICABLES à chaque étape, donc une réponse devenue hors sujet sort du fil
 * sans qu'on ait à la retirer à la main.
 */
import {
  compterCandidats,
  questionsApplicables,
  type Situation,
} from "@/modele/adequation";
import type { ParcoursListe } from "@/donnees/requetes";

/** Une question déjà répondue, avec ce que la réponse a coûté au catalogue. */
export type Echange = {
  cle: keyof Situation;
  intitule: string;
  /** Le libellé affiché de l'option choisie, jamais sa valeur brute. */
  libelle: string;
  valeur: string;
  /** Combien de parcours restaient AVANT cette réponse. */
  avant: number;
  /** Combien il en reste APRÈS. */
  apres: number;
};

export type Question = ReturnType<typeof questionsApplicables>[number];

export type Fil = {
  echanges: Echange[];
  /** La question posée mais pas encore répondue. `null` = questionnaire fini. */
  courante: Question | null;
  /** Les réponses effectivement retenues, purgées de ce qui ne s'applique plus. */
  retenues: Partial<Situation>;
};

/**
 * Reconstruit le fil à partir des réponses.
 *
 * On avance question par question dans l'ordre où elles se posent : c'est ce
 * qui permet de recalculer les compteurs « avant → après » sans les mémoriser,
 * et d'arrêter à la première question restée sans réponse.
 */
export function construireFil(
  parcours: readonly ParcoursListe[],
  reponses: Partial<Situation>,
): Fil {
  const echanges: Echange[] = [];
  let retenues: Partial<Situation> = {};

  for (;;) {
    const applicables = questionsApplicables(retenues);
    const question = applicables[echanges.length];
    if (question === undefined) return { echanges, courante: null, retenues };

    const cle = question.cle as keyof Situation;
    const valeur = reponses[cle];
    if (valeur === undefined) return { echanges, courante: question, retenues };

    const avant = compterCandidats(parcours, retenues);
    const suite = { ...retenues, [cle]: valeur } as Partial<Situation>;
    const apres = compterCandidats(parcours, suite);
    retenues = suite;

    echanges.push({
      cle,
      intitule: question.intitule,
      libelle: (question.options as Record<string, string>)[valeur as string] ?? String(valeur),
      valeur: valeur as string,
      avant,
      apres,
    });
  }
}

/**
 * Retire une réponse ET TOUT CE QUI LA SUIT.
 *
 * Modifier une réponse invalide les suivantes : elles ont été données dans un
 * contexte qui n'existe plus, et les garder produirait un fil que personne n'a
 * composé. C'est le point où un format conversationnel est habituellement moins
 * bon qu'un parcours guidé — il doit donc être explicite, pas silencieux.
 */
export function reprendreDepuis(fil: Fil, cle: keyof Situation): Partial<Situation> {
  const rang = fil.echanges.findIndex((e) => e.cle === cle);
  if (rang < 0) return fil.retenues;
  const gardes: Partial<Situation> = {};
  for (const echange of fil.echanges.slice(0, rang)) {
    (gardes as Record<string, string>)[echange.cle] = echange.valeur;
  }
  return gardes;
}

const CLE_STOCKAGE = "formlist.aide-au-choix";

/**
 * Relit la conversation d'un précédent passage.
 *
 * APRÈS MONTAGE UNIQUEMENT. Le stockage n'existe pas au rendu serveur, et le
 * lire au premier rendu produirait un HTML différent de celui du client : React
 * jetterait l'arbre entier, et des invariants sans rapport tomberaient.
 */
export function relireConversation(): Partial<Situation> | null {
  if (typeof window === "undefined") return null;
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (brut === null) return null;
    const lu = JSON.parse(brut) as unknown;
    if (typeof lu !== "object" || lu === null) return null;
    return lu as Partial<Situation>;
  } catch {
    return null;
  }
}

export function memoriserConversation(reponses: Partial<Situation>): void {
  if (typeof window === "undefined") return;
  try {
    if (Object.keys(reponses).length === 0) localStorage.removeItem(CLE_STOCKAGE);
    else localStorage.setItem(CLE_STOCKAGE, JSON.stringify(reponses));
  } catch {
    // Stockage refusé : la conversation vit le temps de la page, sans plus.
  }
}
