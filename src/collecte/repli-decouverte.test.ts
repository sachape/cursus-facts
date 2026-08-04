import { describe, expect, it } from "vitest";
import { liensInternes, retenirStrategie } from "./repli-decouverte";

describe("repli de découverte", () => {
  it("ne sort jamais du domaine de l'organisme", () => {
    // Sortir du domaine mènerait vers des annuaires et des comparatifs, dont
    // nous ne reprenons aucune donnée. La contrainte est structurelle.
    const html = `<a href="/formations/a">A</a><a href="https://x.fr/formations/b">B</a>
      <a href="https://comparatif.fr/x">C</a><a href="mailto:a@x.fr">D</a><a href="#ancre">E</a>`;
    expect(liensInternes(html, "https://x.fr/plan").sort()).toEqual([
      "https://x.fr/formations/a",
      "https://x.fr/formations/b",
    ]);
  });

  it("survit à un href malformé sans perdre les autres", () => {
    const html = `<a href="/ok">A</a><a href="http://[invalide">B</a>`;
    expect(liensInternes(html, "https://x.fr/")).toEqual(["https://x.fr/ok"]);
  });

  it("s'arrête au premier repli qui rend des URL", () => {
    // Escalader systématiquement paierait le coût de la recherche pour des
    // organismes que le plan HTML suffisait à traiter.
    expect(
      retenirStrategie({ plan_html: ["https://x.fr/a"], recherche_domaine: ["https://x.fr/b"] }),
    ).toEqual({ strategie: "plan_html", urls: ["https://x.fr/a"] });
  });

  it("ignore un repli qui n'a rien rendu", () => {
    expect(retenirStrategie({ plan_html: [], exploration: ["https://x.fr/a"] })).toMatchObject({
      strategie: "exploration",
    });
  });

  it("rend une stratégie nulle quand aucun repli n'aboutit", () => {
    // Un échec de tous les replis est un fait sur notre outillage, pas sur
    // l'organisme : il n'autorise jamais à écrire « non publié ».
    expect(retenirStrategie({})).toEqual({ strategie: null, urls: [] });
  });
});
