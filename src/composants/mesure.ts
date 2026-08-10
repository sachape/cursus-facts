/**
 * Mesure d'usage — derrière une abstraction, et côté client uniquement.
 *
 * POURQUOI JAMAIS AU RENDU SERVEUR. Googlebot crawle nos 400 pages en ce
 * moment. Un événement émis au rendu serveur le compterait comme visiteur, et
 * la courbe d'audience mesurerait notre référencement au lieu de nos
 * utilisateurs — un chiffre faux qui a l'air juste, et sur lequel on prendrait
 * des décisions.
 *
 * AUCUNE PROPRIÉTÉ IDENTIFIANTE. Pas d'email, pas de nom, pas d'identifiant de
 * compte en propriété d'événement. On mesure des gestes, pas des personnes :
 * « une sauvegarde a été ajoutée » se suffit, « qui l'a ajoutée » ne sert
 * aucune décision produit et transforme un outil de mesure en fichier.
 *
 * L'ABSTRACTION EXISTE AVANT LE FOURNISSEUR. Mixpanel n'est pas encore
 * configuré : les appels sont posés maintenant, aux bons endroits, et
 * n'émettent rien tant que la clé manque. Poser l'instrumentation après coup
 * revient toujours à la poser partiellement, aux endroits dont on se souvient.
 */

import mixpanel from "mixpanel-browser";

/** Les gestes suivis. Une liste fermée : un événement libre ne s'analyse pas. */
export type Evenement =
  | "inscription"
  | "connexion"
  | "sauvegarde_ajoutee"
  | "sauvegarde_retiree"
  | "comparaison_enregistree";

/**
 * Propriétés autorisées — volontairement pauvres.
 *
 * `type` distingue un parcours d'un organisme, `nombre` compte des éléments.
 * Rien qui puisse désigner une personne, ni un identifiant de fiche : savoir
 * QUELLE formation a été sauvegardée reviendrait à reconstituer un signal de
 * popularité, que l'invariant de classement interdit de produire.
 */
export type Proprietes = { type?: string; nombre?: number };

/*
  Initialisé une seule fois, à la demande, et JAMAIS au rendu serveur.

  Sans jeton, tout reste inerte : c'est le comportement voulu en développement
  et dans les tests, où mesurer les gestes d'un robot fausserait la seule
  courbe qu'on regarde.
*/
let pret: boolean | null = null;

function initialiser(): boolean {
  if (pret !== null) return pret;
  if (typeof window === "undefined") return (pret = false);

  const jeton = import.meta.env["VITE_MIXPANEL_TOKEN"] as string | undefined;
  if (jeton === undefined || jeton === "") return (pret = false);

  try {
    mixpanel.init(jeton, {
      /*
        `track_pageview: false` — la capture automatique de pages compterait
        chaque exploration de Googlebot, qui parcourt nos 400 URL. La courbe
        d'audience mesurerait alors notre référencement au lieu de nos
        utilisateurs : un chiffre faux qui a l'air juste.
      */
      track_pageview: false,
      // Les URL de fiche portent des identifiants de parcours ; les remonter
      // reconstituerait un signal de popularité que le classement interdit.
      save_referrer: false,
      persistence: "localStorage",
      ip: false,
    });
    return (pret = true);
  } catch {
    return (pret = false);
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
 * chaque geste à une personne de notre base. La consigne du produit dit
 * l'inverse : aucune propriété identifiant une personne. On mesure des gestes,
 * pas des gens.
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
