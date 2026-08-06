/**
 * Vocabulaires fermés du modèle Formlist.
 *
 * Toutes les règles de classification sont déterministes et publiées : un
 * organisme mécontent de son classement doit pouvoir contester la règle, pas
 * la décision. Ce fichier est donc la source unique du vocabulaire, et la page
 * Méthode le lit tel quel.
 *
 * ATTENTION — L'ORDRE DE DÉCLARATION EST SIGNIFICATIF.
 * La détermination du domaine et celle du sujet principal retiennent le
 * *premier* motif qui correspond. Réordonner une liste change la classification
 * du catalogue. Toute modification d'ordre doit être traitée comme un
 * changement de règle : publiée, datée, et vérifiée par les tests de parité.
 */
import type { CategorieOrganisme, DomaineParcours } from "@/types/cursus";

/* -------------------------------------------------------------------------- */
/* Domaines — un seul par parcours, parmi neuf                                */
/* -------------------------------------------------------------------------- */

/** Libellés d'affichage des neuf domaines. */
export const LIBELLES_DOMAINES: Record<DomaineParcours, string> = {
  ecommerce: "E-commerce",
  marketplaces: "Marketplaces",
  publicite_payante: "Publicité payante",
  referencement: "Référencement",
  email_crm: "Email et CRM",
  data_conversion: "Data et conversion",
  creation_site: "Création de site",
  marketing_digital: "Marketing digital",
  commerce_vente: "Commerce et vente",
};

/**
 * Motifs de reconnaissance des domaines, dans l'ordre d'évaluation.
 * Le premier motif qui correspond emporte la décision.
 */
export const MOTIFS_DOMAINES: ReadonlyArray<readonly [DomaineParcours, RegExp]> = [
  [
    "ecommerce",
    /e-commerce|ecommerce|boutique en ligne|vente en ligne|commerce électronique|marchand|dropshipping/i,
  ],
  ["marketplaces", /amazon|marketplace|etsy|wholesale|fba|cdiscount/i],
  // « sea » borné : sans limite de mot il attrapait « Seat » et « réseau ».
  ["publicite_payante", /\bads\b|publicit|(?<![\p{L}\p{N}])sea(?![\p{L}\p{N}])|media buy/iu],
  ["referencement", /seo|référencement/i],
  ["email_crm", /email|klaviyo|brevo|mailchimp|crm|fidélisation/i],
  ["data_conversion", /analytics|\bdata\b|conversion|\bcro\b|hotjar|ga4/i],
  [
    "creation_site",
    /shopify|woocommerce|prestashop|wix|magento|site marchand|no-code/i,
  ],
  [
    "marketing_digital",
    /marketing digital|webmarketing|communication digitale|marketing numérique/i,
  ],
  [
    "commerce_vente",
    /commercial|vente|négociation|relation client|distribution|management/i,
  ],
] as const;

/* -------------------------------------------------------------------------- */
/* Compétences — vocabulaire fermé et motifs de détection                     */
/* -------------------------------------------------------------------------- */

/**
 * Les 22 compétences détectables, dans l'ordre de détection.
 *
 * Une compétence n'est retenue que si son motif apparaît dans l'intitulé, les
 * outils publiés ou les modules publiés. Rien n'est supposé au-delà : une
 * formation qui ne publie pas son programme ne se voit attribuer aucune
 * compétence issue du programme.
 */
