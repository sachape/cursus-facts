/**
 * Crawl profond — test borné sur le lot de `src/donnees/lot-profondeur.json`.
 *
 * `bun run collecte:profond`            appel de contrôle sur la 1re fiche, puis STOP
 * `bun run collecte:profond -- --lancer` les neuf autres, après le contrôle
 *
 * L'objectif est de MESURER un taux de réussite et un coût, pas de remplir le
 * catalogue. Rien n'est écrit au catalogue : les valeurs trouvées vont dans
 * `src/donnees/crawl-profond-resultats.json`, en attente de validation.
 *
 * CE QUE « EN PROFONDEUR » VEUT DIRE ICI
 *
 * La passe d'extraction existante lit UNE page déjà appariée. Elle plafonne
 * donc au taux d'appariement de 23 %. Ce script part de la fiche et non d'une
 * URL : il cherche la page de détail sur le site de l'organisme, puis, si le
 * prix n'y est pas, une page tarifs / financement / inscription — parce que
 * chez beaucoup d'organismes le prix vit ailleurs que sur la fiche formation.
 *
 * TROIS PAGES AU PLUS PAR FICHE, comptées en pages ENVOYÉES AU MODÈLE. Les
 * requêtes de découverte (robots.txt, sitemaps, page catalogue) sont du réseau,
 * pas du modèle : elles ne coûtent pas d'euros et sont comptées à part. Les
 * confondre ferait passer le coût à l'échelle pour trois fois ce qu'il est.
 *
 * LES GARDE-FOUS, ET LEQUEL S'APPLIQUE OÙ
 *
 *   page de détail   → `verifierCorrespondance` : cette PAGE est-elle celle du
 *                      parcours ? (0,8, sur le `<h1>`)
 *   page d'escalade  → `attribuerExtrait` : ce PRIX est-il celui du parcours ?
 *                      (0,8, sur le voisinage de la citation)
 *
 * Le second existe parce que le premier rejetterait toute page tarifs — son
 * `<h1>` dit « Tarifs ». Baisser le seuil aurait supprimé le garde-fou là où il
 * protège le plus : une page tarifs porte le prix de dix formations.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { chargerCatalogue, type OffreNormalisee } from "../src/donnees/catalogue";
import {
  enParallele,
  exigeRepliNavigateur,
  lireRobots,
  recuperer,
  texteprincipal,
} from "../src/collecte/recuperation";
import { clientAnthropic, extrairePage, MODELE, QUALIFIANTS } from "../src/collecte/extraction";
import { fermerNavigateur, rendre } from "../src/collecte/navigateur";
import { estPageFormation, lireSitemap, estIndex, scoreRapprochement } from "../src/collecte/sitemaps";
import { liensAvecLibelle } from "../src/collecte/repli-decouverte";
import { verifierCorrespondance } from "../src/collecte/correspondance";
import { attribuerExtrait, SEUIL_ATTRIBUTION } from "../src/collecte/attribution";
import { convertirJournalier, derivationTotal, trancherUnite } from "../src/collecte/unite-prix";
import { imputer, LIBELLES_CAUSE, type Cause } from "../src/collecte/verdict-prix";

/** Lot mesuré. `--lot <chemin>` pour en viser un autre que le lot figé. */
const LOT = process.argv.includes("--lot")
  ? process.argv[process.argv.indexOf("--lot") + 1]!
  : "src/donnees/lot-profondeur.json";
const SORTIE = process.argv.includes("--sortie")
  ? process.argv[process.argv.indexOf("--sortie") + 1]!
  : "src/donnees/crawl-profond-resultats.json";
const DECOUVERTES = "src/donnees/urls-decouvertes.json";
const LE = new Date().toISOString().slice(0, 10);

/** Trois pages au plus par fiche, comptées en pages envoyées au modèle. */
const PAGES_MAX = 3;

/**
 * Champs demandés — le prix et ce qui le rend interprétable, rien d'autre.
 *
 * Un appel par page au lieu de deux. Demander les dix-neuf champs quand on
 * mesure la récupération du prix doublerait le coût mesuré et le rendrait
 * inutilisable pour décider d'une passe de prix à l'échelle.
 */
/*
  `formats` a rejoint le groupe le 13 août 2026. Sans lui, la dérivation
  publiée « alternance → coût nul, pris en charge » ne peut jamais s'appliquer :
  les trois parcours ISCOD lus ce jour-là sont en alternance, ne publient aucun
  montant, et restaient sans prix faute d'un champ qu'une seule question au
  modèle suffisait à obtenir. Gain gratuit sur les 17 fiches issues d'éclatement,
  qui sont exactement celles dont `formats` est nul.
*/
const GROUPE_PRIX = [
  ["prix", "unitePrix", "prixIntra", "uniteIntra", "modaliteAcces", "formats"],
] as const;

