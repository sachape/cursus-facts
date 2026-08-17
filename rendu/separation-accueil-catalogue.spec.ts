/**
 * La séparation accueil / catalogue, vérifiée dans le navigateur.
 *
 * CE QUE CES TESTS PROTÈGENT. L'accueil et la liste ont vécu sur la même
 * adresse : le logo et l'onglet « Explorer » menaient tous deux à `/`, et la
 * page présentait le produit tout en affichant 217 fiches. La séparation ne se
 * vérifie pas en lisant le code — elle se vérifie en cliquant.
 *
 * Le point le plus fragile n'est pas la présence des pages, c'est la
 * REDIRECTION DES ANCIENNES ADRESSES. `/?sujet=…` est indexé, partagé, et lié
 * depuis les guides ; servi par un accueil qui n'a plus de liste, il afficherait
 * un hero muet. Un tel défaut ne casse rien et ne rougit nulle part.
 */
import { expect, test } from "@playwright/test";

test.describe("séparation de l'accueil et du catalogue", () => {
  test("l'accueil présente le produit et n'affiche aucune liste", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("formations e-commerce");
    // La colonne de filtres et les onglets de domaine ont déménagé.
    await expect(page.getByRole("button", { name: /^Filtres$/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Tous les domaines/ })).toHaveCount(0);
  });

  test("l'appel de l'accueil mène au catalogue, sans attendre l'hydratation", async ({ page }) => {
    /*
      LE CLIC EST IMMÉDIAT, ET C'EST TOUT L'INTÉRÊT. Cet appel a été un
      `<button onClick>` : mesuré le 18 août, un clic immédiat ne bougeait pas
      l'adresse, un clic après hydratation menait bien au catalogue. Le HTML du
      serveur s'affiche et se laisse cliquer bien avant que React n'attache
      quoi que ce soit — sur lien lent, le premier geste du visiteur tombait
      donc dans le vide, sans que rien ne rougisse.

      Ne pas ajouter d'attente ici : c'est la course elle-même qu'on surveille.
    */
    await page.goto("/");
    // Le premier du DOM est celui du hero ; l'Editorial porte le même libellé.
    const appel = page.getByRole("link", { name: /Voir les .* parcours/ }).first();
    await expect(appel).toBeVisible();
    await appel.click();
    await expect(page).toHaveURL(/\/catalogue$/);
    /*
      La liste est là, et elle n'est pas vide. Un catalogue rendu à zéro rangée
      passerait tous les autres contrôles de cette page.
    */
    await expect(page.locator("main ul > li").first()).toBeVisible();
  });

  test("depuis le catalogue, le logo ramène à l'accueil", async ({ page }) => {
    await page.goto("/catalogue");
    await page.locator("header a[href='/']").first().click();
    await expect(page).toHaveURL(new RegExp(`${page.url().split("/").slice(0, 3).join("/")}/?$`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText("formations e-commerce");
  });

  test("aucune entrée de navigation ne pointe deux fois vers la même route", async ({ page }) => {
    await page.goto("/");
    /*
      C'EST LA REDONDANCE QUI A MOTIVÉ LE CHANTIER. Le logo et « Explorer »
      menaient tous deux à `/` : deux éléments de navigation pour une seule
      destination, dont l'un ne disait pas ce qu'il ouvrait.
    */
    /*
      LA PORTÉE EST L'EN-TÊTE DU SITE, PAS TOUT `header` DE LA PAGE. Le hero
      est lui aussi un `<header>` (`index.tsx`), et ses puces de raccourci
      pointent toutes vers `/catalogue?…` : une fois la requête retirée, elles
      s'effondraient en doublons et faisaient rougir ce test pour la seule
      raison qu'elles existent. Mesuré : 10 liens pour 5 cibles, sans qu'aucune
      entrée de navigation ne soit en cause.
    */
    const entete = page.getByRole("banner").first();
    const cibles = await entete.locator("a[href^='/']").evaluateAll((liens) =>
      liens.map((l) => (l as HTMLAnchorElement).getAttribute("href")!.split("?")[0]),
    );
    expect(cibles.length).toBeGreaterThan(0);
    expect(new Set(cibles).size).toBe(cibles.length);
  });

  test("une ancienne adresse filtrée de l'accueil rejoint le catalogue", async ({ page }) => {
    await page.goto("/?cpf=1");
    await expect(page).toHaveURL(/\/catalogue\?.*cpf=1/);
    await expect(page.locator("main ul > li").first()).toBeVisible();
  });

  test("l'accueil nu n'est jamais redirigé", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/catalogue/);
  });
});
