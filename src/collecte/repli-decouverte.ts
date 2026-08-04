/**
 * Repli de découverte — pour les organismes sans sitemap exploitable.
 *
 * 72 organismes sur 163, soit 44 % du catalogue, n'exposent pas de sitemap
 * lisible ou sont injoignables. Les abandonner reviendrait à laisser la moitié
 * du catalogue en profondeur nulle, c'est-à-dire à faire porter à ces
 * organismes une opacité qui serait la nôtre.
 *
 * TROIS REPLIS, PAR ORDRE DE COÛT :
 *   1. plan du site en HTML — une requête, aucun modèle
 *   2. exploration à profondeur limitée depuis la page catalogue
 *   3. recherche restreinte au domaine — la plus chère, la plus efficace
 *
 * On s'arrête au premier qui rend des URL. Escalader systématiquement
 * paierait le coût du troisième pour des organismes que le premier suffisait à
 * traiter.
 */

/** Chemins usuels d'un plan du site en HTML, dans l'ordre de fréquence. */
export const CHEMINS_PLAN_DU_SITE = [
  "/plan-du-site",
  "/plan-site",
  "/sitemap",
  "/sitemap.html",
  "/plan",
  "/nos-formations",
  "/formations",
  "/catalogue",
  "/nos-cours",
  "/courses",
] as const;

/**
 * Extrait les liens d'une page HTML, absolutisés et limités au domaine.
 *
 * Sortir du domaine mènerait vers des annuaires et des comparatifs — dont nous
 * ne reprenons aucune donnée. La contrainte est donc structurelle, pas
 * seulement prudente.
 */
export function liensInternes(html: string, base: string): string[] {
  let origine: string;
  try {
    origine = new URL(base).origin;
  } catch {
    return [];
  }

  const trouves = new Set<string>();
  for (const correspondance of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)["']/gi)) {
    const brut = correspondance[1]!.trim();
    if (brut === "" || /^(mailto:|tel:|javascript:)/i.test(brut)) continue;
    try {
      const url = new URL(brut, base);
      if (url.origin !== origine) continue;
      url.hash = "";
      trouves.add(url.toString());
    } catch {
      // Un href malformé n'est pas une erreur de collecte : on l'ignore.
    }
  }
  return [...trouves];
}

export type Strategie = "sitemap" | "plan_html" | "exploration" | "recherche_domaine";

export type PlanDeRepli = {
  organisme: string;
  domaine: string;
  strategie: Strategie | null;
  urls: string[];
};

/**
 * Décide de la stratégie retenue au vu de ce que chaque repli a rendu.
 *
 * Un repli qui rend zéro URL n'est pas un échec de l'organisme : c'est un
 * échec de notre outillage sur ce site. Le distinguer compte, parce que le
 * premier justifierait de ne rien afficher et le second impose de réessayer
 * autrement.
 */
export function retenirStrategie(
  resultats: Partial<Record<Strategie, string[]>>,
): { strategie: Strategie | null; urls: string[] } {
  const ordre: Strategie[] = ["sitemap", "plan_html", "exploration", "recherche_domaine"];
  for (const strategie of ordre) {
    const urls = resultats[strategie];
    if (urls && urls.length > 0) return { strategie, urls };
  }
  return { strategie: null, urls: [] };
}

/**
 * Profondeur maximale d'exploration depuis la page catalogue.
 *
 * Deux niveaux : la page catalogue, puis ses liens. Au-delà, on parcourt le
 * site entier d'un organisme pour trouver des pages que les deux premiers
 * niveaux auraient rendues — beaucoup de requêtes chez lui pour peu de gain
 * chez nous.
 */
export const PROFONDEUR_EXPLORATION = 2;

/** Nombre maximal de pages visitées par organisme pendant l'exploration. */
export const BUDGET_EXPLORATION = 60;
