/**
 * Invariants de rendu — ce que le navigateur affiche, pas ce que le code déclare.
 *
 * Un design system entièrement mort a passé sept invariants et 207 tests le
 * 4 août 2026 : toutes les classes migrées utilisaient `mr-[--space-6]` au lieu
 * de `mr-(--space-6)`, forme que Tailwind v4 ignore silencieusement. Ni erreur
 * de compilation, ni avertissement, ni style. Les onglets se touchaient.
 *
 * Aucun invariant portant sur le code ne pouvait le voir. Ceux-ci mesurent la
 * géométrie et la couleur calculées par le moteur de rendu — la seule autorité
 * sur ce que l'utilisateur lit.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE = process.env["URL_TEST"] ?? "http://localhost:3000";

/** Rectangle d'un élément, en coordonnées de page. */
async function boite(cible: Locator) {
  const b = await cible.boundingBox();
  if (!b) throw new Error("élément non rendu");
  return b;
}

/** Contraste WCAG entre deux couleurs `rgb(...)` calculées. */
function contraste(avant: string, arriere: string): number {
  const luminance = (couleur: string) => {
    const [r, g, b] = couleur.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number) as [number, number, number];
    const canal = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  };
  const a = luminance(avant);
  const b = luminance(arriere);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Remonte jusqu'au premier ancêtre dont le fond n'est pas transparent. */
async function fondEffectif(page: Page, cible: Locator): Promise<string> {
  return cible.evaluate((element) => {
    let noeud: Element | null = element;
    while (noeud) {
      const fond = getComputedStyle(noeud).backgroundColor;
      if (fond && !/rgba?\([^)]*,\s*0\)$/.test(fond) && fond !== "transparent") return fond;
      noeud = noeud.parentElement;
    }
    return "rgb(255, 255, 255)";
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto(BASE, { waitUntil: "networkidle" });
});

test("deux éléments de texte adjacents ne se touchent jamais", async ({ page }) => {
  /*
    L'invariant qui manquait. « Tous les domaines 193E-commerce 65 » : le
    compteur collé au libellé suivant, parce qu'une classe d'espacement ne
    produisait aucun style. Ici on mesure l'écart réel entre les rectangles.
  */
  const onglets = page.locator("nav a, nav button").filter({ hasText: /\S/ });
  const total = await onglets.count();
  expect(total).toBeGreaterThan(1);

  const collisions: string[] = [];
  for (let i = 0; i < total - 1; i++) {
    const gauche = await boite(onglets.nth(i));
    const droite = await boite(onglets.nth(i + 1));
    // Uniquement les voisins sur la même ligne : un retour à la ligne n'est
    // pas une collision.
    if (Math.abs(gauche.y - droite.y) > 4) continue;
    const ecart = droite.x - (gauche.x + gauche.width);
    if (ecart < 8) {
      collisions.push(
        `« ${(await onglets.nth(i).innerText()).slice(0, 24)} » → ${ecart.toFixed(1)} px`,
      );
    }
  }
  expect(collisions).toEqual([]);
});

test("les tailles rendues appartiennent à l'échelle typographique", async ({ page }) => {
  /*
    Une classe d'échelle ignorée retombe sur la taille héritée, qui est
    plausible — donc invisible à la lecture du code. On compare ici la taille
    CALCULÉE aux valeurs des jetons.
  */
  const echelle = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return [
      "--display-1-size", "--display-2-size", "--heading-1-size", "--heading-2-size",
      "--heading-3-size", "--heading-4-size", "--body-lg-size", "--body-size",
      "--body-sm-size", "--caption-size", "--label-size", "--data-lg-size",
      "--data-size", "--data-sm-size",
    ].map((jeton) => parseFloat(style.getPropertyValue(jeton)));
  });
  expect(echelle.every((v) => v > 0)).toBe(true);

  const horsEchelle = await page.evaluate((tailles: number[]) => {
    const fautifs: string[] = [];
    for (const element of document.querySelectorAll("h1, h2, h3, .chiffre, [class*='t-']")) {
      const rendue = parseFloat(getComputedStyle(element).fontSize);
      if (!tailles.some((t) => Math.abs(t - rendue) < 0.5)) {
        fautifs.push(`${element.tagName.toLowerCase()} → ${rendue}px`);
      }
    }
    return [...new Set(fautifs)];
  }, echelle);

  expect(horsEchelle).toEqual([]);
});

