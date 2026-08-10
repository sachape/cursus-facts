/**
 * Découverte des URL par les sitemaps.
 *
 * Pour une grande partie des parcours, nous n'avons pas l'adresse de la page de
 * détail — seulement le domaine de l'organisme. Or presque tous publient un
 * `sitemap.xml`, souvent référencé dans leur `robots.txt` : c'est la liste
 * exhaustive de leurs pages, structurée, avec les dates de dernière
 * modification.
 *
 * PROFONDEUR ET LARGEUR DANS LE MÊME PASSAGE. Les URL rapprochées d'un parcours
 * fiché donnent la page de détail à lire. Les URL de formation **non**
 * rapprochées sont des parcours que nous n'avons jamais vus. La même requête
 * règle les deux.
 *
 * `lastmod` est conservée : c'est le déclencheur de revérification de l'agent,
 * et le seul signal qui distingue une page modifiée d'une page stable sans la
 * relire.
 */

export type EntreeSitemap = {
  url: string;
  /** Date de dernière modification déclarée par l'organisme, si publiée. */
  lastmod: string | null;
};

/** Extrait les URL de sitemap déclarées dans un robots.txt. */
export function sitemapsDeclares(robots: string): string[] {
  return [...robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]!.trim());
}

/** Vrai si le document est un index de sitemaps plutôt qu'une liste d'URL. */
export function estIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

/**
 * Lit un sitemap ou un index, sans dépendance XML.
 *
 * Les sitemaps réels sont trop irréguliers pour un parseur strict — namespaces
 * absents, CDATA, entités doublement échappées. Une lecture par expression
 * régulière sur `<loc>` est plus robuste ici qu'un parseur qui refuse le
 * document entier pour un caractère.
 */
export function lireSitemap(xml: string): EntreeSitemap[] {
  const blocs = [...xml.matchAll(/<(?:url|sitemap)\b[^>]*>([\s\S]*?)<\/(?:url|sitemap)>/gi)];
  const entrees: EntreeSitemap[] = [];

  for (const bloc of blocs) {
    const contenu = bloc[1] ?? "";
    const loc = contenu.match(/<loc>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/loc>/i)?.[1];
    if (!loc) continue;
    const lastmod = contenu.match(/<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/i)?.[1] ?? null;
    entrees.push({ url: decoderEntites(loc.trim()), lastmod: lastmod?.slice(0, 10) ?? null });
  }
  return entrees;
}

