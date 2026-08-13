/**
 * Six questions à poser avant de payer une formation.
 *
 * C'est notre modèle de données expliqué, sans parler de nous. Chaque question
 * correspond à un champ que le catalogue relève, et chaque champ existe parce
 * que son absence coûte quelque chose à l'acheteur — ce guide énonce le coût
 * plutôt que le champ.
 *
 * AUCUN ORGANISME N'Y EST NOMMÉ. Les six questions valent pour tous, et en
 * citer un en exemple reviendrait à le désigner, ce qui est un jugement.
 */
import { fiches, type Guide } from "./format";

export const guide: Guide = {
  slug: "questions-avant-de-payer-formation",
  titre: "Six questions à poser avant de payer une formation",
  titreMeta: "Six questions à poser avant de payer une formation | Formlist",
  description:
    "Programme, périmètre, volume horaire, accompagnement, unité du prix, certification : six questions dont l'absence de réponse est déjà une réponse.",
  chapo:
    "Aucune de ces questions ne porte sur la qualité, qui ne se vérifie pas avant d'avoir suivi la formation. Toutes portent sur ce qu'un organisme peut publier — et qu'il publie, ou non.",
  misAJourLe: "2026-08-13",

  sections: [
    {
      ancre: "programme",
      titre: "Le programme est-il publié module par module ?",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "Un programme détaillé est le premier signal vérifiable. Une liste de modules avec leur contenu permet de juger de la profondeur ; une page qui annonce « maîtriser le e-commerce de A à Z » ne permet rien du tout.",
        },
        {
          type: "paragraphe",
          texte:
            "L'absence de programme n'est pas toujours de la rétention : certains organismes adaptent le contenu à chaque session. Mais cette adaptation se dit, et un organisme qui ne publie ni programme ni raison de son absence laisse la question ouverte.",
        },
        {
          type: "sortie",
          sortie: { libelle: "Voir les programmes relevés dans les fiches", to: "/" },
        },
      ],
    },

    {
      ancre: "perimetre",
      titre: "Que ne couvre-t-il pas ?",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "C'est la question que personne ne pose, et celle qui produit le plus de déceptions. Une formation « e-commerce » peut porter sur la création de boutique et ignorer l'acquisition, ou l'inverse. Les deux sont légitimes ; la confusion ne l'est pas.",
        },
        {
          type: "paragraphe",
          texte:
            "Poser la question à l'organisme a un autre mérite : la façon dont il y répond en dit long. Une réponse précise sur ce qui n'est pas couvert est le signe d'un programme réellement défini.",
        },
      ],
    },

    {
      ancre: "volume",
      titre: "Le volume horaire est-il précisé, et sur quelle durée ?",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "Volume et durée sont deux informations différentes, souvent confondues. « Six mois » ne dit pas combien d'heures ; « quarante heures » ne dit pas sur combien de semaines. Les deux ensemble donnent la charge réelle, et donc la compatibilité avec une activité en cours.",
        },
        {
          type: "paragraphe",
          texte:
            "Une durée exprimée en fourchette — « un à cinq jours » — mérite attention. Sur un parcours unique elle décrit une adaptation ; sur une page qui recouvre plusieurs cours, elle ne décrit la durée d'aucun.",
        },
        {
          type: "sortie",
          sortie: { libelle: "Filtrer par volume horaire", to: "/" },
        },
      ],
    },

    {
      ancre: "accompagnement",
      titre: "L'accompagnement est-il individuel ou en groupe ?",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "Entre un parcours en autonomie, une session collective et un suivi individuel, l'écart d'expérience est plus grand que l'écart de contenu. C'est souvent ce qui justifie un écart de prix important entre deux formations au programme voisin.",
        },
        {
          type: "paragraphe",
          texte:
            "Deux précisions à demander : le nombre d'apprenants par formateur, et le délai de réponse aux questions posées entre deux séances. Ce sont les deux points que les pages de vente omettent le plus souvent.",
        },
      ],
    },

    {
      ancre: "unite-du-prix",
      titre: "Le prix est-il complet, et en quelle unité ?",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "Un montant ne se compare qu'à unité connue. Le même nombre peut désigner le prix par personne d'une session collective, le prix d'un groupe entier, ou un tarif journalier à multiplier. Trois réalités, un seul chiffre affiché.",
        },
        {
          type: "paragraphe",
          texte:
            "S'ajoute la question de ce qu'il couvre : le passage de la certification est-il compris, l'accès aux supports est-il permanent ou limité dans le temps, existe-t-il des frais d'inscription distincts.",
        },
        {
          type: "donnees",
          titre: "Ce que le catalogue peut vérifier sur le prix",
          lignes: (c) => [
            {
              libelle: "Prix individuel établi",
              valeur: `${c.prixEtabli} sur ${c.parcours}`,
              precision: `${c.partPrixEtabli} % du catalogue`,
            },
            {
              libelle: "Réservés aux entreprises",
              valeur: String(c.intraSeul),
              precision: "le tarif publié est celui d'un groupe",
            },
            {
              libelle: "Gratuité qualifiée par une modalité",
              valeur: String(c.sansFrais),
              precision: "un montant nul n'est retenu que s'il est attesté",
            },
          ],
          sortie: { libelle: "Comparer les prix relevés", to: "/" },
        },
      ],
    },

    {
      ancre: "certification",
      titre: "La certification est-elle celle de la formation, ou celle de l'organisme ?",
      blocs: [
        {
          type: "paragraphe",
          texte:
            "Une page peut afficher plusieurs mentions qui ne portent pas sur le même objet. Certaines certifient l'organisme et son fonctionnement ; d'autres certifient ce que l'apprenant obtient à la fin. Seules les secondes figureront sur un curriculum.",
        },
        {
          type: "paragraphe",
          texte: (c) =>
            `La question se pose souvent : ${fiches(c.certificationSansCode)} annoncent une certification sans code enregistré. Ce n'est pas nécessairement un problème — une attestation d'éditeur a sa valeur — mais ce n'est pas la même chose, et cela n'ouvre aucun droit au financement.`,
        },
        {
          type: "sortie",
          sortie: {
            libelle: "Ce que ces sigles signifient",
            to: "/guides/rncp-rs-qualiopi-comprendre",
          },
        },
      ],
    },
  ],

  faq: [
    {
      question: "Ces questions valent-elles pour une formation gratuite ?",
      reponse:
        "Les cinq premières, oui : le temps investi se paie aussi. La question de l'unité du prix devient celle de ce que la gratuité recouvre — accès libre, compte requis, ou contenu libre à certification payante.",
    },
    {
      question: "Que faire si l'organisme ne répond pas à l'une d'elles ?",
      reponse:
        "L'absence de réponse est une réponse, à mettre en balance avec le reste. Aucune de ces six questions ne demande un secret commercial : elles portent toutes sur ce qui est vendu.",
    },
    {
      question: "Peut-on comparer deux formations sur ces six points ?",
      reponse:
        "C'est exactement ce que permet le comparateur : les champs correspondants sont relevés fiche par fiche, avec leur source et leur date de vérification, et un champ non publié s'affiche « non communiqué » plutôt que d'être deviné.",
    },
    {
      question: "Un prix élevé garantit-il un meilleur accompagnement ?",
      reponse:
        "Rien ne permet de l'affirmer, et ce catalogue ne classe aucune formation par qualité. L'écart de prix s'explique souvent par le format — autonomie, groupe ou suivi individuel — qui est une information vérifiable, contrairement à la qualité.",
    },
  ],
};
