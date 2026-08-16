/**
 * Relève des prix chez l'organisme, avec citation.
 *
 * `bun run collecte:relever -- --lot <fichier>`            à blanc
 * `bun run collecte:relever -- --lot <fichier> --ecrire`   applique
 *
 * UN SEUL OBJECTIF : écrire des montants LUS SUR UNE PAGE. Pas de dérivation,
 * pas de gratuité déduite. Un prix sans citation n'est pas écrit.
 *
 * LES GRILLES. Quand la page publie plusieurs tarifs pour le même parcours, on
 * retient LE PLUS BAS PUBLIÉ, avec sa condition et sa citation — « à partir de
 * 11 390 € par année, formation initiale première année ». C'est vrai, c'est
 * vérifiable, et ça vaut mieux qu'une case vide. La condition vit dans la
 * citation et dans le motif d'historique ; le modèle multi-tarifs viendra plus
 * tard.
 *
 * TROIS GARDE-FOUS, TOUS PRÉEXISTANTS, AUCUN NOUVEAU :
 *   - la page doit correspondre au parcours (`verifierCorrespondance`) ;
 *   - la citation doit figurer LITTÉRALEMENT dans la page ;
 *   - le montant doit figurer littéralement dans la citation.
 * Le troisième est le seul qui empêche d'écrire un prix faux : sans lui, le
 * modèle peut citer une phrase juste et rendre un nombre qui n'y est pas.
 */
import { readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import {
  enParallele,
  exigeRepliNavigateur,
  recuperer,
  texteprincipal,
} from "../src/collecte/recuperation";
import { fermerNavigateur, rendre } from "../src/collecte/navigateur";
import { verifierCorrespondance } from "../src/collecte/correspondance";
import { normaliser } from "../src/collecte/citation";

const CATALOGUE = "src/donnees/offres-sources.json";
const LE = "2026-08-17";
const MODELE = "claude-opus-5";
const TARIF = { entree: 5, sortie: 25 };
const TAUX = Number(process.env["TAUX_USD_EUR"] ?? 0.92);
const MAX_CITATION = 220;

export type Cible = { id: number; nom: string; organisme: string; url: string };

export type Releve = {
  id: number;
  nom: string;
  organisme: string;
  url: string;
  issue: "releve" | "aucun_prix" | "citation_invalide" | "autre_parcours" | "page_illisible";
  montant: number | null;
  unite: string | null;
  condition: string | null;
  citation: string | null;
  motif: string | null;
};

const UNITES = ["total", "annuel", "mensuel", "journalier", "horaire"] as const;

const CONSIGNE = `Tu lis la page d'une formation et tu relèves SON TARIF.

Rends un objet JSON, et rien d'autre :
{"montant": <nombre ou null>, "unite": "total|annuel|mensuel|journalier|horaire|null", "condition": "<phrase courte ou null>", "citation": "<extrait littéral de la page>"}

RÈGLES ABSOLUES :
- La citation doit être un extrait EXACT de la page, copié caractère pour caractère, et contenir le montant. Maximum ${MAX_CITATION} caractères.
- Le montant doit apparaître dans la citation.
- Si la page publie PLUSIEURS tarifs pour cette formation (par régime, par année, par format), retiens LE PLUS BAS, et décris sa condition dans "condition" — par exemple "formation initiale, 1re année" ou "tarif particuliers".
- L'unité est OBLIGATOIRE si un montant est rendu. "annuel" si la page dit par an ou par année ; "mensuel" si par mois ; "journalier" si par jour ; "horaire" si par heure ; "total" si le montant couvre tout le parcours.
- N'invente rien. Si la page ne publie pas de tarif pour CETTE formation, rends {"montant": null, "unite": null, "condition": null, "citation": null}.
- Un tarif d'une AUTRE formation ne compte pas. Un financement, une aide, un salaire, un chiffre d'affaires ne sont pas un tarif.`;

function client() {
  const cle = process.env["ANTHROPIC_API_KEY"];
  if (!cle) throw new Error("ANTHROPIC_API_KEY absente.");
  return new Anthropic({ apiKey: cle });
}

let appels = 0;
let jetonsEntree = 0;
let jetonsSortie = 0;

async function interroger(
  anthropic: Anthropic,
  nomParcours: string,
  organisme: string,
  texte: string,
): Promise<{ montant: unknown; unite: unknown; condition: unknown; citation: unknown } | null> {
  appels++;
  const reponse = await anthropic.messages.create({
    model: MODELE,
    max_tokens: 1200,
    thinking: { type: "adaptive" },
    system: CONSIGNE,
    messages: [
      {
        role: "user",
        content: `Formation : « ${nomParcours} » — organisme : ${organisme}\n\nPage :\n${texte.slice(0, 120_000)}`,
      },
    ],
  });
  jetonsEntree += reponse.usage.input_tokens;
  jetonsSortie += reponse.usage.output_tokens;
  const brut = reponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const m = brut.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as never;
  } catch {
    return null;
  }
}

