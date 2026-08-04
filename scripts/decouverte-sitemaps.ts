/**
 * Découverte des URL de détail par les sitemaps des organismes.
 *
 * `bun run collecte:sitemaps` — sans clé API, sans modèle. Récupère le
 * robots.txt de chaque organisme, suit les sitemaps déclarés, filtre les pages
 * de formation et les rapproche des parcours déjà fichés.
 *
 * Sortie : `src/donnees/urls-decouvertes.json`, qui alimente la file
 * d'extraction. Les URL non rapprochées y figurent aussi — ce sont des
 * parcours que nous n'avons jamais vus.
 */
import { writeFileSync } from "node:fs";
import { chargerCatalogue } from "../src/donnees/catalogue";
import { lireRobots, recuperer } from "../src/collecte/recuperation";
import {
  estIndex,
  estPageFormation,
  lireSitemap,
  rapprocher,
  type EntreeSitemap,
} from "../src/collecte/sitemaps";

const SORTIE = "src/donnees/urls-decouvertes.json";
/** Un index peut pointer des centaines de sous-sitemaps ; on borne. */
const MAX_SOUS_SITEMAPS = 24;
/**
 * Plafond d'URL **non rapprochées** conservées par organisme.
 *
 * Il ne s'applique jamais avant le rapprochement. Plafonner d'abord gardait ce
 * qui arrive en tête du sitemap — chez une université, des pages d'orientation
 * (« comment choisir sa licence ») plutôt que les fiches diplôme — et le
 * rapprochement travaillait ensuite sur les mauvaises URL. Douze organismes
 * touchaient le plafond exactement, ce qui aurait dû suffire à le signaler.
 */
const MAX_NOUVELLES_PAR_ORGANISME = 400;

type ResultatOrganisme = {
  organisme: string;
  domaine: string;
  statut: "ok" | "sans_sitemap" | "sans_domaine_au_catalogue" | "domaine_muet";
  motif?: string;
  pagesFormation: number;
  rapprochees: number;
  nouvelles: number;
  urls: { id: number | null; url: string; lastmod: string | null; score: number }[];
};

/** Normalise le domaine tel qu'il est stocké au catalogue. */
function origine(url: string): string | null {
  const brut = url.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!brut || brut === "—" || !brut.includes(".")) return null;
  return `https://${brut.startsWith("www.") ? brut : brut}`;
}

async function sitemapsDunDomaine(base: string): Promise<{ urls: string[]; robots: ReturnType<typeof lireRobots> | null }> {
  const reponse = await recuperer(`${base}/robots.txt`);
  if (!reponse.ok) return { urls: [`${base}/sitemap.xml`], robots: null };
  const robots = lireRobots(reponse.texte);
  const urls = robots.sitemaps.length > 0 ? robots.sitemaps : [`${base}/sitemap.xml`];
  return { urls, robots };
}

async function collecterEntrees(sitemaps: string[]): Promise<EntreeSitemap[]> {
  const entrees: EntreeSitemap[] = [];
  const aTraiter = [...sitemaps];
  let index = 0;

  while (aTraiter.length > 0 && index < MAX_SOUS_SITEMAPS) {
    const url = aTraiter.shift()!;
    index++;
    const reponse = await recuperer(url);
    if (!reponse.ok) continue;
    const lues = lireSitemap(reponse.texte);
    if (estIndex(reponse.texte)) {
      // Priorité aux sous-sitemaps dont le nom évoque des formations.
      const tries = lues
        .map((e) => e.url)
        .sort((a, b) => Number(/format|cours|product|page/i.test(b)) - Number(/format|cours|product|page/i.test(a)));
      aTraiter.push(...tries.slice(0, MAX_SOUS_SITEMAPS - index));
    } else {
      entrees.push(...lues);
    }
    if (entrees.length > 40_000) break;
  }
  return entrees;
}

async function main() {
  const catalogue = chargerCatalogue();
  const parOrganisme = new Map<string, typeof catalogue>();
  for (const offre of catalogue) {
    const liste = parOrganisme.get(offre.organisme) ?? [];
    liste.push(offre);
    parOrganisme.set(offre.organisme, liste);
  }

  console.log(`\nDécouverte par sitemaps — ${parOrganisme.size} organismes\n`);
  const resultats: ResultatOrganisme[] = [];
  let traites = 0;

  for (const [organisme, offres] of parOrganisme) {
    traites++;
    const base = origine(offres[0]!.url ?? "");
    if (!base) {
      // Ce n'est pas un domaine injoignable : c'est un domaine que nous n'avons
      // jamais noté. Confondre les deux ferait chercher une panne là où il n'y
      // a qu'un champ vide — et attendre indéfiniment un serveur qu'on n'a
      // jamais interrogé.
      resultats.push({
        organisme, domaine: "—", statut: "sans_domaine_au_catalogue",
        motif: "aucune URL d'organisme au catalogue",
        pagesFormation: 0, rapprochees: 0, nouvelles: 0, urls: [],
      });
      continue;
    }

    const { urls: sitemaps, robots } = await sitemapsDunDomaine(base);
    const entrees = await collecterEntrees(sitemaps);

    const pages = entrees
      .filter((e) => estPageFormation(e.url))
      .filter((e) => {
        if (!robots) return true;
        try {
          return robots.autorise(new URL(e.url).pathname);
        } catch {
          return false;
        }
      });

    // Rapprochement sur la totalité des pages, puis plafond sur les seules
    // nouvelles : aucune URL rapprochée n'est jamais perdue par troncature.
    const tous = rapprocher(pages, offres.map((o) => ({ id: o.id, nom: o.nom })));
    const rapprochements = [
      ...tous.filter((r) => r.id !== null),
      ...tous
        .filter((r) => r.id === null)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_NOUVELLES_PAR_ORGANISME),
    ];
    const rapprochees = rapprochements.filter((r) => r.id !== null).length;

    resultats.push({
      organisme,
      domaine: base,
      statut: entrees.length === 0 ? "sans_sitemap" : "ok",
      pagesFormation: pages.length,
      rapprochees,
      nouvelles: rapprochements.length - rapprochees,
      urls: rapprochements,
    });

    process.stdout.write(
      `\r  ${String(traites).padStart(3)}/${parOrganisme.size}  ${organisme.slice(0, 34).padEnd(34)} ` +
        `${String(pages.length).padStart(4)} pages  ${String(rapprochees).padStart(3)} rapprochées`.padEnd(30),
    );
  }

  writeFileSync(SORTIE, JSON.stringify(resultats, null, 1));

  const ok = resultats.filter((r) => r.statut === "ok");
  const pages = resultats.reduce((s, r) => s + r.pagesFormation, 0);
  const rapprochees = resultats.reduce((s, r) => s + r.rapprochees, 0);
  const nouvelles = resultats.reduce((s, r) => s + r.nouvelles, 0);

  console.log(`\n\n  Organismes avec sitemap exploitable : ${ok.length}/${resultats.length}`);
  console.log(`  Pages de formation trouvées         : ${pages}`);
  console.log(`  Rapprochées d'un parcours fiché     : ${rapprochees} / ${catalogue.length}`);
  console.log(`  Parcours inconnus découverts        : ${nouvelles}`);
  console.log(`\n  → ${SORTIE}\n`);
}

main();
