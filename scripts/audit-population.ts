/**
 * Audit de population — deux questions, deux compteurs, deux instruments.
 *
 * `bun run collecte:audit`             les deux compteurs
 * `bun run collecte:audit -- --familles`  compteur 1 seul (modèle, sans réseau)
 * `bun run collecte:audit -- --offres`    compteur 2 seul (réseau, sans modèle)
 *
 * LES DEUX QUESTIONS NE SE MESURENT PAS AU MÊME ENDROIT.
 *
 *   1. « Cette fiche nomme-t-elle une famille ? »  se juge SUR LA FICHE.
 *      C'est une question de modélisation : l'intitulé désigne-t-il un objet
 *      qu'on peut acheter, ou un ensemble dont les membres s'achètent
 *      séparément ? La réponse est dans ce que nous avons écrit, pas chez le
 *      vendeur. Instrument : le modèle, sur les champs de la fiche.
 *
 *   2. « Cette offre existe-t-elle encore ? »  se juge CHEZ LE VENDEUR.
 *      Instrument : le réseau. Aucun appel au modèle — la question est
 *      « l'intitulé correspond-il à une page publiée ? », et un score de
 *      rapprochement y répond sans rien inventer.
 *
 * POURQUOI LES CROISER EST OBLIGATOIRE. Une fiche-famille n'a par construction
 * aucune page qui lui corresponde : « Formations commerce et digital à
 * distance » ne peut égaler ni `bachelor-e-commerce` ni `mastere-ebusiness`,
 * qui existent tous deux. Compter cette fiche comme « offre disparue » serait
 * faux — et ferait retirer du catalogue des parcours bien vivants. Le compteur 2
 * ne retient donc comme candidat que ce qui n'est PAS une famille.
 *
 * CE QUE L'AUDIT NE FAIT PAS. Il ne conclut jamais « cette offre n'existe
 * plus » : il conclut « aucune page publiée ne porte cet intitulé », ce qui est
 * un fait vérifiable. Le passage de l'un à l'autre demande la lecture d'une
 * page, et c'est une décision, pas une mesure.
 */
import { writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { chargerCatalogue, type OffreNormalisee } from "../src/donnees/catalogue";
import { determinerEtats } from "../src/modele/completude";
import { urlExploitable } from "./lot-profondeur";
import { enParallele, lireRobots, recuperer } from "../src/collecte/recuperation";
import { estIndex, estPageFormation, lireSitemap, scoreRapprochement } from "../src/collecte/sitemaps";
import { liensAvecLibelle } from "../src/collecte/repli-decouverte";
import { MODELE } from "../src/collecte/extraction";

const SORTIE = "src/donnees/audit-population.json";
const NON_ETABLI = new Set(["non_collecte", "non_communique", "a_confirmer"]);
const SEUIL_PAGE = 0.6;
const ENFANTS_MAX = 8;
const TARIF = { entree: 5, sortie: 25 };
const TAUX_USD_EUR = Number(process.env["TAUX_USD_EUR"] ?? 0.92);

/*
  LA RÈGLE, RECOPIÉE DU CATALOGUE ET NON RÉINVENTÉE.

  « Une fiche décrit un parcours qu'on peut acheter, avec un prix, une durée et
  un programme qui lui sont propres. Une famille de parcours n'est pas une
  fiche. » — retrait des deux pages catalogue du 4 août 2026.

  Et son garde-fou, du même jour : « À trancher au cas par cas, jamais par
  motif. Une durée en fourchette ne suffit pas à disqualifier : "12 à 13 mois"
  pour un Mastère Spécialisé décrit un seul programme. »

  D'où le troisième verdict. Un classificateur à deux issues force une réponse
  là où la fiche n'en porte pas, et cette réponse forcée entrerait ensuite dans
  un compteur comme si elle avait été établie.
*/
const CONSIGNE = `Tu classes des fiches de formation. Une seule question : l'intitulé de la fiche
désigne-t-il UN parcours qu'une personne peut acheter, ou UN ENSEMBLE de parcours qui
s'achètent séparément ?

« famille » — l'intitulé recouvre plusieurs offres distinctes, vendues séparément par
l'organisme. Aucun prix, aucune durée et aucun programme uniques ne peuvent en être vrais.
Exemples : « Formations commerce et digital à distance », « Cours e-commerce et CMS »,
« Catalogue formations digitales », « Tutoriels e-commerce ».

« parcours » — l'intitulé désigne un produit unique, même long, même décliné en options,
même avec une durée en fourchette. « Licence pro E-commerce et marketing numérique » est
un parcours. « MSc in AI Marketing & Business » est un parcours. Une durée en fourchette
ne suffit JAMAIS à conclure à une famille : « 12 à 13 mois » décrit un seul programme.

« indecidable » — les champs de la fiche ne permettent pas de trancher sans lire la page
de l'organisme. C'est un verdict légitime et attendu : ne force pas une réponse.

Réponds UNIQUEMENT par un objet JSON :
{"verdict": "famille" | "parcours" | "indecidable", "motif": "<une phrase>", "champDecisif": "<le champ de la fiche qui décide, ou null>"}`;

type Fiche = {
  id: number;
  nom: string;
  organisme: string;
  categorie: string;
  duree: string | null;
  volumeHoraire: number | null;
  programme: number;
  domaine: string;
};

type VerdictFamille = { verdict: string; motif: string; champDecisif: string | null };
type VerdictOffre = {
  statut: string;
  meilleurScore: number;
  meilleureUrl: string | null;
  urlsInspectees: number;
  requetes: number;
};

function population(catalogue: readonly OffreNormalisee[]): Fiche[] {
  return catalogue
    .filter(
      (o) =>
        urlExploitable(o.url) &&
        NON_ETABLI.has((determinerEtats(o) as unknown as Record<string, string>)["prix"]!),
    )
    .map((o) => ({
      id: o.id,
      nom: o.nom,
      organisme: o.organisme,
      categorie: o.categorie as string,
      duree: o.duree,
      volumeHoraire: o.volumeHoraire,
      programme: o.programme?.length ?? 0,
      domaine: o.url!.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/^www\./, "").trim(),
    }));
}

