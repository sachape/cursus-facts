/**
 * Formatage de date déterministe — le même octet sur le serveur et dans le
 * navigateur.
 *
 * POURQUOI PAS `toLocaleDateString`. Il dépend des données ICU du moteur, qui
 * ne sont pas les mêmes dans Node et dans le navigateur, et de la locale de la
 * machine. Le 10 août 2026, une date rendue côté serveur et réhydratée côté
 * client a produit un écart de chaîne : React a jeté tout l'arbre SSR et l'a
 * régénéré, ce qui a fait tomber six invariants de rendu d'un coup.
 *
 * L'erreur est instructive parce qu'elle ne ressemble pas à un bogue de date :
 * elle se manifeste en tests qui échouent ailleurs, sur des éléments sans
 * rapport. C'est le motif du §8 sous une forme de plus — une couche en aval,
 * ici l'hydratation, qui change le résultat sans que la règle soit fausse.
 *
 * `new Date(...)` est écarté pour la même raison : il interprète une date ISO
 * courte en UTC puis la rend dans le fuseau local, ce qui décale d'un jour à
 * l'ouest de Greenwich. On lit donc la chaîne, sans jamais construire de date.
 */

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
] as const;

/** Découpe une date ISO courte ou complète. `null` si elle n'en est pas une. */
function decouper(valeur: string): { jour: string; mois: number; annee: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valeur);
  if (m === null) return null;
  const mois = Number(m[2]) - 1;
  if (mois < 0 || mois > 11) return null;
  return { jour: m[3]!, mois, annee: m[1]! };
}

/** « 03 août 2026 ». Pour les mentions de vérification. */
export function formaterDateLongue(valeur: string | null): string {
  if (valeur === null) return "Non communiquée";
  const d = decouper(valeur);
  if (d === null) return "Non communiquée";
  return `${d.jour} ${MOIS[d.mois]} ${d.annee}`;
}

/** « 03/08/2026 ». Pour les lignes de faits, où la place manque. */
export function formaterDateCourte(valeur: string | null): string {
  if (valeur === null) return "—";
  const d = decouper(valeur);
  if (d === null) return "—";
  return `${d.jour}/${String(d.mois + 1).padStart(2, "0")}/${d.annee}`;
}

/** « 10 août ». Pour une date de fraîcheur, où l'année encombre. */
export function formaterJourMois(valeur: string | null): string {
  if (valeur === null) return "—";
  const d = decouper(valeur);
  if (d === null) return "—";
  return `${Number(d.jour)} ${MOIS[d.mois]}`;
}