/** Tarif public Claude Opus 5, en dollars par million de jetons. */
const TARIF = { entree: 5, sortie: 25 };
/**
 * Taux de change, DÉCLARÉ et non deviné, parce qu'il entre dans un chiffre qui
 * sert à décider. Surchargeable par `TAUX_USD_EUR`, et rappelé en restitution.
 */
const TAUX_USD_EUR = Number(process.env["TAUX_USD_EUR"] ?? 0.92);

type EntreeLot = {
  id: number;
  nom: string;
  organisme: string;
  strate: string;
  etatPrix: string;
  prixActuel: number | null;
  url: string;
  domaine: string;
  urlDetail: string | null;
};

type PageLue = { url: string; role: string; texte: string; html: string };

type Resultat = {
  id: number;
  nom: string;
  organisme: string;
  strate: string;
  etatPrix: string;
  prixActuel: number | null;
  /** Voie qui a mené à la page de détail, ou l'échec de découverte. */
  voieDecouverte: string;
  pagesModele: { url: string; role: string }[];
  requetesReseau: number;
  trouve: boolean;
  proposition: {
    champ: string;
    valeur: unknown;
    unite: string;
    extrait: string;
    urlSource: string;
    role: string;
    attribution: number | null;
    derive: boolean;
  } | null;
  motifEchec: string | null;
  /** Cause de non-rétention, et à qui l'absence appartient. */
  cause: Cause | null;
  imputation: string | null;
  /** Rejets de citation sur le champ prix, toutes pages confondues. */
  rejetsPrix: number;
};

/* -------------------------------------------------------------------------- */
/* Découverte de la page de détail — réseau seulement, aucun appel au modèle   */
/* -------------------------------------------------------------------------- */

/** Seuil de rapprochement URL/libellé, identique à celui de la découverte. */
const SEUIL_DECOUVERTE = 0.6;

/** Enfants d'un index de sitemaps lus au plus, avant sortie anticipée. */
const ENFANTS_SITEMAP_MAX = 8;

/** Chemins où une page catalogue se trouve, dans l'ordre de fréquence. */
const CHEMINS_CATALOGUE = ["/formations", "/nos-formations", "/formation", "/catalogue", "/"];

type Decouverte = { organisme: string; urls: { id: number | null; url: string }[] };

type Trouvaille = { url: string; voie: string; requetes: number };

