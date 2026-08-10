/**
 * L'intention en attente — ce que la personne voulait faire avant qu'on lui
 * demande de se connecter.
 *
 * POURQUOI ELLE EST PERSISTÉE, ET PAS SEULEMENT EN MÉMOIRE. La confirmation
 * par email est active : le parcours d'inscription sort du site, ouvre un lien
 * dans la boîte mail, et revient dans un AUTRE ONGLET. Une intention gardée en
 * mémoire de page ne survit pas à ce trajet — c'est-à-dire précisément au
 * parcours le plus long, celui où l'oubli coûte le plus cher.
 *
 * PÉREMPTION D'UNE HEURE. Au-delà, rejouer une action que la personne ne se
 * rappelle plus avoir demandée est plus déroutant que de ne rien faire. Une
 * sauvegarde qui apparaît sans qu'on l'ait demandée est un bug, pas un service.
 *
 * CE QUI N'EST PAS COUVERT, ET C'EST ASSUMÉ : une confirmation depuis un autre
 * appareil. Le stockage local est lié au navigateur ; l'intention ne suit pas.
 * Construire pour ce cas demanderait de la faire transiter par le lien de
 * confirmation, donc par l'URL, donc de la rendre falsifiable — trop cher pour
 * ce qu'elle vaut.
 */

const CLE = "formlist.intention";
const PEREMPTION_MS = 60 * 60 * 1000;

/** Ce qu'une personne déconnectée a tenté de faire. */
export type Intention =
  | { type: "sauvegarder"; cible: "parcours" | "organisme"; cibleId: string }
  | { type: "enregistrer-comparaison"; parcoursIds: string[]; nom: string | null };

type Enveloppe = { intention: Intention; le: number };

export function poserIntention(intention: Intention): void {
  if (typeof window === "undefined") return;
  const enveloppe: Enveloppe = { intention, le: Date.now() };
  try {
    localStorage.setItem(CLE, JSON.stringify(enveloppe));
  } catch {
    // Stockage refusé (navigation privée, quota) : l'intention est perdue, et
    // c'est acceptable — la connexion fonctionne quand même.
  }
}

/**
 * Retire et rend l'intention si elle est encore valable.
 *
 * Elle est retirée AVANT d'être rendue, y compris si elle est périmée : une
 * intention lue deux fois produirait une action jouée deux fois, et le second
 * appel n'a aucun moyen de savoir que le premier a déjà eu lieu.
 */
export function reprendreIntention(): Intention | null {
  if (typeof window === "undefined") return null;
  let brut: string | null = null;
  try {
    brut = localStorage.getItem(CLE);
    localStorage.removeItem(CLE);
  } catch {
    return null;
  }
  if (brut === null) return null;

  try {
    const enveloppe = JSON.parse(brut) as Enveloppe;
    if (Date.now() - enveloppe.le > PEREMPTION_MS) return null;
    return enveloppe.intention;
  } catch {
    return null;
  }
}

/** Oublie l'intention sans la jouer — quand la personne renonce. */
export function oublierIntention(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CLE);
  } catch {
    /* rien à faire */
  }
}
