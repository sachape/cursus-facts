/**
 * Mesure d'usage — le plan de nommage, figé.
 *
 * CE FICHIER EST LA RÉFÉRENCE. Un événement qui n'y figure pas n'existe pas :
 * la liste est fermée, TypeScript refuse un nom libre à la compilation, et
 * `mesure.test.ts` refuse un nom qui s'ajouterait au code sans passer par le
 * plan. C'est ce qui empêche d'arriver à quarante événements dont personne ne
 * sait ce qu'ils mesurent.
 *
 * LES NOMS DISENT CE QUI S'EST PASSÉ, PAS CE QU'ON A CLIQUÉ. `comparaison_lancee`,
 * jamais `bouton_comparer_clique` : le jour où le bouton devient un menu, le
 * nom d'événement resterait juste. Forme `objet_verbe` au passé, en
 * minuscules séparées par des tirets bas.
 *
 * AUCUNE DONNÉE IDENTIFIANT UNE PERSONNE. Pas d'email, pas de nom, pas de
 * texte de recherche. `recherche_effectuee` remonte la LONGUEUR de la requête,
 * jamais la requête : on veut savoir si les gens tapent trois mots ou trente,
 * pas ce qu'ils cherchent.
 *
 * `parcours_id` EST MESURÉ, ET CE N'EST PAS UNE ENTORSE AU CLASSEMENT.
 * L'invariant de `classement.ts` interdit qu'un signal d'usage entre dans le
 * TRI, la MISE EN AVANT ou l'AFFICHAGE PUBLIC — jamais qu'on sache en interne
 * quelle fiche a été ouverte. Sans `parcours_id`, l'écart de conversion entre
 * les fiches qui affichent un prix et celles qui n'en affichent pas est
 * inmesurable, et c'est précisément le chiffre qui dit où porter la collecte.
 * Ce que la mesure ne doit jamais devenir : un compteur de popularité rendu à
 * l'écran, ou une entrée dans l'ordre des résultats.
 *
 * JAMAIS AU RENDU SERVEUR. Googlebot parcourt nos 400 pages ; un événement émis
 * au rendu le compterait comme visiteur, et la courbe d'audience mesurerait
 * notre référencement au lieu de nos utilisateurs.
 */

import mixpanel from "mixpanel-browser";
import type { ParcoursListe } from "@/donnees/requetes";

/**
 * Les gestes suivis. Liste fermée, ordonnée par moment du parcours.
 *
 * Ne mesurent PAS, et c'est délibéré : le défilement, le survol, le temps passé
 * sur une page, le texte des recherches, les pages vues automatiques. Aucun de
 * ces signaux ne décide de quoi que ce soit, et chacun coûte du bruit.
 */
export const EVENEMENTS = [
  // Explorer
  "fiche_ouverte",
  "filtre_applique",
  "recherche_effectuee",
  "tri_change",
  "page_organisme_vue",
  // Comparer
  "comparaison_ajoutee",
  "comparaison_lancee",
  "comparaison_enregistree",
  // Être guidé
  "aide_au_choix_demarree",
  "aide_au_choix_question_repondue",
  "aide_au_choix_terminee",
  // Compte
  "compte_cree",
  "connexion_effectuee",
  "sauvegarde_ajoutee",
  "sauvegarde_retiree",
  "intention_rejouee",
  // Sortie
  "site_officiel_ouvert",
  "correction_signalee",
] as const;

export type Evenement = (typeof EVENEMENTS)[number];

/**
 * D'où vient le geste — la vue, pas la route.
 *
 * `autocompletion` n'est pas une page : c'est l'origine du geste à l'intérieur
 * d'une page. La distinction compte, parce qu'ouvrir une fiche depuis une
 * suggestion et l'ouvrir depuis la liste ne sont pas la même intention.
 */
export const SOURCES_VUE = [
  "explorateur",
  "organisme",
  "comparer",
  "aide_au_choix",
  "mes_formations",
  "autocompletion",
  "fiche",
] as const;

export type SourceVue = (typeof SOURCES_VUE)[number];

