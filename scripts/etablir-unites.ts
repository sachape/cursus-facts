/**
 * Réouverture des prix sans trace, pour établir leur unité.
 *
 * `bun run collecte:etablir-unites`            à blanc
 * `bun run collecte:etablir-unites -- --ecrire` applique
 *
 * CE N'EST PAS UNE PASSE DE COLLECTE. On ne cherche pas de nouveaux prix : on
 * rouvre la page d'un prix DÉJÀ ÉCRIT pour établir son unité et lui rendre une
 * trace. Trente prix du catalogue viennent d'une collecte manuelle sans extrait
 * conservé : ils ne sont ni sains ni suspects, ils sont invérifiables.
 *
 * LE PRIX N'EST JAMAIS MODIFIÉ ICI. Si la page publie un montant différent de
 * celui du catalogue, c'est une DIVERGENCE : elle est signalée, pas appliquée.
 * Une passe qui corrigerait les prix au passage mélangerait deux décisions, et
 * la seconde n'a pas été prise.
 *
 * TROIS ISSUES PAR FICHE :
 *   etablie     — la page publie le même montant, avec son unité. On écrit
 *                 l'unité et la citation.
 *   divergence  — la page publie un autre montant. Rien n'est écrit.
 *   non_etablie — page introuvable, ou aucun prix cité. Le champ reste `null`,
 *                 ce qui est son sens : non établi.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { chargerCatalogue } from "../src/donnees/catalogue";
import {
  enParallele,
  exigeRepliNavigateur,
  racineJoignable,
  recuperer,
  texteprincipal,
} from "../src/collecte/recuperation";
import { clientAnthropic, extrairePage, MODELE } from "../src/collecte/extraction";
import { fermerNavigateur, rendre } from "../src/collecte/navigateur";
import { verifierCorrespondance } from "../src/collecte/correspondance";
import { trancherUnite, derivationTotal, type UnitePrix } from "../src/collecte/unite-prix";
import { estPageFormation, lireSitemap, estIndex, scoreRapprochement } from "../src/collecte/sitemaps";
import { liensAvecLibelle } from "../src/collecte/repli-decouverte";
import { lireRobots } from "../src/collecte/recuperation";

const LOT = "src/donnees/lot-unites.json";
const CATALOGUE = "src/donnees/offres-sources.json";
const SORTIE = "src/donnees/unites-etablies.json";
const LE = "2026-08-16";
const TARIF = { entree: 5, sortie: 25 };
const TAUX = Number(process.env["TAUX_USD_EUR"] ?? 0.92);
const GROUPE = [["prix", "unitePrix"]] as const;

type Entree = { id: number; nom: string; organisme: string; prixActuel: number; domaine: string; urlDetail: string | null };

type Verdict = {
  id: number;
  nom: string;
  organisme: string;
  prixCatalogue: number;
  issue: "etablie" | "divergence" | "non_etablie";
  unite: UnitePrix | null;
  prixLu: number | null;
  extrait: string | null;
  url: string | null;
  derive: boolean;
  motif: string | null;
};

async function pageDe(f: Entree): Promise<string | null> {
  if (f.urlDetail) return f.urlDetail;
  const racine = await racineJoignable(f.domaine);
  if (!racine) return null;
  const candidats: { url: string; libelle: string }[] = [];
  const rb = await recuperer(`${racine}/robots.txt`);
  const sm = rb.ok ? lireRobots(rb.texte).sitemaps : [];
  for (const a of [...sm, `${racine}/sitemap.xml`].slice(0, 2)) {
    const r = await recuperer(a);
    if (!r.ok) continue;
    const brut = lireSitemap(r.texte);
    if (!estIndex(r.texte)) {
      candidats.push(...brut.filter((e) => estPageFormation(e.url)).map((e) => ({ url: e.url, libelle: "" })));
      continue;
    }
    for (const enfant of [...brut].sort((x, y) => Number(estPageFormation(y.url)) - Number(estPageFormation(x.url))).slice(0, 8)) {
      const r2 = await recuperer(enfant.url);
      if (r2.ok) candidats.push(...lireSitemap(r2.texte).filter((e) => estPageFormation(e.url)).map((e) => ({ url: e.url, libelle: "" })));
    }
  }
  for (const chemin of ["/formations", "/nos-formations", "/formation", "/"]) {
    const r = await recuperer(`${racine}${chemin}`);
    if (r.ok) candidats.push(...liensAvecLibelle(r.texte, `${racine}${chemin}`));
  }
  let meilleur: { url: string; score: number } | null = null;
  for (const c of candidats) {
    const s = Math.max(scoreRapprochement(f.nom, c.url), c.libelle ? scoreRapprochement(f.nom, c.libelle) : 0);
    if (!meilleur || s > meilleur.score) meilleur = { url: c.url, score: s };
  }
  return meilleur && meilleur.score >= 0.6 ? meilleur.url : null;
}

async function traiter(f: Entree, client: ReturnType<typeof clientAnthropic>): Promise<Verdict> {
  const base: Verdict = {
    id: f.id, nom: f.nom, organisme: f.organisme, prixCatalogue: f.prixActuel,
    issue: "non_etablie", unite: null, prixLu: null, extrait: null, url: null, derive: false, motif: null,
  };

  const url = await pageDe(f);
  if (!url) return { ...base, motif: "page introuvable" };
  base.url = url;

  const rep = await recuperer(url);
  if (!rep.ok) return { ...base, motif: `page injoignable (${rep.motif})` };

  let texte = texteprincipal(rep.texte);
  let html = rep.texte;
  if (exigeRepliNavigateur(texte) || texte.length / Math.max(1, rep.texte.length) < 0.03) {
    const rendu = await rendre(url);
    if (rendu.ok && texteprincipal(rendu.html).length > texte.length) {
      texte = texteprincipal(rendu.html);
      html = rendu.html;
    }
  }
  if (exigeRepliNavigateur(texte)) return { ...base, motif: "page vide même après rendu" };

  const corr = verifierCorrespondance(f.nom, html);
  if (!corr.correspond) {
    return { ...base, motif: `page d'un autre parcours (${corr.score.toFixed(2)})` };
  }

  const extraction = await extrairePage(client, texte, url);
  const cite = extraction.filtrage.retenus["prix"];
  if (!cite || typeof cite.valeur !== "number") return { ...base, motif: "aucun prix cité sur la page" };
  base.prixLu = cite.valeur;
  base.extrait = cite.extrait;

  /*
    LE MONTANT DOIT CORRESPONDRE. Établir l'unité d'un prix depuis une page qui
    en publie un autre reviendrait à qualifier une valeur avec la trace d'une
    autre — la même faute que le prix juste sur la mauvaise fiche.
  */
  if (cite.valeur !== f.prixActuel) {
    return { ...base, issue: "divergence", motif: `la page publie ${cite.valeur} €, le catalogue ${f.prixActuel} €` };
  }

  const verdict = trancherUnite(
    extraction.filtrage.retenus["unitePrix"]?.valeur as string | undefined,
    `${cite.extrait} ${extraction.filtrage.retenus["unitePrix"]?.extrait ?? ""}`,
  );
  if (verdict.unite !== null) return { ...base, issue: "etablie", unite: verdict.unite };

  // Aucune mention d'unité : la règle publiée lit le tarif comme un total,
  // et le marque `derive` pour que le lecteur puisse la contester.
  const der = verdict.motif === "unite_absente" ? derivationTotal(texte) : { derive: false, motif: verdict.motif };
  if (der.derive) return { ...base, issue: "etablie", unite: "total", derive: true };
  return { ...base, motif: `unité indéterminée (${der.motif})` };
}