export const MOTIFS_COMPETENCES: ReadonlyArray<readonly [string, RegExp]> = [
  ["Shopify", /shopify/i],
  ["WooCommerce", /woocommerce/i],
  ["PrestaShop", /prestashop/i],
  ["Amazon FBA", /amazon|fba|wholesale/i],
  ["Etsy", /etsy/i],
  ["Meta Ads", /meta ads|facebook ads|instagram|publicité meta|snapchat/i],
  ["Google Ads", /google ads|(?<![\p{L}\p{N}])sea(?![\p{L}\p{N}])|moteurs de recherche|microsoft advertising/iu],
  ["TikTok Ads", /tiktok/i],
  ["Pinterest Ads", /pinterest/i],
  ["Email Marketing", /email|mailchimp|newsletter|fidélisation/i],
  ["Klaviyo", /klaviyo/i],
  ["Brevo", /brevo/i],
  ["SEO e-commerce", /seo|référencement|search console|semrush|ahrefs/i],
  /*
    `ux` et `sea` sont bornés par des limites de mot compatibles Unicode.
    Sans elles, « ux » attrapait Linux, flux, Bordeaux et luxe ; « sea »
    attrapait Seat et réseau. `\b` ne suffit pas ici : il est ASCII et ne
    délimite pas un mot accentué — même piège que « recommandé » sur le
    vocabulaire interdit de l'assistant.
  */
  ["CRO", /conversion|hotjar|taux de conversion|(?<![\p{L}\p{N}])ux(?![\p{L}\p{N}])|parcours d'achat|tunnel/iu],
  ["Analytics", /analytics|ga4|matomo|données de masse|kpi|indicateurs/i],
  ["Merchant Center", /merchant center|shopping/i],
  ["IA e-commerce", /\bia\b|intelligence artificielle|chatgpt|gemini|mistral/i],
  ["Copywriting", /copywriting|rédaction|contenu|content/i],
  ["Logistique", /logistique|expédition|stock|livraison|retours|supply/i],
  ["Marketplace", /marketplace|place de marché|cdiscount|commerce cloud/i],
  ["Dropshipping", /dropshipping|sourcing|fournisseur/i],
  ["No-code", /no-code|no code|make|zapier|n8n|airtable|wix|sans coder/i],
] as const;

/** Accès indexé aux motifs de compétences. */
export const MOTIF_PAR_COMPETENCE: ReadonlyMap<string, RegExp> = new Map(
  MOTIFS_COMPETENCES.map(([nom, motif]) => [nom, motif]),
);

/** Les 22 compétences, dans l'ordre de détection. */
export const COMPETENCES = MOTIFS_COMPETENCES.map(([nom]) => nom);

/* -------------------------------------------------------------------------- */
/* Sujets — un seul sujet principal, obligatoire                              */
/* -------------------------------------------------------------------------- */

/**
 * Sujets-outils candidats au rôle de sujet principal, dans l'ordre de priorité.
 *
 * Même contenu que `COMPETENCES` mais ordre volontairement différent : Klaviyo
 * et Brevo passent avant Email Marketing, pour qu'une formation nommément
 * consacrée à un outil ne soit pas absorbée par le sujet générique. Cet écart
 * d'ordre est une règle, pas une négligence — ne pas aligner les deux listes.
 */
export const SUJETS_OUTILS: readonly string[] = [
  "Shopify",
  "WooCommerce",
  "PrestaShop",
  "Amazon FBA",
  "Etsy",
  "Meta Ads",
  "Google Ads",
  "TikTok Ads",
  "Pinterest Ads",
  "Klaviyo",
  "Brevo",
  "Email Marketing",
  "SEO e-commerce",
  "CRO",
  "Analytics",
  "Merchant Center",
  "IA e-commerce",
  "Copywriting",
  "Logistique",
  "Marketplace",
  "Dropshipping",
  "No-code",
] as const;

/**
 * Un sujet généraliste par domaine.
 *
 * Ce ne sont pas des pis-aller : 118 parcours sur 195 n'ont aucune compétence
 * dominante — licences pro, masters, bachelors. Sans eux, 60 % du catalogue
 * sortirait du filtre principal, qui est l'entrée de navigation.
 */
export const SUJET_GENERALISTE: Record<DomaineParcours, string> = {
  ecommerce: "E-commerce généraliste",
  marketplaces: "Vente sur marketplaces",
  publicite_payante: "Acquisition payante",
  referencement: "Référencement naturel",
  email_crm: "Email et relation client",
  data_conversion: "Data et performance",
  creation_site: "Création de boutique",
  marketing_digital: "Marketing digital généraliste",
  commerce_vente: "Commerce et vente",
};

/** Le vocabulaire fermé complet des sujets : 22 sujets-outils + 9 généralistes. */
export const SUJETS: readonly string[] = [
  ...SUJETS_OUTILS,
  ...Object.values(SUJET_GENERALISTE),
];

/* -------------------------------------------------------------------------- */
/* Catégories d'organisme                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Les sept catégories d'organisme.
 * Elles évitent qu'un cours à 15 € et un mastère de deux ans se retrouvent
 * dans la même liste.
 */
export const LIBELLES_CATEGORIES: Record<CategorieOrganisme, string> = {
  universite: "Universités",
  ecole: "Écoles",
  bootcamp: "Bootcamps",
  formation_professionnelle: "Formations professionnelles",
  certification_editeur: "Certifications éditeurs",
  mooc_plateforme: "MOOC et plateformes",
  formation_independante: "Formations indépendantes",
};

/**
 * Rattachement des familles d'acteurs aux sept catégories.
 * Conserve le vocabulaire de collecte (« sous-famille ») en entrée, pour que
 * la provenance d'une fiche reste lisible après normalisation.
 */
export const CATEGORIE_PAR_FAMILLE: Record<string, CategorieOrganisme> = {
  "Diplôme d'État": "universite",
  "École de commerce": "ecole",
  "École du digital": "ecole",
  Bootcamp: "bootcamp",
  "Organisme de formation": "formation_professionnelle",
  "Formation continue": "formation_professionnelle",
  Éditeur: "certification_editeur",
  "Plateforme et MOOC": "mooc_plateforme",
  Public: "mooc_plateforme",
  "Créateur indépendant": "formation_independante",
};

/**
 * Catégories dont le domaine par défaut est « Commerce et vente ».
 * Les autres retombent sur « Marketing digital ».
 */
export const CATEGORIES_ACADEMIQUES: readonly CategorieOrganisme[] = [
  "universite",
  "ecole",
] as const;
