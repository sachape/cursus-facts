/**
 * Repli navigateur — pour les pages rendues côté client.
 *
 * Coursera sert 12 360 caractères de texte pour 890 Ko de HTML : un ratio de
 * 1,4 %, contre 4,9 % chez une école et 6,9 % en formation professionnelle. Ce
 * n'est pas un squelette vide — le seuil de page vide ne se déclenche pas —
 * mais l'essentiel du contenu n'arrive jamais. C'est cette strate qui
 * décrochait à l'extraction.
 *
 * RÈGLE INCHANGÉE : un échec de rendu n'est jamais une absence d'information.
 * Si le navigateur ne fait pas mieux que la récupération simple, le champ reste
 * `non_collecte` — jamais `non_communique`. Faire porter à un organisme une
 * opacité qui est la nôtre est l'erreur que ce dispositif existe pour éviter.
 *
 * Le navigateur est ouvert une fois et réutilisé : démarrer Chromium par page
 * coûterait plus que la lecture elle-même.
 */
import type { Browser } from "playwright";

let navigateur: Browser | null = null;

/** Ouvre le navigateur au premier appel, le réutilise ensuite. */
async function obtenir(): Promise<Browser> {
  if (navigateur) return navigateur;
  // Import différé : les scripts qui n'ont pas besoin du navigateur ne doivent
  // pas payer le chargement de Playwright.
  const { chromium } = await import("playwright");
  navigateur = await chromium.launch({ headless: true });
  return navigateur;
}

export async function fermerNavigateur(): Promise<void> {
  await navigateur?.close();
  navigateur = null;
}

export type RenduNavigateur =
  | { ok: true; html: string }
  | { ok: false; motif: string };

/**
 * Rend une page avec exécution du JavaScript.
 *
 * `networkidle` plutôt que `load` : les plateformes chargent leur contenu après
 * le premier rendu, et attendre le seul `load` ramènerait le même squelette que
 * la récupération simple.
 */
export async function rendre(
  url: string,
  options: { timeoutMs?: number } = {},
): Promise<RenduNavigateur> {
  try {
    const nav = await obtenir();
    const contexte = await nav.newContext({
      userAgent:
        "CursusBot/1.0 (+https://cursus-facts-only.lovable.app ; comparateur de formations)",
      // Les images et polices ne portent aucun fait : les charger triplerait le
      // temps de rendu pour rien.
      javaScriptEnabled: true,
    });
    await contexte.route("**/*", (route) => {
      const type = route.request().resourceType();
      return ["image", "font", "media"].includes(type) ? route.abort() : route.continue();
    });

    const page = await contexte.newPage();
    try {
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: options.timeoutMs ?? 30_000,
      });
      const html = await page.content();
      return { ok: true, html };
    } finally {
      await contexte.close();
    }
  } catch (erreur) {
    return {
      ok: false,
      motif: erreur instanceof Error ? erreur.name : "erreur_navigateur",
    };
  }
}
