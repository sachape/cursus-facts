/**
 * Vérification à blanc de l'ingestion.
 *
 *   bun run ingestion:verifier
 *
 * N'écrit rien et ne contacte aucun service : applique le modèle au catalogue
 * source et affiche ce qui partirait en base. L'écriture réelle passe par la
 * page d'administration `/admin/seed`, seule à disposer de la clé serveur.
 *
 * Utile avant chaque ingestion : si un chiffre bouge ici sans qu'une règle ait
 * changé, c'est le catalogue qui a bougé.
 */
import { preparerIngestion } from "../src/ingestion/preparer";
import { LIBELLES_DOMAINES } from "../src/modele/vocabulaires";

const { organismes, fiches, arbitrages } = preparerIngestion();

const informations = fiches.reduce((s, f) => s + (f.colonnes["infos_renseignees"] as number), 0);
const entrees = fiches.filter((f) => f.ancreSlug === null).length;
const variantes = fiches.reduce((s, f) => s + f.variantes.length, 0);

const parStatut = fiches.reduce<Record<string, number>>((acc, f) => {
  const statut = f.colonnes["statut_regroupement"] as string;
  return { ...acc, [statut]: (acc[statut] ?? 0) + 1 };
}, {});

const parDomaine = fiches.reduce<Record<string, number>>((acc, f) => {
  const domaine = LIBELLES_DOMAINES[f.colonnes["domaine"] as keyof typeof LIBELLES_DOMAINES];
  return { ...acc, [domaine]: (acc[domaine] ?? 0) + 1 };
}, {});

const denominateurs = fiches.reduce<Record<number, number>>((acc, f) => {
  const n = f.colonnes["infos_applicables"] as number;
  return { ...acc, [n]: (acc[n] ?? 0) + 1 };
}, {});

console.log(`
Ingestion à blanc — rien n'a été écrit.

  ${fiches.length} fiches            ${entrees} entrées dans la liste
  ${organismes.length} organismes        ${variantes} variantes
  ${informations} informations vérifiées
  ${arbitrages.length} cas en file d'arbitrage

Regroupement`);
for (const [statut, n] of Object.entries(parStatut).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${statut.padEnd(20)} ${n}`);
}

console.log(`\nDomaines`);
for (const [domaine, n] of Object.entries(parDomaine).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${domaine.padEnd(20)} ${n}`);
}

console.log(`\nInformations applicables par fiche`);
for (const [n, fiches] of Object.entries(denominateurs).sort()) {
  console.log(`  ${n} champs applicables  ${fiches} fiches`);
}

for (const arbitrage of arbitrages) {
  console.log(`\nArbitrage en attente\n  ${arbitrage.regle_muette}\n  ${arbitrage.preuve_retenue}`);
}