/** Le montant figure-t-il littéralement dans la citation ? */
function montantDansCitation(montant: number, citation: string): boolean {
  const c = normaliser(citation).replace(/[  ]/g, " ");
  const formes = [
    String(montant),
    montant.toLocaleString("fr-FR").replace(/ | /g, " "),
    String(montant).replace(/\B(?=(\d{3})+(?!\d))/g, " "),
    String(montant).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
    String(montant).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  ];
  return formes.some((f) => c.includes(normaliser(f)));
}

async function lire(anthropic: Anthropic, c: Cible): Promise<Releve> {
  const base: Releve = {
    id: c.id, nom: c.nom, organisme: c.organisme, url: c.url,
    issue: "aucun_prix", montant: null, unite: null, condition: null, citation: null, motif: null,
  };

  const rep = await recuperer(c.url);
  if (!rep.ok) return { ...base, issue: "page_illisible", motif: rep.motif };
  let texte = texteprincipal(rep.texte);
  let html = rep.texte;
  if (exigeRepliNavigateur(texte) || texte.length / Math.max(1, rep.texte.length) < 0.03) {
    const rendu = await rendre(c.url);
    if (rendu.ok && texteprincipal(rendu.html).length > texte.length) {
      texte = texteprincipal(rendu.html);
      html = rendu.html;
    }
  }
  if (exigeRepliNavigateur(texte)) return { ...base, issue: "page_illisible", motif: "page vide même après rendu" };

  const corr = verifierCorrespondance(c.nom, html);
  if (!corr.correspond) return { ...base, issue: "autre_parcours", motif: `score ${corr.score.toFixed(2)}` };

  const r = await interroger(anthropic, c.nom, c.organisme, texte);
  if (!r || typeof r.montant !== "number") return base;

  const citation = typeof r.citation === "string" ? r.citation.trim() : "";
  if (citation === "") return { ...base, issue: "citation_invalide", motif: "aucune citation" };
  if (citation.length > MAX_CITATION * 2) {
    return { ...base, issue: "citation_invalide", motif: `citation de ${citation.length} caractères` };
  }
  // La citation doit figurer littéralement dans la page.
  if (!normaliser(texte).includes(normaliser(citation))) {
    return { ...base, issue: "citation_invalide", motif: "citation absente de la page" };
  }
  // Le montant doit figurer littéralement dans la citation.
  if (!montantDansCitation(r.montant, citation)) {
    return { ...base, issue: "citation_invalide", motif: `${r.montant} absent de la citation` };
  }
  const unite = typeof r.unite === "string" && (UNITES as readonly string[]).includes(r.unite) ? r.unite : null;
  if (r.montant > 0 && unite === null) {
    return { ...base, issue: "citation_invalide", motif: "unité indéterminée" };
  }

  return {
    ...base,
    issue: "releve",
    montant: r.montant,
    unite,
    condition: typeof r.condition === "string" && r.condition.trim() !== "" ? r.condition.trim() : null,
    citation,
  };
}

