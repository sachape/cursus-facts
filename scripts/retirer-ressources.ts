/**
 * Retrait des ressources gratuites sans offre payante ni parcours borné.
 *
 * `bun run collecte:retirer`            à blanc, n'écrit rien
 * `bun run collecte:retirer -- --ecrire` applique
 *
 * CE QUE CE SCRIPT FAIT, ET DANS QUEL ORDRE.
 *
 *   1. Copie la fiche ENTIÈRE dans `ressources-ecartees.json` — programme,
 *      modalité d'accès, URL, tout. Une ressource réduite à son identifiant
 *      serait effacée, pas mise de côté, et la page Ressources aura besoin de
 *      ces données.
 *   2. Journalise le retrait dans `journal-retraits.json`, publié dans Méthode.
 *   3. Retire la fiche de `offres-sources.json`.
 *
 * L'ordre compte : la copie précède le retrait, donc une interruption entre les
 * deux laisse une ressource dupliquée — récupérable — plutôt qu'effacée.
 *
 * LE MOTIF NE DIT JAMAIS « FICHE INCOMPLÈTE ».
 *
 * L'invariant produit 3 — « Une fiche incomplète n'est jamais retirée du
 * catalogue » — est publié mot pour mot sur la page Méthode. Ces dix-neuf
 * fiches ne sont pas incomplètes : elles portent trois à quatre éléments de
 * programme et une modalité d'accès. Elles sortent parce que ce qu'elles
 * nomment n'est pas un parcours, pas parce qu'on en sait peu. Contredire un
 * invariant sur la page qui le publie serait le pire endroit pour le faire.
 *
 * LA GRATUITÉ SEULE N'ÉCARTE JAMAIS. Le catalogue porte 73 fiches à prix nul ;
 * 54 restent après ce retrait, dont 34 licences et BTS en établissement public.
 * Leur coût est PRIS EN CHARGE, il n'est pas absent — elles ont un parcours
 * borné et un prix, payé par un tiers. Les deux conditions du critère sont
 * cumulatives, et c'est la seule formulation qui prend les Academies sans
 * prendre les licences. Le 3 août, un motif voisin appliqué à une seule
 * condition avait effacé trois parcours que Google publie « gratuites ».
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const CATALOGUE = "src/donnees/offres-sources.json";
const RESSOURCES = "src/donnees/ressources-ecartees.json";
const JOURNAL = "src/donnees/journal-retraits.json";
const AUDIT = "src/donnees/audit-population.json";
const LE = "2026-08-13";

/**
 * Les dix-neuf, nommément.
 *
 * La liste est écrite en dur et non recalculée depuis l'audit : un retrait de
 * catalogue ne doit pas dépendre d'un classificateur qui pourrait rendre un
 * verdict différent au prochain passage. Ce sont ces fiches-là, décidées le
 * 13 août 2026, et aucune autre.
 */
const RETIRES = [114, 117, 118, 120, 122, 161, 162, 163, 164, 165, 166, 168, 169, 170, 171, 174, 175, 177, 178];

const MOTIF_COMMUN =
  "Ressource gratuite sans offre payante ni parcours borné : ce n'est pas un parcours au sens du catalogue. " +
  "Plateforme d'apprentissage d'éditeur, dont les modules se suivent séparément et à la carte — " +
  "aucun prix, aucune durée et aucun programme uniques ne peuvent en être vrais. " +
  "La fiche n'est pas incomplète : elle décrit un objet qui n'entre pas dans le modèle.";

/** Les deux retraits du 4 août, remontés du fichier de test vers le journal public. */
const ANTERIEURS = [
  {
    id: 105,
    organisme: "M2i Formation",
    nom: "Formations digital et multimédia",
    le: "2026-08-04",
    motif:
      "Page catalogue d'organisme fichée comme un parcours. Elle portait des champs remplis de valeurs vraies d'aucun cours — « 1 à 5 jours » n'est la durée de rien. Une moyenne de catalogue présentée comme un fait sur un parcours est une information déduite : invariant 2. Les parcours recouverts sont fichés séparément.",
  },
  {
    id: 107,
    organisme: "Dawan",
    nom: "Formations e-commerce et CMS",
    le: "2026-08-04",
    motif:
      "Page catalogue d'organisme fichée comme un parcours. Son « Aucun prérequis » était démenti par PrestaShop Développeurs, qui exige PHP et l'orienté objet. Invariant 2. Les parcours recouverts sont fichés séparément.",
  },
];

const ecrire = process.argv.includes("--ecrire");

const catalogue = JSON.parse(readFileSync(CATALOGUE, "utf8")) as Record<string, unknown>[];
const audit = existsSync(AUDIT)
  ? (JSON.parse(readFileSync(AUDIT, "utf8")) as { id: number; famille?: { motif: string } }[])
  : [];
const motifAudit = new Map(audit.map((a) => [a.id, a.famille?.motif ?? ""]));

const aRetirer = catalogue.filter((o) => RETIRES.includes(o["id"] as number));
const manquantes = RETIRES.filter((id) => !catalogue.some((o) => o["id"] === id));
if (manquantes.length > 0) {
  // Un retrait déjà appliqué n'est pas une erreur ; une liste qui ne correspond
  // à rien en est une.
  console.log(`  ⚠ ${manquantes.length} fiche(s) déjà absente(s) : ${manquantes.join(", ")}`);
}

console.log(`\nRetrait — ${aRetirer.length} fiche(s) sur ${catalogue.length}\n`);
for (const o of aRetirer) {
  console.log(`  #${String(o["id"]).padStart(3)}  ${String(o["organisme"]).padEnd(24)} ${o["nom"]}`);
}

const ressources = aRetirer.map((o) => ({
  ...o,
  retireLe: LE,
  motifRetrait: MOTIF_COMMUN,
  // Le verdict qui a mené à la décision, conservé pour qu'elle soit relisible.
  constatAudit: motifAudit.get(o["id"] as number) ?? null,
}));

const journal = [
  ...ANTERIEURS,
  ...aRetirer.map((o) => ({
    id: o["id"] as number,
    organisme: String(o["organisme"]),
    nom: String(o["nom"]),
    le: LE,
    motif: MOTIF_COMMUN,
  })),
].sort((a, b) => a.le.localeCompare(b.le) || a.id - b.id);

const restant = catalogue.filter((o) => !RETIRES.includes(o["id"] as number));

console.log(`\n  Catalogue : ${catalogue.length} → ${restant.length}`);
console.log(`  Ressources mises de côté, fiche entière : ${ressources.length}`);
console.log(`  Journal public : ${journal.length} entrées (dont ${ANTERIEURS.length} du 4 août)`);

if (!ecrire) {
  console.log(`\n  (à blanc — relancer avec --ecrire pour appliquer)\n`);
} else {
  // Copie d'abord, retrait ensuite : une interruption laisse un doublon, pas un trou.
  writeFileSync(RESSOURCES, JSON.stringify(ressources, null, 1));
  writeFileSync(JOURNAL, JSON.stringify(journal, null, 1));
  writeFileSync(CATALOGUE, JSON.stringify(restant, null, 1));
  console.log(`\n  → ${RESSOURCES}\n  → ${JOURNAL}\n  → ${CATALOGUE}\n`);
}
