import { describe, expect, it } from "vitest";
import {
  enParallele,
  exigeRepliNavigateur,
  lireRobots,
  recuperer,
  texteprincipal,
} from "./recuperation";

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
    /*
      Espace INSÉCABLE, et c'est voulu : la page en contient une, et le
      décodage la restitue telle quelle plutôt que de l'aplatir. La
      normalisation des citations traite les deux comme équivalentes, donc rien
      ne se casse en aval — et le texte servi au modèle reste littéral.
    */
    expect(texte).toContain("Tarif\u00a0: 1\u00a0500\u00a0€ HT");
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

describe("cadence sous concurrence", () => {
  it("espace réellement deux requêtes vers un même domaine", async () => {
    // Le bug attrapé le 4 août : le créneau était enregistré APRÈS l'attente.
    // En séquentiel, indifférent. En concurrent, six appels lisaient la même
    // date, dormaient la même durée et repartaient ensemble — la politesse de
    // 1,5 s devenait une salve. Rien ne plantait, la variable existait, la
    // consigne semblait respectée, et le résultat était faux.
    const debuts: number[] = [];
    const faux: typeof fetch = async () => {
      debuts.push(Date.now());
      return new Response("ok", { status: 200 });
    };

    const t0 = Date.now();
    await enParallele([1, 2, 3], 3, () =>
      recuperer("https://exemple.fr/a", { fetchImpl: faux }),
    );

    expect(debuts).toHaveLength(3);
    const ecarts = debuts.slice(1).map((t, i) => t - debuts[i]!);
    // Chacun attend son tour : au moins une seconde entre deux départs.
    for (const ecart of ecarts) expect(ecart).toBeGreaterThanOrEqual(1_000);
    // Et la troisième requête part bien après deux créneaux, pas après un seul.
    expect(Date.now() - t0).toBeGreaterThanOrEqual(2_000);
  }, 20_000);
});
