/**
 * Combien coûte une formation e-commerce en France.
 *
 * LE GUIDE LE PLUS STRATÉGIQUE, et le seul que nous soyons légitimes à écrire :
 * la question a du volume, une forte intention, et la réponse suppose d'avoir
 * relevé les prix un par un. Les contenus d'affiliés annoncent des fourchettes
 * qu'aucune source ne soutient ; ici chaque montant est calculé à la lecture
 * sur les fiches du catalogue, avec sa date de calcul et le lien vers ce qui le
 * compose.
 */
import { euros, fiches, type Guide } from "./format";

export const guide: Guide = {
  slug: "combien-coute-formation-ecommerce",
  titre: "Combien coûte une formation e-commerce en France",
  titreMeta: "Combien coûte une formation e-commerce en France | Formlist",
  description:
    "Les prix relevés un par un sur les formations e-commerce françaises : fourchette réelle, écarts par catégorie, ce que « gratuit » recouvre, et pourquoi tant d'organismes ne publient pas leur tarif.",
  chapo:
    "Il n'existe pas un prix, mais plusieurs façons de tarifer la même chose — et une part importante du marché ne publie rien. Ce guide décrit ce que le catalogue mesure, et ce qu'il ne peut pas mesurer.",
  misAJourLe: "2026-08-13",

  sections: [
    {
      ancre: "fourchette",
      titre: "La fourchette réelle du catalogue",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "Un prix de formation ne se compare que s'il désigne la même chose. Le montant retenu ici est toujours celui qu'une personne débourse pour s'inscrire elle-même — pas le budget d'une entreprise qui fait venir un formateur, pas un tarif journalier multiplié par une durée supposée.",
        },
        {
          type: "paragraphe",
          texte: (c) =>
            `Parmi les parcours payants, l'écart va de ${euros(c.prixMinPayant)} à ${euros(c.prixMaxPayant)}, et la médiane se situe à ${euros(c.medianePayant)} : la moitié d'entre eux coûte moins que cela.`,
        },
        {
          type: "donnees",
          titre: "Tarifs individuels relevés, parcours payants",
          lignes: (c) => [
            { libelle: "Tarif le plus bas", valeur: euros(c.prixMinPayant) },
            { libelle: "Médiane", valeur: euros(c.medianePayant) },
            { libelle: "Tarif le plus haut", valeur: euros(c.prixMaxPayant) },
            {
              libelle: "Parcours dont le prix est établi",
              valeur: `${c.prixEtabli} sur ${c.parcours}`,
              precision: `${c.partPrixEtabli} % du catalogue, dont ${c.prixNul} sans frais`,
            },
          ],
          sortie: { libelle: "Voir les parcours dont le prix est publié", to: "/", search: { prixPublie: "1" } },
        },
        {
          type: "paragraphe",
          texte: (c) =>
            `Les parcours sans frais pour l'apprenant sont écartés de cette fourchette, et pas par commodité : la gratuité n'est pas un petit prix, c'est une autre situation, traitée plus bas. Les inclure ferait tomber la médiane à zéro — un chiffre exact et sans usage, puisque rien ne coûte moins que cela. Ils sont ${c.prixNul} dans ce cas.`,
        },
        {
          type: "paragraphe",
          texte:
            "Une médiane n'est pas non plus un prix conseillé, et ne dit rien de ce qui se vend. Elle situe le milieu de ce qui est publié : la moitié des tarifs en dessous, la moitié au-dessus.",
        },
        {
          type: "paragraphe",
          texte: (c) =>
            c.moinsChere === null || c.plusChere === null
              ? "Les extrêmes du catalogue s'observent directement dans l'explorateur, triés par prix croissant."
              : `Les deux extrémités payantes sont, à cette date, ${c.moinsChere.nom} chez ${c.moinsChere.organisme} à ${euros(c.moinsChere.prix)}, et ${c.plusChere.nom} chez ${c.plusChere.organisme} à ${euros(c.plusChere.prix)}. Elles sont citées parce qu'elles bornent la mesure, pas parce qu'elles seraient remarquables.`,
        },
      ],
    },

    {
      ancre: "categories",
      titre: "Les écarts par catégorie d'organisme",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "L'écart le plus large n'est pas entre deux formations, il est entre deux natures d'organisme. Une académie d'éditeur logiciel et un mastère d'école de commerce ne vendent pas le même objet : l'une documente son propre produit, l'autre délivre un diplôme sur plusieurs semestres. Les comparer par le prix seul n'apprend rien.",
        },
        {
          type: "donnees",
          titre: "Médiane du tarif individuel, par catégorie",
          lignes: (c) =>
            c.parCategorie.map((ligne) => ({
              libelle: ligne.libelle,
              valeur: euros(ligne.mediane),
              precision: `${ligne.payants} tarifs payants relevés sur ${ligne.nombre}, et ${ligne.gratuits} sans frais`,
            })),
          sortie: { libelle: "Comparer les parcours par catégorie", to: "/" },
        },
        {
          type: "paragraphe",
          texte:
            "Une médiane calculée sur peu de tarifs reste fragile : elle décrit les organismes de la catégorie qui publient, pas la catégorie. Le nombre de tarifs qui la composent est affiché à côté pour cette raison, avec le nombre de parcours sans frais — dans certaines catégories, c'est le cas dominant.",
        },
      ],
    },

    {
      ancre: "prix-absent",
      titre: "Pourquoi une part du marché ne publie pas son tarif",
      blocs: [
        {
          type: "paragraphe",
          texte: (c) =>
            `${fiches(c.prixNonEtabli)} sur ${c.parcours} n'ont pas de prix établi, soit ${c.partPrixNonEtabli} % du catalogue. Ce n'est pas un défaut de collecte : dans la plupart des cas, la page de l'organisme a été lue et ne porte aucun montant.`,
        },
        {
          type: "liste",
          items: [
            "Le tarif est communiqué sur devis, après un échange commercial. C'est l'usage dominant en formation professionnelle continue.",
            "Le parcours n'est vendu qu'aux entreprises, et son tarif est celui d'un groupe entier.",
            "Le montant dépend d'un financement à instruire, et l'organisme préfère annoncer un reste à charge qu'il ne connaît pas encore.",
            "La page consultée est une page catalogue et non une page de parcours : elle ne porte le prix d'aucun cours en particulier.",
          ],
        },
        {
          type: "paragraphe",
          texte:
            "Un prix absent n'est donc pas un prix élevé, et ne doit pas se lire comme tel. C'est la raison pour laquelle une fiche sans montant reste visible quel que soit le filtre de budget posé : ne pas publier son prix ne doit ni profiter à l'organisme, ni lui nuire.",
        },
        {
          type: "sortie",
          sortie: {
            libelle: "La règle, dans la page Méthode",
            to: "/methode",
            hash: "invariants",
          },
        },
      ],
    },

    {
      ancre: "gratuit",
      titre: "Ce que « gratuit » recouvre réellement",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "« Gratuit » est le mot le moins fiable du marché. Il désigne aussi bien un contenu ouvert à tous qu'un parcours dont la certification se paie, ou un cursus dont le coût est simplement porté par un tiers. Écrire un zéro dans une case efface cette différence, alors que c'est elle qui décide.",
        },
        {
          type: "paragraphe",
          texte: (c) =>
            `Le catalogue distingue donc ${c.etatsModalite} états : ${c.parModalite.length} modalités d'accès déclarées, plus le cas où la gratuité n'a pas pu être vérifiée sur le site de l'organisme. Dans ce dernier cas, le prix reste « non communiqué » — la gratuité ne s'affirme jamais par défaut.`,
        },
        {
          type: "donnees",
          titre: "Répartition des modalités d'accès",
          lignes: (c) => [
            ...c.parModalite.map((ligne) => ({
              libelle: ligne.libelle,
              valeur: String(ligne.nombre),
            })),
            {
              libelle: "Modalité non qualifiée",
              valeur: String(c.modaliteNonQualifiee),
              precision: "le prix reste « non communiqué »",
            },
          ],
          sortie: { libelle: "Voir les parcours sans frais pour l'apprenant", to: "/", search: { sansFrais: "1" } },
        },
        {
          type: "paragraphe",
          texte:
            "La question utile n'est pas « est-ce gratuit », mais « qu'est-ce qui est gratuit, et sous quelle condition ». Un contenu libre à suivre dont l'attestation se paie n'a pas le même coût réel qu'un accès sans condition.",
        },
      ],
    },

    {
      ancre: "cout-apprenant",
      titre: "Le coût pour l'apprenant contre le coût du parcours",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "Ce sont deux montants différents, et la confusion entre les deux est la plus coûteuse du marché. Le coût du parcours est ce que la formation vaut ; le coût pour l'apprenant est ce qu'il sort de sa poche. Un tiers — entreprise, opérateur de compétences, région — peut prendre le second à sa charge sans que le premier change.",
        },
        {
          type: "paragraphe",
          texte:
            "L'alternance est le cas où l'écart est le plus net : l'alternant ne paie pas sa formation, financée par l'employeur et l'opérateur de compétences. Son coût pour l'apprenant est nul, celui du parcours ne l'est pas du tout. C'est un coût nul sous condition — encore faut-il signer un contrat, ce qui est souvent plus difficile que payer.",
        },
        {
          type: "donnees",
          titre: "Parcours dont le coût pour l'apprenant peut être nul",
          lignes: (c) => [
            { libelle: "Sans frais pour l'apprenant", valeur: String(c.sansFrais) },
            { libelle: "Accès partiel gratuit", valeur: String(c.accesPartiel) },
            {
              libelle: "Disponibles en alternance",
              valeur: String(c.alternance),
              precision: "sous réserve de signer un contrat",
            },
          ],
          sortie: { libelle: "Voir les parcours en alternance", to: "/", search: { format: "alternance" } },
        },
        {
          type: "paragraphe",
          texte:
            "Le catalogue affiche toujours le coût pour l'apprenant, accompagné de sa condition. Une valeur sans sa condition serait une demi-information, et c'est celle qui se retourne au moment de payer.",
        },
      ],
    },

    {
      ancre: "inter-intra",
      titre: "Tarifs inter, intra, et le piège du tarif journalier",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "En formation professionnelle, un même intitulé se vend de deux façons. En inter-entreprises, une personne s'inscrit à une session collective et paie sa place. En intra-entreprise, une société fait venir le formateur pour ses équipes et paie le groupe entier — un montant souvent trois à cinq fois supérieur, qui ne s'adresse pas à un particulier.",
        },
        {
          type: "paragraphe",
          texte:
            "Certains organismes publient les deux tarifs sur la même page, sans toujours les distinguer clairement. D'autres n'affichent que l'inter et réservent l'intra au devis. D'autres encore tarifent par format — distanciel, présentiel, tutorat — et affichent un prix journalier qu'il faut multiplier par une durée pour obtenir le coût réel.",
        },
        {
          type: "donnees",
          titre: "Disponibilité commerciale relevée",
          lignes: (c) => [
            {
              libelle: "Inscription individuelle constatée",
              valeur: String(c.interConstate),
            },
            {
              libelle: "Réservés aux entreprises",
              valeur: String(c.intraSeul),
              precision: "aucun tarif individuel : le prix compte comme non connu",
            },
            {
              libelle: "Disponibilité non tranchée",
              valeur: String(c.disponibiliteNonTranchee),
              precision: "la page de détail n'a pas encore été lue",
            },
          ],
          sortie: { libelle: "Voir les parcours accessibles à titre individuel", to: "/", search: { individuel: "1" } },
        },
        {
          type: "paragraphe",
          texte:
            "Un tarif journalier affiché sans le nombre de jours n'est pas un prix, c'est une unité. Avant de comparer deux montants, la première question à poser est celle de leur unité : par personne ou par groupe, pour la session entière ou par journée.",
        },
      ],
    },
  ],

  faq: [
    {
      question: "Quel est le prix moyen d'une formation e-commerce ?",
      reponse: (c) =>
        `Le catalogue ne publie pas de moyenne, qu'un seul mastère à ${euros(c.prixMaxPayant)} suffirait à déplacer. La médiane des tarifs payants est de ${euros(c.medianePayant)}, entre ${euros(c.prixMinPayant)} et ${euros(c.prixMaxPayant)}. À côté, ${c.prixNul} parcours n'entraînent aucun frais pour l'apprenant.`,
    },
    {
      question: "Pourquoi certaines formations n'affichent-elles aucun prix ?",
      reponse: (c) =>
        `${c.partPrixNonEtabli} % des parcours n'ont pas de prix établi. Le plus souvent, l'organisme communique son tarif sur devis, ou ne vend qu'aux entreprises. Ces fiches restent visibles dans le catalogue : ne pas publier son prix ne doit ni profiter ni nuire.`,
    },
    {
      question: "Une formation gratuite vaut-elle quelque chose ?",
      reponse:
        "La question n'a pas de réponse générale, et le catalogue n'évalue aucun organisme. Ce qu'il distingue, c'est la nature de la gratuité : accès libre, compte requis, contenu libre à certification payante, ou coût porté par un tiers. Ce sont des situations différentes, et la mention est toujours affichée avec le montant.",
    },
    {
      question: "Le prix affiché inclut-il la certification ?",
      reponse:
        "Pas nécessairement. Certains organismes publient un contenu libre et facturent l'attestation ou le passage de la certification séparément. Chaque fiche indique la modalité d'accès relevée, qui précise ce que le montant couvre.",
    },
    {
      question: "Comment vérifier un prix relevé ici ?",
      reponse:
        "Chaque fiche porte sa date de vérification et un lien vers la source utilisée. Un écart constaté avec le site de l'organisme peut être signalé : la correction est journalisée et publique.",
    },
  ],
};
