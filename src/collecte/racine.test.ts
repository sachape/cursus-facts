import { beforeEach, describe, expect, it } from "vitest";
import { oublierRacines, racineJoignable, type Reponse } from "./recuperation";

const ok = (): Reponse => ({ ok: true, texte: "", statut: 200 });
const refus = (): Reponse => ({ ok: false, motif: "erreur_reseau", statut: null });
const quatreCentQuatre = (): Reponse => ({ ok: false, motif: "http_404", statut: 404 });

describe("racine joignable d'un domaine", () => {
  beforeEach(oublierRacines);

  it("garde le domaine nu quand il répond", async () => {
    const vues: string[] = [];
    const racine = await racineJoignable("enaco.fr", async (u) => {
      vues.push(u);
      return ok();
    });
    expect(racine).toBe("https://enaco.fr");
    // Une seule requête : on n'essaie `www.` que si le nu échoue.
    expect(vues).toHaveLength(1);
  });

  /*
    LE CAS QUI A COÛTÉ TROIS PASSES. Huit universités françaises refusent la
    connexion sur leur domaine nu et répondent sur `www.`. Sans ce repli,
    l'échec était compté comme une opacité de l'organisme.
  */
  it("se rabat sur www. quand le domaine nu refuse", async () => {
    const racine = await racineJoignable("univ-rouen.fr", async (u) =>
      u.includes("www.") ? ok() : refus(),
    );
    expect(racine).toBe("https://www.univ-rouen.fr");
  });

  it("accepte un hôte qui répond 404 : il répond, c'est ce qu'on cherche", async () => {
    // `robots.txt` absent ne dit rien du site ; seul un échec de connexion le dit.
    const racine = await racineJoignable("exemple.fr", async () => quatreCentQuatre());
    expect(racine).toBe("https://exemple.fr");
  });

  it("rend null quand aucune des deux formes ne répond", async () => {
    expect(await racineJoignable("yomi-denzel.fr", async () => refus())).toBeNull();
  });

  it("ne teste un domaine qu'une fois par passe", async () => {
    let appels = 0;
    const sonde = async () => {
      appels++;
      return ok();
    };
    await racineJoignable("studi.com", sonde);
    await racineJoignable("studi.com", sonde);
    await racineJoignable("www.studi.com", sonde);
    expect(appels).toBe(1);
  });
});