async function trouverPageDetail(
  fiche: EntreeLot,
  decouvertes: readonly Decouverte[],
): Promise<Trouvaille> {
  let requetes = 0;
  /*
    UN DOMAINE INJOIGNABLE N'EST PAS UNE PAGE INTROUVABLE.

    Confondre les deux ferait porter à l'organisme une opacité qui est la nôtre :
    `ebs-paris.com` ne résout pas, et le vrai domaine est `ebs-paris.fr`. Ce
    n'est pas « l'école ne publie pas son prix », c'est « notre catalogue porte
    un domaine faux ». On compte donc les succès réseau : zéro succès sur toutes
    les tentatives, et l'échec est le nôtre.
  */
  let succesReseau = 0;
  const racine = `https://${fiche.domaine}`;

  // 1. Déjà connue. Gratuit, et c'est la seule voie sans risque d'erreur.
  if (fiche.urlDetail) return { url: fiche.urlDetail, voie: "url_detail_fichee", requetes };

  // 2. Déjà rapprochée par une passe de découverte antérieure.
  for (const d of decouvertes) {
    const trouve = d.urls.find((u) => u.id === fiche.id);
    if (trouve) return { url: trouve.url, voie: "decouverte_apparie", requetes };
  }

  // 3. Sitemap. Une requête pour robots.txt, puis au plus deux sitemaps —
  //    au-delà on paierait la découverte d'un organisme pour une seule fiche.
  const robots = await recuperer(`${racine}/robots.txt`);
  requetes++;
  if (robots.ok) succesReseau++;
  const declares = robots.ok ? lireRobots(robots.texte).sitemaps : [];
  const aEssayer = [...declares, `${racine}/sitemap.xml`].slice(0, 2);

  for (const adresse of aEssayer) {
    const rep = await recuperer(adresse);
    requetes++;
    if (!rep.ok) continue;
    succesReseau++;

    const brut = lireSitemap(rep.texte);

    /*
      UN INDEX DE SITEMAPS SE DESCEND EN ENTIER, PAS SUR SON PREMIER ENFANT.

      Mesuré le 13 août : ENACO déclare `sitemaps.xml`, un index. Ne lire que
      son premier enfant rendait 381 URL dont ZÉRO page de formation — alors que
      l'organisme en expose 56, déjà présentes dans `urls-decouvertes.json`. Le
      crawl concluait « aucune page rapprochée » sur un organisme dont le
      catalogue était entièrement lisible, et l'échec passait pour une opacité
      de l'organisme alors qu'il était le nôtre.

      Les enfants dont l'adresse évoque une formation passent d'abord : c'est le
      seul indice disponible avant de payer la requête, et il fait tomber le cas
      courant en un ou deux appels au lieu de huit.
    */
    let entrees = brut;
    if (estIndex(rep.texte)) {
      const enfants = [...brut]
        .sort((a, b) => Number(estPageFormation(b.url)) - Number(estPageFormation(a.url)))
        .slice(0, ENFANTS_SITEMAP_MAX);
      entrees = [];
      for (const enfant of enfants) {
        const rep2 = await recuperer(enfant.url);
        requetes++;
        if (!rep2.ok) continue;
        succesReseau++;
        entrees.push(...lireSitemap(rep2.texte));
        // Sortie anticipée : dès qu'un enfant suffit, les suivants ne sont pas
        // payés. Un organisme au sitemap découpé finement coûterait sinon huit
        // requêtes pour une fiche.
        const partiel = meilleurCandidat(
          entrees.filter((e) => estPageFormation(e.url)).map((e) => ({ url: e.url, libelle: "" })),
          fiche.nom,
        );
        if (partiel) return { url: partiel, voie: "sitemap", requetes };
      }
    }

    const candidat = meilleurCandidat(
      entrees.filter((e) => estPageFormation(e.url)).map((e) => ({ url: e.url, libelle: "" })),
      fiche.nom,
    );
    if (candidat) return { url: candidat, voie: "sitemap", requetes };
  }

  // 4. Page catalogue. Le libellé d'un lien EST le titre du parcours : c'est le
  //    signal le plus riche du site, et il ne coûte qu'une requête.
  for (const chemin of CHEMINS_CATALOGUE) {
    const rep = await recuperer(`${racine}${chemin}`);
    requetes++;
    if (!rep.ok) continue;
    succesReseau++;
    const candidat = meilleurCandidat(liensAvecLibelle(rep.texte, `${racine}${chemin}`), fiche.nom);
    if (candidat) return { url: candidat, voie: `page_catalogue${chemin}`, requetes };
  }

  return {
    url: "",
    voie: succesReseau === 0 ? "domaine_injoignable" : "aucune_page_rapprochee",
    requetes,
  };
}

/**
 * Meilleur candidat parmi des liens, au seuil de découverte.
 *
 * On score le libellé ET l'URL, et on garde le meilleur des deux : un organisme
 * publie le titre complet dans le lien, un autre dans le chemin, et exiger les
 * deux ferait rater les deux moitiés.
 */
function meilleurCandidat(
  liens: readonly { url: string; libelle: string }[],
  nom: string,
): string | null {
  let meilleur: { url: string; score: number } | null = null;
  for (const lien of liens) {
    const score = Math.max(
      scoreRapprochement(nom, lien.url),
      lien.libelle === "" ? 0 : scoreRapprochement(nom, lien.libelle),
    );
    if (!meilleur || score > meilleur.score) meilleur = { url: lien.url, score };
  }
  return meilleur && meilleur.score >= SEUIL_DECOUVERTE ? meilleur.url : null;
}

/* -------------------------------------------------------------------------- */
/* Escalade — où le prix vit quand il n'est pas sur la fiche formation        */
/* -------------------------------------------------------------------------- */

/**
 * Ordre d'essai : le prix se trouve d'abord sur une page tarifs, ensuite dans
 * les modalités de financement, en dernier dans le tunnel d'inscription — qui
 * le porte souvent mais noyé dans un formulaire.
 */
const MOTIFS_ESCALADE: { motif: RegExp; role: string }[] = [
  { motif: /tarif|\bprix\b|co[uû]ts?\b|frais\b|pricing/i, role: "tarifs" },
  // `financ` seul est trop large : il attrape « commerce-marketing-finance »,
  // qui est une discipline, pas une page de financement.
  { motif: /financement|financer|prise en charge|\bcpf\b|\bopco\b|bourse/i, role: "financement" },
  { motif: /inscri|admission|candidat|rejoindre/i, role: "inscription" },
];