/* -------------------------------------------------------------------------- */
/* Compteur 1 — la famille se juge sur la fiche                               */
/* -------------------------------------------------------------------------- */

async function jugerFamille(
  client: Anthropic,
  fiche: Fiche,
  compteur: { entree: number; sortie: number; appels: number },
): Promise<VerdictFamille> {
  const message = await client.messages.create({
    model: MODELE,
    max_tokens: 1_000,
    thinking: { type: "adaptive" },
    system: CONSIGNE,
    messages: [
      {
        role: "user",
        content:
          `Organisme : ${fiche.organisme}\n` +
          `Intitulé : ${fiche.nom}\n` +
          `Catégorie : ${fiche.categorie}\n` +
          `Durée déclarée : ${fiche.duree ?? "non communiquée"}\n` +
          `Volume horaire : ${fiche.volumeHoraire ?? "non communiqué"}\n` +
          `Éléments de programme publiés : ${fiche.programme}`,
      },
    ],
  });
  compteur.appels++;
  compteur.entree += message.usage.input_tokens;
  compteur.sortie += message.usage.output_tokens;

  const bloc = message.content.find((c) => c.type === "text");
  const json = bloc && "text" in bloc ? bloc.text.match(/\{[\s\S]*\}/)?.[0] : undefined;
  try {
    const brut = json ? JSON.parse(json) : {};
    const verdict = ["famille", "parcours", "indecidable"].includes(brut.verdict)
      ? brut.verdict
      : "indecidable";
    return { verdict, motif: String(brut.motif ?? ""), champDecisif: brut.champDecisif ?? null };
  } catch {
    // Un JSON illisible n'est pas un verdict : il ne doit pas devenir « parcours »
    // par défaut, ce qui masquerait une famille.
    return { verdict: "indecidable", motif: "réponse illisible", champDecisif: null };
  }
}

/* -------------------------------------------------------------------------- */
/* Compteur 2 — l'offre se juge chez le vendeur, sans modèle                   */
/* -------------------------------------------------------------------------- */

async function jugerOffre(fiche: Fiche): Promise<VerdictOffre> {
  let requetes = 0;
  let succes = 0;
  const corpus: string[] = [];
  const racine = `https://${fiche.domaine}`;

  const robots = await recuperer(`${racine}/robots.txt`);
  requetes++;
  if (robots.ok) succes++;
  const declares = robots.ok ? lireRobots(robots.texte).sitemaps : [];

  for (const adresse of [...declares, `${racine}/sitemap.xml`].slice(0, 2)) {
    const rep = await recuperer(adresse);
    requetes++;
    if (!rep.ok) continue;
    succes++;
    const brut = lireSitemap(rep.texte);
    if (!estIndex(rep.texte)) {
      corpus.push(...brut.map((e) => e.url));
      continue;
    }
    const enfants = [...brut]
      .sort((a, b) => Number(estPageFormation(b.url)) - Number(estPageFormation(a.url)))
      .slice(0, ENFANTS_MAX);
    for (const enfant of enfants) {
      const rep2 = await recuperer(enfant.url);
      requetes++;
      if (!rep2.ok) continue;
      succes++;
      corpus.push(...lireSitemap(rep2.texte).map((e) => e.url));
    }
  }

  // La page d'accueil en dernier recours : elle porte les libellés de liens,
  // qui sont le titre publié des parcours.
  const accueil = await recuperer(racine);
  requetes++;
  if (accueil.ok) {
    succes++;
    corpus.push(...liensAvecLibelle(accueil.texte, racine).flatMap((l) => [l.url, l.libelle]));
  }

  if (succes === 0) {
    return { statut: "domaine_injoignable", meilleurScore: 0, meilleureUrl: null, urlsInspectees: 0, requetes };
  }
  if (corpus.length === 0) {
    // Le site répond mais ne rend aucune adresse lisible : c'est un fait sur
    // notre outillage, pas sur l'existence de l'offre.
    return { statut: "site_illisible", meilleurScore: 0, meilleureUrl: null, urlsInspectees: 0, requetes };
  }

  let meilleur: { url: string; score: number } = { url: "", score: 0 };
  for (const cible of corpus) {
    const score = scoreRapprochement(fiche.nom, cible);
    if (score > meilleur.score) meilleur = { url: cible, score };
  }

  return {
    statut: meilleur.score >= SEUIL_PAGE ? "page_correspondante_trouvee" : "aucune_page_correspondante",
    meilleurScore: Number(meilleur.score.toFixed(2)),
    meilleureUrl: meilleur.url || null,
    urlsInspectees: corpus.length,
    requetes,
  };
}

