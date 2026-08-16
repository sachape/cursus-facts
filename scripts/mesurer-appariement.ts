/**
 * Mesure de l'appariement — découverte seule, aucun appel au modèle.
 *
 * `bun run collecte:mesurer-appariement`
 *
 * Rejoue la recherche de page de détail sur les fiches que le crawl a laissées
 * en `aucune_page_rapprochee`, avec `racineJoignable` corrigé. L'objectif est
 * un chiffre, pas une collecte : combien restent RÉELLEMENT bloquées une fois
 * le défaut de `www.` retiré.
 *
 * Le mur d'appariement a été déclaré clos deux fois, et il vient de se révéler
 * contaminé sur huit fiches par un défaut qui était le nôtre. Une piste fermée
 * sans sa mesure se rouvre toujours — et celle-ci se rouvre avec un chiffre.
 */
import { writeFileSync } from "node:fs";
import { chargerCatalogue } from "../src/donnees/catalogue";
import {
  enParallele,
  lireRobots,
  racineJoignable,
  recuperer,
} from "../src/collecte/recuperation";
import { estIndex, estPageFormation, lireSitemap, scoreRapprochement } from "../src/collecte/sitemaps";
import { liensAvecLibelle } from "../src/collecte/repli-decouverte";

const SORTIE = "src/donnees/mesure-appariement.json";
const SEUIL = 0.6;
const ENFANTS_MAX = 8;
const CHEMINS = ["/formations", "/nos-formations", "/formation", "/catalogue", "/"];

type Mesure = {
  id: number;
  nom: string;
  organisme: string;
  strate: string;
  codeRncpRs: string | null;
  racine: string | null;
  urlsInspectees: number;
  meilleurScore: number;
  meilleureUrl: string | null;
  /** Le meilleur candidat au seuil abaissé — ce que gagnerait un autre angle. */
  meilleurIntitule: string | null;
  issue: string;
};

async function mesurer(fiche: {
  id: number;
  nom: string;
  organisme: string;
  categorie: string;
  url: string;
  codeRncpRs: string | null;
}): Promise<Mesure> {
  const base: Mesure = {
    id: fiche.id,
    nom: fiche.nom,
    organisme: fiche.organisme,
    strate: fiche.categorie,
    codeRncpRs: fiche.codeRncpRs,
    racine: null,
    urlsInspectees: 0,
    meilleurScore: 0,
    meilleureUrl: null,
    meilleurIntitule: null,
    issue: "domaine_injoignable",
  };

  const domaine = fiche.url.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/^www\./, "").trim();
  const racine = await racineJoignable(domaine);
  if (racine === null) return base;
  base.racine = racine;

  const candidats: { url: string; libelle: string }[] = [];

  const robots = await recuperer(`${racine}/robots.txt`);
  const declares = robots.ok ? lireRobots(robots.texte).sitemaps : [];
  for (const adresse of [...declares, `${racine}/sitemap.xml`].slice(0, 2)) {
    const rep = await recuperer(adresse);
    if (!rep.ok) continue;
    const brut = lireSitemap(rep.texte);
    if (!estIndex(rep.texte)) {
      candidats.push(...brut.filter((e) => estPageFormation(e.url)).map((e) => ({ url: e.url, libelle: "" })));
      continue;
    }
    const enfants = [...brut]
      .sort((a, b) => Number(estPageFormation(b.url)) - Number(estPageFormation(a.url)))
      .slice(0, ENFANTS_MAX);
    for (const enfant of enfants) {
      const r2 = await recuperer(enfant.url);
      if (!r2.ok) continue;
      candidats.push(...lireSitemap(r2.texte).filter((e) => estPageFormation(e.url)).map((e) => ({ url: e.url, libelle: "" })));
    }
  }
  for (const chemin of CHEMINS) {
    const rep = await recuperer(`${racine}${chemin}`);
    if (!rep.ok) continue;
    candidats.push(...liensAvecLibelle(rep.texte, `${racine}${chemin}`));
  }

  base.urlsInspectees = candidats.length;
  if (candidats.length === 0) {
    base.issue = "site_illisible";
    return base;
  }

  for (const c of candidats) {
    const score = Math.max(
      scoreRapprochement(fiche.nom, c.url),
      c.libelle === "" ? 0 : scoreRapprochement(fiche.nom, c.libelle),
    );
    if (score > base.meilleurScore) {
      base.meilleurScore = Number(score.toFixed(2));
      base.meilleureUrl = c.url;
      base.meilleurIntitule = c.libelle || null;
    }
  }
  base.issue = base.meilleurScore >= SEUIL ? "rapprochee" : "toujours_bloquee";
  return base;
}

async function main() {
  const ids = new Set(
    JSON.parse(
      await Bun.file("src/donnees/crawl-reste.json").text(),
    ).filter((x: { motifEchec: string | null }) => x.motifEchec === "aucune_page_rapprochee")
      .map((x: { id: number }) => x.id) as number[],
  );
  const fiches = chargerCatalogue()
    .filter((o) => ids.has(o.id))
    .map((o) => ({
      id: o.id,
      nom: o.nom,
      organisme: o.organisme,
      categorie: o.categorie as string,
      url: o.url!,
      codeRncpRs: (o as { codeRncpRs?: string | null }).codeRncpRs ?? null,
    }));

  console.log(`\nMesure d'appariement — ${fiches.length} fiches restées « aucune page rapprochée »`);
  console.log(`Découverte seule, aucun appel au modèle.\n`);

  const mesures = await enParallele(fiches, 4, async (f, i) => {
    const m = await mesurer(f);
    console.log(
      `  ${String(i + 1).padStart(2)}/${fiches.length}  #${String(m.id).padStart(3)} ${m.organisme.slice(0, 24).padEnd(24)} ${m.issue.padEnd(18)} meilleur ${m.meilleurScore}  (${m.urlsInspectees} URL)`,
    );
    return m;
  });
  writeFileSync(SORTIE, JSON.stringify(mesures, null, 1));

  const par = new Map<string, number>();
  for (const m of mesures) par.set(m.issue, (par.get(m.issue) ?? 0) + 1);
  console.log("\n  ISSUES");
  for (const [k, n] of [...par].sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(3)}  ${k}`);

  const bloquees = mesures.filter((m) => m.issue === "toujours_bloquee");
  console.log(`\n  AVEC UN CODE RNCP : ${mesures.filter((m) => m.codeRncpRs).length} sur ${mesures.length}`);
  console.log(`      dont encore bloquées : ${bloquees.filter((m) => m.codeRncpRs).length}`);

  // La distribution des meilleurs scores dit ce qu'un seuil plus bas coûterait.
  const paliers = [0, 0.2, 0.3, 0.4, 0.5];
  console.log("\n  MEILLEUR SCORE DES FICHES BLOQUÉES");
  for (const p of paliers) {
    const n = bloquees.filter((m) => m.meilleurScore >= p && m.meilleurScore < p + 0.1).length;
    if (n) console.log(`      ${String(n).padStart(3)}  entre ${p.toFixed(1)} et ${(p + 0.1).toFixed(1)}`);
  }
  console.log(`\n  → ${SORTIE}\n`);
}

main();
