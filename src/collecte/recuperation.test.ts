import { describe, expect, it } from "vitest";
import { exigeRepliNavigateur, lireRobots, texteprincipal } from "./recuperation";

describe("récupération", () => {
  it("n'applique que les règles qui nous concernent", () => {
    const robots = `User-agent: BadBot
Disallow: /
User-agent: *
Disallow: /admin
Sitemap: https://x.fr/sitemap.xml`;
    const r = lireRobots(robots);
    expect(r.sitemaps).toEqual(["https://x.fr/sitemap.xml"]);
    expect(r.autorise("/formations/a")).toBe(true);
    expect(r.autorise("/admin/x")).toBe(false);
  });

  it("ignore les commentaires et les Disallow vides", () => {
    // « Disallow: » sans valeur signifie « tout autorisé » — le lire comme un
    // préfixe vide interdirait le site entier.
    const r = lireRobots("User-agent: *\nDisallow:   # rien d'interdit");
    expect(r.autorise("/formations/a")).toBe(true);
  });

  it("garde le texte littéral, seule base valable pour vérifier une citation", () => {
    // Toute reformulation ici rendrait le garde-fou inopérant : la valeur
    // serait comparée à un texte que la page n'a jamais servi.
    const html = `<html><head><style>.a{color:red}</style></head>
      <body><script>var x=1</script><h1>Formation PrestaShop</h1>
      <p>Tarif&nbsp;: 1&nbsp;500&nbsp;&euro; HT</p><!-- caché --></body></html>`;
    const texte = texteprincipal(html);
    expect(texte).toContain("Formation PrestaShop");
    expect(texte).toContain("Tarif : 1 500 € HT");
    expect(texte).not.toContain("var x=1");
    expect(texte).not.toContain("color:red");
    expect(texte).not.toContain("caché");
  });

  it("signale une page vide plutôt que de la prendre pour une absence", () => {
    // Coachingfba servait une page vide par rendu JavaScript. Sans ce repli,
    // on classerait « non publié » des informations parfaitement publiées.
    expect(exigeRepliNavigateur(texteprincipal("<html><body><div id=root></div></body></html>"))).toBe(
      true,
    );
    expect(exigeRepliNavigateur("x".repeat(1000))).toBe(false);
  });
});