/**
 * Le motif est cherché dans le LIBELLÉ et dans le DERNIER SEGMENT de l'URL,
 * jamais dans le chemin entier.
 *
 * Mesuré au contrôle du 13 août : le chemin entier faisait passer
 * `/formation/commerce-marketing-finance/commerce/master-droit-...` pour une
 * page de financement. Un appel dépensé pour rien — et, pire, le vrai lien
 * tarifs aurait été déplacé par ce faux positif si la page en avait porté un.
 * Un segment de taxonomie décrit la rubrique où vit la page, pas la page.
 */
function liensEscalade(html: string, base: string): { url: string; role: string }[] {
  const vus = new Set<string>();
  const retenus: { url: string; role: string; rang: number }[] = [];
  for (const lien of liensAvecLibelle(html, base)) {
    let segment = "";
    try {
      segment = new URL(lien.url).pathname.split("/").filter(Boolean).pop() ?? "";
    } catch {
      /* href malformé : le libellé décidera seul */
    }
    const rang = MOTIFS_ESCALADE.findIndex(
      (m) => m.motif.test(lien.libelle) || m.motif.test(segment),
    );
    if (rang < 0 || vus.has(lien.url) || lien.url === base) continue;
    vus.add(lien.url);
    retenus.push({ url: lien.url, role: MOTIFS_ESCALADE[rang]!.role, rang });
  }
  return retenus.sort((a, b) => a.rang - b.rang).map(({ url, role }) => ({ url, role }));
}

/* -------------------------------------------------------------------------- */
/* Lecture d'une page                                                         */
/* -------------------------------------------------------------------------- */

async function lire(url: string, role: string): Promise<PageLue | { echec: string }> {
  const rep = await recuperer(url);
  if (!rep.ok) return { echec: rep.motif };

  let texte = texteprincipal(rep.texte);
  let html = rep.texte;

  // Repli navigateur : le seuil de page vide ne suffit pas — une page rendue
  // côté client sert beaucoup de HTML pour très peu de texte.
  const ratio = texte.length / Math.max(1, rep.texte.length);
  if (exigeRepliNavigateur(texte) || ratio < 0.03) {
    const rendu = await rendre(url);
    if (rendu.ok) {
      const apres = texteprincipal(rendu.html);
      if (apres.length > texte.length) {
        texte = apres;
        html = rendu.html;
      }
    }
    if (exigeRepliNavigateur(texte)) {
      return { echec: rendu.ok ? "page_vide_apres_rendu" : `navigateur_${rendu.motif}` };
    }
  }
  return { url, role, texte, html };
}

/* -------------------------------------------------------------------------- */
/* Traitement d'une fiche                                                     */
/* -------------------------------------------------------------------------- */

type Client = ReturnType<typeof clientAnthropic>;

