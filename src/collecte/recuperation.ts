/**
 * Récupération réseau — politesse, robustesse, et distinction des échecs.
 *
 * RÈGLE CARDINALE : un échec réseau n'est jamais une absence d'information. Le
 * champ reste `non_collecte`, jamais `non_communique`. Confondre les deux fait
 * porter au vendeur une opacité qui est peut-être la nôtre — coachingfba.com
 * servait une page vide par rendu JavaScript, ce qui aurait fait classer en
 * « non publié » des informations parfaitement publiées.
 */

const CADENCE_PAR_DOMAINE_MS = 1_500;
const TENTATIVES = 3;
const AGENT = "FormlistBot/1.0 (+https://www.formlist.fr ; comparateur de formations)";

/** Dernier appel par domaine, pour espacer les requêtes. */
const dernierAppel = new Map<string, number>();

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Espace les requêtes d'un même domaine, sans ralentir les autres.
 *
 * La réservation du créneau est faite **avant** l'attente, pas après : sans ça,
 * deux appels concurrents sur le même domaine liraient la même date, dormiraient
 * la même durée et repartiraient ensemble — la concurrence transformerait la
 * politesse en martèlement chez un seul organisme.
 */
async function respecterCadence(domaine: string, horloge: () => number): Promise<void> {
  const maintenant = horloge();
  const prochainCreneau = Math.max(maintenant, (dernierAppel.get(domaine) ?? 0) + CADENCE_PAR_DOMAINE_MS);
  dernierAppel.set(domaine, prochainCreneau);
  const attente = prochainCreneau - maintenant;
  if (attente > 0) await attendre(attente);
}

/**
 * Exécute des tâches avec un nombre borné en vol.
 *
 * L'extraction est dominée par l'attente, pas par le calcul : 20 pages en
 * 32 minutes séquentielles, dont l'essentiel passé à attendre le modèle sur des
 * pages universitaires de plusieurs dizaines de milliers de caractères. Six en
 * vol ramènent la passe complète de sept heures à un peu plus d'une, sans
 * toucher à la cadence par domaine, qui reste appliquée en dessous.
 */
export async function enParallele<T, R>(
  items: readonly T[],
  limite: number,
  travail: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const resultats = new Array<R>(items.length);
  let curseur = 0;
  const ouvriers = Array.from({ length: Math.min(limite, items.length) }, async () => {
    while (curseur < items.length) {
      const index = curseur++;
      resultats[index] = await travail(items[index]!, index);
    }
  });
  await Promise.all(ouvriers);
  return resultats;
}

export type Reponse =
  | { ok: true; texte: string; statut: number }
  | { ok: false; motif: string; statut: number | null };

/**
 * Récupère une URL, avec réessais à temporisation croissante.
 *
 * Un 404 ou un 403 ne sont pas réessayés : ils sont stables, et insister
 * ajoute de la charge chez l'organisme sans rien apprendre.
 */
export async function recuperer(
  url: string,
  options: { horloge?: () => number; fetchImpl?: typeof fetch } = {},
): Promise<Reponse> {
  const horloge = options.horloge ?? Date.now;
  const requete = options.fetchImpl ?? fetch;
  let domaine: string;
  try {
    domaine = new URL(url).host;
  } catch {
    return { ok: false, motif: "url_invalide", statut: null };
  }

  let dernierMotif = "inconnu";
  for (let tentative = 0; tentative < TENTATIVES; tentative++) {
    if (tentative > 0) await attendre(1_000 * 2 ** tentative);
    await respecterCadence(domaine, horloge);
    try {
      const reponse = await requete(url, {
        headers: { "user-agent": AGENT, accept: "text/html,application/xhtml+xml,application/xml" },
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
      });
      if (reponse.ok) return { ok: true, texte: await reponse.text(), statut: reponse.status };
      // Stables : inutile d'insister.
      if (reponse.status === 404 || reponse.status === 403 || reponse.status === 410) {
        return { ok: false, motif: `http_${reponse.status}`, statut: reponse.status };
      }
      dernierMotif = `http_${reponse.status}`;
    } catch (erreur) {
      dernierMotif = erreur instanceof Error ? erreur.name : "erreur_reseau";
    }
  }
  return { ok: false, motif: dernierMotif, statut: null };
}

