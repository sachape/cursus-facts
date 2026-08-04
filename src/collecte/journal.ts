/**
 * Journal des écritures — la réversibilité.
 *
 * Chaque écriture conserve la valeur précédente, la nouvelle valeur, l'URL
 * source, l'extrait cité, l'horodatage et l'origine du changement. C'est ce qui
 * manquait le 3 août 2026 : 61 prix ont été effacés sans qu'aucune trace ne
 * permette de les rendre, et il a fallu un diff Git pour les retrouver.
 *
 * Ce journal doit permettre d'annuler une correction de masse mal calibrée.
 * C'est sa seule raison d'être — pas l'audit, pas la statistique.
 */
import { arbitrerEcriture, type Issue } from "@/modele/provenance";

export const ORIGINES = [
  "extraction_automatique",
  "correction_manuelle",
  "declaration_organisme",
  "signalement_utilisateur",
] as const;
export type Origine = (typeof ORIGINES)[number];

export type EcritureJournalisee = {
  /** Identifiant du parcours concerné. */
  id: number;
  champ: string;
  valeurPrecedente: unknown;
  valeurNouvelle: unknown;
  /** Ce qui a été décidé : remplacement, déclassement, effacement, statu quo. */
  sort: Issue["sort"];
  urlSource: string | null;
  /** L'extrait qui atteste la valeur. `null` pour un déclassement. */
  extrait: string | null;
  le: string;
  origine: Origine;
  motif: string;
};

export type Proposition = {
  id: number;
  champ: string;
  ancienne: unknown;
  nouvelle: unknown;
  extrait: string | null;
  urlSource: string | null;
  /** Vrai si la page a été lue et n'énonce pas l'information. */
  constateeAbsente?: boolean;
};

/**
 * Transforme une proposition d'extraction en écriture journalisée.
 *
 * L'arbitrage vient de `provenance.ts` : on n'efface pas une valeur, on la
 * déclasse. Le journal ne décide rien, il enregistre — mais il enregistre le
 * *sort* décidé, ce qui rend chaque déclassement aussi traçable qu'une
 * écriture.
 */
export function journaliser(
  proposition: Proposition,
  contexte: { le: string; origine: Origine; motif: string },
): EcritureJournalisee {
  const issue = arbitrerEcriture(proposition.ancienne, proposition.nouvelle, {
    ...(proposition.constateeAbsente !== undefined
      ? { constateeAbsente: proposition.constateeAbsente }
      : {}),
    motif: contexte.motif,
  });

  const valeurNouvelle =
    issue.sort === "remplace"
      ? issue.valeur
      : issue.sort === "declasse"
        ? proposition.ancienne
        : issue.sort === "efface"
          ? null
          : proposition.ancienne;

  return {
    id: proposition.id,
    champ: proposition.champ,
    valeurPrecedente: proposition.ancienne,
    valeurNouvelle,
    sort: issue.sort,
    urlSource: proposition.urlSource,
    extrait: issue.sort === "remplace" ? proposition.extrait : null,
    le: contexte.le,
    origine: contexte.origine,
    motif: contexte.motif,
  };
}

/**
 * Annule un lot d'écritures, en rendant à chaque champ sa valeur précédente.
 *
 * L'ordre est inversé : si un champ a été écrit deux fois dans le lot, c'est la
 * valeur d'avant la **première** écriture qui doit revenir, pas celle d'avant
 * la seconde.
 */
export function annuler(ecritures: readonly EcritureJournalisee[]): Map<string, unknown> {
  const restitution = new Map<string, unknown>();
  for (const ecriture of [...ecritures].reverse()) {
    restitution.set(`${ecriture.id}.${ecriture.champ}`, ecriture.valeurPrecedente);
  }
  return restitution;
}

/**
 * Une écriture est-elle automatisable sans validation humaine ?
 *
 * Automatique quand la valeur est **nouvelle** et confirmée par citation
 * exacte. En attente de validation dès qu'elle modifie une valeur existante :
 * un agent qui réécrit sans supervision dans un catalogue dont l'unique actif
 * est l'exactitude est un risque de réputation concentré, et le coût de la
 * validation est faible.
 */
export function ecritureAutomatique(ecriture: EcritureJournalisee): boolean {
  if (ecriture.sort !== "remplace") return false;
  if (ecriture.extrait === null || ecriture.extrait.trim() === "") return false;
  const avait =
    ecriture.valeurPrecedente !== null &&
    ecriture.valeurPrecedente !== undefined &&
    !(Array.isArray(ecriture.valeurPrecedente) && ecriture.valeurPrecedente.length === 0) &&
    !(typeof ecriture.valeurPrecedente === "string" && ecriture.valeurPrecedente.trim() === "");
  return !avait;
}