function decoderEntites(texte: string): string {
  return texte
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

/**
 * Motifs d'URL désignant une page de formation.
 *
 * Volontairement larges : un faux positif coûte une requête, un faux négatif
 * coûte un parcours jamais découvert. Le rapprochement en aval tranchera.
 */
const MOTIFS_FORMATION =
  /\/(formation|formations|cours|cursus|programme|programmes|parcours|training|course|courses|stage|stages|bootcamp|certification|diplome|diplomes|master|licence|bachelor|mastere|mba|bts|but|dut|academy|apprendre)[s]?[/-]/i;

/**
 * Motifs d'URL qui ne peuvent pas être une page de parcours.
 *
 * L'exclusion est plus fiable que l'inclusion sur ce bruit-là : une page
 * d'actualité peut porter un titre de formation parfaitement crédible, mais son
 * chemin la trahit toujours. L'échantillon du 4 août a ramené un article
 * Parcoursup d'Audencia, une page « les métiers » d'EM Normandie et une
 * actualité de MBA ESG — trois faux positifs qu'aucun filtre d'inclusion
 * n'aurait écartés.
 */
const MOTIFS_EXCLUS =
  /\/(blog|actualite|actualites|news|article|articles|auteur|author|tag|tags|categorie|category|metier|metiers|parcoursup|admission|admissions|evenement|evenements|mentions|cgv|cgu|politique|privacy|contact|recrutement|carriere|presse|plan-du-site|panier|compte|login|connexion|wp-content|wp-json|feed)[/-]?|\.(jpg|jpeg|png|gif|svg|pdf|css|js|xml)$/i;

/**
 * Marqueurs réellement discriminants du périmètre e-commerce.
 *
 * « Commerce » seul en est absent, et c'est le point : sur vingt candidats
 * tirés au hasard le 4 août, il ramenait du commerce international, du commerce
 * circulaire et des écoles de commerce — soit une bonne moitié de faux
 * positifs. Un mot générique ne discrimine rien.
 *
 * « Marketing digital » est admis mais reste le maillon faible : il ramènera de
 * la communication et de la publicité qui ne relèvent pas de nos neuf domaines.
 * La classification tranchera en aval ; ce filtre-ci ne fait que réduire le
 * volume à lire.
 */
const MARQUEURS_ECOMMERCE =
  /(e-?commerce|dropshipping|shopify|prestashop|woo-?commerce|magento|marketplace|amazon|fba|vente-en-ligne|boutique-en-ligne|marketing-digital)/i;

/** Vrai si l'URL relève du périmètre e-commerce, et pas seulement du commerce. */
export function estPertinentEcommerce(url: string): boolean {
  return MARQUEURS_ECOMMERCE.test(cheminDe(url));
}

/** Vrai si l'URL ressemble à une page de détail de formation. */
export function estPageFormation(url: string): boolean {
  const chemin = cheminDe(url);
  if (chemin === "/" || chemin === "") return false;
  if (MOTIFS_EXCLUS.test(chemin)) return false;
  return MOTIFS_FORMATION.test(chemin);
}

function cheminDe(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/* -------------------------------------------------------------------------- */
/* Rapprochement URL ↔ parcours fiché                                         */
/* -------------------------------------------------------------------------- */

/** Mots trop fréquents pour discriminer un parcours d'un autre. */
const MOTS_VIDES = new Set([
  "de", "du", "des", "le", "la", "les", "un", "une", "et", "en", "au", "aux", "pour", "sur",
  "avec", "par", "dans", "son", "sa", "ses", "formation", "formations", "cours", "parcours",
  "the", "of", "and", "to", "your", "creer", "creez",
]);

/** Réduit un texte à ses mots discriminants, pour le rapprochement. */
export function motsCles(texte: string): Set<string> {
  const mots = texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((m) => m.length >= 3 && !MOTS_VIDES.has(m));
  return new Set(mots);
}

/**
 * Score de rapprochement entre un intitulé de parcours et une URL.
 *
 * Part des mots discriminants de l'intitulé retrouvés dans l'URL. Le sens est
 * volontairement asymétrique : une URL porte souvent plus de segments que
 * l'intitulé (catégorie, référence), et les compter contre elle ferait rater
 * des rapprochements corrects.
 */
export function scoreRapprochement(intitule: string, cible: string): number {
  const attendus = motsCles(intitule);
  if (attendus.size === 0) return 0;
  // `cheminDe` rend la chaîne telle quelle si ce n'est pas une URL : la même
  // fonction sert donc à comparer un intitulé à une URL ou à un autre intitulé.
  const presents = motsCles(cheminDe(cible));
  let trouves = 0;
  for (const mot of attendus) if (presents.has(mot)) trouves++;
  return trouves / attendus.size;
}

export type Rapprochement = {
  /** Identifiant du parcours fiché, ou `null` si l'URL n'en rejoint aucun. */
  id: number | null;
  url: string;
  lastmod: string | null;
  score: number;
};

/**
 * Seuil de rapprochement.
 *
 * Sous ce seuil, l'URL est traitée comme un parcours inconnu plutôt que
 * rattachée au mauvais. Se tromper de rattachement écrirait les données d'une
 * formation sur la fiche d'une autre — une erreur invisible et bien pire qu'une
 * découverte en trop.
 */
export const SEUIL_RAPPROCHEMENT = 0.6;

/** Rapproche les URL d'un organisme de ses parcours déjà fichés. */
export function rapprocher(
  entrees: readonly EntreeSitemap[],
  fiches: readonly { id: number; nom: string }[],
): Rapprochement[] {
  const pris = new Set<number>();
  const resultats: Rapprochement[] = [];

  for (const entree of entrees) {
    let meilleur: { id: number; score: number } | null = null;
    for (const fiche of fiches) {
      if (pris.has(fiche.id)) continue;
      const score = scoreRapprochement(fiche.nom, entree.url);
      if (!meilleur || score > meilleur.score) meilleur = { id: fiche.id, score };
    }
    const retenu = meilleur && meilleur.score >= SEUIL_RAPPROCHEMENT ? meilleur : null;
    if (retenu) pris.add(retenu.id);
    resultats.push({
      id: retenu?.id ?? null,
      url: entree.url,
      lastmod: entree.lastmod,
      score: meilleur?.score ?? 0,
    });
  }
  return resultats;
}
