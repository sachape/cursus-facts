/**
 * Application du journal d'extraction au catalogue.
 *
 * `bun run collecte:appliquer`            à blanc, n'écrit rien
 * `bun run collecte:appliquer -- --ecrire` applique
 *
 * Étape volontairement distincte de l'extraction. Un pipeline qui écrit dans le
 * même geste qu'il extrait ne laisse pas le temps de regarder ce qu'il a
 * produit — et c'est précisément en ne regardant pas qu'on efface 61 prix.
 *
 * Seules les écritures automatisables sont appliquées : valeur nouvelle,
 * attestée par citation. Toute modification d'une valeur existante est mise de
 * côté pour validation.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ecritureAutomatique, type EcritureJournalisee } from "../src/collecte/journal";

const JOURNAL = "src/donnees/journal-extraction.json";
const CATALOGUE = "src/donnees/offres-sources.json";
const EN_ATTENTE = "src/donnees/ecritures-en-attente.json";
const LE = new Date().toISOString().slice(0, 10);

const ecrire = process.argv.includes("--ecrire");

if (!existsSync(JOURNAL)) {
  console.error(`${JOURNAL} absent — lancer d'abord « bun run collecte:extraire ».`);
  process.exit(1);
}

const journal = JSON.parse(readFileSync(JOURNAL, "utf8")) as EcritureJournalisee[];
const catalogue = JSON.parse(readFileSync(CATALOGUE, "utf8")) as Record<string, unknown>[];
const parId = new Map(catalogue.map((o) => [o["id"] as number, o]));

const automatiques = journal.filter(ecritureAutomatique);
const enAttente = journal.filter((e) => !ecritureAutomatique(e));

const touchees = new Set<number>();
for (const ecriture of automatiques) {
  const offre = parId.get(ecriture.id);
  if (!offre) continue;
  offre[ecriture.champ] = ecriture.valeurNouvelle;
  // La provenance suit la valeur : sans l'extrait, l'information n'est pas
  // défendable face à un organisme qui la conteste.
  offre["historique"] = [
    ...((offre["historique"] as unknown[]) ?? []),
    {
      champ: ecriture.champ,
      valeurPrecedente: ecriture.valeurPrecedente,
      le: ecriture.le,
      motif: `Extraction automatique depuis ${ecriture.urlSource} — « ${ecriture.extrait} »`,
    },
  ];
  touchees.add(ecriture.id);
}

// Une fiche dont la page a été lue passe en profondeur vérifiée : ses champs
// vides deviennent des faits sur l'organisme, plus sur notre collecte.
for (const id of touchees) {
  const offre = parId.get(id);
  if (!offre) continue;
  offre["profondeur"] = "detail_verifie";
  offre["profondeurVerifieeLe"] = LE;
}

console.log(`\nApplication du journal — ${ecrire ? "ÉCRITURE" : "à blanc"}\n`);
console.log(`  Écritures au journal            : ${journal.length}`);
console.log(`  Automatiques (valeur nouvelle)  : ${automatiques.length}`);
console.log(`  En attente de validation        : ${enAttente.length}`);
console.log(`  Fiches passant à detail_verifie : ${touchees.size}`);

const parSort = enAttente.reduce<Record<string, number>>(
  (acc, e) => ({ ...acc, [e.sort]: (acc[e.sort] ?? 0) + 1 }),
  {},
);
for (const [sort, n] of Object.entries(parSort)) {
  console.log(`      ${String(n).padStart(4)}  ${sort}`);
}

if (ecrire) {
  writeFileSync(CATALOGUE, JSON.stringify(catalogue, null, 1));
  writeFileSync(EN_ATTENTE, JSON.stringify(enAttente, null, 1));
  console.log(`\n  → ${CATALOGUE}\n  → ${EN_ATTENTE}`);
  console.log(`\n  Vérifier ensuite : bun run test (le plancher de valeurs présentes doit tenir).\n`);
} else {
  console.log(`\n  Rien écrit. Relancer avec --ecrire pour appliquer.\n`);
}
