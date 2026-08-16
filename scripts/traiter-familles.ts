/**
 * Traitement des fiches-familles isolées — éclatements, retraits, hors périmètre.
 *
 * `bun run collecte:familles`            à blanc
 * `bun run collecte:familles -- --ecrire` applique
 *
 * TROIS ISSUES, TROIS MOTIFS DISTINCTS, ET C'EST LE POINT.
 *
 *   éclatement     — l'intitulé recouvrait plusieurs parcours réels, chacun
 *                    avec sa page. La fiche parente sort, ses parcours entrent.
 *                    Le catalogue ne perd rien, il gagne en précision.
 *   retrait        — l'intitulé désignait un catalogue ou un dispositif de
 *                    réseau. Rien à éclater : aucun produit derrière.
 *   hors_perimetre — l'offre est réelle et bornée, mais ne relève pas du
 *                    e-commerce. Ce motif NE DIT RIEN de la qualité de l'offre,
 *                    et c'est pour ça qu'il est distinct du retrait.
 *
 * LA RÈGLE D'ENTRÉE, POSÉE LE 13 AOÛT 2026 : une fiche nouvelle n'entre que si
 * sa page produit existe ET porte un intitulé propre. Un cours sans page
 * n'entre pas. Sept fiches réelles valent mieux que trente approximatives —
 * c'est le défaut qu'on a passé la journée à corriger.
 *
 * Chaque intitulé ci-dessous a donc été RELEVÉ SUR LA PAGE, pas déduit du nom
 * de la fiche parente ni du chemin de l'URL. C'est ce relevé qui a fait tomber
 * dixmilleheures de l'éclatement : ses trois pages e-commerce s'intitulent
 * « Les 8 meilleures formations… » — des comparatifs, pas des cours qu'il vend.
 */
import { readFileSync, writeFileSync } from "node:fs";

const CATALOGUE = "src/donnees/offres-sources.json";
const JOURNAL = "src/donnees/journal-retraits.json";
const LE = "2026-08-13";

type Enfant = { nom: string; urlDetail: string };

/** Parcours confirmés : page ouverte, code 200, intitulé relevé sur la page. */
const ECLATEMENTS: { parent: number; enfants: Enfant[] }[] = [
  {
    parent: 69,
    enfants: [
      { nom: "Bachelor Marketing Communication & IA", urlDetail: "https://www.iscod.fr/formation-bachelor-marketing-et-communication-en-alternance" },
      { nom: "MBA Marketing, Digital Business et IA", urlDetail: "https://www.iscod.fr/formation-marketing-digital-business-et-ia-en-alternance" },
      { nom: "MBA Stratégie Marketing, Communication et IA", urlDetail: "https://www.iscod.fr/formation-mba-strategie-marketing-communication-et-ia-en-alternance" },
    ],
  },
  {
    parent: 74,
    enfants: [
      { nom: "Bachelor européen E-commerce", urlDetail: "https://www.enaco.fr/formations/bachelor-e-commerce/" },
      { nom: "Mastère européen E-business", urlDetail: "https://www.enaco.fr/formations/mastere-ebusiness/" },
      { nom: "Bachelor européen Marketing digital", urlDetail: "https://www.enaco.fr/formations/bachelor-marketing-digital/" },
      { nom: "BTS Négociation et digitalisation de la relation client", urlDetail: "https://www.enaco.fr/formations/bts-ndrc/" },
      { nom: "Mastère européen Management digital", urlDetail: "https://www.enaco.fr/formations/mastere-management-digital/" },
    ],
  },
  {
    parent: 93,
    enfants: [
      { nom: "BTS Management Commercial Opérationnel", urlDetail: "https://www.studi.com/fr/formation/retail-point-de-vente/bts-management-commercial-operationnel" },
      { nom: "BTS Négociation Digitalisation Relation Client", urlDetail: "https://www.studi.com/fr/formation/commercial-relation-client/bts-negociation-digitalisation-relation-client" },
      { nom: "Déployer une stratégie marketing digital", urlDetail: "https://www.studi.com/fr/formation/gestion-de-projet/strategie-marketing-digital" },
      { nom: "Bachelor Chargé de Marketing et Communication", urlDetail: "https://www.studi.com/fr/formation/marketing/bachelor-charge-de-marketing-et-communication" },
      { nom: "Développer la performance stratégique marketing digital", urlDetail: "https://www.studi.com/fr/formation/marketing/performance-marketing-digital" },
      { nom: "Manager des équipes et des projets de marketing digital", urlDetail: "https://www.studi.com/fr/formation/marketing/management-projets-marketing-digital" },
    ],
  },
  {
    parent: 145,
    enfants: [
      { nom: "Formation e-Commerce Power — WordPress WooCommerce et Elementor", urlDetail: "https://voltee.fr/formations/ecommerce/e-commerce-woocommerce-formation" },
      { nom: "Formation Shopify Expert", urlDetail: "https://voltee.fr/formations/ecommerce/shopify-ecommerce" },
      { nom: "Formation Amazon FBA Pro", urlDetail: "https://voltee.fr/formations/ecommerce/amazon-fba" },
    ],
  },
];

