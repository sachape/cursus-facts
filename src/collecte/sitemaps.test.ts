import { describe, expect, it } from "vitest";
import {
  estIndex,
  estPageFormation,
  lireSitemap,
  rapprocher,
  scoreRapprochement,
  sitemapsDeclares,
} from "./sitemaps";

describe("découverte par sitemaps", () => {
  it("lit les sitemaps déclarés dans un robots.txt", () => {
    const robots = `User-agent: *\nDisallow: /admin\nSitemap: https://x.fr/sitemap.xml\nsitemap: https://x.fr/sitemap-2.xml`;
    expect(sitemapsDeclares(robots)).toEqual([
      "https://x.fr/sitemap.xml",
      "https://x.fr/sitemap-2.xml",
    ]);
  });

  it("lit un sitemap malgré CDATA, entités et absence de namespace", () => {
    // Les sitemaps réels sont trop irréguliers pour un parseur strict : celui-ci
    // doit survivre à ce qui ferait échouer un parseur XML sur le document entier.
    const xml = `<urlset><url><loc><![CDATA[https://x.fr/formation/a]]></loc><lastmod>2026-07-01T10:00:00+02:00</lastmod></url>
      <url><loc>https://x.fr/formation/b?x=1&amp;y=2</loc></url></urlset>`;
    expect(lireSitemap(xml)).toEqual([
      { url: "https://x.fr/formation/a", lastmod: "2026-07-01" },
      { url: "https://x.fr/formation/b?x=1&y=2", lastmod: null },
    ]);
  });

  it("distingue un index de sitemaps d'une liste d'URL", () => {
    expect(estIndex(`<sitemapindex><sitemap><loc>https://x.fr/s1.xml</loc></sitemap></sitemapindex>`)).toBe(true);
    expect(estIndex(`<urlset><url><loc>https://x.fr/a</loc></url></urlset>`)).toBe(false);
  });

  it("reconnaît une page de formation et écarte le reste", () => {
    expect(estPageFormation("https://x.fr/formation/prestashop-utilisateurs")).toBe(true);
    expect(estPageFormation("https://x.fr/formations/bachelor-marketing")).toBe(true);
    expect(estPageFormation("https://x.fr/blog/formation-e-commerce")).toBe(false);
    expect(estPageFormation("https://x.fr/mentions-legales")).toBe(false);
    expect(estPageFormation("https://x.fr/")).toBe(false);
    expect(estPageFormation("https://x.fr/img/formation-hero.jpg")).toBe(false);
  });

  it("rapproche une URL de son parcours par les mots discriminants", () => {
    expect(
      scoreRapprochement("PrestaShop — Utilisateurs", "https://x.fr/formations/prestashop-utilisateurs"),
    ).toBe(1);
    // « Formation » et « créer » sont trop fréquents pour rapprocher quoi que ce soit.
    expect(scoreRapprochement("Formation e-commerce", "https://x.fr/formation/marketing-digital")).toBeLessThan(0.6);
  });

  it("laisse une URL non rapprochée plutôt que de la rattacher au hasard", () => {
    // Se tromper de rattachement écrirait les données d une formation sur la
    // fiche d une autre : une erreur invisible, bien pire qu une découverte en trop.
    const fiches = [{ id: 1, nom: "PrestaShop — Développeurs" }];
    const r = rapprocher(
      [
        { url: "https://x.fr/formations/prestashop-developpeurs", lastmod: "2026-06-01" },
        { url: "https://x.fr/formations/shopify-avance", lastmod: null },
      ],
      fiches,
    );
    expect(r[0]!.id).toBe(1);
    expect(r[1]!.id).toBeNull();
  });

  it("n attribue jamais deux URL au même parcours", () => {
    const fiches = [{ id: 1, nom: "PrestaShop Utilisateurs" }];
    const r = rapprocher(
      [
        { url: "https://x.fr/formations/prestashop-utilisateurs", lastmod: null },
        { url: "https://x.fr/formations/prestashop-utilisateurs-avance", lastmod: null },
      ],
      fiches,
    );
    expect(r.filter((x) => x.id === 1)).toHaveLength(1);
  });
});