async function traiter(
  fiche: EntreeLot,
  offre: OffreNormalisee,
  client: Client,
  decouvertes: readonly Decouverte[],
): Promise<Resultat> {
  const base: Resultat = {
    id: fiche.id,
    nom: fiche.nom,
    organisme: fiche.organisme,
    strate: fiche.strate,
    etatPrix: fiche.etatPrix,
    prixActuel: fiche.prixActuel,
    voieDecouverte: "aucune",
    pagesModele: [],
    requetesReseau: 0,
    trouve: false,
    proposition: null,
    motifEchec: null,
    cause: null,
    imputation: null,
    rejetsPrix: 0,
  };

  const trouvaille = await trouverPageDetail(fiche, decouvertes);
  base.voieDecouverte = trouvaille.voie;
  base.requetesReseau = trouvaille.requetes;
  if (trouvaille.url === "") {
    // Fait sur NOTRE outillage ou nos données, jamais sur l'organisme.
    base.motifEchec = trouvaille.voie;
    return base;
  }

  const detail = await lire(trouvaille.url, "detail");
  base.requetesReseau++;
  if ("echec" in detail) {
    base.motifEchec = `detail_${detail.echec}`;
    return base;
  }

  /*
    La page lue est-elle bien celle du parcours ? Sur la page de détail, la
    question porte sur la PAGE. Un mauvais rapprochement écrirait le prix d'une
    formation sur la fiche d'une autre.
  */
  const correspondance = verifierCorrespondance(fiche.nom, detail.html);
  if (!correspondance.correspond) {
    base.motifEchec = `page_d_un_autre_parcours(${correspondance.score.toFixed(2)}) « ${correspondance.intitule?.slice(0, 60)} »`;
    return base;
  }

  // File des pages à envoyer au modèle : la page de détail, puis l'escalade.
  const file: PageLue[] = [detail];
  const escalade = liensEscalade(detail.html, detail.url).slice(0, PAGES_MAX - 1);

  for (let rang = 0; rang < PAGES_MAX; rang++) {
    let page = file[rang];
    if (!page) {
      const suivant = escalade[rang - 1];
      if (!suivant) break;
      const lu = await lire(suivant.url, suivant.role);
      base.requetesReseau++;
      if ("echec" in lu) continue;
      page = lu;
    }

    base.pagesModele.push({ url: page.url, role: page.role });
    let extraction;
    try {
      extraction = await extrairePage(client, page.texte, page.url);
    } catch (erreur) {
      base.motifEchec = erreur instanceof Error ? erreur.message.slice(0, 120) : "erreur_extraction";
      return base;
    }

    base.rejetsPrix += extraction.filtrage.rejets.filter((r) => r.champ === "prix").length;
    const verdict = retenirPrix(
      fiche, offre, page, extraction.filtrage.retenus, extraction.filtrage.rejets,
    );
    if (verdict.ok) {
      base.trouve = true;
      base.proposition = verdict.proposition;
      return base;
    }
    /*
      La cause LA PLUS GRAVE l'emporte sur les pages successives : si une page
      a proposé un prix qu'on n'a pas su retenir, la fiche ne peut pas être
      déclarée « non publiée par l'organisme » à cause d'une autre page muette.
    */
    if (base.cause === null || base.cause === "aucun_prix_cite") base.cause = verdict.cause;
  }

  if (base.cause !== null) {
    base.imputation = imputer(base.cause);
    base.motifEchec = `${base.imputation} — ${LIBELLES_CAUSE[base.cause]}`;
  } else {
    base.motifEchec = base.motifEchec ?? "aucune_page_lue";
  }
  return base;
}

/**
 * Retient un prix, ou rien.
 *
 * Trois conditions, toutes obligatoires : la valeur est citée (déjà vérifiée en
 * amont), son unité est tranchée, et sur une page qui n'est pas celle du
 * parcours, le voisinage de la citation porte le nom du parcours.
 */
type Retenue =
  | { ok: true; proposition: NonNullable<Resultat["proposition"]> }
  | { ok: false; cause: Cause };

function retenirPrix(
  fiche: EntreeLot,
  offre: OffreNormalisee,
  page: PageLue,
  cites: Record<string, { valeur: unknown; extrait: string }>,
  rejets: readonly { champ: string }[],
): Retenue {
  const cite = cites["prix"];
  if (!cite || typeof cite.valeur !== "number") {
    /*
      DISTINCTION DÉCISIVE. Le modèle n'a rien proposé, ou il a proposé une
      valeur que le garde-fou de citation a rejetée : le premier est un fait sur
      l'organisme, le second sur nous. `filtrerParCitation` les sépare déjà —
      il suffisait de lire ses rejets au lieu de les ignorer.
    */
    return {
      ok: false,
      cause: rejets.some((r) => r.champ === "prix") ? "citation_invalide" : "aucun_prix_cite",
    };
  }

  /*
    UNE VALEUR EXISTANTE N'EST JAMAIS REMPLACÉE PAR UN VIDE. Ce script ne
    produit que des propositions portant une valeur citée : il n'a aucun chemin
    vers l'effacement, et c'est voulu — une consigne d'écriture sans règle
    d'effacement avait supprimé 61 prix le 3 août.
  */
  if (cite.valeur === null || cite.valeur === undefined) return { ok: false, cause: "aucun_prix_cite" };

  let valeur = cite.valeur;
  let extrait = cite.extrait;

  // L'unité est obligatoire : un tarif journalier lu comme un total ment d'un
  // facteur égal à la durée.
  const verdictUnite = trancherUnite(
    cites["unitePrix"]?.valeur as string | undefined,
    `${extrait} ${cites["unitePrix"]?.extrait ?? ""}`,
  );
  let unite = verdictUnite.unite;
  let derive = false;
  if (unite === null) {
    const derivation =
      verdictUnite.motif === "unite_absente"
        ? derivationTotal(page.texte)
        : { derive: false, motif: verdictUnite.motif };
    if (!derivation.derive) return { ok: false, cause: "unite_indeterminee" };
    unite = "total";
    derive = true;
  }
  if (unite === "journalier") {
    const converti = convertirJournalier(valeur, unite, offre.duree);
    if (converti === null) return { ok: false, cause: "journalier_sans_duree" };
    valeur = converti.total;
    extrait = `${extrait} — ${converti.unitaire} €/jour × ${converti.jours} j`;
  } else if (unite !== "total") {
    // Mensuel, annuel, horaire : l'organisme A publié son prix. C'est notre
    // modèle de comparaison qui ne sait pas le ramener à un total.
    return { ok: false, cause: "unite_non_comparable" };
  }

  /*
    ATTRIBUTION. Sur la page de détail, la correspondance de page a déjà tranché.
    Sur une page tarifs, elle n'a rien dit — son titre est « Tarifs » — et c'est
    ici que se joue le pire résultat possible : un prix juste sur la mauvaise
    fiche.
  */
  let attribution: number | null = null;
  if (page.role !== "detail") {
    const verdict = attribuerExtrait(fiche.nom, page.texte, cite.extrait);
    attribution = Number(verdict.score.toFixed(2));
    if (!verdict.attribue) return { ok: false, cause: "attribution_refusee" };
  }

  return {
    ok: true,
    proposition: {
    champ: "prix",
    valeur,
    unite,
    extrait,
    urlSource: page.url,
    role: page.role,
    attribution,
    derive,
    },
  };
}

