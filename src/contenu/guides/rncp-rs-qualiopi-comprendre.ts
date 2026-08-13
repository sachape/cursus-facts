/**
 * RNCP, RS, Qualiopi : ce que ces sigles signifient.
 *
 * Personne ne les explique clairement, tout le monde les rencontre, et le
 * modèle porte déjà ces champs.
 *
 * LA SECTION QUI COMPTE EST LA DERNIÈRE — ce qu'aucun de ces sigles ne
 * garantit. C'est là que ce guide cesse d'être un contenu marketing : un
 * enregistrement atteste d'un processus, jamais d'une qualité pédagogique, et
 * l'écrire est exactement ce qu'un organisme certifié ne fera pas.
 */
import { fiches, type Guide } from "./format";

export const guide: Guide = {
  slug: "rncp-rs-qualiopi-comprendre",
  titre: "RNCP, RS, Qualiopi : ce que ces sigles signifient",
  titreMeta: "RNCP, RS, Qualiopi : ce que ces sigles signifient | Formlist",
  description:
    "Ce que recouvrent le RNCP, le Répertoire spécifique, Qualiopi et le numéro de déclaration d'activité — et surtout ce qu'aucun d'eux ne garantit sur la qualité d'une formation.",
  chapo:
    "Quatre mentions que l'on croise sur presque toutes les pages de formation, rarement expliquées. Elles attestent chacune d'une chose précise, et aucune ne dit ce que la plupart des lecteurs comprennent.",
  misAJourLe: "2026-08-13",

  sections: [
    {
      ancre: "rncp",
      titre: "Le RNCP et les diplômes reconnus par l'État",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "Le Répertoire national des certifications professionnelles recense les certifications qui attestent d'un métier ou d'un ensemble de compétences professionnelles. Une certification qui y figure porte un code, un niveau de qualification, et un ou plusieurs organismes habilités à la délivrer.",
        },
        {
          type: "paragraphe",
          texte:
            "L'enregistrement est accordé pour une durée limitée, sur dossier, et se renouvelle. Un code peut donc être inactif : la certification a existé, elle n'est plus délivrée. C'est un cas fréquent sur les pages qui n'ont pas été mises à jour.",
        },
        {
          type: "paragraphe",
          texte:
            "Le niveau associé décrit la qualification visée, pas la durée ni la difficulté. Deux certifications de même niveau peuvent représenter des engagements très différents.",
        },
      ],
    },

    {
      ancre: "rs",
      titre: "Le Répertoire spécifique et les certifications de compétences",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "Le Répertoire spécifique recense des certifications plus étroites : une compétence complémentaire, une habilitation, la maîtrise d'un outil. Elles ne visent pas un métier entier et ne délivrent pas de niveau de qualification.",
        },
        {
          type: "paragraphe",
          texte:
            "C'est le répertoire le plus pertinent pour le e-commerce, où beaucoup de compétences sont transversales ou liées à un logiciel. Une certification qui y est enregistrée ouvre les mêmes droits au financement qu'une certification du répertoire national, ce que beaucoup ignorent.",
        },
        {
          type: "donnees",
          titre: "Certifications relevées dans le catalogue",
          lignes: (c) => [
            { libelle: "Code du répertoire national", valeur: String(c.rncp) },
            { libelle: "Code du répertoire spécifique", valeur: String(c.rs) },
            {
              libelle: "Certification annoncée sans code",
              valeur: String(c.certificationSansCode),
              precision: "attestation, certification maison, ou code non publié",
            },
            {
              libelle: "Aucune certification",
              valeur: String(c.aucuneCertification),
              precision: "un fait publié, pas une lacune",
            },
          ],
          sortie: { libelle: "Filtrer les parcours certifiants", to: "/" },
        },
        {
          type: "paragraphe",
          texte:
            "Une certification annoncée sans code enregistré n'est pas illégitime : une attestation d'éditeur peut avoir plus de valeur sur le marché qu'un enregistrement obscur. Elle n'ouvre simplement aucun droit au financement.",
        },
      ],
    },

    {
      ancre: "qualiopi",
      titre: "Qualiopi certifie l'organisme, pas la formation",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "C'est la confusion la plus répandue. Qualiopi est une certification de l'organisme prestataire, obligatoire pour accéder aux financements publics et mutualisés. Elle porte sur son fonctionnement : information du public, adaptation des prestations, qualification des intervenants, recueil des appréciations.",
        },
        {
          type: "paragraphe",
          texte:
            "Elle ne dit rien du contenu d'un cours en particulier. Un organisme certifié peut proposer une excellente formation et une médiocre : la certification portait sur ses processus, pas sur son catalogue. Voir le logo sur une page de vente ne renseigne donc pas sur cette page.",
        },
      ],
    },

    {
      ancre: "declaration",
      titre: "Le numéro de déclaration d'activité",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "Tout organisme de formation doit se déclarer auprès de l'administration et reçoit un numéro. C'est une formalité déclarative, pas un agrément : elle établit l'existence légale de l'activité, rien de plus.",
        },
        {
          type: "paragraphe",
          texte:
            "Sa présence sur une page ne constitue donc aucune garantie de qualité. Son absence, en revanche, est un signal : un organisme non déclaré ne peut légalement facturer une action de formation professionnelle.",
        },
      ],
    },

    {
      ancre: "ce-que-ca-ne-garantit-pas",
      titre: "Ce qu'aucun de ces sigles ne garantit",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "C'est le point central de ce guide, et celui que les pages commerciales ne diront pas. Ces quatre mentions attestent d'un processus administratif — un dossier instruit, un audit passé, une déclaration enregistrée. Aucune ne porte sur ce qui décide de la valeur d'une formation.",
        },
        {
          type: "liste",
          items: [
            "Ni la qualité pédagogique : personne n'a évalué le cours, ni assisté à une séance.",
            "Ni l'actualité du contenu : un programme enregistré il y a trois ans peut décrire des outils qui ont changé depuis.",
            "Ni l'insertion professionnelle réelle des personnes formées, au-delà des taux déclarés par l'organisme lui-même.",
            "Ni l'accompagnement : un enregistrement ne dit rien du nombre d'apprenants par formateur, ni du temps de réponse.",
          ],
        },
        {
          type: "paragraphe",
          texte:
            "Ce catalogue ne note aucune formation et n'en classe aucune par qualité, précisément parce qu'aucune source publique ne permet de le faire honnêtement. Ce qu'il publie est vérifiable : un code, sa présence, son absence, et la date à laquelle l'information a été relevée.",
        },
        {
          type: "sortie",
          sortie: { libelle: "Comment ce catalogue est construit", to: "/methode" },
        },
      ],
    },

    {
      ancre: "verifier",
      titre: "Vérifier un code par soi-même",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "La vérification est publique, gratuite et prend une minute. Le moteur de France Compétences accepte un code, un intitulé ou un organisme, et affiche l'état de l'enregistrement, sa date d'échéance et la liste des habilités.",
        },
        {
          type: "liste",
          items: [
            "Le code annoncé existe-t-il, et l'intitulé correspond-il à celui de la page ?",
            "L'enregistrement est-il toujours actif à la date d'aujourd'hui ?",
            "L'organisme qui vend la formation figure-t-il parmi les habilités à délivrer cette certification ?",
          ],
        },
        {
          type: "sources",
          items: [
            {
              libelle: "France Compétences — recherche de certification",
              href: "https://www.francecompetences.fr/recherche_certificationprofessionnelle/",
            },
            {
              libelle: "Ministère du Travail — la certification Qualiopi",
              href: "https://travail-emploi.gouv.fr/la-certification-qualiopi",
            },
          ],
        },
        {
          type: "paragraphe",
          texte: (c) =>
            `Le catalogue publie le code relevé sur la page de l'organisme quand il existe — ${fiches(c.certifiants)} en portent un. Il ne le revérifie pas auprès du répertoire : c'est une information reprise, pas une attestation.`,
        },
      ],
    },
  ],

  faq: [
    {
      question: "Quelle différence entre RNCP et RS ?",
      reponse:
        "Le Répertoire national des certifications professionnelles recense des certifications visant un métier, avec un niveau de qualification. Le Répertoire spécifique recense des compétences plus étroites, sans niveau. Les deux ouvrent des droits au financement.",
    },
    {
      question: "Une formation Qualiopi est-elle de meilleure qualité ?",
      reponse:
        "Qualiopi certifie le fonctionnement de l'organisme, pas le contenu d'une formation. Elle est nécessaire pour accéder aux financements publics et mutualisés, et ne constitue pas une évaluation pédagogique.",
    },
    {
      question: "Une formation sans certification a-t-elle une valeur ?",
      reponse: (c) =>
        `Le catalogue ne se prononce pas sur la valeur d'une formation. Il relève que ${c.aucuneCertification} parcours n'en annoncent aucune : c'est un fait publié par l'organisme, affiché comme tel, et non une lacune du catalogue.`,
    },
    {
      question: "Comment savoir si un code est encore valable ?",
      reponse:
        "En le cherchant sur le moteur de France Compétences, qui affiche l'état de l'enregistrement et sa date d'échéance. Un code inactif signifie que la certification n'est plus délivrée, même si la page de l'organisme l'affiche encore.",
    },
  ],
};
