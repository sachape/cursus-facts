/**
 * Passe d'extraction sur la file d'URL découvertes.
 *
 * `bun run collecte:extraire -- --lot 20`  échantillon
 * `bun run collecte:extraire -- --tout`    passe complète
 *
 * Une requête réseau et une requête modèle par page. Rien n'entre au catalogue
 * sans citation vérifiée ; rien n'est effacé sans absence constatée.
 *
 * Le script écrit deux fichiers et ne touche jamais le catalogue directement :
 *   - `src/donnees/journal-extraction.json` — toutes les écritures, annulables
 *   - `src/donnees/rejets-extraction.json`  — ce qui n'a pas su être cité
 *
 * L'application au catalogue est une étape distincte et explicite. Un pipeline
 * qui écrit dans le même geste qu'il extrait ne laisse pas le temps de regarder
 * ce qu'il a produit.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { chargerCatalogue, type OffreNormalisee } from "../src/donnees/catalogue";
import {
  exigeRepliNavigateur,
  recuperer,
  texteprincipal,
} from "../src/collecte/recuperation";
import { clientAnthropic, extrairePage } from "../src/collecte/extraction";
import { journaliser, type EcritureJournalisee } from "../src/collecte/journal";
import type { Rejet } from "../src/collecte/citation";

const DECOUVERTES = "src/donnees/urls-decouvertes.json";
const JOURNAL = "src/donnees/journal-extraction.json";
const REJETS = "src/donnees/rejets-extraction.json";
const LE = new Date().toISOString().slice(0, 10);

type Decouverte = {
  organisme: string;
  urls: { id: number | null; url: string; lastmod: string | null; score: number }[];
};

const argv = process.argv.slice(2);
const tout = argv.includes("--tout");
const taille = Number(argv[argv.indexOf("--lot") + 1] ?? 20);

function fileDeTravail(catalogue: readonly OffreNormalisee[]) {
  if (!existsSync(DECOUVERTES)) {
    throw new Error(`${DECOUVERTES} absent — lancer d'abord « bun run collecte:sitemaps ».`);
  }
  const decouvertes = JSON.parse(readFileSync(DECOUVERTES, "utf8")) as Decouverte[];
  const parId = new Map(catalogue.map((o) => [o.id, o]));

  // Priorité aux fiches rapprochées et sans prix : c'est le champ dont
  // l'absence fait réellement partir un utilisateur.
  return decouvertes
    .flatMap((d) => d.urls.map((u) => ({ ...u, organisme: d.organisme })))
    .filter((u) => u.id !== null)
    .map((u) => ({ ...u, offre: parId.get(u.id!)! }))
    .filter((u) => u.offre !== undefined && u.offre.profondeur !== "detail_verifie")
    .sort((a, b) => Number(a.offre.prix !== null) - Number(b.offre.prix !== null));
}

async function main() {
  const catalogue = chargerCatalogue();
  const file = fileDeTravail(catalogue);
  const lot = tout ? file : file.slice(0, taille);
  const client = clientAnthropic();

  console.log(`\nExtraction — ${lot.length} page(s) sur ${file.length} en file\n`);

  const journal: EcritureJournalisee[] = [];
  const rejets: (Rejet & { id: number; url: string })[] = [];
  const echecs: { id: number; url: string; motif: string }[] = [];
  let proposes = 0;
  let retenus = 0;
  let pagesLues = 0;
  let repliNecessaire = 0;
  const fichesTouchees = new Set<number>();

  for (const [index, entree] of lot.entries()) {
    const etiquette = `${String(index + 1).padStart(3)}/${lot.length}  ${entree.offre.nom.slice(0, 40).padEnd(40)}`;

    const reponse = await recuperer(entree.url);
    if (!reponse.ok) {
      // Un échec réseau n'est jamais une absence d'information.
      echecs.push({ id: entree.id!, url: entree.url, motif: reponse.motif });
      console.log(`${etiquette} ✗ ${reponse.motif}`);
      continue;
    }

    const texte = texteprincipal(reponse.texte);
    if (exigeRepliNavigateur(texte)) {
      // Rendu JavaScript probable : sans repli navigateur, on classerait en
      // « non publié » des informations parfaitement publiées.
      repliNecessaire++;
      echecs.push({ id: entree.id!, url: entree.url, motif: "page_vide_repli_navigateur_requis" });
      console.log(`${etiquette} ⟳ page vide (${texte.length} car.) — repli requis`);
      continue;
    }

    pagesLues++;
    let extraction;
    try {
      extraction = await extrairePage(client, texte, entree.url);
    } catch (erreur) {
      echecs.push({
        id: entree.id!,
        url: entree.url,
        motif: erreur instanceof Error ? erreur.message.slice(0, 120) : "erreur_extraction",
      });
      console.log(`${etiquette} ✗ extraction`);
      continue;
    }

    proposes += extraction.proposes;
    retenus += Object.keys(extraction.filtrage.retenus).length;
    rejets.push(...extraction.filtrage.rejets.map((r) => ({ ...r, id: entree.id!, url: entree.url })));

    for (const [champ, cite] of Object.entries(extraction.filtrage.retenus)) {
      journal.push(
        journaliser(
          {
            id: entree.id!,
            champ,
            ancienne: (entree.offre as unknown as Record<string, unknown>)[champ] ?? null,
            nouvelle: cite.valeur,
            extrait: cite.extrait,
            urlSource: entree.url,
          },
          { le: LE, origine: "extraction_automatique", motif: "Passe d'extraction automatisée" },
        ),
      );
    }
    fichesTouchees.add(entree.id!);
    console.log(
      `${etiquette} ✓ ${String(Object.keys(extraction.filtrage.retenus).length).padStart(2)}/${String(extraction.proposes).padStart(2)} champs cités`,
    );
  }

  writeFileSync(JOURNAL, JSON.stringify(journal, null, 1));
  writeFileSync(REJETS, JSON.stringify({ rejets, echecs }, null, 1));

  const tauxCitation = proposes === 0 ? 0 : Math.round((retenus / proposes) * 100);
  const parMotif = rejets.reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r.motif]: (acc[r.motif] ?? 0) + 1 }),
    {},
  );

  console.log(`\n  Pages lues                    : ${pagesLues}/${lot.length}`);
  console.log(`  Repli navigateur nécessaire   : ${repliNecessaire}`);
  console.log(`  Champs proposés par le modèle : ${proposes}`);
  console.log(`  Champs retenus (cités)        : ${retenus}`);
  console.log(`  TAUX DE CITATION VALIDE       : ${tauxCitation} %`);
  console.log(`  Champs rejetés                : ${rejets.length}`);
  for (const [motif, n] of Object.entries(parMotif)) console.log(`      ${String(n).padStart(3)}  ${motif}`);
  console.log(`  Fiches passant à detail_verifie: ${fichesTouchees.size}`);
  console.log(
    `  Gain moyen par fiche          : ${fichesTouchees.size === 0 ? 0 : (retenus / fichesTouchees.size).toFixed(1)} champs`,
  );
  console.log(`\n  → ${JOURNAL}\n  → ${REJETS}\n`);
}

main();