const RETRAITS: { id: number; motif: string }[] = [
  {
    id: 110,
    motif:
      "Programme de réseau, pas une offre. Le Réseau CCI oriente vers les offres de ses chambres territoriales ; l'intitulé « Formation continue commerce et numérique » couvre un domaine entier, avec une durée « Variable » et aucun programme. Rien à éclater : il n'y a pas de produit derrière, seulement un dispositif.",
  },
  {
    id: 111,
    motif:
      "Dispositif de réseau, pas une offre. artisanat.fr publie un annuaire de centres de formation par région et des parcours d'orientation (« devenir apprenti », « entamer une reconversion ») ; aucune page de cours, aucune page pertinente e-commerce sur les 62 pages de formation relevées. Même nature que le Réseau CCI.",
  },
  {
    id: 157,
    motif:
      "Page catalogue d'organisme. L'intitulé « Catalogue formations digitales » désigne explicitement un ensemble d'offres distinctes, avec une durée « Variable » et aucun programme. Même motif que M2i et Dawan le 4 août.",
  },
  {
    id: 83,
    motif:
      "Page catalogue d'organisme, et la fiche en porte la preuve. Sa durée déclarée « 0,5 à 3 jours » reprend exactement les filtres du catalogue B2B d'Oreegami (moins d'1 jour, 1 jour, 1,5 jour, 2 jours) : c'est une plage de filtres, une valeur vraie d'aucun cours. Motif M2i et Dawan au mot près.",
  },
];

const HORS_PERIMETRE: { id: number; motif: string }[] = [
  {
    id: 220,
    motif:
      "Hors périmètre e-commerce. La page publiée est « Formation automatisation » : trois mois de mentorat pour automatiser réseaux sociaux, prospection, e-mails, comptabilité et veille, avec Zapier, Make et Airtable. Relevé sur la page : « automatis » 124 fois, « e-commerce » zéro, « boutique » zéro. Son objet est l'outillage et le gain de temps de l'entrepreneur, pas la vente en ligne. Le critère porte sur l'objet du parcours, jamais sur son public.",
  },
  {
    id: 86,
    motif:
      "Hors périmètre e-commerce. Jedha vend des bootcamps data, intelligence artificielle, Python et cybersécurité, ainsi que des bachelors et mastères IA. Aucune de ces offres n'a le commerce en ligne pour objet. L'éclatement aurait produit une dizaine de fiches immédiatement candidates à la sortie pour ce même motif.",
  },
  {
    id: 87,
    motif:
      "Hors périmètre e-commerce. Le Wagon vend des bootcamps de développement web et de data. Le e-commerce n'y est pas l'objet du parcours.",
  },
  {
    id: 160,
    motif:
      "Hors périmètre e-commerce. Ce que dixmilleheures vend est réel et borné — Airtable, Notion, Webflow, Bubble, un programme « lancer un site, le monétiser et le revendre » — mais relève de l'outillage no-code, pas du commerce en ligne. Ses trois pages e-commerce sont des comparatifs : leurs intitulés relevés sur la page sont « Les 8 meilleures formations Dropshipping », « Les 8 meilleures formations Google Ads », « Les 7 meilleures formations Shopify ». Le motif « média de comparatifs » viserait ses articles et non son offre : il serait inexact.",
  },
  {
    id: 134,
    motif:
      "Hors périmètre e-commerce. Marketing Mania vend trois produits réels, bornés et achetables, chacun avec sa page : croissance YouTube, copywriting professionnel avec certification, méthode 90 jours. Aucun ne porte sur le e-commerce. Ce motif ne dit rien de la qualité de l'offre — c'est le même que celui de Business Mentorat, « programme entrepreneurial généraliste, hors périmètre e-commerce ».",
  },
];

const ecrire = process.argv.includes("--ecrire");
const catalogue = JSON.parse(readFileSync(CATALOGUE, "utf8")) as Record<string, unknown>[];
const journal = JSON.parse(readFileSync(JOURNAL, "utf8")) as Record<string, unknown>[];
const parId = new Map(catalogue.map((o) => [o["id"] as number, o]));

