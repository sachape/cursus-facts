/**
 * Transformation des 19 fiches retirées en ressources gratuites.
 *
 * `bun run ressources:transformer`            à blanc
 * `bun run ressources:transformer -- --ecrire` applique
 *
 * ON NE RECRÉE RIEN, ON TRANSFORME. La source est `ressources-ecartees.json`,
 * c'est-à-dire la fiche COMPLÈTE de chaque « Academy » telle qu'elle existait
 * au catalogue le jour de son retrait. Ressaisir ces dix-neuf ressources à la
 * main perdrait leur date de vérification, leur programme et leur historique —
 * et surtout, cela couperait le lien entre ce qui a été retiré et ce qui
 * réapparaît. Le retrait est une étape du parcours de la donnée, pas un effacement.
 *
 * LE RATTACHEMENT AUX SUJETS EST FAIT À LA MAIN, et c'est la seule partie de ce
 * fichier qui ne se déduit pas. Il a été soumis et validé avant application le
 * 16 août 2026. Les sujets sont pris dans le vocabulaire fermé du catalogue —
 * 22 sujets-outils et 9 généralistes — sans qu'AUCUN terme n'y soit ajouté :
 * le vocabulaire décrit le catalogue de formations, pas les outils du marché.
 * WiziShop, Wix et Salesforce restent donc sur un sujet générique. Le jour où
 * une formation payante portera sur WiziShop, le sujet naîtra de ce côté-là.
 *
 * ADRESSE ET LANGUE VIENNENT DE `ressources-verification.json`, produit par
 * `verifier-ressources.ts`. Elles ne sont pas décidées ici.
 */
import { writeFileSync } from "node:fs";
import { SUJETS } from "../src/modele/vocabulaires";
import { TYPES_RESSOURCE, type TypeRessource } from "../src/modele/ressources";

const SOURCE = "src/donnees/ressources-ecartees.json";
const VERIFICATION = "src/donnees/ressources-verification.json";
const SORTIE = "src/donnees/ressources.json";

/**
 * Le rattachement, ligne à ligne.
 *
 * `description` tient en une phrase et décrit CE QUE LA RESSOURCE COUVRE, sans
 * appréciation : ni « excellent », ni « incontournable », ni « pour débuter
 * avant d'investir ». Elle est écrite depuis le programme déjà collecté.
 */
const TABLE: Record<number, { type: TypeRessource; sujets: string[]; description: string }> = {
  114: {
    type: "plateforme_editeur",
    sujets: ["Google Ads", "Référencement naturel", "Analytics"],
    description:
      "Modules de Google sur les principes du marketing numérique, le référencement naturel, la publicité sur les moteurs et l'analyse des données.",
  },
  117: {
    type: "plateforme_editeur",
    sujets: ["PrestaShop", "Création de boutique"],
    description:
      "Cours de l'éditeur sur l'installation et la configuration de PrestaShop, la gestion du catalogue et des commandes, les modules et le référencement.",
  },
  118: {
    type: "plateforme_editeur",
    sujets: ["Création de boutique"],
    description:
      "Ressources d'apprentissage de l'éditeur WiziShop sur la création et la gestion d'une boutique en ligne ; le programme n'est pas publié.",
  },
  120: {
    type: "plateforme_editeur",
    sujets: ["Klaviyo", "Email Marketing"],
    description:
      "Cours de l'éditeur sur les fondamentaux de l'email marketing, la segmentation, les flux automatisés et la mesure de la performance.",
  },
  122: {
    type: "plateforme_editeur",
    sujets: ["TikTok Ads", "Acquisition payante"],
    description:
      "Ressources de TikTok sur la création de campagnes, les formats créatifs, le ciblage et la mesure dans TikTok Ads Manager.",
  },
  161: {
    type: "plateforme_editeur",
    sujets: ["Brevo", "Email Marketing"],
    description:
      "Cours de l'éditeur sur l'email marketing, l'automatisation, les campagnes SMS et le CRM.",
  },
  162: {
    type: "plateforme_editeur",
    sujets: ["Email Marketing"],
    description:
      "Cours de l'éditeur sur les campagnes email, les automatisations, la segmentation et l'analyse des résultats.",
  },
  163: {
    type: "plateforme_editeur",
    sujets: ["Pinterest Ads", "Acquisition payante"],
    description:
      "Ressources de Pinterest sur les fondamentaux de la plateforme, les formats publicitaires, le ciblage et la mesure.",
  },
  164: {
    type: "plateforme_editeur",
    sujets: ["SEO e-commerce", "Référencement naturel"],
    description:
      "Cours de l'éditeur sur le SEO technique, la recherche de mots-clés, l'analyse concurrentielle et le content marketing.",
  },
  165: {
    type: "plateforme_editeur",
    sujets: ["SEO e-commerce", "Référencement naturel"],
    description:
      "Cours de l'éditeur sur les fondamentaux du référencement naturel, le netlinking et l'audit de site.",
  },
  166: {
    type: "plateforme_editeur",
    sujets: ["Acquisition payante", "Merchant Center"],
    description:
      "Ressources de Microsoft sur les campagnes search, les campagnes Shopping et l'audience network de Microsoft Advertising.",
  },
  168: {
    type: "plateforme_editeur",
    sujets: ["TikTok Ads", "Marketplace"],
    description:
      "Ressources de TikTok sur la stratégie de contenu, le fonctionnement de l'algorithme, TikTok Shop et la monétisation.",
  },
  169: {
    type: "documentation",
    sujets: ["Etsy", "Vente sur marketplaces"],
    description:
      "Documentation d'Etsy sur l'ouverture d'une boutique, les fiches produits et le référencement interne, l'expédition et la publicité sur la plateforme.",
  },
  170: {
    type: "certification_gratuite",
    sujets: ["Shopify", "Création de boutique"],
    description:
      "Cours et certification de Shopify sur l'écosystème partenaire, les thèmes, les applications et l'accompagnement des marchands.",
  },
  171: {
    type: "plateforme_editeur",
    sujets: ["Création de boutique"],
    description:
      "Ressources de Wix sur la création d'un site, l'ouverture d'une boutique en ligne et le référencement.",
  },
  174: {
    type: "plateforme_editeur",
    sujets: ["E-commerce généraliste"],
    description:
      "Parcours Trailhead de Salesforce sur les fondamentaux de Commerce Cloud, le parcours client et la personnalisation.",
  },
  175: {
    type: "plateforme_editeur",
    sujets: ["Email et relation client"],
    description:
      "Ressources de Zendesk sur le support client, l'automatisation des réponses et la mesure de la satisfaction.",
  },
  177: {
    type: "certification_gratuite",
    sujets: ["Klaviyo", "Email Marketing"],
    description:
      "Certifications de Klaviyo sur les flux avancés, la segmentation prédictive et le reporting.",
  },
  178: {
    type: "plateforme_editeur",
    sujets: ["CRO", "Analytics"],
    description:
      "Cours de l'éditeur sur les heatmaps et les enregistrements de session, les sondages utilisateurs et l'optimisation du taux de conversion.",
  },
};