/* -------------------------------------------------------------------------- */

function euros(jetonsEntree: number, jetonsSortie: number): number {
  const dollars = (jetonsEntree / 1e6) * TARIF.entree + (jetonsSortie / 1e6) * TARIF.sortie;
  return dollars * TAUX_USD_EUR;
}

async function main() {
  if (!existsSync(LOT)) {
    throw new Error(`${LOT} absent — lancer d'abord « bun run scripts/lot-profondeur.ts --figer ».`);
  }
  const fige = JSON.parse(readFileSync(LOT, "utf8")) as EntreeLot[];
  const catalogue = chargerCatalogue();
  const parId = new Map(catalogue.map((o) => [o.id, o]));

  /*
    LE LOT FIGÉ ÉPINGLE L'ÉCHANTILLON, PAS SES DONNÉES.

    Le fichier fixe QUELLES fiches sont mesurées — c'est ce qui rend deux
    mesures comparables. Il ne doit pas fixer leur domaine : après la correction
    d'`ebs-paris.com` en `.fr`, rejouer sur la copie figée remesurerait l'ancien
    domaine et rendrait « injoignable » sur une fiche réparée. On relit donc
    domaine et `urlDetail` au catalogue à chaque rejeu.
  */
  const lot: EntreeLot[] = fige.map((e) => {
    const offre = parId.get(e.id);
    if (!offre) return e;
    return {
      ...e,
      nom: offre.nom,
      organisme: offre.organisme,
      url: offre.url ?? e.url,
      domaine: (offre.url ?? e.url).replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/^www\./, "").trim(),
      urlDetail: (offre as { urlDetail?: string | null }).urlDetail ?? null,
      prixActuel: offre.prix,
    };
  });
  const decouvertes: Decouverte[] = existsSync(DECOUVERTES)
    ? JSON.parse(readFileSync(DECOUVERTES, "utf8"))
    : [];
  const client = clientAnthropic(undefined, GROUPE_PRIX);

  console.log(`\nCrawl profond — ${lot.length} fiches, ${PAGES_MAX} pages modèle au plus par fiche`);
  console.log(`Modèle : ${MODELE}   ·   attribution hors page de détail : ${SEUIL_ATTRIBUTION}\n`);

  const resultats: Resultat[] = [];
  const sauvegarder = () => writeFileSync(SORTIE, JSON.stringify(resultats, null, 1));

  /*
    APPEL DE CONTRÔLE, avant le lot.

    Deux gaspillages ont déjà été causés par une configuration invalide
    découverte au dixième appel : quarante appels perdus sur une compilation de
    grammaire, puis trente sur un paramètre refusé. Les deux se voyaient sur le
    PREMIER appel. Le reste ne part donc qu'ensuite, et seulement sur demande
    explicite — sans `--lancer`, le script s'arrête ici.
  */
  /*
    UN CONTRÔLE QUI N'APPELLE PAS LE MODÈLE NE CONTRÔLE RIEN.

    Première version : la fiche 1 échouait en découverte, zéro appel partait, et
    le script imprimait « configuration valide ». Il tournait, ne plantait pas,
    et rendait un verdict sur autre chose — le motif que ce dépôt collectionne.

    La parade est d'interroger la SORTIE : le contrôle n'est acquis que si
    `depense().appels` a bougé. Tant qu'il n'a pas bougé, on descend la file —
    une découverte ratée coûte des requêtes réseau, pas des euros, et elle ne
    doit pas empêcher d'éprouver la configuration.
  */
  let controle: Resultat | null = null;
  let traitees = 0;
  for (const fiche of lot) {
    traitees++;
    console.log(`Appel de contrôle — #${fiche.id} ${fiche.organisme} · ${fiche.nom}`);
    let resultat: Resultat;
    try {
      resultat = await traiter(fiche, parId.get(fiche.id)!, client, decouvertes);
    } catch (erreur) {
      await fermerNavigateur();
      console.error(
        `\nAPPEL DE CONTRÔLE EN ÉCHEC — le lot n'est pas lancé.\n` +
          `${erreur instanceof Error ? erreur.message : String(erreur)}\n`,
      );
      process.exit(1);
    }
    resultats.push(resultat);
    sauvegarder();
    restituerFiche(resultat);

    if (client.depense().appels > 0) {
      controle = resultat;
      break;
    }
    console.log(
      `      aucune page n'a atteint le modèle — la configuration n'est pas encore éprouvée.`,
    );
  }

  const depenseControle = client.depense();
  if (controle === null) {
    await fermerNavigateur();
    console.error(
      `\nCONTRÔLE IMPOSSIBLE — les ${lot.length} fiches ont échoué avant tout appel au modèle.\n` +
        `La configuration n'est NI valide NI invalide : elle n'a pas été éprouvée.\n` +
        `Le blocage est en amont, dans la découverte d'URL. → ${SORTIE}\n`,
    );
    process.exit(1);
  }

  console.log(
    `\n  Contrôle acquis sur #${controle.id} : ${depenseControle.appels} appel(s), ` +
      `${depenseControle.jetonsEntree.toLocaleString("fr-FR")} jetons entrée, ` +
      `${euros(depenseControle.jetonsEntree, depenseControle.jetonsSortie).toFixed(4)} €` +
      (traitees > 1 ? `   (${traitees - 1} fiche(s) écartée(s) avant, sans appel)` : ""),
  );

  if (!process.argv.includes("--lancer")) {
    await fermerNavigateur();
    console.log(
      `\n  Configuration éprouvée. Relancer avec --lancer pour les ${lot.length - traitees} restantes.`,
    );
    console.log(`  → ${SORTIE}\n`);
    return;
  }

  console.log(`\n--- Les ${lot.length - traitees} fiches restantes ---\n`);
  const restantes = lot.slice(traitees);
  const autres = await enParallele(restantes, 3, (fiche) =>
    traiter(fiche, parId.get(fiche.id)!, client, decouvertes).then((r) => {
      restituerFiche(r);
      return r;
    }),
  );
  resultats.push(...autres);
  sauvegarder();
  await fermerNavigateur();

  restituer(resultats, client.depense());
}