let prochainId = Math.max(...catalogue.map((o) => o["id"] as number)) + 1;
const nouvelles: Record<string, unknown>[] = [];
const aRetirer: { id: number; type: string; motif: string }[] = [];

console.log(`\nTraitement des fiches-familles isolées\n`);

for (const { parent, enfants } of ECLATEMENTS) {
  const p = parId.get(parent);
  // Idempotence : une fiche déjà traitée n'est ni retraitée ni rejournalisée.
  if (!p) continue;
  console.log(`  ÉCLATEMENT #${parent} ${p["organisme"]} → ${enfants.length} fiches`);
  for (const e of enfants) {
    console.log(`      #${prochainId} « ${e.nom} »`);
    nouvelles.push({
      id: prochainId++,
      nom: e.nom,
      organisme: p["organisme"],
      categorieLibelle: p["categorieLibelle"],
      sousFamille: p["sousFamille"] ?? null,
      region: p["region"] ?? null,
      url: p["url"],
      /*
        TOUT LE RESTE EST NUL, ET C'EST HONNÊTE. Seuls l'intitulé et l'adresse
        ont été constatés — sur la page, pas déduits. Reprendre les champs de la
        fiche parente peuplerait ces fiches de valeurs vraies d'aucun cours,
        c'est-à-dire exactement ce qui a motivé son éclatement.
      */
      prix: null, duree: null, volumeHoraire: null, formats: null,
      niveauLibelle: null, prerequis: null, cpf: null, financements: null,
      certification: null, outils: null, programme: null, nonCouvert: null,
      dateVerification: LE,
      source: "Page de la formation sur le site de l'organisme",
      domaineDeclareLibelle: null,
      competencesDeclarees: [],
      classificationManuelle: false,
      modaliteAcces: null,
      // La page a été ouverte et son intitulé relevé, rien de plus : la
      // profondeur reste « catalogue seul » tant que ses champs ne sont pas lus.
      profondeur: "catalogue_seul",
      urlDetail: e.urlDetail,
      historique: [
        { champ: "id", valeurPrecedente: parent, le: LE,
          motif: `Issue de l'éclatement de la fiche ${parent} « ${p["nom"]} », qui nommait une famille. Intitulé relevé sur ${e.urlDetail}.` },
      ],
    });
  }
  aRetirer.push({
    id: parent,
    type: "eclatement",
    motif: `Fiche éclatée en ${enfants.length} parcours, chacun avec sa page produit et son intitulé propre : ${enfants.map((e) => e.nom).join(" · ")}. L'intitulé « ${p["nom"]} » recouvrait ces offres vendues séparément ; aucun prix, aucune durée et aucun programme uniques ne pouvaient en être vrais. Le catalogue ne perd rien.`,
  });
}

for (const r of RETRAITS) if (parId.has(r.id)) aRetirer.push({ ...r, type: "retrait" });
for (const h of HORS_PERIMETRE) if (parId.has(h.id)) aRetirer.push({ ...h, type: "hors_perimetre" });

for (const r of aRetirer.filter((x) => x.type !== "eclatement")) {
  const o = parId.get(r.id);
  console.log(`  ${r.type.toUpperCase().padEnd(15)} #${r.id} ${o?.["organisme"] ?? "?"} — ${o?.["nom"] ?? "?"}`);
}

const ids = new Set(aRetirer.map((r) => r.id));
const restant = [...catalogue.filter((o) => !ids.has(o["id"] as number)), ...nouvelles].sort(
  (a, b) => (a["id"] as number) - (b["id"] as number),
);

for (const r of aRetirer) {
  const o = parId.get(r.id);
  if (!o) continue;
  journal.push({ id: r.id, organisme: String(o["organisme"]), nom: String(o["nom"]), le: LE, type: r.type, motif: r.motif });
}

console.log(`\n  Catalogue : ${catalogue.length} → ${restant.length}  (${aRetirer.length} sorties, ${nouvelles.length} entrées)`);
console.log(`  Journal public : ${journal.length} entrées`);

if (!ecrire) {
  console.log(`\n  (à blanc — relancer avec --ecrire)\n`);
} else {
  writeFileSync(CATALOGUE, JSON.stringify(restant, null, 1));
  writeFileSync(JOURNAL, JSON.stringify(journal, null, 1));
  console.log(`\n  → ${CATALOGUE}\n  → ${JOURNAL}\n`);
}