type Ecartee = { id: number; nom: string; organisme: string; url: string; dateVerification: string };
type Verif = { id: number; urlRetenue: string; correspond: boolean; langue: string | null };

async function main() {
  const ecartees = JSON.parse(await Bun.file(SOURCE).text()) as Ecartee[];
  const verifs = new Map(
    (JSON.parse(await Bun.file(VERIFICATION).text()) as Verif[]).map((v) => [v.id, v]),
  );

  /*
    LE RATTACHEMENT DOIT COUVRIR EXACTEMENT LA SOURCE. Une ressource sans entrée
    dans la table serait publiée sans sujet, donc invisible sur une page groupée
    par sujet — elle disparaîtrait sans que rien ne le signale. Une entrée sans
    ressource serait un rattachement mort. Les deux sont des erreurs, pas des
    avertissements.
  */
  const manquantes = ecartees.filter((e) => !(e.id in TABLE)).map((e) => e.id);
  const orphelines = Object.keys(TABLE).map(Number).filter((id) => !ecartees.some((e) => e.id === id));
  if (manquantes.length > 0) throw new Error(`Sans rattachement : ${manquantes.join(", ")}`);
  if (orphelines.length > 0) throw new Error(`Rattachement sans ressource : ${orphelines.join(", ")}`);

  const ressources = ecartees.map((e) => {
    const t = TABLE[e.id]!;
    const v = verifs.get(e.id);
    const inconnus = t.sujets.filter((s) => !SUJETS.includes(s));
    if (inconnus.length > 0) throw new Error(`#${e.id} : sujet hors vocabulaire — ${inconnus.join(", ")}`);
    if (!TYPES_RESSOURCE.includes(t.type)) throw new Error(`#${e.id} : type hors vocabulaire — ${t.type}`);
    return {
      id: e.id,
      nom: e.nom,
      editeurOuAuteur: e.organisme,
      type: t.type,
      sujets: t.sujets,
      // Sans adresse précise, la langue reste non établie — voir `ressources.ts`.
      langue: v?.correspond ? v.langue : null,
      url: v?.urlRetenue ?? `https://${e.url}`,
      description: t.description,
      verifieeLe: e.dateVerification,
    };
  });

  console.log(`\nTransformation — ${ressources.length} ressources\n`);
  for (const r of ressources) {
    console.log(`  #${String(r.id).padStart(3)} ${r.nom.slice(0, 34).padEnd(34)} ${r.type.padEnd(22)} ${(r.langue ?? "—").padEnd(3)} ${r.sujets.join(" · ")}`);
  }

  const parType = new Map<string, number>();
  for (const r of ressources) parType.set(r.type, (parType.get(r.type) ?? 0) + 1);
  console.log("\n  PAR TYPE");
  for (const t of TYPES_RESSOURCE) console.log(`      ${String(parType.get(t) ?? 0).padStart(2)}  ${t}`);

  const sujets = new Map<string, number>();
  for (const r of ressources) for (const s of r.sujets) sujets.set(s, (sujets.get(s) ?? 0) + 1);
  console.log(`\n  ${sujets.size} SUJETS COUVERTS`);
  for (const [s, n] of [...sujets].sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(2)}  ${s}`);

  if (!process.argv.includes("--ecrire")) {
    console.log("\n  (à blanc — relancer avec --ecrire)\n");
    return;
  }
  writeFileSync(SORTIE, JSON.stringify(ressources, null, 1));
  console.log(`\n  → ${SORTIE}\n`);
}

main();
