/**
 * Relève un tarif publié dans une GRILLE, pas sur la page du parcours.
 *
 * `bun run scripts/relever-grille.ts --lot <fichier>`            à blanc
 * `bun run scripts/relever-grille.ts --lot <fichier> --ecrire`   applique
 *
 * POURQUOI UN SCRIPT À PART. `relever-prix` lit la page d'un parcours et lui
 * demande son tarif ; ici la page est une grille d'école, dont le titre dit
 * « Tarifs » et qui porte le prix de dix programmes. La correspondance de page
 * la rejette — à raison — et l'attribution automatique aussi : rien sur cette
 * page ne rattache « Année 1 : 8 600 € » à un cursus plutôt qu'à un autre.
 *
 * CE QUI REMPLACE L'ATTRIBUTION AUTOMATIQUE EST UNE DÉCISION HUMAINE, et elle
 * est écrite dans le lot : « cette fiche est au palier Année 1 ». C'est un
 * jugement — un bachelor de trois ans commence en année 1, un mastère de deux
 * ans en année 4 — et il est journalisé comme toute décision manuelle,
 * invariant 8.
 *
 * QUATRE GARDE-FOUS, dont trois repris de `relever-prix` :
 *   - la citation figure LITTÉRALEMENT dans la page ;
 *   - le montant figure littéralement dans la citation ;
 *   - le palier figure littéralement dans la citation — le quatrième, propre à
 *     ce script : sans lui, on écrirait un montant juste sur la mauvaise ligne
 *     de grille, ce qui est précisément le risque d'une grille ;
 *   - aucune valeur existante n'est remplacée.
 *
 * Aucun appel au modèle : tout est vérifié par comparaison de chaînes. Le
 * jugement est en amont, dans le lot, pas dans une inférence.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { exigeRepliNavigateur, recuperer, texteprincipal } from "../src/collecte/recuperation";
import { fermerNavigateur, rendre } from "../src/collecte/navigateur";
import { normaliser } from "../src/collecte/citation";

const CATALOGUE = "src/donnees/offres-sources.json";
const LE = "2026-08-17";

export type CibleGrille = {
  id: number;
  /** Rappel lisible, jamais utilisé pour décider. */
  nom?: string;
  url: string;
  /** Le palier, tel qu'il est écrit dans la grille. */
  palier: string;
  montant: number;
  unite: "annuel" | "mensuel" | "journalier" | "horaire";
  /** Extrait littéral de la grille, contenant le palier ET le montant. */
  citation: string;
  /** Ce qui justifie ce palier pour cette fiche. Entre dans l'historique. */
  justification: string;
};

type Verdict = {
  id: number;
  issue: "releve" | "citation_absente" | "montant_absent" | "palier_absent" | "page_illisible" | "prix_existant";
  motif: string | null;
};

/** Le montant figure-t-il dans la citation, quelle que soit sa graphie ? */
function montantDansCitation(montant: number, citation: string): boolean {
  const nu = normaliser(citation).replace(/[\s  .,]/g, "");
  return nu.includes(String(montant));
}

async function verifier(c: CibleGrille): Promise<Verdict> {
  /* Même chemin de lecture que `relever-prix`, repli navigateur compris : une
     grille tarifaire est souvent rendue côté client. */
  const rep = await recuperer(c.url);
  if (!rep.ok) return { id: c.id, issue: "page_illisible", motif: rep.motif };
  let texte = texteprincipal(rep.texte);
  if (exigeRepliNavigateur(texte) || texte.length / Math.max(1, rep.texte.length) < 0.03) {
    const rendu = await rendre(c.url);
    if (rendu.ok && texteprincipal(rendu.html).length > texte.length) texte = texteprincipal(rendu.html);
  }

  if (!normaliser(texte).includes(normaliser(c.citation))) {
    return { id: c.id, issue: "citation_absente", motif: "la citation ne figure pas dans la page" };
  }
  if (!montantDansCitation(c.montant, c.citation)) {
    return { id: c.id, issue: "montant_absent", motif: `${c.montant} absent de la citation` };
  }
  if (!normaliser(c.citation).includes(normaliser(c.palier))) {
    return { id: c.id, issue: "palier_absent", motif: `« ${c.palier} » absent de la citation` };
  }
  return { id: c.id, issue: "releve", motif: null };
}

async function main() {
  const iLot = process.argv.indexOf("--lot");
  if (iLot === -1) throw new Error("Usage : --lot <fichier.json> [--ecrire]");
  const lot = JSON.parse(readFileSync(process.argv[iLot + 1]!, "utf8")) as CibleGrille[];
  const ecrire = process.argv.includes("--ecrire");

  console.log(`\nRelevé de grille — ${lot.length} fiche(s)\n`);
  const verdicts: Verdict[] = [];
  for (const c of lot) {
    const v = await verifier(c);
    verdicts.push(v);
    const marque = v.issue === "releve" ? "€" : "·";
    console.log(
      `  ${marque} #${String(c.id).padStart(3)} ${c.palier.padEnd(18)} ${String(c.montant).padStart(6)} € ` +
        `${v.issue}${v.motif !== null ? ` — ${v.motif}` : ""}`,
    );
  }
  await fermerNavigateur();

  const retenus = verdicts.filter((v) => v.issue === "releve").map((v) => v.id);
  if (!ecrire) {
    console.log(`\n  (à blanc — ${retenus.length} tarif(s) écrivable(s))\n`);
    return;
  }

  const catalogue = JSON.parse(readFileSync(CATALOGUE, "utf8")) as Record<string, unknown>[];
  const parId = new Map(catalogue.map((o) => [o["id"] as number, o]));
  let ecrits = 0;
  for (const c of lot.filter((x) => retenus.includes(x.id))) {
    const o = parId.get(c.id);
    if (!o) continue;
    // Aucune valeur existante n'est remplacée : cette passe comble des vides.
    if (o["prix"] !== null && o["prix"] !== undefined) continue;
    o["prix"] = c.montant;
    o["unitePrix"] = c.unite;
    o["prixNiveau"] = c.palier;
    o["historique"] = [
      ...((o["historique"] as unknown[]) ?? []),
      {
        champ: "prix",
        valeurPrecedente: null,
        le: LE,
        motif:
          `Relevé dans la grille tarifaire de l'organisme, palier « ${c.palier} ». ` +
          `${c.justification} ${c.url} — « ${c.citation} »`,
      },
    ];
    o["aConfirmer"] = ((o["aConfirmer"] as string[]) ?? []).filter((x) => x !== "prix");
    ecrits++;
  }
  writeFileSync(CATALOGUE, JSON.stringify(catalogue, null, 1));
  console.log(`\n  ${ecrits} tarif(s) écrit(s).\n  → ${CATALOGUE}\n`);
}

if (import.meta.main) void main();
