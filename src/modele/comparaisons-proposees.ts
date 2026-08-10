/**
 * Comparaisons possibles — construites depuis le catalogue, jamais choisies.
 *
 * AUCUNE SÉLECTION ÉDITORIALE. Les paires sont tirées au sort parmi celles qui
 * remplissent les critères, et l'ordre change à chaque chargement. Retenir
 * toujours les mêmes reviendrait à mettre en avant certains organismes — un
 * classement déguisé, que l'invariant 1 interdit autant qu'une note.
 *
 * TROIS CRITÈRES, ET CHACUN A SA RAISON :
 *
 * 1. MÊME SUJET PRINCIPAL. Comparer une formation Shopify à un mastère de deux
 *    ans n'apprend rien : les écarts y sont si nombreux qu'aucun ne ressort.
 * 2. COÛT ÉTABLI PARTOUT. Le coût est le premier critère de décision ; une
 *    comparaison où il manque d'un côté ne se lit pas, elle se devine.
 * 3. AU MOINS CINQ ÉCARTS RÉELS. Deux fiches quasi identiques produisent un
 *    tableau où tout se répète — la personne a cliqué pour rien.
 *
 * Mesuré le 10 août 2026 : 1 027 paires remplissent les trois critères, sur un
 * catalogue dont 65 % des fiches ont un coût établi. Si ce chiffre tombait à
 * zéro, la section ne s'afficherait pas — mieux vaut rien qu'une proposition
 * qui n'apprend rien.
 */
import type { ParcoursListe } from "@/donnees/requetes";
import { coutDuParcours } from "./condition-cout";

export type ComparaisonProposee = {
  /** Clé stable, pour le rendu ; jamais affichée. */
  cle: string;
  parcours: ParcoursListe[];
};

/** Le minimum d'écarts sous lequel une comparaison n'apprend rien. */
export const ECARTS_MINIMUM = 5;

/** Attributs sur lesquels un écart se constate, hors format traité à part. */
const ATTRIBUTS = [
  "prixMin",
  "duree",
  "volumeHoraire",
  "niveauEntree",
  "lieu",
  "eligibleCpf",
  "certification",
  "codeRncpRs",
  "modaliteAcces",
] as const;

/** Vrai si le coût de ce parcours est établi, au sens du modèle de coût. */
function coutEtabli(p: ParcoursListe): boolean {
  const cout = coutDuParcours(p);
  return cout.montant !== null || cout.valeur !== null;
}

/** Combien d'attributs diffèrent réellement entre ces parcours. */
export function compterEcarts(parcours: readonly ParcoursListe[]): number {
  const distincts = (valeurs: unknown[]) => new Set(valeurs.map((v) => JSON.stringify(v))).size > 1;
  let total = ATTRIBUTS.filter((a) => distincts(parcours.map((p) => p[a]))).length;
  // Le format est un tableau : on le compare trié, sinon l'ordre suffirait à
  // fabriquer un écart qui n'existe pas.
  if (distincts(parcours.map((p) => [...p.formats].sort()))) total += 1;
  return total;
}

/**
 * Construit les comparaisons proposées.
 *
 * `melanger` est injecté plutôt qu'appelé ici : le tirage doit se faire APRÈS
 * montage, jamais au rendu serveur. Un ordre tiré au sort des deux côtés
 * différerait, et l'hydratation échouerait — c'est le défaut qui a fait tomber
 * six invariants le 10 août.
 */
export function comparaisonsProposees(
  catalogue: readonly ParcoursListe[],
  combien: number,
  melanger: <T>(liste: T[]) => T[],
): ComparaisonProposee[] {
  const parSujet = new Map<string, ParcoursListe[]>();
  for (const p of catalogue) {
    if (!coutEtabli(p)) continue;
    parSujet.set(p.sujetPrincipal, [...(parSujet.get(p.sujetPrincipal) ?? []), p]);
  }

  const candidates: ComparaisonProposee[] = [];
  for (const groupe of parSujet.values()) {
    if (groupe.length < 2) continue;
    for (let i = 0; i < groupe.length; i++) {
      for (let j = i + 1; j < groupe.length; j++) {
        const paire = [groupe[i]!, groupe[j]!];
        if (compterEcarts(paire) < ECARTS_MINIMUM) continue;
        candidates.push({ cle: `${paire[0]!.slug}|${paire[1]!.slug}`, parcours: paire });
      }
    }
  }

  /*
    Un organisme au plus une fois dans la sélection rendue. Sans cette règle, un
    organisme au large catalogue occuperait mécaniquement les cinq cartes — un
    biais de volume qui se lirait comme une mise en avant.
  */
  const retenues: ComparaisonProposee[] = [];
  const vus = new Set<string>();
  for (const candidate of melanger(candidates)) {
    const organismes = candidate.parcours.map((p) => p.organismeNom);
    if (organismes.some((o) => vus.has(o))) continue;
    organismes.forEach((o) => vus.add(o));
    retenues.push(candidate);
    if (retenues.length >= combien) break;
  }
  return retenues;
}
