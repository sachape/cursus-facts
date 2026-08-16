/**
 * Combien de fiches publient une GRILLE plutôt qu'un montant ?
 *
 * `bun run collecte:mesurer-grilles`
 *
 * Le chiffre qui décide du modèle multi-tarifs. Si c'est cinq, on vit avec une
 * note ; si c'est quarante, c'est le prochain chantier de modèle.
 *
 * CE QU'EST UNE GRILLE, dans le sens qui compte : la page publie PLUSIEURS
 * tarifs pour le même parcours, indexés sur un régime (initiale / alternance),
 * une année, un format ou une rentrée. Aucun montant unique n'est alors vrai —
 * et aucun calcul ne les réconcilie. L'INSEEC affiche 11 390 € et 13 450 € par
 * année, et 24 250 € pour deux ans d'alternance : la somme des deux premiers
 * fait 24 840 €, pas 24 250 €.
 *
 * LA MESURE EST BORNÉE PAR L'APPARIEMENT, et le dénominateur le dit.
 * Seules les fiches dont la page est atteignable peuvent être classées. Les
 * autres ne sont pas « sans grille » : elles sont non mesurées. Les compter
 * comme simples serait la faute corrigée trois fois aujourd'hui.
 */
import { writeFileSync } from "node:fs";
import { chargerCatalogue } from "../src/donnees/catalogue";
import {
  enParallele,
  exigeRepliNavigateur,
  racineJoignable,
  recuperer,
  texteprincipal,
} from "../src/collecte/recuperation";
import { fermerNavigateur, rendre } from "../src/collecte/navigateur";
import { verifierCorrespondance } from "../src/collecte/correspondance";

const SORTIE = "src/donnees/mesure-grilles.json";

/** Régimes qui indexent un tarif : leur présence près des montants fait la grille. */
const REGIMES =
  /formation initiale|alternance|apprentissage|contrat de pro|formation continue|1[eè]re? ann[ée]e|2[eè]me? ann[ée]e|rentr[ée]e|pr[ée]sentiel|distanciel|inter-?entreprise|intra-?entreprise/i;

type Verdict = {
  id: number;
  nom: string;
  organisme: string;
  strate: string;
  url: string | null;
  issue: "grille" | "montant_unique" | "aucun_montant" | "non_mesuree";
  montants: number[];
  motif: string | null;
};

function montantsDe(texte: string): number[] {
  const vus = new Set<number>();
  for (const m of texte.matchAll(/(\d[\d  ]{2,9})\s?€/g)) {
    const v = Number(m[1]!.replace(/[\s ]/g, ""));
    // Sous 100 €, on attrape des frais annexes et des mensualités ; au-dessus
    // de 100 000, des chiffres d'affaires et des levées de fonds.
    if (v >= 100 && v <= 100_000) vus.add(v);
  }
  return [...vus].sort((a, b) => a - b);
}

async function mesurer(o: {
  id: number;
  nom: string;
  organisme: string;
  categorie: string;
  url: string | null;
  urlDetail: string | null;
}): Promise<Verdict> {
  const base: Verdict = {
    id: o.id, nom: o.nom, organisme: o.organisme, strate: o.categorie,
    url: o.urlDetail, issue: "non_mesuree", montants: [], motif: null,
  };
  if (!o.urlDetail) {
    const dom = (o.url ?? "").replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/^www\./, "");
    const racine = dom ? await racineJoignable(dom) : null;
    return { ...base, motif: racine ? "aucune page de détail connue" : "domaine injoignable" };
  }

  const rep = await recuperer(o.urlDetail);
  if (!rep.ok) return { ...base, motif: `page injoignable (${rep.motif})` };
  let texte = texteprincipal(rep.texte);
  let html = rep.texte;
  if (exigeRepliNavigateur(texte) || texte.length / Math.max(1, rep.texte.length) < 0.03) {
    const rendu = await rendre(o.urlDetail);
    if (rendu.ok && texteprincipal(rendu.html).length > texte.length) {
      texte = texteprincipal(rendu.html);
      html = rendu.html;
    }
  }
  if (exigeRepliNavigateur(texte)) return { ...base, motif: "page vide même après rendu" };

  const corr = verifierCorrespondance(o.nom, html);
  if (!corr.correspond) return { ...base, motif: `page d'un autre parcours (${corr.score.toFixed(2)})` };

  const montants = montantsDe(texte);
  base.montants = montants;
  if (montants.length === 0) return { ...base, issue: "aucun_montant" };
  if (montants.length === 1) return { ...base, issue: "montant_unique" };

  /*
    PLUSIEURS MONTANTS NE SUFFISENT PAS. Une page peut citer un tarif et un
    salaire moyen, ou un tarif et des frais de dossier. Ce qui fait la grille,
    c'est que les montants soient INDEXÉS par un régime — et le mot du régime
    doit se trouver près d'eux, pas n'importe où sur la page.
  */
  const proche = [...texte.matchAll(/(\d[\d  ]{2,9})\s?€/g)].some((m) => {
    const i = m.index!;
    return REGIMES.test(texte.slice(Math.max(0, i - 260), i + 120));
  });
  return proche
    ? { ...base, issue: "grille" }
    : { ...base, issue: "montant_unique", motif: `${montants.length} montants, aucun régime à proximité` };
}

async function main() {
  const catalogue = chargerCatalogue();
  const cibles = catalogue.map((o) => ({
    id: o.id, nom: o.nom, organisme: o.organisme, categorie: o.categorie as string,
    url: o.url, urlDetail: (o as { urlDetail?: string | null }).urlDetail ?? null,
  }));
  const mesurables = cibles.filter((o) => o.urlDetail !== null);

  console.log(`\nMesure des grilles tarifaires — ${catalogue.length} fiches au catalogue`);
  console.log(`  dont mesurables (page de détail connue) : ${mesurables.length}\n`);

  const verdicts = await enParallele(mesurables, 4, async (o, i) => {
    const v = await mesurer(o);
    const marque = v.issue === "grille" ? "▦" : v.issue === "montant_unique" ? "·" : "✗";
    console.log(
      `  ${String(i + 1).padStart(3)}/${mesurables.length} ${marque} #${String(v.id).padStart(3)} ${v.organisme.slice(0, 22).padEnd(22)} ${v.issue.padEnd(15)} ${v.montants.slice(0, 6).join(" · ")}`,
    );
    return v;
  });
  await fermerNavigateur();
  writeFileSync(SORTIE, JSON.stringify(verdicts, null, 1));

  const par = new Map<string, number>();
  for (const v of verdicts) par.set(v.issue, (par.get(v.issue) ?? 0) + 1);
  console.log("\n  SUR LES FICHES MESURÉES");
  for (const [k, n] of [...par].sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(3)}  ${k}`);

  const nonMesurables = catalogue.length - mesurables.length;
  console.log(`\n  ${String(nonMesurables).padStart(3)}  NON MESURÉES — aucune page de détail connue.`);
  console.log(`       Elles ne sont pas « sans grille » : elles ne sont pas mesurées.`);
  console.log(`       Le taux ne s'extrapole pas — la population mesurable est celle`);
  console.log(`       des fiches déjà appariées, qui n'est pas un échantillon au hasard.\n`);
  console.log(`  → ${SORTIE}\n`);
}

main();
