/**
 * Appariement par le CATALOGUE DE L'ORGANISME — ce que ferait un humain.
 *
 * `bun run collecte:apparier-catalogue -- --lot <fichier> [--ecrire]`
 *
 * POURQUOI CETTE PISTE. Quatre méthodes ont été construites pour retrouver la
 * page d'un parcours — score d'URL, appariement par libellé de lien, inférence
 * de domaine, correctif de sitemap — et aucune ne fait ce que fait n'importe
 * qui devant un site d'école : ouvrir la page « Nos formations », lire les
 * intitulés affichés, et reconnaître le sien dans la liste.
 *
 * TROIS ÉTAPES, ET LE MODÈLE N'INTERVIENT QU'À LA DEUXIÈME :
 *   1. trouver la ou les pages qui LISTENT les formations ;
 *   2. donner au modèle l'intitulé cherché et la liste des intitulés publiés,
 *      et lui demander LEQUEL correspond — en le citant littéralement ;
 *   3. vérifier que l'intitulé rendu figure bien dans la liste, puis relever le
 *      prix sur la page ainsi trouvée.
 *
 * L'ÉTAPE 3 EST LE GARDE-FOU, et il est indispensable : sans elle, le modèle
 * peut rendre un intitulé plausible qui n'a jamais été publié, et l'on
 * apparierait une fiche à une page inventée. C'est le même principe que la
 * citation sur les prix — la valeur doit exister dans ce qu'on a lu.
 */
import { readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import {
  enParallele,
  exigeRepliNavigateur,
  racineJoignable,
  recuperer,
  texteprincipal,
} from "../src/collecte/recuperation";
import { fermerNavigateur, rendre } from "../src/collecte/navigateur";
import { liensAvecLibelle } from "../src/collecte/repli-decouverte";
import { normaliser } from "../src/collecte/citation";
import { relever, type Cible } from "./relever-prix";

const MODELE = "claude-opus-5";
const TARIF = { entree: 5, sortie: 25 };
const TAUX = Number(process.env["TAUX_USD_EUR"] ?? 0.92);

/** Chemins où vit d'ordinaire le catalogue de formations. */
const CHEMINS_CATALOGUE = [
  "/formations",
  "/nos-formations",
  "/formation",
  "/catalogue",
  "/nos-programmes",
  "/programmes",
  "/nos-formations-en-ligne",
  "/les-formations",
  "/formations-courtes",
  "/offre-de-formation",
  "/",
];

/** Un lien de navigation vers le catalogue, reconnu sur son libellé. */
const LIBELLE_CATALOGUE = /nos formations|toutes? (?:nos|les) formations|catalogue|nos programmes|offre de formation|formations?$/i;

/** Liens qui ne sont jamais une formation. */
const HORS_SUJET =
  /mentions|cgv|cgu|confidentialit|cookie|contact|actualit|blog|presse|recrutement|plan du site|connexion|login|panier|newsletter|linkedin|facebook|twitter|instagram|youtube/i;

type Verdict = {
  id: number;
  nom: string;
  organisme: string;
  domaine: string;
  issue: "apparie" | "absent_du_catalogue" | "catalogue_introuvable" | "domaine_injoignable";
  urlTrouvee: string | null;
  libelleCite: string | null;
  intitulesLus: number;
  motif: string | null;
};

let appels = 0;
let jetonsEntree = 0;
let jetonsSortie = 0;

const CONSIGNE = `On te donne l'intitulé d'une formation, et la liste des formations qu'un organisme publie sur son site.

Dis LAQUELLE de la liste est la même formation.

Rends un objet JSON, et rien d'autre :
{"libelle": "<l'intitulé de la liste, copié à l'identique>", "certitude": "sure|probable|aucune"}

RÈGLES :
- "libelle" doit être copié EXACTEMENT depuis la liste fournie, caractère pour caractère.
- Deux intitulés désignent la même formation s'ils portent le même diplôme ou titre ET la même spécialité. « Bachelor Marketing Digital » et « Bachelor Marketing Digital et E-commerce » peuvent être la même ; « Bachelor Marketing Digital » et « MBA Marketing Digital » ne le sont pas.
- Un niveau différent (BTS vs Bachelor vs Mastère) signifie une formation différente.
- Si aucune formation de la liste ne correspond, rends {"libelle": null, "certitude": "aucune"}.
- Dans le doute, réponds "aucune". Une fiche sans page vaut mieux qu'une fiche rattachée à la mauvaise page.`;

function client() {
  const cle = process.env["ANTHROPIC_API_KEY"];
  if (!cle) throw new Error("ANTHROPIC_API_KEY absente.");
  return new Anthropic({ apiKey: cle });
}

/**
 * Une page lisible, AVEC repli navigateur.
 *
 * Sans ce repli, la première passe a rendu « aucun intitulé lisible » sur six
 * organismes de dix — KEDGE, EFAP, LiveMentor, Coursera, le Cnam. Ce n'était
 * pas une réponse sur la méthode : leurs catalogues sont rendus en JavaScript,
 * et l'instrument regardait un document vide. Conclure « la piste ne marche
 * pas » à partir de là aurait été conclure d'une absence de preuve.
 */
async function pageLisible(url: string): Promise<{ texte: string; html: string } | null> {
  const rep = await recuperer(url);
  if (!rep.ok) return null;
  let texte = texteprincipal(rep.texte);
  let html = rep.texte;
  if (exigeRepliNavigateur(texte) || texte.length / Math.max(1, rep.texte.length) < 0.03) {
    const rendu = await rendre(url);
    if (rendu.ok && texteprincipal(rendu.html).length > texte.length) {
      texte = texteprincipal(rendu.html);
      html = rendu.html;
    }
  }
  if (exigeRepliNavigateur(texte)) return null;
  return { texte, html };
}

/**
 * Les intitulés publiés par l'organisme, avec leur adresse.
 *
 * On part des chemins usuels, et on suit EN PLUS les liens de l'accueil dont le
 * libellé annonce un catalogue — beaucoup d'écoles rangent leurs formations
 * sous une adresse qui ne figure dans aucune liste de chemins usuels.
 */
async function intitulesPublies(racine: string): Promise<{ url: string; libelle: string }[]> {
  /*
    L'ORDRE DÉCIDE DU RÉSULTAT, PARCE QU'IL Y A UN BUDGET.

    Une première version ajoutait les onze chemins usuels, PUIS les liens de
    catalogue découverts sur l'accueil, PUIS coupait à huit. La coupe tombait
    donc exactement sur ce qui marche — la racine et les adresses réellement
    publiées — et gardait huit chemins devinés qui répondent 404. Résultat :
    « aucun intitulé lisible » sur KEDGE, dont l'accueil offre pourtant 62 liens.

    Ce qui est CONSTATÉ passe donc avant ce qui est DEVINÉ.
  */
  const accueil = await pageLisible(racine);
  const decouvertes: string[] = [];
  if (accueil) {
    for (const l of liensAvecLibelle(accueil.html, racine)) {
      if (LIBELLE_CATALOGUE.test(l.libelle.trim()) && l.url.startsWith(racine)) decouvertes.push(l.url);
    }
  }
  const pages = new Set<string>([...decouvertes, racine, ...CHEMINS_CATALOGUE.map((c) => `${racine}${c}`)]);

  const liens = new Map<string, string>();
  // L'accueil est déjà lu : ses liens comptent, une école y liste souvent ses
  // programmes phares.
  if (accueil) {
    for (const l of liensAvecLibelle(accueil.html, racine)) {
      const libelle = l.libelle.replace(/\s+/g, " ").trim();
      if (libelle.length < 8 || libelle.length > 140) continue;
      if (HORS_SUJET.test(libelle)) continue;
      if (!l.url.startsWith(racine)) continue;
      if (!liens.has(libelle)) liens.set(libelle, l.url);
    }
  }
  for (const p of [...pages].slice(0, 10)) {
    const page = await pageLisible(p);
    if (!page) continue;
    for (const l of liensAvecLibelle(page.html, p)) {
      const libelle = l.libelle.replace(/\s+/g, " ").trim();
      if (libelle.length < 8 || libelle.length > 140) continue;
      if (HORS_SUJET.test(libelle)) continue;
      if (!l.url.startsWith(racine)) continue;
      // Le premier libellé rencontré fait foi : les listes répètent les liens.
      if (!liens.has(libelle)) liens.set(libelle, l.url);
    }
  }
  return [...liens].map(([libelle, url]) => ({ libelle, url }));
}

async function demander(
  anthropic: Anthropic,
  nomParcours: string,
  organisme: string,
  intitules: string[],
): Promise<{ libelle: string | null; certitude: string }> {
  appels++;
  const reponse = await anthropic.messages.create({
    model: MODELE,
    max_tokens: 900,
    thinking: { type: "adaptive" },
    system: CONSIGNE,
    messages: [
      {
        role: "user",
        content:
          `Formation cherchée : « ${nomParcours} »\nOrganisme : ${organisme}\n\n` +
          `Formations publiées sur le site :\n${intitules.map((i) => `- ${i}`).join("\n")}`,
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
  if (!m) return { libelle: null, certitude: "aucune" };
  try {
    const r = JSON.parse(m[0]) as { libelle?: unknown; certitude?: unknown };
    return {
      libelle: typeof r.libelle === "string" && r.libelle.trim() !== "" ? r.libelle.trim() : null,
      certitude: typeof r.certitude === "string" ? r.certitude : "aucune",
    };
  } catch {
    return { libelle: null, certitude: "aucune" };
  }
}

async function apparier(anthropic: Anthropic, f: Cible): Promise<Verdict> {
  const domaine = f.url.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  const base: Verdict = {
    id: f.id, nom: f.nom, organisme: f.organisme, domaine,
    issue: "catalogue_introuvable", urlTrouvee: null, libelleCite: null, intitulesLus: 0, motif: null,
  };

  const racine = await racineJoignable(domaine);
  if (!racine) return { ...base, issue: "domaine_injoignable" };

  const publies = await intitulesPublies(racine);
  base.intitulesLus = publies.length;
  if (publies.length === 0) return { ...base, motif: "aucun intitulé lisible" };

  const r = await demander(anthropic, f.nom, f.organisme, publies.map((p) => p.libelle).slice(0, 400));
  if (r.libelle === null || r.certitude === "aucune") {
    return { ...base, issue: "absent_du_catalogue", motif: `${publies.length} intitulés lus, aucun ne correspond` };
  }

  /*
    LE LIBELLÉ RENDU DOIT EXISTER DANS LA LISTE. Sans cette vérification, un
    intitulé plausible mais jamais publié apparierait la fiche à une page
    inventée — la même faute que le prix cité depuis une phrase absente.
  */
  const cible = publies.find((p) => normaliser(p.libelle) === normaliser(r.libelle!));
  if (!cible) {
    return { ...base, issue: "absent_du_catalogue", motif: `« ${r.libelle.slice(0, 60)} » ne figure pas dans la liste` };
  }

  return { ...base, issue: "apparie", urlTrouvee: cible.url, libelleCite: cible.libelle };
}

async function main() {
  const iLot = process.argv.indexOf("--lot");
  if (iLot === -1) throw new Error("Usage : --lot <fichier.json> [--ecrire]");
  const chemin = process.argv[iLot + 1]!;
  const lot = JSON.parse(readFileSync(chemin, "utf8")) as Cible[];
  const sortie = chemin.replace(/\.json$/, "-appariements.json");
  const anthropic = client();

  console.log(`\nAppariement par le catalogue de l'organisme — ${lot.length} fiche(s)\nModèle : ${MODELE}\n`);

  const verdicts = await enParallele(lot, 4, async (f, i) => {
    let v: Verdict;
    try {
      v = await apparier(anthropic, f);
    } catch (e) {
      v = { id: f.id, nom: f.nom, organisme: f.organisme, domaine: f.url, issue: "catalogue_introuvable", urlTrouvee: null, libelleCite: null, intitulesLus: 0, motif: e instanceof Error ? e.message.slice(0, 80) : "erreur" };
    }
    console.log(
      `  ${String(i + 1).padStart(3)}/${lot.length} ${v.issue === "apparie" ? "✓" : "·"} #${String(v.id).padStart(3)} ` +
        `${v.organisme.slice(0, 20).padEnd(20)} ${String(v.intitulesLus).padStart(3)} intitulés  ${v.urlTrouvee ?? v.motif ?? v.issue}`,
    );
    return v;
  });
  await fermerNavigateur();
  writeFileSync(sortie, JSON.stringify(verdicts, null, 1));

  const par = new Map<string, number>();
  for (const v of verdicts) par.set(v.issue, (par.get(v.issue) ?? 0) + 1);
  console.log("\n  ISSUES");
  for (const [k, n] of [...par].sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(3)}  ${k}`);
  console.log(
    `\n  Coût appariement : ${appels} appel(s) → ` +
      `${(((jetonsEntree / 1e6) * TARIF.entree + (jetonsSortie / 1e6) * TARIF.sortie) * TAUX).toFixed(2)} €`,
  );

  const apparies = verdicts.filter((v) => v.issue === "apparie");
  if (apparies.length === 0) {
    console.log("\n  Aucune page trouvée : rien à relever.\n");
    return;
  }

  console.log(`\n\nRelevé de prix sur les ${apparies.length} page(s) trouvée(s)\n`);
  const cibles: Cible[] = apparies.map((v) => ({ id: v.id, nom: v.nom, organisme: v.organisme, url: v.urlTrouvee! }));
  const lotReleve = chemin.replace(/\.json$/, "-trouvees.json");
  writeFileSync(lotReleve, JSON.stringify(cibles, null, 1));
  await relever(cibles, process.argv.includes("--ecrire"), chemin.replace(/\.json$/, "-releves.json"));
}

main();
