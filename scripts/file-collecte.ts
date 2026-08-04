/**
 * Construit et met à jour la file de collecte en profondeur.
 *
 *   bun run collecte:file        — reconstruit la file, affiche l'avancement
 *   bun run collecte:lot         — affiche le prochain lot à traiter
 *
 * La file est persistée dans src/donnees/file-collecte.json : une session
 * reprend là où la précédente s'est arrêtée. Sans cette persistance, chaque
 * session recommencerait au début et la profondeur ne serait jamais atteinte.
 */
import { writeFileSync } from "node:fs";
import { chargerCatalogue } from "../src/donnees/catalogue";
import {
  avancement,
  construireFile,
  coutDuManque,
  prochainLot,
  type EntreeFile,
} from "../src/donnees/file-collecte";
import fileExistante from "../src/donnees/file-collecte.json";

const catalogue = chargerCatalogue();
const file = construireFile(catalogue, fileExistante as EntreeFile[]);
writeFileSync("src/donnees/file-collecte.json", JSON.stringify(file, null, 1));

const etat = avancement(file);
console.log(`
File de collecte en profondeur

  ${etat.total} parcours au catalogue
  ${etat.traites} page(s) de détail vérifiée(s)
  ${etat.injoignables} injoignable(s)
  ${etat.restants} restant(s)

  Profondeur du catalogue : ${etat.pourcentage} %
`);

if (process.argv.includes("--lot")) {
  const lot = prochainLot(file, 20);
  console.log("Prochain lot — les 20 fiches dont le manque coûte le plus :\n");
  for (const e of lot) {
    const offre = catalogue.find((o) => o.id === e.id)!;
    console.log(
      `  [${String(coutDuManque(offre)).padStart(2)}] ${e.organisme.slice(0, 22).padEnd(24)} ${e.nom.slice(0, 44)}`,
    );
  }
}
