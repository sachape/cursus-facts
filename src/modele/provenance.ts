/**
 * Provenance des valeurs — on n'efface pas, on déclasse.
 *
 * LA RÈGLE. Une valeur existante qu'on ne peut pas reconfirmer ne devient
 * jamais « non communiqué ». Elle conserve sa valeur, passe en `a_confirmer`,
 * et entre en tête de la file de vérification. Seule la lecture d'une page
 * officielle **constatant l'absence** de l'information autorise le passage en
 * « non publié par l'organisme ».
 *
 * POURQUOI. Une consigne d'écriture — n'affirme pas sans vérifier — sans règle
 * d'effacement produit une dérive silencieuse : face à une valeur qu'il ne peut
 * pas confirmer, on la supprime. C'est ce qui est arrivé le 3 août 2026 sur 61
 * prix, dont les trois parcours Google que Google lui-même publie « Free ». La
 * consigne avait été appliquée à la lettre et le résultat était faux.
 *
 * Une disparition d'information est un **événement suspect, pas une mise à
 * jour**. Cette règle vaut pour toute correction manuelle comme pour un futur
 * agent de rafraîchissement, qui reproduirait le même comportement à l'échelle.
 */
import type { ChampInformation } from "@/types/cursus";

/** Un changement de valeur, conservé pour pouvoir être annulé. */
export type ChangementValeur = {
  champ: ChampInformation;
  /** La valeur d'avant. C'est elle qui rend la correction réversible. */
  valeurPrecedente: unknown;
  /** Date du changement, au format ISO court. */
  le: string;
  /** Pourquoi la valeur a changé. Jamais vide. */
  motif: string;
};

/** Ce qu'une écriture peut faire d'une valeur existante. */
export type Issue =
  | { sort: "conserve" }
  | { sort: "remplace"; valeur: unknown }
  | { sort: "declasse"; valeur: unknown; motif: string }
  | { sort: "efface"; motif: string };

/** Vrai si une valeur compte comme présente. */
export function presente(valeur: unknown): boolean {
  if (valeur === null || valeur === undefined) return false;
  if (typeof valeur === "string") return valeur.trim() !== "";
  if (Array.isArray(valeur)) return valeur.length > 0;
  return true;
}

/**
 * Arbitre une écriture sur un champ.
 *
 * `constateeAbsente` est le seul chemin vers l'effacement : il signifie qu'une
 * page officielle a été lue et que l'information n'y figure pas. Tout le reste
 * — doute, source non retrouvée, vérification impossible — déclasse.
 */
export function arbitrerEcriture(
  ancienne: unknown,
  nouvelle: unknown,
  options: { constateeAbsente?: boolean; motif: string },
): Issue {
  // Rien à protéger : le champ était déjà vide.
  if (!presente(ancienne)) {
    return presente(nouvelle) ? { sort: "remplace", valeur: nouvelle } : { sort: "conserve" };
  }
  // Une valeur en remplace une autre : c'est une mise à jour ordinaire.
  if (presente(nouvelle)) return { sort: "remplace", valeur: nouvelle };
  // À partir d'ici, l'écriture ferait disparaître une valeur.
  if (options.constateeAbsente) return { sort: "efface", motif: options.motif };
  return { sort: "declasse", valeur: ancienne, motif: options.motif };
}