test("le texte secondaire respecte le contraste AA sur sa surface", async ({ page }) => {
  /*
    Le document impose AA : 4,5:1 en dessous de 18 px. `text-tertiary` sur
    `surface-raised` n'est jamais employé pour une information nécessaire à la
    décision — ce test vérifie que ce qui est affiché reste lisible.
  */
  const cibles = page.locator("main p, main span, main dd").filter({ hasText: /\S/ });
  const total = Math.min(await cibles.count(), 40);
  const insuffisants: string[] = [];

  for (let i = 0; i < total; i++) {
    const cible = cibles.nth(i);
    if (!(await cible.isVisible())) continue;
    const { couleur, taille } = await cible.evaluate((e) => ({
      couleur: getComputedStyle(e).color,
      taille: parseFloat(getComputedStyle(e).fontSize),
    }));
    const fond = await fondEffectif(page, cible);
    const ratio = contraste(couleur, fond);
    const requis = taille >= 18 ? 3 : 4.5;
    if (ratio < requis) {
      insuffisants.push(
        `« ${(await cible.innerText()).slice(0, 28)} » ${ratio.toFixed(2)}:1 < ${requis}:1`,
      );
    }
  }
  expect(insuffisants).toEqual([]);
});

test("les trois KPIs du hero ne se touchent pas", async ({ page }) => {
  // Même défaut que les onglets, même mesure : l'écart réel entre rectangles.
  // Le document impose space-12 entre les blocs ; on vérifie qu'il existe.
  const blocs = page.locator("header dl > div");
  const total = await blocs.count();
  expect(total).toBe(3);

  const collisions: string[] = [];
  for (let i = 0; i < total - 1; i++) {
    const gauche = await boite(blocs.nth(i));
    const droite = await boite(blocs.nth(i + 1));
    if (Math.abs(gauche.y - droite.y) > 4) continue;
    const ecart = droite.x - (gauche.x + gauche.width);
    if (ecart < 24) collisions.push(`bloc ${i} → ${ecart.toFixed(1)} px`);
  }
  expect(collisions).toEqual([]);
});

test("la liste de suggestions ne déborde pas et suit la sélection", async ({ page }) => {
  /*
    Deux défauts que seul le rendu révèle : une liste qui sort de la fenêtre
    devient inatteignable, et une sélection clavier qui sort de la zone visible
    fait piloter une liste qu'on ne voit plus.
  */
  const champ = page.getByRole("combobox");
  await champ.fill("mar");
  const liste = page.getByRole("listbox");
  await expect(liste).toBeVisible();

  const fenetre = page.viewportSize()!;
  const boiteListe = await boite(liste);
  expect(boiteListe.x).toBeGreaterThanOrEqual(0);
  expect(boiteListe.x + boiteListe.width).toBeLessThanOrEqual(fenetre.width + 1);
  // La liste tient entièrement dans la zone visible, quel que soit le
  // défilement : c'est la position du champ dans un hero haut qui la faisait
  // déborder, pas son nombre d'entrées.
  const defilement = await page.evaluate(() => window.scrollY);
  expect(boiteListe.y - defilement).toBeGreaterThanOrEqual(0);
  expect(boiteListe.y - defilement + boiteListe.height).toBeLessThanOrEqual(fenetre.height + 1);

  // Descendre jusqu'au dernier élément : il doit rester dans la zone visible
  // de la liste, pas seulement exister dans le document.
  const options = page.getByRole("option");
  const total = await options.count();
  for (let i = 1; i < total; i++) await champ.press("ArrowDown");

  const actif = options.nth(total - 1);
  const boiteActif = await boite(actif);
  const visible =
    boiteActif.y >= boiteListe.y - 1 &&
    boiteActif.y + boiteActif.height <= boiteListe.y + boiteListe.height + 1;
  expect(visible).toBe(true);
});