/**
 * Les propriétés communes d'un parcours — construites ICI, et nulle part
 * ailleurs.
 *
 * Une vue qui composerait les siennes produirait `organisme` chez l'une et
 * `nom_organisme` chez l'autre, et les deux ne se croiseraient jamais dans un
 * rapport. Le prix de la règle est un import ; le prix de son absence est un
 * entonnoir qu'on ne peut pas tracer.
 */
export type ProprietesParcours = {
  parcours_id: string;
  organisme: string;
  categorie: string;
  domaine: string;
  sujet_principal: string;
  /**
   * LA PROPRIÉTÉ LA PLUS IMPORTANTE DU PLAN.
   *
   * Elle répond à la seule question qui décide de la collecte : est-ce que les
   * fiches qui affichent un coût mènent plus souvent au site de l'organisme ?
   * Si oui, chaque prix relevé se paie tout seul.
   *
   * Elle dit CE QUE LA PERSONNE A VU, pas ce que la base contient : un montant
   * affiché, quel que soit son état de complétude.
   */
  cout_etabli: boolean;
  informations_renseignees: number;
  informations_applicables: number;
};

export function proprietesParcours(p: ParcoursListe): ProprietesParcours {
  return {
    parcours_id: p.slug,
    organisme: p.organismeNom,
    categorie: p.organismeCategorie,
    domaine: p.domaine,
    sujet_principal: p.sujetPrincipal,
    cout_etabli: p.prixMin !== null || p.prixMax !== null,
    informations_renseignees: p.infosRenseignees,
    informations_applicables: p.infosApplicables,
  };
}

/**
 * Les propriétés propres à un événement. Fermées elles aussi.
 *
 * UN MÊME NOM PARTOUT : `nombre` compte des éléments dans tous les événements
 * qui en comptent, `source_vue` désigne toujours la même chose. Deux noms pour
 * une même grandeur rendent impossible la moindre comparaison entre étapes.
 */
export type Proprietes = Partial<ProprietesParcours> & {
  /** Surcharge la vue courante quand le geste a une origine plus précise. */
  source_vue?: SourceVue;
  /** `filtre_applique` : quel filtre, et sur quelle valeur. */
  filtre?: string;
  valeur?: string;
  /** `recherche_effectuee` : la longueur de la requête, JAMAIS son texte. */
  longueur?: number;
  resultats?: number;
  /** `tri_change` : la clé de tri choisie. */
  tri?: string;
  /** Compte d'éléments — parcours comparés, résultats, parcours d'un organisme. */
  nombre?: number;
  /** `sauvegarde_*` : parcours ou organisme. */
  type?: string;
  /** `aide_au_choix_question_repondue` : la question et la réponse choisie. */
  question?: string;
  reponse?: string;
  /** `compte_cree` : ce qui a amené à créer le compte. */
  declencheur?: string;
  /** `intention_rejouee` : ce qu'on a rejoué, et après combien de temps. */
  action?: string;
  delai_secondes?: number;
};

/*
  Initialisé une seule fois, à la demande, et JAMAIS au rendu serveur.

  Sans jeton, tout reste inerte. On croyait que ça suffisait à protéger les
  chiffres en développement et dans les tests — c'était faux : le jeton vit
  dans `.env`, versionné parce que Lovable en a besoin à la construction, donc
  il est présent partout, y compris sous Playwright.
*/
let pret: boolean | null = null;

/**
 * La machine mesure-t-elle, ou est-elle en train de se tester elle-même ?
 *
 * CONSTATÉ, PAS SUPPOSÉ. Le projet contenait 52 événements dont 40 émis depuis
 * `http://localhost:4317` — le serveur que lance la suite d'invariants de
 * rendu. Le crochet de pré-poussée l'exécute à chaque poussée : chaque
 * vérification faussait la seule courbe qu'on regarde, et le taux de
 * conversion se serait mesuré sur un robot qui clique toujours au même endroit.
 *
 * Deux barrages plutôt qu'un. L'hôte local couvre le développement et
 * l'intégration continue ; `navigator.webdriver` couvre le cas où une suite
 * viserait un jour un domaine réel. Aucun des deux ne peut arriver en
 * production, où l'on sert `formlist.fr` à de vrais navigateurs.
 */
function machineDeTest(): boolean {
  const hote = window.location.hostname;
  if (hote === "localhost" || hote === "127.0.0.1" || hote === "0.0.0.0" || hote === "[::1]") {
    return true;
  }
  return navigator.webdriver === true;
}

