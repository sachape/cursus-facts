import { describe, expect, it } from "vitest";
import { MOTIFS_COMPETENCES, MOTIFS_DOMAINES } from "./vocabulaires";


describe("bornes de mot des motifs", () => {
  /*
    Un fragment court sans limite de mot est un bug, pas un arbitrage : « ux »
    attrapait Linux, flux, Bordeaux et luxe, et a fait classer une prépa en CRO
    parce que sa page mentionnait « Linux et bash ». Le défaut dormait depuis le
    début et n'attendait qu'une donnée pour se manifester — c'est l'extraction
    qui l'a réveillé.

    `\b` ne suffirait pas : il est ASCII et ne délimite pas un mot accentué.
  */
  const TEMOINS = [
    "Linux",
    "flux",
    "Bordeaux",
    "luxe",
    "Seat",
    "réseau",
    "Reseau",
    "Chiapas",
    "Ionos",
    "Media",
    "Prestashop",
    "crossfit",
    "Sirius",
    "aisance",
  ];

  it("aucun motif ne correspond à une sous-chaîne interne d'un mot", () => {
    const fautifs: string[] = [];
    for (const [nom, lot] of [
      ["compétence", MOTIFS_COMPETENCES],
      ["domaine", MOTIFS_DOMAINES],
    ] as const) {
      for (const [cle, motif] of lot) {
        for (const temoin of TEMOINS) {
          const trouve = temoin.match(motif);
          // Une correspondance PARTIELLE sur un mot isolé signale un motif non
          // borné : le mot entier peut légitimement correspondre, pas un
          // fragment interne.
          if (trouve && trouve[0].length < temoin.length) {
            fautifs.push(`${nom} « ${cle} » ⟵ « ${trouve[0]} » dans « ${temoin} »`);
          }
        }
      }
    }
    expect(fautifs).toEqual([]);
  });
});