/* -------------------------------------------------------------------------- */
/* robots.txt                                                                 */
/* -------------------------------------------------------------------------- */

export type Robots = { autorise: (chemin: string) => boolean; sitemaps: string[] };

/**
 * Lit un robots.txt pour notre agent.
 *
 * En l'absence de robots.txt, tout est autorisé — c'est la convention. En cas
 * d'erreur serveur, on s'abstient plutôt : un 500 ne vaut pas permission.
 */
export function lireRobots(contenu: string): Robots {
  const lignes = contenu.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim());
  const sitemaps: string[] = [];
  const interdits: string[] = [];
  let groupeApplicable = false;

  for (const ligne of lignes) {
    const [cle, ...reste] = ligne.split(":");
    if (!cle || reste.length === 0) continue;
    const valeur = reste.join(":").trim();
    const nom = cle.trim().toLowerCase();

    if (nom === "sitemap") sitemaps.push(valeur);
    else if (nom === "user-agent") groupeApplicable = valeur === "*" || /cursus/i.test(valeur);
    else if (nom === "disallow" && groupeApplicable && valeur !== "") interdits.push(valeur);
  }

  return {
    sitemaps,
    autorise: (chemin) => !interdits.some((prefixe) => chemin.startsWith(prefixe)),
  };
}

/* -------------------------------------------------------------------------- */
/* Texte principal                                                            */
/* -------------------------------------------------------------------------- */

/** En dessous, la page est présumée rendue côté client : repli navigateur. */
export const SEUIL_PAGE_VIDE = 600;

/**
 * Extrait le texte principal d'une page.
 *
 * Le texte doit rester **littéral** : c'est lui qui servira à vérifier les
 * citations. Toute reformulation ici rendrait le garde-fou inopérant, puisque
 * la valeur serait comparée à un texte que la page n'a jamais servi.
 */
export function texteprincipal(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // La navigation dilue la page et n'apporte aucun fait sur le parcours.
    // Trois pages sur trois commençaient par « Go to header », « For
    // Individuals », « Explore » — du bruit que le modèle doit écarter à nos
    // frais, et dans lequel il finit par puiser des citations.
    .replace(/<(nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi, " ")
    /*
      RESTITUER LE LIEN ÉTIQUETTE → VALEUR.

      L'information des pages qui résistent — MOOC 64 %, formation continue
      70 % — ne vit pas en phrases mais en éléments d'interface : « Durée » dans
      un encart, « 35 h » à côté. Aplatis sans séparateur, les deux se retrouvent
      collés à du bruit, et le modèle reconstitue une phrase qui n'existe nulle
      part dans le texte servi. Sa valeur est souvent juste ; c'est sa citation
      qui est introuvable, et le garde-fou la rejette à raison.

      Rétablir le deux-points entre l'étiquette et sa valeur produit la phrase
      que le modèle allait écrire de toute façon — mais cette fois elle existe
      dans la page. On améliore l'entrée du garde-fou, on ne le relâche jamais.
    */
    .replace(/<\/(dt|th)>\s*/gi, " : ")
    .replace(/<\/(dd|td)>\s*/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&(#39|apos|rsquo);/gi, "'")
    .replace(/&(quot|ldquo|rdquo);/gi, '"')
    .replace(/&(euro);/gi, "€")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n")
    .trim();
}

/** Vrai si la page est vide ou anormalement courte — rendu JavaScript probable. */
export function exigeRepliNavigateur(texte: string): boolean {
  return texte.length < SEUIL_PAGE_VIDE;
}
