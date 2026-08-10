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

const BASE = process.env["URL_TEST"] ?? "http://localhost:4317";

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
    produisait aucun style.

    ON MESURE ENTRE LES BOÎTES D'ENCRE, pas entre les rectangles. Les entrées
    d'en-tête sont des pastilles à retrait interne : 4 px séparent leurs
    rectangles, ~28 px séparent leurs lettres. Comparer les rectangles les
    signalait toutes les quatre, alors que rien ne se touche à l'écran — et un
    invariant qui signale du bruit finit par ne plus être lu, ce qui le rend
    pire qu'absent.

    Ce qui compte pour un lecteur, c'est l'espace entre les GLYPHES. Le retrait
    intérieur en fait partie : le soustraire mesure ce que l'œil voit.
  */
  const onglets = page.locator("nav a, nav button").filter({ hasText: /\S/ });
  const total = await onglets.count();
  expect(total).toBeGreaterThan(1);

  /** Rectangle réduit à sa zone de texte : retraits et filets ôtés. */
  const encre = (cible: Locator) =>
    cible.evaluate((e) => {
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      const g = parseFloat(s.paddingLeft) + parseFloat(s.borderLeftWidth);
      const d = parseFloat(s.paddingRight) + parseFloat(s.borderRightWidth);
      return { x: r.x + g, droite: r.right - d, y: r.y };
    });

  const collisions: string[] = [];
  for (let i = 0; i < total - 1; i++) {
    const gauche = await encre(onglets.nth(i));
    const droite = await encre(onglets.nth(i + 1));
    // Uniquement les voisins sur la même ligne : un retour à la ligne n'est
    // pas une collision.
    if (Math.abs(gauche.y - droite.y) > 4) continue;
    const ecart = droite.x - gauche.droite;
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
      "--display-0-size", "--display-1-size", "--display-2-size", "--heading-1-size", "--heading-2-size",
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

test("le bloc de chiffres s'aligne sur la ligne de base, et s'empile sous 640 px", async ({
  page,
}) => {
  /*
    Les trois chiffres flottaient : alignés sur leur BOÎTE, trois valeurs de
    hauteurs différentes paraissent dériver les unes par rapport aux autres.
    C'est la ligne de base qui les tient, et elle ne se voit qu'en mesurant —
    à l'œil, l'écart passe pour une intention.

    Sous 640 px, trois chiffres côte à côte à 375 px sont illisibles : le bloc
    s'empile. C'est ce qui produisait le chiffre orphelin sur une seconde ligne.
  */
  for (const largeur of [1280, 768]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto(BASE, { waitUntil: "networkidle" });

    const valeurs = page.locator("header dl dd");
    await expect(valeurs).toHaveCount(3);

    // Même ligne de base : on compare le BAS du texte, pas le haut de la boîte.
    const bases = await valeurs.evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        const s = getComputedStyle(e);
        // Approximation stable de la ligne de base : bas de la boîte moins la
        // demi-différence entre interligne et taille de police.
        return r.bottom - (parseFloat(s.lineHeight) - parseFloat(s.fontSize)) / 2;
      }),
    );
    expect(Math.max(...bases) - Math.min(...bases)).toBeLessThanOrEqual(1);

    const { defilable } = await page.evaluate(() => ({
      defilable: document.documentElement.scrollWidth,
    }));
    expect(defilable).toBeLessThanOrEqual(largeur + 1);
  }

  // Sous 640 px : empilé, donc trois ordonnées distinctes.
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  const cellules = page.locator("header dl > div");
  const y: number[] = [];
  for (let i = 0; i < 3; i++) y.push((await boite(cellules.nth(i))).y);
  expect(y[1]!).toBeGreaterThan(y[0]!);
  expect(y[2]!).toBeGreaterThan(y[1]!);

  const { defilable } = await page.evaluate(() => ({
    defilable: document.documentElement.scrollWidth,
  }));
  expect(defilable).toBeLessThanOrEqual(376);
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
  /*
    `getByRole("listitem")` visait n'importe quel `<li>` de la page — donc les
    cartes de la bande d'organismes, qui n'ouvrent aucun panneau. Le test
    échouait sur « dialog introuvable » en accusant le panneau, alors qu'il
    n'avait jamais cliqué au bon endroit. Le sélecteur descend maintenant dans
    la liste de résultats, la seule qui ouvre une fiche.
  */
  for (const rang of [0, 1]) {
    await page.locator("main ul > li h3 a").nth(rang).click();
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

test("la barre d'actions du panneau tient en une ligne de boutons", async ({ page }) => {
  /*
    Elle faisait 137 px : trois actions alignées, donc trois lignes une fois la
    place manquante, plus la mention. Le pied mangeait le corps de la fiche.

    Le plafond porte sur la HAUTEUR RENDUE, boutons et mention compris — pas sur
    le nombre d'actions. Un futur bouton qui repasserait la barre à trois lignes
    doit faire rougir ce test, quelle que soit la raison qui l'a fait ajouter.
  */
  const fautifs: string[] = [];

  for (const largeur of [1440, 1024, 768, 430, 390, 320]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.locator("main ul > li h3 a").first().click();
    const panneau = page.getByRole("dialog");
    await expect(panneau).toBeVisible();

    const pied = panneau.locator("footer");
    const hauteur = (await boite(pied)).height;
    if (hauteur > 96) fautifs.push(`${largeur}px → pied de ${hauteur.toFixed(0)} px`);

    // Les deux boutons partagent une ligne : même ordonnée, à un pixel près.
    /*
      Trois commandes depuis que le signet est posé : le lien sortant, le
      signet, la comparaison. Le signet est une cible carrée qui ne participe
      pas au partage de largeur — on ne mesure donc l'égalité qu'entre les deux
      actions à libellé, qui sont celles qui se disputent la ligne.
    */
    const actions = pied.locator("a, button");
    await expect(actions).toHaveCount(3);
    const aLibelle = pied.locator("a, button").filter({ hasText: /\S/ });
    await expect(aLibelle).toHaveCount(2);
    const a = await boite(aLibelle.nth(0));
    const b = await boite(aLibelle.nth(1));
    if (Math.abs(a.y - b.y) > 1) fautifs.push(`${largeur}px → boutons sur deux lignes`);

    // Sous 640 px, la cible tactile passe à 44 px et les deux boutons sont à
    // parts égales : c'est le seul cas où l'égalité de largeur l'emporte.
    if (largeur < 640) {
      /*
        Trois pixels de tolérance. La moitié de ligne tombe sur une fraction —
        390 px d'espace utile donnent 195 px chacun, que le moteur répartit en
        194,x et 196,x. C'est un arrondi de rendu, pas un déséquilibre : le
        seuil doit laisser passer le bruit du partage sans laisser passer un
        bouton dimensionné par son contenu, qui s'écarterait de dizaines de
        pixels.
      */
      if (Math.abs(a.width - b.width) > 3) {
        fautifs.push(`${largeur}px → ${a.width.toFixed(0)} contre ${b.width.toFixed(0)} px`);
      }
      if (a.height < 44) fautifs.push(`${largeur}px → cible de ${a.height.toFixed(0)} px`);
    }

    // Aucun libellé tronqué : le raccourcissement est une décision, pas un
    // débordement qu'on laisse couper.
    for (const rang of [0, 1]) {
      const coupe = await actions.nth(rang).evaluate((e) => e.scrollWidth > Math.ceil(e.getBoundingClientRect().width));
      if (coupe) fautifs.push(`${largeur}px → libellé tronqué`);
    }

    await page.keyboard.press("Escape");
  }

  expect(fautifs).toEqual([]);
});

test("la requête de conteneur du pied décrit bien le panneau, pas la fenêtre", async ({ page }) => {
  /*
    Une requête de conteneur qui ne s'applique pas ne produit AUCUN message :
    la classe est simplement ignorée, et la mise en page retombe sur un état
    plausible. C'est le même mode de défaillance que `mr-[--space-6]`, et il ne
    se voit qu'en mesurant.

    Le critère est observable sans rien savoir de la mécanique : le panneau est
    plafonné à 560 px, donc la mention passe SOUS les boutons — même dans une
    fenêtre de 1440 px, où une règle exprimée en unités de fenêtre l'aurait
    remontée sur la même ligne.
  */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("main ul > li h3 a").first().click();
  const panneau = page.getByRole("dialog");
  await expect(panneau).toBeVisible();

  const pied = panneau.locator("footer");
  expect((await boite(pied)).width).toBeLessThan(900);

  const bouton = await boite(pied.locator("a, button").first());
  const mention = await boite(pied.getByText("Lien non affilié"));
  expect(mention.y).toBeGreaterThan(bouton.y + bouton.height - 1);
});

test("depuis l'aide au choix, fermer une fiche rend le parcours intact", async ({ page }) => {
  /*
    LE DÉFAUT VISÉ, dans ses termes exacts : le panneau n'existait que dans
    l'explorateur. Depuis l'aide au choix, un clic sur une correspondance
    ouvrait la page dédiée, et le retour renvoyait à l'accueil — réponses au
    questionnaire et correspondances perdues. La personne avait répondu à
    quatre questions pour rien.

    Ce test ne vérifie pas qu'un panneau s'ouvre : il vérifie que la VUE DERRIÈRE
    est toujours là après fermeture. C'est la seule formulation qui tienne, parce
    qu'une implémentation par navigation peut très bien ouvrir un panneau et
    perdre l'état quand même.
  */
  await page.goto(`${BASE}/aide-au-choix`, { waitUntil: "networkidle" });

  // Répondre jusqu'au bout, puis demander les correspondances.
  for (const reponse of ["Lancer ma boutique", "Moins de 500 €", "3 à 10 h", "Ma propre boutique"]) {
    await page.getByRole("button", { name: reponse, exact: true }).click();
  }
  await page.getByRole("button", { name: /Voir les correspondances/ }).click();

  const correspondances = page.locator("main section ul > li");
  await expect(correspondances.first()).toBeVisible({ timeout: 20_000 });
  const combien = await correspondances.count();
  const premier = await correspondances.first().locator("a").first().innerText();

  // L'entrée est un VRAI lien : sans href, un robot et une ouverture dans un
  // nouvel onglet perdent la fiche.
  const lien = correspondances.first().locator('a[href^="/parcours/"]').first();
  await expect(lien).toHaveCount(1);

  await lien.click();
  const panneau = page.getByRole("dialog");
  await expect(panneau).toBeVisible();
  // On est resté sur l'aide au choix : le panneau se superpose, il ne remplace
  // pas.
  expect(new URL(page.url()).pathname).toBe("/aide-au-choix");

  await page.keyboard.press("Escape");
  await expect(panneau).toBeHidden();

  // Les réponses et les correspondances sont toujours à l'écran, à l'identique.
  await expect(page.getByRole("button", { name: "Ma propre boutique", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(correspondances).toHaveCount(combien);
  expect(await correspondances.first().locator("a").first().innerText()).toBe(premier);
});

test("un organisme a sa page, et le panneau s'y ouvre sans la quitter", async ({ page }) => {
  /*
    Cliquer sur un organisme renvoyait vers l'explorateur avec `?organisme=` :
    la personne quittait la vue Organismes, perdait sa position, et atterrissait
    dans une liste qui ne disait rien de l'organisme lui-même.

    Le test suit le parcours entier — vue, page, panneau, retour — parce que
    c'est la CHAÎNE qui était rompue, pas un maillon. Vérifier séparément que la
    page existe et que le panneau s'ouvre laisserait passer exactement le défaut
    d'origine : chaque étape correcte, l'enchaînement perdu.
  */
  await page.goto(`${BASE}/organismes`, { waitUntil: "networkidle" });

  // La carte est un vrai lien vers la page dédiée, pas un filtre sur l'accueil.
  const carte = page.locator('main ul li a[href^="/organismes/"]').first();
  await expect(carte).toBeVisible();
  const nomAttendu = await carte.locator("h2").innerText();

  await carte.click();
  /*
    La carte est un vrai lien : le clic déclenche un chargement de page complet.
    Il faut attendre l'HYDRATATION avant de cliquer un parcours — sans elle, le
    gestionnaire n'est pas encore posé et le lien navigue au lieu d'ouvrir le
    panneau. C'est le comportement voulu sans JavaScript, ce n'est pas ce que ce
    test mesure.
  */
  await page.waitForLoadState("networkidle");
  await expect(page.locator("h1")).toHaveText(nomAttendu);
  const adresseOrganisme = new URL(page.url()).pathname;
  expect(adresseOrganisme).toMatch(/^\/organismes\/.+/);

  // La mention obligatoire : sans elle, le compteur se lit comme une mesure de
  // taille, donc comme un jugement.
  await expect(
    page.getByText(/décrit l'étendue de notre collecte, pas celle du catalogue/),
  ).toBeVisible();

  const parcours = page.locator("main section ul > li");
  const combien = await parcours.count();
  expect(combien).toBeGreaterThan(0);

  await parcours.first().locator('a[href^="/parcours/"]').first().click();
  const panneau = page.getByRole("dialog");
  await expect(panneau).toBeVisible();
  // On ne quitte pas la page organisme : le panneau se superpose.
  expect(new URL(page.url()).pathname).toBe(adresseOrganisme);

  await page.keyboard.press("Escape");
  await expect(panneau).toBeHidden();

  // La page et sa liste sont intactes.
  await expect(page.locator("h1")).toHaveText(nomAttendu);
  await expect(parcours).toHaveCount(combien);
});

test("la synthèse de comparaison énonce des écarts, jamais des noms", async ({ page }) => {
  /*
    LA CONTRAINTE DE FOND, vérifiée sur le rendu. Un bloc de synthèse est
    l'endroit exact où un comparateur se met à recommander sans le décider :
    il suffit d'écrire « LiveMentor est le moins cher » au lieu de « de 0 € à
    1 980 € ». Les deux disent la même chose ; l'un tranche.

    Le test lit donc les énoncés et vérifie qu'AUCUN nom de parcours n'y figure,
    et qu'aucun superlatif n'apparaît. C'est mécanique, et c'est le genre de
    dérive qu'une relecture humaine laisse passer parce qu'elle sonne juste.
  */
  const noms: string[] = [];
  for (const rang of [0, 1]) {
    const carte = page.locator("main ul > li").nth(rang);
    noms.push(await carte.locator("h3 a").first().innerText());
    await carte.getByRole("button", { name: /Comparer|Ajouter/ }).first().click();
  }

  await page.goto(`${BASE}/comparer`, { waitUntil: "networkidle" });
  const synthese = page.locator("main section").first();
  await expect(synthese).toBeVisible();

  const texte = await synthese.innerText();
  // Des écarts chiffrés, pas un classement.
  expect(texte).toMatch(/diffèrent?\s+sur/);
  for (const interdit of ["le moins cher", "le plus complet", "meilleur", "recommand"]) {
    expect(texte.toLowerCase()).not.toContain(interdit);
  }
  // Les énoncés d'écart ne nomment aucun parcours.
  const enonces = await synthese.locator("dd").allInnerTexts();
  for (const e of enonces) {
    for (const nom of noms) expect(e).not.toContain(nom);
  }
});

test("l'en-tête mobile centre son logo et rend le focus au burger", async ({ page }) => {
  /*
    Les cinq entrées s'affichaient à toutes les largeurs et se coupaient sous
    900 px. Le menu ne masque rien — il expose les cinq d'un coup, Méthode
    comprise — mais il introduit un dialogue modal, donc trois façons de piéger
    la navigation au clavier : focus qui part derrière le voile, Échap inerte,
    focus perdu à la fermeture.

    Le centrage du logo se MESURE. Il ne tient que si les deux zones latérales
    font la même largeur, et l'emplacement d'action de droite est vide : rien
    à l'écran ne signale qu'il a disparu, seul l'écart au centre le dirait.
  */
  for (const largeur of [375, 768]) {
    await page.setViewportSize({ width: largeur, height: 800 });
    await page.goto(BASE, { waitUntil: "networkidle" });

    const burger = page.getByRole("button", { name: "Ouvrir le menu" });
    await expect(burger).toBeVisible();

    // Logo centré : son milieu tombe sur le milieu de la fenêtre.
    const logo = await boite(page.getByRole("link", { name: "Formlist — accueil" }));
    const milieu = logo.x + logo.width / 2;
    expect(Math.abs(milieu - largeur / 2)).toBeLessThanOrEqual(2);

    await burger.click();
    const menu = page.getByRole("dialog", { name: "Navigation principale" });
    await expect(menu).toBeVisible();

    /*
      Attendre la FIN du glissement, pas un délai. Le panneau entre depuis la
      gauche : mesuré à mi-course il est à −304 px, ce qui ressemble à un
      débordement alors que c'est une image d'animation. Un `waitForTimeout`
      aurait marché aujourd'hui et menti le jour où la durée change.
    */
    await menu.evaluate((e) => Promise.all(e.getAnimations().map((a) => a.finished)));

    // Le panneau ne dépasse pas la fenêtre.
    const b = await boite(menu);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(largeur + 1);

    // Les cinq entrées sont là : le menu n'en masque aucune.
    await expect(menu.getByRole("link")).toHaveCount(5);

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    // Le focus revient au burger : sans ça, la tabulation repart du document.
    await expect(burger).toBeFocused();

    // Aucun débordement horizontal, menu ouvert ou fermé.
    const { defilable } = await page.evaluate(() => ({
      defilable: document.documentElement.scrollWidth,
    }));
    expect(defilable).toBeLessThanOrEqual(largeur + 1);
  }

  // Au-dessus de 1 024 px, rien ne change.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toBeHidden();
  await expect(page.locator("header nav a")).toHaveCount(5);
});

test("chaque type de page porte ses balises au PREMIER OCTET", async ({ request }) => {
  /*
    Mesuré sur la réponse HTTP BRUTE, sans navigateur. C'est la seule chose que
    voit un robot au premier passage : ce qu'un moteur de rendu ajoute après
    hydratation arrive trop tard pour l'indexation d'une page de traîne longue.

    Cet invariant existe aussi parce que je me suis trompé de diagnostic sur ce
    point exact, en lisant une sortie vide de `grep` comme un zéro. Une mesure
    faite à la main se relit mal ; une mesure qui échoue en rouge, non.
  */
  const pages = [
    { url: "/", title: /Formlist/, donnees: false },
    {
      url: "/parcours/livementor-formation-e-commerce-88",
      title: /LiveMentor/,
      donnees: "Course",
    },
    { url: "/organismes/livementor", title: /LiveMentor/, donnees: "Organization" },
  ];

  const manques: string[] = [];
  for (const page of pages) {
    const html = await (await request.get(`${BASE}${page.url}`)).text();

    const titre = /<title[^>]*>([^<]*)</.exec(html);
    if (titre === null || !page.title.test(titre[1]!)) {
      manques.push(`${page.url} → titre « ${titre?.[1] ?? "absent"} »`);
    }
    /*
      Le canonique doit désigner LA PAGE, pas le site. Posé dans la racine, il
      s'appliquait à toutes les routes : les fiches déclaraient l'accueil comme
      canonique, ce qui les aurait sorties de l'index — l'inverse exact du but.
      Vérifier sa seule présence ne l'aurait pas vu.
    */
    const can = /<link[^>]+rel="canonical"[^>]+href="([^"]*)/.exec(html);
    if (can === null) {
      manques.push(`${page.url} → canonique absent`);
    } else {
      /*
        Le canonique désigne toujours le DOMAINE DE PRODUCTION, jamais celui du
        serveur de test : on compare donc le chemin, et on vérifie séparément
        que l'origine est bien la nôtre. Comparer l'URL entière ferait rougir
        ce test en local pour une raison qui n'a rien à voir avec le défaut.
      */
      const url = new URL(can[1]!);
      if (url.origin !== "https://formlist.fr") {
        manques.push(`${page.url} → canonique hors domaine : ${url.origin}`);
      }
      if (url.pathname !== page.url) {
        manques.push(`${page.url} → canonique vers ${url.pathname}`);
      }
    }
    if (!/<meta[^>]+name="description"/.test(html)) manques.push(`${page.url} → description absente`);

    if (page.donnees !== false) {
      const ld = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/.exec(html);
      if (ld === null) {
        manques.push(`${page.url} → aucune donnée structurée`);
      } else {
        const objet = JSON.parse(ld[1]!) as Record<string, unknown>;
        if (objet["@type"] !== page.donnees) {
          manques.push(`${page.url} → type ${String(objet["@type"])} au lieu de ${page.donnees}`);
        }
        /*
          Ni note ni avis dans le balisage. Ce sont les propriétés que Google
          met en avant, et les publier supposerait des notes que le produit
          refuse de produire — un balisage qui promet une étoile qu'on
          n'affiche pas est un mensonge structuré.
        */
        // `sameAs` n'accepte que des URL : la colonne `site` porte parfois du
        // texte libre, et `https://Site officiel + fiche…` est une adresse
        // inventée publiée comme un fait.
        for (const lien of (objet["sameAs"] as string[] | undefined) ?? []) {
          if (!/^https?:\/\/[^\s]+$/.test(lien)) manques.push(`${page.url} → sameAs « ${lien} »`);
        }
        for (const interdit of ["aggregateRating", "review", "ratingValue"]) {
          if (JSON.stringify(objet).includes(interdit)) {
            manques.push(`${page.url} → ${interdit} dans le ld+json`);
          }
        }
      }
    }
  }

  expect(manques).toEqual([]);
});

test("deux fiches au libellé identique ne partagent ni titre ni description", async ({
  request,
}) => {
  /*
    24 licences professionnelles portent le même intitulé à l'université près,
    et 51 fiches le même sujet principal. Une description bâtie sur le nom et le
    sujet les rend indiscernables : Google les traite alors comme des doublons,
    et c'est le motif « page en double, Google n'a pas sélectionné la même page
    canonique ».

    Le canonique auto-référent ne suffit pas à lui seul — il désigne la page,
    il ne la distingue pas. C'est le CONTENU des balises qui doit varier, et
    seule une comparaison entre deux pages le vérifie.
  */
  const slugs = [
    "universite-de-picardie-jules-verne-licence-pro-e-commerce-et-marketing-numerique-3",
    "universite-bordeaux-montaigne-licence-pro-e-commerce-et-marketing-numerique-4",
  ];

  const lus = await Promise.all(
    slugs.map(async (slug) => {
      const html = await (await request.get(`${BASE}/parcours/${slug}`)).text();
      return {
        titre: /<title[^>]*>([^<]*)/.exec(html)?.[1] ?? "",
        description: /<meta[^>]+name="description"[^>]+content="([^"]*)/.exec(html)?.[1] ?? "",
      };
    }),
  );

  for (const lu of lus) {
    expect(lu.titre).not.toBe("");
    expect(lu.description).not.toBe("");
  }
  expect(lus[0]!.titre).not.toBe(lus[1]!.titre);
  expect(lus[0]!.description).not.toBe(lus[1]!.description);
});

test("une fiche portant un champ non collecté n'affiche jamais un compteur plein", async ({
  page,
}) => {
  /*
    ÉCRIT SUR CE QUE L'INTERFACE REND, pas sur ce que le modèle calcule — c'est
    le patron du 4 bis. Un invariant qui interroge `compterInformations`
    vérifie sa cohérence interne ; il ne voit pas que la valeur AFFICHÉE vient
    d'ailleurs.

    Et elle venait bien d'ailleurs : `infos_renseignees` et `infos_applicables`
    sont des colonnes dérivées, écrites à l'ingestion. La règle du dénominateur
    a été corrigée dans le modèle le 4 août, le catalogue n'a jamais été
    réingéré, et 224 fiches sur 233 ont continué d'afficher l'ancien calcul.
    Le code était juste, les tests verts, et « 11 sur 11 » s'affichait au-dessus
    de sept champs marqués « pas encore collecté ».

    Le seul contrôle qui l'attrape est celui-ci : lire les deux à l'écran, et
    refuser qu'ils se contredisent.
  */
  await page.locator("main ul > li h3 a").first().click();
  const panneau = page.getByRole("dialog");
  await expect(panneau).toBeVisible();
  // La fiche se charge après l'ouverture : lire trop tôt ne rend que le
  // message d'attente, et le test conclurait à l'absence de compteur.
  await expect(panneau.getByText(/Chargement de la fiche/)).toBeHidden();
  await expect(panneau.getByText(/\d+\s+sur\s+\d+/).first()).toBeVisible();

  const texte = await panneau.innerText();
  const compteur = /(\d+)\s+sur\s+(\d+)/.exec(texte);
  expect(compteur, "aucun compteur lisible dans le panneau").not.toBeNull();

  const [renseignees, applicables] = [Number(compteur![1]), Number(compteur![2])];
  const nonCollectes = (texte.match(/[Pp]as encore collecté/g) ?? []).length;

  if (nonCollectes > 0) {
    expect(
      renseignees,
      `${nonCollectes} champ(s) non collecté(s) affichés, et pourtant ${renseignees} sur ${applicables}`,
    ).toBeLessThan(applicables);
  }
});

test("les cartes de la bande sont de vrais liens vers la page organisme", async ({ page }) => {
  /*
    Elles filtraient l'explorateur : la personne quittait la bande, perdait sa
    position, et atterrissait dans une liste qui ne disait rien de l'organisme.
    La vue Organismes avait été corrigée au chantier de la page dédiée, la bande
    n'avait pas suivi — un seul comportement doit valoir partout.

    Le test porte sur le `href`, pas sur le clic, parce que c'est le href qui
    décide de l'indexation. Un `<button>` déclencherait la même navigation pour
    un humain et rendrait ces 163 pages invisibles depuis l'accueil : le défaut
    ne se verrait qu'en Search Console, des semaines plus tard.
  */
  const bande = page.getByRole("list", { name: "Organismes référencés" });
  await expect(bande).toBeVisible();

  const entrees = bande.locator("li > *");
  const total = Math.min(await entrees.count(), 12);
  expect(total).toBeGreaterThan(0);

  const fautifs: string[] = [];
  for (let i = 0; i < total; i++) {
    const entree = entrees.nth(i);
    const balise = await entree.evaluate((e) => e.tagName.toLowerCase());
    const href = await entree.getAttribute("href");
    if (balise !== "a") fautifs.push(`entrée ${i} → <${balise}> au lieu de <a>`);
    else if (href === null || !href.startsWith("/organismes/")) {
      fautifs.push(`entrée ${i} → href « ${href ?? "absent"} »`);
    }
  }
  expect(fautifs).toEqual([]);

  // Et le lien mène bien à une page qui existe.
  const premier = await entrees.first().getAttribute("href");
  const reponse = await page.request.get(`${BASE}${premier!}`);
  expect(reponse.status()).toBe(200);
});

test("aucun lien du pied de page ne pointe vers une route inexistante", async ({ page }) => {
  /*
    Un lien mort en pied abîme la crédibilité plus qu'une colonne courte — sur
    un produit dont toute la proposition est la vérifiabilité, c'est la première
    promesse qu'on casse. Et c'est le genre de défaut qu'on n'attrape jamais à
    l'œil : personne ne clique son propre pied de page.

    Les `mailto:` sont écartés — ils ne se testent pas par une requête.
  */
  const liens = page.locator("footer a[href^='/']");
  const total = await liens.count();
  expect(total).toBeGreaterThan(0);

  const morts: string[] = [];
  for (let i = 0; i < total; i++) {
    const href = await liens.nth(i).getAttribute("href");
    if (href === null) continue;
    const reponse = await page.request.get(`${BASE}${href}`);
    if (reponse.status() !== 200) morts.push(`${href} → ${reponse.status()}`);
  }
  expect(morts).toEqual([]);
});

test("le bouton de connexion a la bonne cible aux deux largeurs", async ({ page }) => {
  /*
    36 px en version bureau, 44 px sur mobile — le minimum sous lequel un pouce
    rate. Deux hauteurs, deux raisons : l'une est une proportion de barre,
    l'autre une contrainte d'ergonomie tactile, et confondre les deux donnerait
    un bouton trop petit au doigt ou trop lourd à l'écran large.
  */
  for (const [largeur, attendu] of [[1280, 36], [375, 44]] as const) {
    await page.setViewportSize({ width: largeur, height: 800 });
    await page.goto(BASE, { waitUntil: "networkidle" });

    const bouton = page.getByRole("link", { name: "Se connecter" });
    await expect(bouton).toBeVisible();
    const b = await boite(bouton);
    expect(Math.round(b.height), `${largeur}px`).toBe(attendu);

    // Le libellé reste lisible sur son fond.
    const { couleur, taille } = await bouton.evaluate((e) => ({
      couleur: getComputedStyle(e).color,
      taille: parseFloat(getComputedStyle(e).fontSize),
    }));
    const fond = await fondEffectif(page, bouton);
    const requis = taille >= 18 ? 3 : 4.5;
    expect(contraste(couleur, fond)).toBeGreaterThanOrEqual(requis);
  }
});

test("aucun point d'entrée vers un organisme ne pose un filtre", async ({ page }) => {
  /*
    TROIS FOIS LE MÊME DÉFAUT EN UN JOUR : la vue Organismes, la bande
    défilante, puis l'autocomplétion. Chaque fois la même cause — la consigne
    d'origine « organisme pose un filtre » datait d'avant la page dédiée, et
    chaque vue l'appliquait pour son compte.

    Cet invariant existe pour qu'il n'y ait pas de quatrième. Il ne connaît
    aucune vue : il balaie la page, prend tout ce qui est cliquable et porte un
    nom d'organisme, et exige que ça mène à `/organismes/`.

    Le filtre `?organisme=` reste ACCEPTÉ en entrée — une adresse partagée ne
    doit pas casser — mais plus rien ne doit le produire.
  */
  const noms = await page.evaluate(() => {
    const bande = document.querySelector('ul[aria-label="Organismes référencés"]');
    return [...(bande?.querySelectorAll("li a span:first-child") ?? [])]
      .map((e) => (e.textContent ?? "").trim())
      .filter((n) => n.length > 3)
      .slice(0, 8);
  });
  expect(noms.length).toBeGreaterThan(0);

  const fautifs = await page.evaluate((liste: string[]) => {
    const mauvais: string[] = [];
    for (const element of document.querySelectorAll("a[href], button")) {
      const texte = (element.textContent ?? "").trim();
      if (!liste.some((n) => texte === n)) continue;
      const href = element.getAttribute("href");
      if (href === null) {
        mauvais.push(`<button> « ${texte} » — un organisme doit être un lien`);
      } else if (!href.startsWith("/organismes/")) {
        mauvais.push(`« ${texte} » → ${href}`);
      }
    }
    return mauvais;
  }, noms);

  expect(fautifs).toEqual([]);

  // L'autocomplétion : une suggestion d'organisme mène à sa page.
  const champ = page.getByRole("combobox");
  await champ.fill(noms[0]!.slice(0, 6));
  const suggestion = page.getByRole("option").filter({ hasText: noms[0]! }).first();
  if ((await suggestion.count()) > 0) {
    await suggestion.click();
    await page.waitForLoadState("networkidle");
    expect(new URL(page.url()).pathname).toMatch(/^\/organismes\/.+/);
  }
});

test("la vue Comparer vide permet de démarrer sans quitter la page", async ({ page }) => {
  /*
    La page ne faisait que renvoyer au catalogue : un aller-retour, pas une
    page. Le test vérifie qu'on peut y COMMENCER quelque chose — le champ
    ajoute réellement un parcours, et les comparaisons proposées existent.

    Elles sont tirées au sort APRÈS montage, pour que serveur et client rendent
    le même HTML : le test attend donc leur apparition plutôt que de les lire
    au premier rendu.
  */
  await page.goto(`${BASE}/comparer`, { waitUntil: "networkidle" });

  const champ = page.getByPlaceholder(/Ajouter un parcours/);
  await expect(champ).toBeVisible();

  // Les comparaisons possibles : le catalogue le permet aujourd'hui.
  const propositions = page.locator("main section", { hasText: "Comparaisons possibles" });
  await expect(propositions).toBeVisible();
  const cartes = propositions.locator("ul > li");
  expect(await cartes.count()).toBeGreaterThan(0);

  // Jamais « populaires » ni « recommandées » : ce serait un jugement.
  const titre = await propositions.locator("h2").innerText();
  expect(titre.toLowerCase()).not.toMatch(/populaire|recommand/);

  // Le champ ajoute vraiment : une suggestion retenue fait apparaître le
  // compteur d'un parcours retenu, sans navigation.
  await champ.fill("commerce");
  const option = page.getByRole("option").first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.getByText(/Un parcours retenu/)).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/comparer");
});

