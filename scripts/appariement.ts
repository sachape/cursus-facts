/**
 * Appariement par les pages catalogue des organismes.
 *
 * `bun run collecte:apparier`
 *
 * Le score d'URL plafonnait à 25 % — 58 fiches sur 232 — parce qu'un chemin
 * d'URL n'est qu'un écho appauvri du titre. Sur une page catalogue, le texte du
 * lien EST le titre du parcours : l'appariement y est exact, sans score ni
 * seuil, et ne coûte qu'une requête par page catalogue.
 *
 * Tant que les trois quarts des fiches n'ont aucune page associée, ni le lot de
 * référence ni le crawl profond ne peuvent fonctionner : c'est l'appariement
 * qui débloque la mesure, pas l'inverse.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { chargerCatalogue } from "../src/donnees/catalogue";
import { enParallele, recuperer } from "../src/collecte/recuperation";
import { apparierParLibelle, liensAvecLibelle } from "../src/collecte/repli-decouverte";
import { estPageFormation } from "../src/collecte/sitemaps";

const DECOUVERTES = "src/donnees/urls-decouvertes.json";
const SORTIE = "src/donnees/appariements.json";

/** Chemins où vit habituellement le catalogue d'un organisme. */
const PAGES_CATALOGUE = [
  "/formations",
  "/nos-formations",
  "/formation",
  "/catalogue",
  "/programmes",
  "/nos-programmes",
  "/cours",
  "/courses",
  "/",
];

type Decouverte = {
  organisme: string;
  domaine: string;
  urls: { id: number | null; url: string }[];
};

async function main() {
  if (!existsSync(DECOUVERTES)) throw new Error(`${DECOUVERTES} absent.`);
  const decouvertes = JSON.parse(readFileSync(DECOUVERTES, "utf8")) as Decouverte[];
  const catalogue = chargerCatalogue();

  const dejaApparies = new Set(
    decouvertes.flatMap((d) => d.urls.filter((u) => u.id !== null).map((u) => u.id!)),
  );
  const parOrganisme = new Map<string, { id: number; nom: string }[]>();
  for (const offre of catalogue) {
    if (dejaApparies.has(offre.id)) continue;
    const liste = parOrganisme.get(offre.organisme) ?? [];
    liste.push({ id: offre.id, nom: offre.nom });
    parOrganisme.set(offre.organisme, liste);
  }

  const domaines = new Map(decouvertes.map((d) => [d.organisme, d.domaine]));
  const cibles = [...parOrganisme].filter(([o]) => (domaines.get(o) ?? "—") !== "—");

  console.log(
    `\nAppariement par pages catalogue — ${cibles.length} organismes, ` +
      `${[...parOrganisme.values()].flat().length} fiches sans page\n`,
  );

  const resultats: { id: number; url: string; libelle: string; organisme: string }[] = [];
  let traites = 0;

  await enParallele(cibles, 6, async ([organisme, fiches]) => {
    const base = domaines.get(organisme)!;
    const liens: { url: string; libelle: string }[] = [];

    for (const chemin of PAGES_CATALOGUE) {
      if (liens.length > 400) break;
      const reponse = await recuperer(`${base}${chemin}`);
      if (!reponse.ok) continue;
      liens.push(...liensAvecLibelle(reponse.texte, `${base}${chemin}`));
    }

    const apparies = apparierParLibelle(
      liens.filter((l) => estPageFormation(l.url)),
      fiches,
    );
    resultats.push(...apparies.map((a) => ({ ...a, organisme })));
    traites++;
    console.log(
      `  ${String(traites).padStart(3)}/${cibles.length}  ${organisme.slice(0, 30).padEnd(30)} ` +
        `${String(liens.length).padStart(4)} liens  ${apparies.length}/${fiches.length} appariés`,
    );
  });

  writeFileSync(SORTIE, JSON.stringify(resultats, null, 1));

  const avant = dejaApparies.size;
  console.log(`\n  Appariés par score d'URL      : ${avant} / ${catalogue.length}`);
  console.log(`  Appariés par libellé de lien  : ${resultats.length}`);
  console.log(
    `  TOTAL                         : ${avant + resultats.length} / ${catalogue.length} ` +
      `(${Math.round(((avant + resultats.length) / catalogue.length) * 100)} %)`,
  );
  console.log(`\n  → ${SORTIE}\n`);
}

main();