function restituerFiche(r: Resultat) {
  const etiquette = `#${String(r.id).padStart(3)} ${r.organisme.slice(0, 22).padEnd(22)}`;
  if (r.trouve && r.proposition) {
    console.log(
      `${etiquette} ✓ ${r.proposition.valeur} € (${r.proposition.unite})` +
        ` — ${r.pagesModele.length} page(s), via ${r.proposition.role}` +
        (r.proposition.attribution === null ? "" : `, attribution ${r.proposition.attribution}`),
    );
    console.log(`      « ${r.proposition.extrait.slice(0, 110)} »`);
    console.log(`      ${r.proposition.urlSource}`);
  } else {
    console.log(`${etiquette} ✗ ${r.motifEchec} — ${r.pagesModele.length} page(s) lue(s)`);
  }
}

function restituer(
  resultats: readonly Resultat[],
  depense: { appels: number; caracteresEnvoyes: number; jetonsEntree: number; jetonsSortie: number },
) {
  const trouves = resultats.filter((r) => r.trouve);
  const pages = resultats.reduce((n, r) => n + r.pagesModele.length, 0);
  const reseau = resultats.reduce((n, r) => n + r.requetesReseau, 0);
  const cout = euros(depense.jetonsEntree, depense.jetonsSortie);

  /*
    LE TAUX D'ATTEINTE DU MODÈLE VIENT EN PREMIER, et c'est délibéré.

    Au lot du 13 août, 7 fiches sur 10 n'atteignaient jamais le modèle — toutes
    pour des raisons qui nous appartenaient. Tant que ce chiffre est bas, le
    taux de citation mesure surtout notre découverte, pas notre extraction.
  */
  const atteintes = resultats.filter((r) => r.pagesModele.length > 0);
  console.log(`\n  ATTEINTE DU MODÈLE : ${atteintes.length}/${resultats.length} fiches ont fait lire au moins une page`);
  console.log(`  PRIX TROUVÉS       : ${trouves.length} (sur ${atteintes.length} fiches atteintes)`);
  console.log(`  Pages modèle       : ${pages} (${(pages / resultats.length).toFixed(1)} par fiche)`);
  console.log(`  Requêtes réseau    : ${reseau} (gratuites, hors modèle)`);
  console.log(`  Appels au modèle   : ${depense.appels}`);
  console.log(`  Caractères envoyés : ${depense.caracteresEnvoyes.toLocaleString("fr-FR")}`);
  console.log(
    `  Jetons             : ${depense.jetonsEntree.toLocaleString("fr-FR")} entrée, ` +
      `${depense.jetonsSortie.toLocaleString("fr-FR")} sortie`,
  );
  console.log(`  COÛT               : ${cout.toFixed(2)} € (taux USD→EUR ${TAUX_USD_EUR}, déclaré)`);
  console.log(`  Coût par fiche     : ${(cout / resultats.length).toFixed(3)} €`);

  // Le nombre absolu avant le pourcentage : « 1 sur 2 » se discute, « 50 % »
  // fabrique une fausse précision en cachant la taille de l'échantillon.
  console.log("\n  PAR STRATE");
  const strates = new Map<string, { n: number; ok: number; pages: number }>();
  for (const r of resultats) {
    const s = strates.get(r.strate) ?? { n: 0, ok: 0, pages: 0 };
    s.n++;
    if (r.trouve) s.ok++;
    s.pages += r.pagesModele.length;
    strates.set(r.strate, s);
  }
  for (const [strate, s] of strates) {
    console.log(`      ${strate.padEnd(26)} ${s.ok}/${s.n} trouvés, ${s.pages} page(s)`);
  }

  console.log("\n  À QUI APPARTIENT L'ABSENCE");
  const parImput = new Map<string, number>();
  for (const r of resultats.filter((x) => !x.trouve && x.imputation)) {
    parImput.set(r.imputation!, (parImput.get(r.imputation!) ?? 0) + 1);
  }
  for (const [i, n] of parImput) console.log(`      ${String(n).padStart(3)}  ${i}`);

  console.log("\n  MOTIFS D'ÉCHEC");
  const motifs = new Map<string, number>();
  for (const r of resultats.filter((x) => !x.trouve)) {
    const cle = (r.motifEchec ?? "inconnu").split("(")[0]!;
    motifs.set(cle, (motifs.get(cle) ?? 0) + 1);
  }
  for (const [motif, n] of motifs) console.log(`      ${String(n).padStart(2)}  ${motif}`);

  /*
    L'INVARIANT, VÉRIFIÉ SUR LA SORTIE ET NON SUR L'INTENTION.

    Aucune fiche déclarée « non publiée par l'organisme » ne peut porter un
    rejet de citation sur le prix : un rejet est un fait sur NOUS, et il
    interdit de conclure sur le silence de l'organisme. Le test unitaire
    verrouille `imputer` ; celui-ci verrouille ce qui sort réellement du crawl,
    même si un chemin de code futur contourne `imputer`.

    Il échoue bruyamment plutôt que d'écrire : c'est l'inversion la plus
    coûteuse du produit, et elle a déjà eu lieu une fois.
  */
  const inversions = resultats.filter(
    (r) => r.imputation === "non_publie_par_organisme" && r.rejetsPrix > 0,
  );
  if (inversions.length > 0) {
    console.error(
      `\n  INVARIANT VIOLÉ — ${inversions.length} fiche(s) imputées à l'organisme malgré un rejet de notre pipeline :`,
    );
    for (const r of inversions) console.error(`      #${r.id} ${r.organisme} (${r.rejetsPrix} rejet(s))`);
    process.exitCode = 1;
  } else {
    console.log(`\n  Invariant d'imputation : aucune absence imputée à tort à un organisme.`);
  }

  console.log(`\n  Rien n'a été écrit au catalogue. → ${SORTIE}\n`);
}

main();