test("aucun sélecteur natif dans le rendu", async ({ page }) => {
  /*
    Troisième cas du jour où une vue écrite après les autres n'a pas repris le
    composant existant — après l'ouverture de fiche et le lien vers l'organisme.
    Le symptôme était visible : le menu système affichait « distanciel » et
    « presentiel », c'est-à-dire le vocabulaire de la base servi à
    l'utilisateur.

    Le contrôle est mécanique et ne coûte rien : un `<select>` natif ne peut
    pas respecter les jetons, donc sa seule présence est le défaut.
  */
  const pages = ["/", "/organismes", "/comparer", "/aide-au-choix", "/organismes/livementor"];
  const fautifs: string[] = [];

  for (const chemin of pages) {
    await page.goto(`${BASE}${chemin}`, { waitUntil: "networkidle" });
    const natifs = await page.locator("select").count();
    if (natifs > 0) fautifs.push(`${chemin} → ${natifs} <select>`);
  }
  expect(fautifs).toEqual([]);
});

test("les filtres de la page organisme affichent des libellés, pas des valeurs brutes", async ({
  page,
}) => {
  /*
    Le rendu système montrait les valeurs stockées. On vérifie donc le CONTENU
    du menu, pas seulement sa forme : une refonte visuelle qui garderait
    « presentiel » n'aurait rien corrigé de ce qui se lit.
  */
  await page.goto(`${BASE}/organismes/livementor`, { waitUntil: "networkidle" });

  const declencheurs = page.locator("main section button[aria-haspopup]");
  const total = await declencheurs.count();
  if (total === 0) return; // Cet organisme n'a pas assez d'axes pour filtrer.

  await declencheurs.first().click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();

  const texte = await menu.innerText();
  for (const brut of ["distanciel", "presentiel", "aucun_prerequis", "formation_professionnelle"]) {
    expect(texte).not.toContain(brut);
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

test("l'explorateur n'a qu'un seul champ de recherche, sans perdre de frappe", async ({ page }) => {
  /*
    Il y en avait deux, synchronisés : chacun gardait un état local resynchronisé
    par un minuteur, et celui qui n'était pas actif écrasait la frappe de l'autre
    au premier battement. Caractères perdus, curseur qui saute.

    Le second champ a été retiré plutôt que réparé : deux champs obligent à
    répondre en permanence à « lequel fait foi », et c'est cette question qui
    coûtait un état partagé et des frappes. Ce test tient les deux bouts —
    l'unicité, et la saisie qui arrive entière.
  */
  await expect(page.getByRole("combobox")).toHaveCount(1);

  const champ = page.getByRole("combobox");
  await champ.click();
  await champ.pressSequentially("shopi", { delay: 60 });
  await expect(champ).toHaveValue("shopi");

  // Le curseur reste à la fin : un remontage le renverrait à zéro.
  const position = await champ.evaluate((e: HTMLInputElement) => e.selectionStart);
  expect(position).toBe(5);
});

test("aucune carte ne recouvre la barre de résultats, à toutes les largeurs", async ({ page }) => {
  /*
    Le défaut visé : les cartes passaient PAR-DESSUS la barre collante au
    défilement, et les deux textes se superposaient. Deux causes possibles, et
    une seule des deux se lit dans le code — un plan de superposition implicite,
    ou un fond non opaque. La mesure ne s'intéresse à ni l'une ni l'autre : elle
    demande au navigateur ce qui se trouve RÉELLEMENT au-dessus de la barre.

    `elementFromPoint` est l'autorité ici. Comparer des rectangles ne suffirait
    pas : une carte qui chevauche le rectangle de la barre est le comportement
    NORMAL d'un élément collant — c'est de passer devant qui est le défaut.
  */
  const fautifs: string[] = [];

  for (const largeur of [1440, 1024, 960, 768, 430, 390]) {
    await page.setViewportSize({ width: largeur, height: 800 });
    await page.evaluate(() => window.scrollTo(0, 2600));
    await page.waitForTimeout(200);

    const intrus = await page.evaluate(() => {
      const barre = [...document.querySelectorAll("*")].find((e) =>
        String(e.className).includes("z-(--z-barre-resultats)"),
      );
      if (!barre) return ["barre de résultats introuvable"];
      const r = barre.getBoundingClientRect();
      const dessus: string[] = [];
      for (const dx of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        for (const dy of [0.15, 0.5, 0.85]) {
          const el = document.elementFromPoint(r.x + r.width * dx, r.y + r.height * dy);
          if (el && el !== barre && !barre.contains(el)) {
            dessus.push(el.tagName.toLowerCase());
          }
        }
      }
      return [...new Set(dessus)];
    });

    if (intrus.length > 0) fautifs.push(`${largeur}px → ${intrus.join(", ")}`);

    // Et le fond reste plein : un fond translucide laisse passer le texte quel
    // que soit le plan de superposition.
    const opaque = await page.evaluate(() => {
      const barre = [...document.querySelectorAll("*")].find((e) =>
        String(e.className).includes("z-(--z-barre-resultats)"),
      );
      const fond = barre ? getComputedStyle(barre).backgroundColor : "";
      // Le quatrième nombre est l'alpha — s'il y en a un quatrième. Chercher
      // « le dernier nombre » prenait le bleu de `rgb(255, 255, 255)` pour une
      // opacité de 255 et déclarait translucide un fond parfaitement plein.
      const composantes = (fond.match(/[\d.]+/g) ?? []).map(Number);
      return composantes.length < 4 || composantes[3] === 1;
    });
    if (!opaque) fautifs.push(`${largeur}px → fond translucide`);
  }

  expect(fautifs).toEqual([]);
});

test("la bande d'organismes ne déborde pas et reste lisible", async ({ page }) => {
  const bande = page.getByRole("list", { name: "Organismes référencés" });
  await expect(bande).toBeVisible();

  // Elle déborde volontairement la grille, jamais la fenêtre.
  const fenetre = page.viewportSize()!;
  const { defilable } = await page.evaluate(() => ({
    defilable: document.documentElement.scrollWidth,
  }));
  expect(defilable).toBeLessThanOrEqual(fenetre.width + 1);

  /*
    Les trois blocs de la carte — pictogramme, texte, badge — ne se touchent
    jamais. Sans écart, « Bootcamp12 » se lit comme un seul mot, et un badge
    collé au nom se lit comme sa suite.

    Mesuré sur les enfants DIRECTS du bouton, dans l'ordre du document : c'est
    la composition qu'on vérifie, pas une paire choisie à la main.
  */
  // La carte est un LIEN depuis qu'elle mène à la page organisme : viser
  // `button` ici ne trouvait plus rien, et le test échouait sur le comptage
  // sans rien dire de la composition.
  const carte = bande.locator("li").first().locator("a");
  const blocs = carte.locator("> span");
  await expect(blocs).toHaveCount(3);

  const rects = [];
  for (let i = 0; i < 3; i++) rects.push(await boite(blocs.nth(i)));
  for (let i = 0; i < 2; i++) {
    const ecart = rects[i + 1]!.x - (rects[i]!.x + rects[i]!.width);
    expect(ecart).toBeGreaterThan(4);
  }

  // Le badge est bien à droite, le texte au centre : la composition tient.
  expect(rects[2]!.x).toBeGreaterThan(rects[1]!.x);
});

test("la bande défile à une vitesse lisible, quelle que soit la taille du catalogue", async ({
  page,
}) => {
  /*
    L'invariant qui manquait au chantier précédent. `--bande-duree` valait 50 s
    en dur : la vitesse dépendait donc du nombre d'organismes, et chaque ajout
    au catalogue rendait la bande un peu plus illisible sans que rien ne le
    signale. Un test sur la durée n'aurait rien vu — c'est la VITESSE qui est le
    critère, et elle ne se lit nulle part dans le code.

    `defile` translate de -50 % : la distance parcourue en un cycle vaut la
    moitié de la largeur de la piste dupliquée.
  */
  const bande = page.getByRole("list", { name: "Organismes référencés" });
  await expect(bande).toBeVisible();

  const vitesse = await bande.evaluate((element) => {
    const duree = parseFloat(getComputedStyle(element).animationDuration);
    const parcourue = element.getBoundingClientRect().width / 2;
    return parcourue / duree;
  });

  // Le repère de contrôle est la lisibilité : à moins de 30 px/s la bande
  // paraît figée, au-delà de 50 un nom ne tient pas deux secondes à l'écran.
  expect(vitesse).toBeGreaterThanOrEqual(30);
  expect(vitesse).toBeLessThanOrEqual(50);
});

test("la bande décélère à la mise en pause au lieu de s'arrêter net", async ({ page }) => {
  /*
    Cet invariant existe parce que la décélération S'EXÉCUTAIT — sans erreur,
    sans test rouge — en une seule image. `--bande-deceleration` vaut « 400ms »,
    que `getComputedStyle` rend normalisé en « .4s » : `parseFloat` en tirait
    0,4, et la durée valait quatre dixièmes de milliseconde. Le résultat visible
    était l'arrêt brutal que la règle interdisait.

    Aucun contrôle sur le jeton ne pouvait le voir : le jeton était juste. Seule
    la mesure du taux de lecture À MI-PARCOURS distingue une décélération d'un
    arrêt — c'est la sortie qu'on interroge, pas la mécanique.
  */
  const bande = page.getByRole("list", { name: "Organismes référencés" });
  await expect(bande).toBeVisible();

  // L'échantillonnage vit dans la page : un aller-retour par mesure coûterait
  // plus longtemps que la décélération elle-même.
  await bande.evaluate((ul) => {
    const releves: Array<[number, number]> = [];
    const depart = performance.now();
    const pas = () => {
      const t = performance.now() - depart;
      releves.push([t, ul.getAnimations()[0]?.playbackRate ?? -1]);
      if (t < 600) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
    (window as unknown as { releves: typeof releves }).releves = releves;
  });

  /*
    `hover()` attend que l'élément soit stable, ce qu'une bande en défilement
    continu n'est jamais : on pointe la position, pas l'élément.
  */
  /*
    La section, et non la piste : celle-ci fait plusieurs dizaines de milliers
    de pixels de large et son rectangle déborde largement la fenêtre.

    Amenée dans la zone visible d'abord — `page.mouse` travaille en coordonnées
    de fenêtre, et la bande est sous la ligne de flottaison : viser sa position
    de page déplaçait le pointeur hors de l'écran, sans que rien ne le signale.
  */
  const section = page.locator("section").filter({ has: bande });
  await section.scrollIntoViewIfNeeded();
  const zone = await boite(section);
  await page.mouse.move(zone.x + zone.width / 2, zone.y + zone.height / 2);
  await page.waitForTimeout(700);

  const releves = await page.evaluate(
    () => (window as unknown as { releves: Array<[number, number]> }).releves,
  );

  const a = (instant: number) =>
    releves.reduce((meilleur, actuel) =>
      Math.abs(actuel[0] - instant) < Math.abs(meilleur[0] - instant) ? actuel : meilleur,
    )[1];

  // À mi-parcours le mouvement est engagé mais pas fini : c'est le seul point
  // qu'un arrêt net ne peut pas produire.
  expect(a(200)).toBeGreaterThan(0.02);
  expect(a(200)).toBeLessThan(0.9);
  // Et il finit bien par s'arrêter, sans jamais accélérer en chemin.
  expect(a(600)).toBeLessThan(0.01);
  expect(Math.max(...releves.map(([, taux]) => taux))).toBeLessThanOrEqual(1.001);
});
