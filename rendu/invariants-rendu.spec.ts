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

test("le pied du panneau reste visible et ne recouvre aucun contenu", async ({ page }) => {
  /*
    Trois défauts que seul le rendu révèle : un pied poussé hors du panneau par
    un corps trop haut, un pied qui recouvre la dernière section, et un corps
    qui entraîne l'en-tête ou le pied en défilant.
  */
  for (const rang of [0, 1]) {
    await page.getByRole("listitem").nth(rang).getByRole("link").first().click();
    const panneau = page.getByRole("dialog");
    await expect(panneau).toBeVisible();

    const bPanneau = await boite(panneau);
    const bPied = await boite(panneau.locator("footer"));
    const corps = panneau.locator("div.overflow-y-auto");
    const bCorps = await boite(corps);

    // Le pied tient dans le panneau, sans défilement.
    expect(bPied.y + bPied.height).toBeLessThanOrEqual(bPanneau.y + bPanneau.height + 1);
    // Il ne recouvre pas le corps : leurs rectangles ne se chevauchent pas.
    expect(bCorps.y + bCorps.height).toBeLessThanOrEqual(bPied.y + 1);

    // Le corps défile seul : le pied ne bouge pas d'un pixel.
    await corps.evaluate((e) => e.scrollTo(0, e.scrollHeight));
    const bPiedApres = await boite(panneau.locator("footer"));
    expect(Math.abs(bPiedApres.y - bPied.y)).toBeLessThanOrEqual(1);

    await page.keyboard.press("Escape");
  }
});

const LARGEURS = [320, 360, 375, 390, 430, 768, 1024];

test("aucun défilement horizontal, à toutes les largeurs", async ({ page }) => {
  /*
    Le critère est mesurable et sans appel : la largeur défilable du document
    doit égaler celle de la fenêtre. Un débordement de quelques pixels ne se
    voit pas sur une capture, mais il fait glisser la page entière sous le
    doigt.
  */
  const debordements: string[] = [];
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.waitForTimeout(120);
    const { defilable, fenetre } = await page.evaluate(() => ({
      defilable: document.documentElement.scrollWidth,
      fenetre: window.innerWidth,
    }));
    if (defilable > fenetre) debordements.push(`${largeur}px → ${defilable} > ${fenetre}`);
  }
  expect(debordements).toEqual([]);
});

test("le titre tient sur exactement deux lignes jusqu'à 1023 px", async ({ page }) => {
  // Mesuré par la hauteur rendue rapportée à l'interligne : compter les lignes
  // depuis le texte serait faux, c'est la mise en page qui décide où ça casse.
  const fautifs: string[] = [];
  for (const largeur of LARGEURS.filter((l) => l < 1024)) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.waitForTimeout(120);
    const titre = page.locator("h1").first();
    const lignes = await titre.evaluate((e) => {
      const style = getComputedStyle(e);
      return Math.round(e.getBoundingClientRect().height / parseFloat(style.lineHeight));
    });
    if (lignes !== 2) fautifs.push(`${largeur}px → ${lignes} ligne(s)`);
  }
  expect(fautifs).toEqual([]);
});

test("les deux champs de recherche partagent une valeur, sans perdre de frappe", async ({ page }) => {
  /*
    Chaque champ gardait un état local resynchronisé par un minuteur : celui qui
    n'était pas actif écrasait la frappe de l'autre au premier battement.
    Caractères perdus, curseur qui saute. Ce test saisit réellement et vérifie
    les deux symptômes — la valeur complète, et le curseur resté en fin.
  */
  const champs = page.getByRole("combobox");
  await expect(champs).toHaveCount(2);

  const hero = champs.first();
  await hero.click();
  await hero.pressSequentially("shopi", { delay: 60 });

  await expect(hero).toHaveValue("shopi");
  await expect(champs.nth(1)).toHaveValue("shopi");

  // Le curseur reste à la fin : un remontage le renverrait à zéro.
  const position = await hero.evaluate((e: HTMLInputElement) => e.selectionStart);
  expect(position).toBe(5);
});
