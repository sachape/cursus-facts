/**
 * Application des corrections de domaine, une par une et journalisées.
 *
 * `bun run collecte:domaines`            à blanc, n'écrit rien
 * `bun run collecte:domaines -- --ecrire` applique
 *
 * Étape distincte du crawl, et à blanc par défaut : c'est la même règle que
 * pour `appliquer-journal.ts`. Un pipeline qui écrit dans le même geste qu'il
 * constate ne laisse pas le temps de regarder ce qu'il a produit.
 *
 * DEUX SORTS S'APPLIQUENT AUTOMATIQUEMENT, LES AUTRES JAMAIS :
 *
 *   `correction_sure`           — le domaine constaté désigne le même
 *                                 organisme, la même offre. Erreur de saisie.
 *   `a_vider_puis_redecouvrir`  — la valeur actuelle est fausse et aucune ne la
 *                                 remplace. Le champ repasse à `null`, ce qui
 *                                 rend la fiche à la file de découverte.
 *
 * Tout le reste — changement de marque, offre disparue — part en attente de
 * validation. Un domaine qui redirige vers un autre organisme n'est pas une
 * correction d'URL : c'est peut-être une autre offre, et la rattacher
 * écrirait le prix d'un produit sur la fiche d'un autre.
 *
 * VIDER N'EST PAS EFFACER UNE INFORMATION. La règle « on n'efface pas une
 * valeur, on la déclasse » protège ce que l'organisme publie. Ici la valeur
 * n'est pas une information sur l'organisme : c'est une adresse à nous, dont on
 * a constaté qu'elle ne mène pas où elle prétend. La conserver ferait échouer
 * toute lecture en profondeur en silence.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const CORRECTIONS = "src/donnees/domaines-a-corriger.json";
const CATALOGUE = "src/donnees/offres-sources.json";
const EN_ATTENTE = "src/donnees/ecritures-en-attente.json";

const AUTOMATIQUES = new Set(["correction_sure", "a_vider_puis_redecouvrir"]);

type Correction = {
  id: number;
  organisme: string;
  nom: string;
  champ: string;
  valeurActuelle: string | null;
  valeurConstatee: string | null;
  sort: string;
  motif: string;
  constateLe: string;
};

const ecrire = process.argv.includes("--ecrire");

if (!existsSync(CORRECTIONS)) {
  console.error(`${CORRECTIONS} absent.`);
  process.exit(1);
}

const corrections = JSON.parse(readFileSync(CORRECTIONS, "utf8")) as Correction[];
const catalogue = JSON.parse(readFileSync(CATALOGUE, "utf8")) as Record<string, unknown>[];
const parId = new Map(catalogue.map((o) => [o["id"] as number, o]));
const enAttente = JSON.parse(readFileSync(EN_ATTENTE, "utf8")) as Record<string, unknown>[];

let appliquees = 0;
let differees = 0;

for (const c of corrections) {
  const offre = parId.get(c.id);
  if (!offre) {
    console.log(`  ✗ #${c.id} introuvable au catalogue`);
    continue;
  }

  if (!AUTOMATIQUES.has(c.sort)) {
    differees++;
    console.log(`  ⏸ #${c.id} ${c.organisme} — ${c.champ} : ${c.sort}, laissé en l'état`);
    if (ecrire && !enAttente.some((e) => e["id"] === c.id && e["champ"] === c.champ)) {
      enAttente.push({
        id: c.id,
        champ: c.champ,
        valeurPrecedente: c.valeurActuelle,
        valeurNouvelle: null,
        sort: "a_verifier_en_priorite",
        urlSource: null,
        extrait: null,
        le: c.constateLe,
        origine: "arbitrage_manuel",
        motif: c.motif,
      });
    }
    continue;
  }

  const precedente = offre[c.champ] ?? null;
  const nouvelle = c.sort === "a_vider_puis_redecouvrir" ? null : c.valeurConstatee;

  /*
    IDEMPOTENCE. Sans ce test, rejouer le script réécrit la même valeur et
    empile une entrée d'historique dont la valeur précédente est identique à la
    nouvelle. L'historique sert à annuler une correction ; un historique bruité
    de non-corrections cesse de servir à ça.
  */
  if (precedente === nouvelle) {
    console.log(`  = #${c.id} ${c.organisme} — ${c.champ} déjà à la valeur voulue`);
    continue;
  }
  console.log(
    `  ✓ #${c.id} ${c.organisme} — ${c.champ} : ${JSON.stringify(precedente)} → ${JSON.stringify(nouvelle)}`,
  );
  appliquees++;

  if (!ecrire) continue;
  offre[c.champ] = nouvelle;
  // Toute correction est annulable : la valeur précédente, la date et le motif
  // restent sur la fiche.
  offre["historique"] = [
    ...((offre["historique"] as unknown[]) ?? []),
    {
      champ: c.champ,
      valeurPrecedente: precedente,
      le: c.constateLe,
      motif: c.motif,
    },
  ];
  /*
    Une fiche dont l'adresse était fausse n'a jamais été lue en profondeur, quoi
    qu'en dise son statut : ce qu'on croyait avoir vérifié l'a été ailleurs.
  */
  if (offre["profondeur"] === "detail_verifie") {
    offre["profondeur"] = "catalogue_seul";
    offre["profondeurVerifieeLe"] = null;
  }
}

console.log(`\n  ${appliquees} correction(s) applicable(s), ${differees} différée(s)`);

if (!ecrire) {
  console.log(`  (à blanc — relancer avec --ecrire pour appliquer)\n`);
} else {
  // Indentation 1 et pas de saut final : la forme exacte des deux fichiers.
  // Un diff de 232 fiches sur un reformatage cacherait la correction de deux.
  writeFileSync(CATALOGUE, JSON.stringify(catalogue, null, 1));
  writeFileSync(EN_ATTENTE, JSON.stringify(enAttente, null, 1));
  console.log(`  → ${CATALOGUE}\n  → ${EN_ATTENTE}\n`);
}