async function main() {
  if (!existsSync(LOT)) throw new Error(`${LOT} absent.`);
  const lot = JSON.parse(readFileSync(LOT, "utf8")) as Entree[];
  const client = clientAnthropic(undefined, GROUPE);
  const ecrire = process.argv.includes("--ecrire");

  console.log(`\nÉtablissement d'unités — ${lot.length} prix sans trace\nModèle : ${MODELE}\n`);

  const verdicts = await enParallele(lot, 4, async (f, i) => {
    let v: Verdict;
    try {
      v = await traiter(f, client);
    } catch (e) {
      v = { id: f.id, nom: f.nom, organisme: f.organisme, prixCatalogue: f.prixActuel, issue: "non_etablie", unite: null, prixLu: null, extrait: null, url: null, derive: false, motif: e instanceof Error ? e.message.slice(0, 80) : "erreur" };
    }
    const marque = v.issue === "etablie" ? "✓" : v.issue === "divergence" ? "≠" : "✗";
    console.log(`  ${String(i + 1).padStart(2)}/${lot.length} ${marque} #${String(v.id).padStart(3)} ${v.organisme.slice(0, 22).padEnd(22)} ${v.prixCatalogue} € → ${v.unite ?? v.motif}`);
    return v;
  });

  await fermerNavigateur();
  writeFileSync(SORTIE, JSON.stringify(verdicts, null, 1));

  const par = new Map<string, number>();
  for (const v of verdicts) par.set(v.issue, (par.get(v.issue) ?? 0) + 1);
  console.log("\n  ISSUES");
  for (const [k, n] of par) console.log(`      ${String(n).padStart(3)}  ${k}`);

  const div = verdicts.filter((v) => v.issue === "divergence");
  if (div.length > 0) {
    console.log("\n  DIVERGENCES — rien n'est écrit, à trancher à la main");
    for (const v of div) console.log(`      #${v.id} ${v.organisme} : ${v.motif}\n         « ${(v.extrait ?? "").slice(0, 90)} »\n         ${v.url}`);
  }

  const d = client.depense();
  console.log(
    `\n  Coût : ${d.appels} appel(s), ${d.jetonsEntree.toLocaleString("fr-FR")} jetons entrée → ` +
      `${(((d.jetonsEntree / 1e6) * TARIF.entree + (d.jetonsSortie / 1e6) * TARIF.sortie) * TAUX).toFixed(2)} €`,
  );

  if (!ecrire) {
    console.log(`\n  (à blanc — relancer avec --ecrire)\n  → ${SORTIE}\n`);
    return;
  }

  const catalogue = JSON.parse(readFileSync(CATALOGUE, "utf8")) as Record<string, unknown>[];
  const parId = new Map(catalogue.map((o) => [o["id"] as number, o]));
  let ecrits = 0;
  for (const v of verdicts.filter((x) => x.issue === "etablie")) {
    const o = parId.get(v.id);
    if (!o) continue;
    o["unitePrix"] = v.unite;
    o["historique"] = [
      ...((o["historique"] as unknown[]) ?? []),
      {
        champ: "unitePrix",
        valeurPrecedente: null,
        le: LE,
        motif:
          `Unité établie par réouverture de la page, prix inchangé${v.derive ? " — dérivée en total, aucune mention d'unité sur la page (règle publiée)" : ""}. ` +
          `${v.url} — « ${v.extrait} »`,
      },
    ];
    ecrits++;
  }
  writeFileSync(CATALOGUE, JSON.stringify(catalogue, null, 1));
  console.log(`\n  ${ecrits} unité(s) écrite(s), aucun prix modifié.\n  → ${CATALOGUE}\n  → ${SORTIE}\n`);
}

main();
