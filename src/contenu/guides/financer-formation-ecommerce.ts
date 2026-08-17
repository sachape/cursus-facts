/**
 * Comment financer sa formation e-commerce.
 *
 * Requête à très forte intention : quelqu'un qui cherche à financer a déjà
 * décidé de se former.
 *
 * CE GUIDE TOUCHE À DE LA RÉGLEMENTATION QUI ÉVOLUE. Chaque affirmation
 * réglementaire porte une source officielle, et la date de mise à jour est
 * affichée en évidence — un montant de droits ou une règle d'éligibilité change
 * par décret, et un guide qui affirme sans dater devient faux sans prévenir.
 * Aucune somme n'est reprise ici : elles sont sur les sites officiels, qui
 * seuls font foi.
 */
import { fiches, type Guide } from "./format";

export const guide: Guide = {
  slug: "financer-formation-ecommerce",
  titre: "Comment financer sa formation e-commerce",
  titreMeta: "Comment financer sa formation e-commerce | Formlist",
  description:
    "CPF, opérateur de compétences, France Travail, alternance, autofinancement : ce que chaque dispositif couvre, pour qui, et comment vérifier qu'une formation y est réellement éligible.",
  chapo:
    "Cinq dispositifs, des conditions distinctes, et une vérification à faire dans tous les cas. Ce guide décrit ce que chacun couvre et renvoie aux sources officielles, qui seules font foi.",
  misAJourLe: "2026-08-13",

  sections: [
    {
      ancre: "cpf",
      titre: "Le CPF, ce qu'il couvre et ce qu'il ne couvre pas",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "Le compte personnel de formation crédite des droits en euros, mobilisables directement par la personne, sans accord de l'employeur lorsque la formation se déroule hors temps de travail. C'est le dispositif le plus autonome, et le plus mal compris.",
        },
        {
          type: "paragraphe",
          texte:
            "Une condition est structurante : seules les formations menant à une certification enregistrée au Répertoire national des certifications professionnelles ou au Répertoire spécifique sont éligibles. Une formation excellente mais non enregistrée ne l'est pas, et l'inverse est vrai aussi — l'enregistrement atteste d'un processus, pas d'une pédagogie.",
        },
        {
          type: "paragraphe",
          texte:
            "Le solde couvre rarement l'intégralité d'un parcours long. Le reste à charge se règle alors directement, et une participation forfaitaire s'applique depuis 2024 à la plupart des dossiers.",
        },
        {
          type: "donnees",
          titre: "Éligibilité CPF dans le catalogue",
          lignes: (c) => [
            { libelle: "Parcours déclarés éligibles", valeur: String(c.eligiblesCpf) },
            {
              libelle: "Éligibilité non tranchée",
              valeur: String(c.cpfNonTranche),
              precision: "l'information n'a pas été vérifiée à la source",
            },
            {
              libelle: "Parcours portant un code enregistré",
              valeur: String(c.certifiants),
              precision: "condition nécessaire, pas suffisante",
            },
          ],
          sortie: { libelle: "Voir les parcours éligibles au CPF", to: "/catalogue", search: { cpf: "1" } },
        },
        {
          type: "paragraphe",
          texte:
            "Une éligibilité non tranchée n'est pas une non-éligibilité : c'est une information que nous n'avons pas encore vérifiée. Le catalogue ne la déduit pas, et le seul endroit qui fait foi reste le site officiel du dispositif.",
        },
        {
          type: "sources",
          items: [
            {
              libelle: "Mon Compte Formation — service officiel",
              href: "https://www.moncompteformation.gouv.fr/",
            },
            {
              libelle: "Service-public.fr — compte personnel de formation",
              href: "https://www.service-public.fr/particuliers/vosdroits/F10705",
            },
          ],
        },
      ],
    },

    {
      ancre: "opco",
      titre: "L'opérateur de compétences, quand on est salarié",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "Un salarié dont la formation sert son poste relève du plan de développement des compétences de son employeur. Le financement passe alors par l'opérateur de compétences de la branche, et la demande est portée par l'entreprise, pas par la personne.",
        },
        {
          type: "paragraphe",
          texte:
            "L'intérêt de cette voie est qu'elle ne consomme aucun droit personnel et n'exige pas de certification enregistrée : une formation courte sur un outil précis peut être prise en charge alors qu'elle serait hors CPF. Sa limite est qu'elle suppose un accord, et donc une formation dont l'employeur reconnaît l'utilité.",
        },
        {
          type: "donnees",
          titre: "Financements publiés par les organismes",
          lignes: (c) => [
            {
              libelle: "Parcours déclarant au moins un financement",
              valeur: String(c.financementPublie),
              precision: "OPCO, France Travail, région, alternance",
            },
          ],
          sortie: { libelle: "Voir les parcours financés par l'entreprise", to: "/catalogue", search: { entreprise: "1" } },
        },
        {
          type: "sources",
          items: [
            {
              libelle: "Ministère du Travail — les opérateurs de compétences",
              href: "https://travail-emploi.gouv.fr/les-operateurs-de-competences-opco",
            },
          ],
        },
      ],
    },

    {
      ancre: "france-travail",
      titre: "France Travail et l'aide individuelle à la formation",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "Un demandeur d'emploi dispose d'une voie distincte. L'aide individuelle à la formation complète un financement insuffisant, sur validation du conseiller et à condition que la formation s'inscrive dans un projet de retour à l'emploi formalisé.",
        },
        {
          type: "paragraphe",
          texte:
            "La demande précède l'inscription : une formation déjà commencée, ou payée, ne peut plus être prise en charge. C'est l'erreur la plus fréquente, et elle est irréversible. Les préparations opérationnelles à l'emploi relèvent d'une logique voisine, avec un employeur identifié en amont.",
        },
        {
          type: "sources",
          items: [
            {
              libelle: "France Travail — aides à la formation",
              href: "https://www.francetravail.fr/candidat/en-formation/mes-aides-financieres.html",
            },
          ],
        },
      ],
    },

    {
      ancre: "alternance",
      titre: "L'alternance : apprentissage et professionnalisation",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "En alternance, la question du financement ne se pose pas dans les mêmes termes : l'alternant ne paie pas sa formation. Le coût est porté par l'employeur et l'opérateur de compétences, et la personne perçoit une rémunération.",
        },
        {
          type: "paragraphe",
          texte:
            "Le contrat d'apprentissage vise une certification enregistrée et s'adresse principalement aux moins de trente ans, avec des exceptions. Le contrat de professionnalisation est ouvert plus largement et vise l'adaptation à un poste. Dans les deux cas, la difficulté n'est pas financière : c'est de trouver l'entreprise. Sans contrat signé, le parcours n'existe pas.",
        },
        {
          type: "donnees",
          titre: "Parcours disponibles en alternance",
          lignes: (c) => [
            {
              libelle: "Disponibles en alternance",
              valeur: String(c.alternance),
              precision: "coût nul pour l'alternant, sous réserve d'un contrat",
            },
          ],
          sortie: { libelle: "Voir les parcours en alternance", to: "/catalogue", search: { format: "alternance" } },
        },
        {
          type: "sources",
          items: [
            {
              libelle: "Service-public.fr — contrat d'apprentissage",
              href: "https://www.service-public.fr/particuliers/vosdroits/F2918",
            },
            {
              libelle: "Service-public.fr — contrat de professionnalisation",
              href: "https://www.service-public.fr/particuliers/vosdroits/F15478",
            },
          ],
        },
      ],
    },

    {
      ancre: "autofinancement",
      titre: "Autofinancement et paiement échelonné",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "Financer soi-même reste la voie la plus rapide, et la seule qui ne dépende de personne. La plupart des organismes proposent un échelonnement, dont les conditions ne figurent presque jamais sur la page de vente : c'est une question à poser, pas une information à chercher.",
        },
        {
          type: "paragraphe",
          texte:
            "Deux points méritent d'être vérifiés avant de s'engager : ce que couvre exactement le montant — passage de certification compris ou non —, et les conditions de rétractation. Un organisme qui ne répond pas clairement à ces deux questions répond déjà à une troisième.",
        },
        {
          type: "sortie",
          sortie: { libelle: "Comparer les prix relevés", to: "/catalogue", search: { prixPublie: "1" } },
        },
      ],
    },

    {
      ancre: "verifier",
      titre: "Vérifier qu'une formation est réellement éligible",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "Une mention « éligible CPF » sur une page commerciale n'est pas une preuve. La vérification tient en trois gestes, et aucun ne passe par l'organisme.",
        },
        {
          type: "liste",
          items: [
            "Chercher le code de certification sur le site de France Compétences : il doit exister, être actif, et porter l'intitulé annoncé.",
            "Vérifier que l'organisme est bien le certificateur ou un partenaire habilité pour cette certification — un code valide ne vaut pas pour n'importe quel organisme.",
            "Retrouver la session sur le service officiel du dispositif : une formation éligible y est réservable directement.",
          ],
        },
        {
          type: "paragraphe",
          texte: (c) =>
            `Le catalogue relève le code enregistré quand l'organisme le publie : ${fiches(c.certifiants)} en portent un. Cette information est reprise telle quelle, elle ne vaut pas vérification d'éligibilité — c'est le rôle des services officiels ci-dessous.`,
        },
        {
          type: "sources",
          items: [
            {
              libelle: "France Compétences — répertoires officiels",
              href: "https://www.francecompetences.fr/recherche_certificationprofessionnelle/",
            },
            {
              libelle: "Mon Compte Formation — recherche de sessions",
              href: "https://www.moncompteformation.gouv.fr/",
            },
          ],
        },
      ],
    },
  ],

  faq: [
    {
      question: "Toutes les formations e-commerce sont-elles éligibles au CPF ?",
      reponse: (c) =>
        `Non. Seules celles qui mènent à une certification enregistrée le sont. Dans le catalogue, ${c.eligiblesCpf} parcours sont déclarés éligibles, et l'information n'est pas tranchée pour ${c.cpfNonTranche} autres.`,
    },
    {
      question: "Peut-on cumuler plusieurs financements ?",
      reponse:
        "Oui dans la plupart des cas : un solde CPF insuffisant peut être complété par une aide de France Travail ou par un reste à charge personnel. Les règles de cumul dépendent du dispositif et de la situation, et se vérifient auprès de l'organisme financeur.",
    },
    {
      question: "Faut-il l'accord de son employeur ?",
      reponse:
        "Pas pour une formation suivie hors temps de travail et financée par le CPF. L'accord devient nécessaire dès que la formation se déroule sur le temps de travail, ou qu'elle passe par le plan de développement des compétences.",
    },
    {
      question: "Que se passe-t-il si le financement est refusé après l'inscription ?",
      reponse:
        "Les conditions varient d'un organisme à l'autre et figurent au contrat de formation. C'est la raison pour laquelle une demande de financement se dépose avant l'inscription, et non après.",
    },
    {
      question: "Un demandeur d'emploi paie-t-il sa formation ?",
      reponse:
        "Pas nécessairement. Le CPF reste mobilisable, et l'aide individuelle à la formation peut compléter un reste à charge, sur validation du conseiller et avant le début de la formation.",
    },
  ],
};