function initialiser(): boolean {
  if (pret !== null) return pret;
  if (typeof window === "undefined") return (pret = false);
  if (machineDeTest()) return (pret = false);

  const jeton = import.meta.env["VITE_MIXPANEL_TOKEN"] as string | undefined;
  if (jeton === undefined || jeton === "") return (pret = false);

  try {
    mixpanel.init(jeton, {
      /*
        RÉGION EUROPE. Le projet a été créé en UE ; sans cette ligne, la
        bibliothèque poste vers `api-js.mixpanel.com`, c'est-à-dire le cluster
        américain, qui accepte la requête et n'en fait rien.

        C'est le pire des cas : la requête part, le navigateur ne signale
        aucune erreur, et le tableau de bord reste vide sans rien pour dire
        pourquoi. Constaté ici — quatre événements vérifiés au départ,
        zéro arrivé sur sept jours.

        Voir une requête partir ne prouve pas qu'elle arrive. La vérification
        se fait des DEUX côtés : au réseau et dans le projet.
      */
      api_host: "https://api-eu.mixpanel.com",
      /*
        `track_pageview: false` — la capture automatique de pages compterait
        chaque exploration de Googlebot, qui parcourt nos 400 URL. La courbe
        d'audience mesurerait alors notre référencement au lieu de nos
        utilisateurs : un chiffre faux qui a l'air juste.
      */
      track_pageview: false,
      // Les URL de fiche portent le slug du parcours. Il est mesuré
      // explicitement par `parcours_id` ; le laisser aussi remonter par le
      // référent ajouterait une seconde source pour la même donnée, avec un
      // nom que nous ne contrôlons pas.
      save_referrer: false,
      persistence: "localStorage",
      ip: false,
    });
    return (pret = true);
  } catch {
    return (pret = false);
  }
}

/**
 * Déclare la vue courante — une route, un mot, et c'est tout.
 *
 * Enregistrée comme propriété globale : chaque événement la porte ensuite sans
 * qu'aucune vue n'ait à la composer. C'est la contrepartie du point d'appel
 * unique : la vue dit OÙ elle est, la mesure décide de ce qu'elle en fait.
 */
export function declarerVue(source: SourceVue): void {
  if (typeof window === "undefined") return;
  if (!initialiser()) return;
  try {
    mixpanel.register({ source_vue: source });
  } catch {
    /* une mesure qui échoue ne casse jamais la vue qu'elle observe */
  }
}

/**
 * Déclare l'état de connexion — booléen, jamais l'identifiant.
 *
 * Savoir qu'un geste vient d'une personne connectée sépare deux populations
 * aux comportements différents. Savoir LAQUELLE ne sert aucune décision.
 */
export function declarerConnecte(connecte: boolean): void {
  if (typeof window === "undefined") return;
  if (!initialiser()) return;
  try {
    mixpanel.register({ connecte });
  } catch {
    /* rien à faire */
  }
}

export function mesurer(evenement: Evenement, proprietes: Proprietes = {}): void {
  // Le rendu serveur ne mesure rien : c'est la garantie, pas une précaution.
  if (typeof window === "undefined") return;
  if (!initialiser()) return;
  try {
    mixpanel.track(evenement, proprietes);
  } catch {
    // Une mesure qui échoue ne casse jamais le geste qu'elle observe.
  }
}

/**
 * Oublie l'identité du navigateur à la déconnexion.
 *
 * AUCUN `identify` N'EST APPELÉ — c'est une décision, pas un oubli. Le skill
 * Mixpanel recommande `identify(user.id)` à la connexion, ce qui rattacherait
 * chaque geste à une personne de notre base. Le plan dit l'inverse : aucune
 * donnée identifiant une personne. On mesure des gestes, pas des gens.
 *
 * Conséquence assumée : la mesure reste au niveau du navigateur, et on ne peut
 * pas suivre un même utilisateur d'un appareil à l'autre. `reset` reste utile
 * sur un poste partagé, pour ne pas coudre deux sessions en une.
 */
export function oublierIdentite(): void {
  if (typeof window === "undefined") return;
  if (!initialiser()) return;
  try {
    mixpanel.reset();
  } catch {
    /* rien à faire */
  }
}