/* -------------------------------------------------------------------------- */

async function main() {
  const argv = process.argv.slice(2);
  const faireFamilles = !argv.includes("--offres");
  const faireOffres = !argv.includes("--familles");

  const fiches = population(chargerCatalogue());
  console.log(`\nAudit de population — ${fiches.length} fiches\n`);

  const compteur = { entree: 0, sortie: 0, appels: 0 };
  const client = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });

  const familles = new Map<number, VerdictFamille>();
  if (faireFamilles) {
    console.log(`Compteur 1 — famille ou parcours (modèle : ${MODELE})`);
    await enParallele(fiches, 6, async (f, i) => {
      const v = await jugerFamille(client, f, compteur);
      familles.set(f.id, v);
      if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${fiches.length}`);
    });
    console.log(`  ${fiches.length}/${fiches.length}\n`);
  }

  const offres = new Map<number, VerdictOffre>();
  if (faireOffres) {
    console.log(`Compteur 2 — l'intitulé correspond-il à une page publiée (réseau seul)`);
    await enParallele(fiches, 4, async (f, i) => {
      offres.set(f.id, await jugerOffre(f));
      if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${fiches.length}`);
    });
    console.log(`  ${fiches.length}/${fiches.length}\n`);
  }

  const lignes = fiches.map((f) => ({
    ...f,
    famille: familles.get(f.id) ?? null,
    offre: offres.get(f.id) ?? null,
  }));
  writeFileSync(SORTIE, JSON.stringify(lignes, null, 1));

  /*
    RESTITUTION EN NOMBRES ABSOLUS.

    Aucun pourcentage : la population entière est mesurée, pas un échantillon,
    donc un ratio n'ajouterait rien qu'une fausse précision — et masquerait la
    taille des sous-ensembles, qui est ce qui décide du traitement.
  */
  if (faireFamilles) {
    console.log("  COMPTEUR 1 — modélisation");
    for (const v of ["famille", "parcours", "indecidable"]) {
      const n = lignes.filter((l) => l.famille?.verdict === v).length;
      console.log(`      ${String(n).padStart(3)}  ${v}`);
    }
  }

  if (faireOffres) {
    console.log("\n  COMPTEUR 2 — l'intitulé correspond-il à une page publiée");
    const parStatut = new Map<string, number>();
    for (const l of lignes) {
      const s = l.offre?.statut ?? "non_mesure";
      parStatut.set(s, (parStatut.get(s) ?? 0) + 1);
    }
    for (const [s, n] of [...parStatut].sort((a, b) => b[1] - a[1])) {
      console.log(`      ${String(n).padStart(3)}  ${s}`);
    }
  }

  if (faireFamilles && faireOffres) {
    /*
      LE CROISEMENT. Une famille sans page correspondante est NORMALE : aucune
      page ne peut porter le nom d'un ensemble. Ne sont candidates au retrait
      que les fiches qui nomment un parcours et dont aucune page ne porte le nom.
    */
    const candidatesRetrait = lignes.filter(
      (l) => l.famille?.verdict === "parcours" && l.offre?.statut === "aucune_page_correspondante",
    );
    const famillesSansPage = lignes.filter(
      (l) => l.famille?.verdict === "famille" && l.offre?.statut === "aucune_page_correspondante",
    );
    console.log("\n  CROISEMENT");
    console.log(`      ${String(candidatesRetrait.length).padStart(3)}  parcours sans page publiée — candidats « offre disparue »`);
    console.log(`      ${String(famillesSansPage.length).padStart(3)}  familles sans page publiée — attendu, ne rien conclure`);
    const injoignables = lignes.filter((l) => l.offre?.statut === "domaine_injoignable");
    console.log(`      ${String(injoignables.length).padStart(3)}  domaines injoignables — à trancher avant tout le reste`);
  }

  if (compteur.appels > 0) {
    const cout =
      ((compteur.entree / 1e6) * TARIF.entree + (compteur.sortie / 1e6) * TARIF.sortie) * TAUX_USD_EUR;
    console.log(
      `\n  Coût : ${compteur.appels} appel(s), ${compteur.entree.toLocaleString("fr-FR")} jetons entrée, ` +
        `${compteur.sortie.toLocaleString("fr-FR")} sortie → ${cout.toFixed(2)} €`,
    );
  }
  console.log(`\n  → ${SORTIE}\n`);
}

main();
