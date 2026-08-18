/**
 * Qui doit être prévenu de quoi — décision pure, sans base ni réseau.
 *
 * LA RÈGLE CENTRALE, ÉCRITE DANS `schema-attendu.ts` AVANT D'ÊTRE IMPLÉMENTÉE.
 * Seule une valeur qui change de VALEUR déclenche un email. Un champ qui passe
 * de « pas encore collecté » à « non publié par l'organisme » est un changement
 * pour NOUS, pas pour la personne qui suit ce parcours : rien de ce qu'elle lit
 * n'a bougé. C'est pour ça que l'historique conserve les états à côté des
 * valeurs — sans eux, on ne saurait pas distinguer les deux.
 *
 * Prévenir sur un changement d'état ferait partir un email à chaque passage de
 * la file de collecte, c'est-à-dire des centaines pour zéro information neuve.
 * C'est le mécanisme qui apprend à ignorer un expéditeur.
 */

/**
 * Les champs qui déclenchent un envoi.
 *
 * Ils portent les noms de `historique_champs.champ`, pas ceux de l'interface.
 * Le prix décide de l'achat, la certification du financement ; la durée et le
 * programme changent ce qu'on a acheté. Un champ hors de cette liste peut
 * changer sans que personne ne soit dérangé.
 */
export const CHAMPS_SURVEILLES = [
  "cout_apprenant",
  "duree",
  "programme",
  "certification",
] as const;

export type ChampSurveille = (typeof CHAMPS_SURVEILLES)[number];

/** Une ligne de `historique_champs`, réduite à ce qui décide. */
export type ChangementHistorique = {
  id: string;
  parcoursId: string;
  champ: string;
  valeurPrecedente: string | null;
  valeurNouvelle: string | null;
  etatPrecedent: string | null;
  etatNouveau: string | null;
};

/**
 * Les deux façons d'être abonné, et elles ne se ressemblent pas.
 *
 * `alerte` — un compte a demandé à suivre UN parcours, avec ses champs.
 * `abonnement` — un visiteur sans compte a coché la case du comparatif ; il
 * suit les parcours qu'il comparait, sur les champs par défaut.
 *
 * Les traiter par un seul type les rendrait indistinguables au moment
 * d'enregistrer l'envoi, et c'est là que se joue l'idempotence.
 */
export type Destinataire =
  | {
      type: "alerte";
      id: string;
      email: string;
      parcoursId: string;
      champsSurveilles: readonly string[];
      active: boolean;
    }
  | {
      type: "abonnement";
      id: string;
      email: string;
      parcoursIds: readonly string[];
      consentement: boolean;
      desabonneLe: string | null;
    };

export type Notification = {
  destinataire: { type: Destinataire["type"]; id: string; email: string };
  changements: ChangementHistorique[];
};

/**
 * Un changement mérite-t-il un email ?
 *
 * Trois refus, dans cet ordre : le champ n'est pas suivi, la valeur n'a pas
 * bougé, ou seul l'état a bougé. Le deuxième et le troisième sont le même test
 * — c'est volontaire, il se lit mieux ainsi qu'en négatif.
 */
export function changementNotifiable(changement: ChangementHistorique): boolean {
  if (!(CHAMPS_SURVEILLES as readonly string[]).includes(changement.champ)) return false;

  /*
    Comparaison sur la valeur SEULE. Deux lignes peuvent différer par leur état
    et porter la même valeur : c'est le cas d'une fiche relue dont l'organisme
    ne publiait rien et ne publie toujours rien. Rien à annoncer.
  */
  return changement.valeurPrecedente !== changement.valeurNouvelle;
}

/** Un abonné est-il joignable aujourd'hui ? */
function joignable(destinataire: Destinataire): boolean {
  if (destinataire.email.trim() === "") return false;
  if (destinataire.type === "alerte") return destinataire.active;
  /*
    LE DÉSABONNEMENT PRIME SUR LE CONSENTEMENT, toujours. Une ligne peut porter
    les deux — on a consenti puis changé d'avis — et l'ordre de lecture décide
    si l'on écrit à quelqu'un qui a demandé qu'on arrête.
  */
  return destinataire.consentement && destinataire.desabonneLe === null;
}

/** Ce destinataire suit-il ce parcours, sur ce champ ? */
function concerne(destinataire: Destinataire, changement: ChangementHistorique): boolean {
  if (destinataire.type === "alerte") {
    if (destinataire.parcoursId !== changement.parcoursId) return false;
    // Une alerte peut restreindre à moins de champs que le défaut, jamais plus.
    return destinataire.champsSurveilles.includes(changement.champ);
  }
  return destinataire.parcoursIds.includes(changement.parcoursId);
}

/** Clé d'idempotence : un destinataire n'est prévenu qu'une fois par changement. */
export function cleEnvoi(type: Destinataire["type"], destinataireId: string, changementId: string) {
  return `${type}:${destinataireId}:${changementId}`;
}

/**
 * Les emails à préparer, groupés par destinataire.
 *
 * UN EMAIL PAR PERSONNE, JAMAIS UN PAR CHANGEMENT. Une ingestion qui corrige
 * quatre champs d'un parcours suivi enverrait autrement quatre emails en une
 * minute — ce qui se lit comme une panne, puis comme du spam.
 *
 * Le résultat est ordonné : destinataires dans l'ordre reçu, changements dans
 * l'ordre reçu. Un ordre stable rend le test lisible et l'envoi rejouable.
 */
export function notificationsAPreparer(entree: {
  changements: readonly ChangementHistorique[];
  destinataires: readonly Destinataire[];
  /** Clés déjà envoyées, au format `cleEnvoi`. */
  dejaEnvoyees: ReadonlySet<string>;
}): Notification[] {
  const notifiables = entree.changements.filter(changementNotifiable);
  if (notifiables.length === 0) return [];

  const notifications: Notification[] = [];

  for (const destinataire of entree.destinataires) {
    if (!joignable(destinataire)) continue;

    const retenus = notifiables.filter(
      (changement) =>
        concerne(destinataire, changement) &&
        !entree.dejaEnvoyees.has(cleEnvoi(destinataire.type, destinataire.id, changement.id)),
    );

    if (retenus.length === 0) continue;

    notifications.push({
      destinataire: {
        type: destinataire.type,
        id: destinataire.id,
        email: destinataire.email,
      },
      changements: retenus,
    });
  }

  return notifications;
}