export async function relever(cibles: Cible[], ecrire: boolean, sortie: string): Promise<Releve[]> {
  const anthropic = client();
  const releves = await enParallele(cibles, 4, async (c, i) => {
    let v: Releve;
    try {
      v = await lire(anthropic, c);
    } catch (e) {
      v = {
        id: c.id, nom: c.nom, organisme: c.organisme, url: c.url, issue: "page_illisible",
        montant: null, unite: null, condition: null, citation: null,
        motif: e instanceof Error ? e.message.slice(0, 90) : "erreur",
      };
    }
    const marque = v.issue === "releve" ? "€" : "·";
    console.log(
      `  ${String(i + 1).padStart(3)}/${cibles.length} ${marque} #${String(v.id).padStart(3)} ` +
        `${v.organisme.slice(0, 18).padEnd(18)} ${v.issue.padEnd(18)} ${v.montant !== null ? `${v.montant} € ${v.unite}` : (v.motif ?? "")}`,
    );
    return v;
  });
  await fermerNavigateur();
  writeFileSync(sortie, JSON.stringify(releves, null, 1));

  const retenus = releves.filter((r) => r.issue === "releve");
  const par = new Map<string, number>();
  for (const r of releves) par.set(r.issue, (par.get(r.issue) ?? 0) + 1);
  console.log("\n  ISSUES");
  for (const [k, n] of [...par].sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(3)}  ${k}`);
  console.log(
    `\n  Coût : ${appels} appel(s) → ` +
      `${(((jetonsEntree / 1e6) * TARIF.entree + (jetonsSortie / 1e6) * TARIF.sortie) * TAUX).toFixed(2)} €`,
  );

  if (!ecrire) {
    console.log(`\n  (à blanc — ${retenus.length} prix relevables)\n  → ${sortie}\n`);
    return releves;
  }

  const catalogue = JSON.parse(readFileSync(CATALOGUE, "utf8")) as Record<string, unknown>[];
  const parId = new Map(catalogue.map((o) => [o["id"] as number, o]));
  let ecrits = 0;
  for (const r of retenus) {
    const o = parId.get(r.id);
    if (!o) continue;
    /*
      UNE VALEUR EXISTANTE N'EST JAMAIS REMPLACÉE PAR CETTE PASSE. Elle écrit
      des prix ABSENTS ; corriger un prix existant est une autre décision, qui
      se prend une fiche à la fois.
    */
    if (o["prix"] !== null && o["prix"] !== undefined) continue;
    o["prix"] = r.montant;
    o["unitePrix"] = r.unite;
    o["urlDetail"] = r.url;
    o["historique"] = [
      ...((o["historique"] as unknown[]) ?? []),
      {
        champ: "prix",
        valeurPrecedente: null,
        le: LE,
        motif:
          `Relevé sur la page de l'organisme${r.condition !== null ? ` — ${r.condition}` : ""}. ` +
          `${r.url} — « ${r.citation} »`,
      },
    ];
    // Un prix relevé lève le « à confirmer » qui portait sur son absence.
    o["aConfirmer"] = ((o["aConfirmer"] as string[]) ?? []).filter((c) => c !== "prix");
    ecrits++;
  }
  writeFileSync(CATALOGUE, JSON.stringify(catalogue, null, 1));
  console.log(`\n  ${ecrits} prix écrit(s).\n  → ${CATALOGUE}\n  → ${sortie}\n`);
  return releves;
}

async function main() {
  const iLot = process.argv.indexOf("--lot");
  if (iLot === -1) throw new Error("Usage : --lot <fichier.json> [--ecrire]");
  const lot = JSON.parse(readFileSync(process.argv[iLot + 1]!, "utf8")) as Cible[];
  const sortie = process.argv[iLot + 1]!.replace(/\.json$/, "-releves.json");
  console.log(`\nRelevé de prix — ${lot.length} page(s)\nModèle : ${MODELE}\n`);
  await relever(lot, process.argv.includes("--ecrire"), sortie);
}

if (import.meta.main) main();
