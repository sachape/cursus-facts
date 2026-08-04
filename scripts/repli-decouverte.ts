/**
 * Repli de découverte pour les organismes sans sitemap exploitable.
 *
 * `bun run collecte:repli -- --source <fichier-decouvertes>`
 *
 * Applique les replis par ordre de coût et s'arrête au premier qui rend des
 * URL de formation. La recherche restreinte au domaine n'est pas incluse : elle
 * exige une API de recherche, et l'appeler à la main page par page serait
 * revenir à ce que ce pipeline remplace.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { chargerCatalogue } from "../src/donnees/catalogue";
import { recuperer } from "../src/collecte/recuperation";
import { estPageFormation, rapprocher } from "../src/collecte/sitemaps";
import {
  BUDGET_EXPLORATION,
  CHEMINS_PLAN_DU_SITE,
  liensInternes,
  retenirStrategie,
  type Strategie,
} from "../src/collecte/repli-decouverte";

const SORTIE = "src/donnees/urls-repli.json";
const source = process.argv.includes("--source")
  ? process.argv[process.argv.indexOf("--source") + 1]!
  : "src/donnees/urls-decouvertes.json";

type Decouverte = { organisme: string; domaine: string; statut: string; pagesFormation: number };

/** Repli 1 — plan du site en HTML. Une requête par chemin usuel, au plus. */
async function planHtml(base: string): Promise<string[]> {
  for (const chemin of CHEMINS_PLAN_DU_SITE) {
    const reponse = await recuperer(`${base}${chemin}`);
    if (!reponse.ok) continue;
    const pages = liensInternes(reponse.texte, `${base}${chemin}`).filter(estPageFormation);
    if (pages.length >= 3) return pages;
  }
  return [];
}

/** Repli 2 — exploration à profondeur limitée depuis la racine. */
async function exploration(base: string): Promise<string[]> {
  const vues = new Set<string>([base]);
  const trouvees = new Set<string>();
  let front = [base];

  for (let niveau = 0; niveau < 2 && front.length > 0; niveau++) {
    const suivant: string[] = [];
    for (const url of front) {
      if (vues.size > BUDGET_EXPLORATION) break;
      const reponse = await recuperer(url);
      if (!reponse.ok) continue;
      for (const lien of liensInternes(reponse.texte, url)) {
        if (estPageFormation(lien)) trouvees.add(lien);
        else if (!vues.has(lien) && vues.size <= BUDGET_EXPLORATION) {
          vues.add(lien);
          suivant.push(lien);
        }
      }
    }
    front = suivant.slice(0, 12);
  }
  return [...trouvees];
}

async function main() {
  if (!existsSync(source)) throw new Error(`${source} absent.`);
  const decouvertes = JSON.parse(readFileSync(source, "utf8")) as Decouverte[];
  const catalogue = chargerCatalogue();

  const aTraiter = decouvertes.filter((d) => d.statut !== "ok" || d.pagesFormation === 0);
  console.log(`\nRepli de découverte — ${aTraiter.length} organismes sans sitemap exploitable\n`);

  const resultats: {
    organisme: string;
    strategie: Strategie | null;
    pages: number;
    rapprochees: number;
    urls: { id: number | null; url: string; lastmod: null; score: number }[];
  }[] = [];

  for (const [index, d] of aTraiter.entries()) {
    if (d.domaine === "—") {
      resultats.push({ organisme: d.organisme, strategie: null, pages: 0, rapprochees: 0, urls: [] });
      continue;
    }

    const parPlan = await planHtml(d.domaine);
    const parExploration = parPlan.length > 0 ? [] : await exploration(d.domaine);
    const { strategie, urls } = retenirStrategie({
      plan_html: parPlan,
      exploration: parExploration,
    });

    const offres = catalogue
      .filter((o) => o.organisme === d.organisme)
      .map((o) => ({ id: o.id, nom: o.nom }));
    const rapprochements = rapprocher(
      urls.map((url) => ({ url, lastmod: null })),
      offres,
    );
    const rapprochees = rapprochements.filter((r) => r.id !== null).length;

    resultats.push({
      organisme: d.organisme,
      strategie,
      pages: urls.length,
      rapprochees,
      urls: rapprochements.map((r) => ({ ...r, lastmod: null })),
    });

    console.log(
      `  ${String(index + 1).padStart(3)}/${aTraiter.length}  ${d.organisme.slice(0, 32).padEnd(32)} ` +
        `${(strategie ?? "aucune").padEnd(12)} ${String(urls.length).padStart(4)} pages  ${rapprochees} rapprochées`,
    );
  }

  writeFileSync(SORTIE, JSON.stringify(resultats, null, 1));

  const parStrategie = resultats.reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r.strategie ?? "aucune"]: (acc[r.strategie ?? "aucune"] ?? 0) + 1 }),
    {},
  );
  console.log(`\n  Organismes débloqués : ${resultats.filter((r) => r.strategie !== null).length}/${aTraiter.length}`);
  for (const [s, n] of Object.entries(parStrategie)) console.log(`      ${String(n).padStart(3)}  ${s}`);
  console.log(`  Pages trouvées       : ${resultats.reduce((s, r) => s + r.pages, 0)}`);
  console.log(`  Rapprochées          : ${resultats.reduce((s, r) => s + r.rapprochees, 0)}`);
  console.log(`\n  → ${SORTIE}\n`);
}

main();
