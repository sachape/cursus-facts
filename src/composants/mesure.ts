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

type Mixpanel = { track: (evenement: string, proprietes?: Proprietes) => void };

function fournisseur(): Mixpanel | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { mixpanel?: Mixpanel }).mixpanel ?? null;
}

export function mesurer(evenement: Evenement, proprietes: Proprietes = {}): void {
  // Le rendu serveur ne mesure rien : c'est la garantie, pas une précaution.
  if (typeof window === "undefined") return;
  const mp = fournisseur();
  if (mp === null) return;
  try {
    mp.track(evenement, proprietes);
  } catch {
    // Une mesure qui échoue ne casse jamais le geste qu'elle observe.
  }
}
