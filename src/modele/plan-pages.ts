/**
 * Le plan de pages — ce qui décide qu'une adresse filtrée est indexable.
 *
 * LA RÉPONSE EST DÉSORMAIS « JAMAIS », ET C'EST UN CHANGEMENT DE PHASE.
 *
 * Jusqu'ici, une poignée de croisements choisis échappaient au `noindex` par
 * défaut et s'indexaient à leur adresse à paramètres — `/catalogue?cpf=1`.
 * Depuis que les croisements ont une adresse lisible — `/formations/shopify-cpf`,
 * voir `croisements.ts` — les deux formes serviraient le même contenu à deux
 * adresses, ce qui est la définition du doublon. Une seule peut être indexable,
 * et c'est celle qui se lit.
 *
 * CE QUI SUBSISTE ICI. Les entrées du plan gardent leur INTITULÉ : c'est lui
 * qui remplace le titre générique en tête de liste quand on arrive sur un
 * croisement connu depuis le site. Un libellé d'écran, plus une décision
 * d'indexation.
 *
 * LA FAMILLE MANQUANTE, ET POURQUOI ELLE MANQUE. Un croisement par RÉGION a été
 * envisagé — « formation e-commerce en Île-de-France ». Il n'existe pas, et ce
 * n'est pas un oubli : le champ `lieu` est vide sur 173 fiches sur 215, et sur
 * les 42 restantes il mélange des régions et des villes — « Île-de-France » à
 * côté de « Paris », « Lyon », « Vieux-Lille », « Paris 15 », « En ligne ».
 * La région la mieux fournie réunit six parcours : UNE combinaison au seuil.
 * Une page unique ne fait pas une famille, et son maillage n'irait nulle part.
 *
 * Ce qui débloquerait cette famille n'est pas une route de plus, c'est un
 * nettoyage de `lieu` en vocabulaire de régions — un chantier de collecte, à
 * mener avant d'ouvrir la porte, pas après.
 */
import type { ParametresFiltres } from "./filtres-url";
import { memesFiltres, normaliserParametres } from "./filtres-url";

export type PagePlanifiee = {
  /** Les paramètres exacts, tels qu'ils seront écrits dans l'adresse. */
  parametres: ParametresFiltres;
  /** Le titre de la page. Il décrit le croisement, jamais une promesse. */
  titre: string;
  description: string;
  /** L'intitulé affiché en tête de liste, à la place du titre générique. */
  intitule: string;
};

/**
 * Les croisements retenus.
 *
 * Chacun répond à une requête réellement formulée — « formation Shopify CPF »,
 * « formation e-commerce à distance » — et non à une combinaison qu'il serait
 * techniquement possible de produire. Cette liste s'étend à la main, une entrée
 * à la fois, quand une requête le justifie.
 *
 * Les valeurs de `sujet` viennent du vocabulaire du catalogue et doivent y
 * correspondre exactement : `plan-pages.test.ts` le vérifie contre le catalogue
 * source, faute de quoi une page planifiée resterait vide sans que rien ne le
 * dise.
 */
export const PLAN_PAGES: readonly PagePlanifiee[] = [
  {
    parametres: { sujet: "Shopify", cpf: "1" },
    titre: "Formations Shopify éligibles au CPF | Formlist",
    description:
      "Les formations Shopify dont l'organisme déclare l'éligibilité au CPF, avec leur prix, leur durée et leur certification — relevés à la source.",
    intitule: "Formations Shopify éligibles au CPF",
  },
  {
    parametres: { format: "distanciel" },
    titre: "Formations e-commerce à distance | Formlist",
    description:
      "Les formations e-commerce suivables entièrement à distance, comparées sur leur prix, leur volume horaire et leur certification.",
    intitule: "Formations e-commerce à distance",
  },
  {
    parametres: { format: "alternance" },
    titre: "Formations e-commerce en alternance | Formlist",
    description:
      "Les parcours e-commerce disponibles en alternance : aucun frais pour l'alternant, sous réserve de signer un contrat.",
    intitule: "Formations e-commerce en alternance",
  },
  {
    parametres: { cpf: "1" },
    titre: "Formations e-commerce éligibles au CPF | Formlist",
    description:
      "Les formations e-commerce dont l'éligibilité au CPF est déclarée par l'organisme, avec leur code de certification quand il est publié.",
    intitule: "Formations e-commerce éligibles au CPF",
  },
  {
    parametres: { sansFrais: "1" },
    titre: "Formations e-commerce sans frais pour l'apprenant | Formlist",
    description:
      "Les parcours e-commerce dont l'apprenant ne débourse rien, avec la modalité qui le qualifie : accès libre, compte requis, ou prise en charge.",
    intitule: "Formations e-commerce sans frais pour l'apprenant",
  },
  {
    parametres: { certifiant: "1" },
    titre: "Formations e-commerce certifiantes (RNCP ou RS) | Formlist",
    description:
      "Les formations e-commerce portant un code enregistré au Répertoire national ou au Répertoire spécifique, condition nécessaire au financement.",
    intitule: "Formations e-commerce certifiantes",
  },
  {
    parametres: { sujet: "SEO e-commerce" },
    titre: "Formations SEO e-commerce | Formlist",
    description:
      "Les formations dont le référencement naturel en e-commerce est le sujet principal, et non une compétence abordée en passant.",
    intitule: "Formations SEO e-commerce",
  },
  /*
    LES SIX PAGES PAR TYPE D'ORGANISME.

    « Formation e-commerce à l'université », « bootcamp e-commerce » sont des
    requêtes réelles, et la catégorie est le seul critère qui répond à la
    question « à qui ai-je affaire » — un mastère d'école et un cours
    d'indépendant ne se comparent pas de la même façon.

    LES BOOTCAMPS N'Y SONT PAS, et c'est le seuil qui le décide : quatre fiches,
    sous les huit requises. La page naîtra quand la collecte l'aura nourrie ;
    l'ouvrir maintenant installerait une page pauvre à une adresse qu'on
    voudrait ensuite faire remonter.

    Aucune promesse dans les intitulés : ils nomment le croisement, pas une
    qualité. « Les meilleures formations en école » serait un classement.
  */
  {
    parametres: { categorie: "formation_professionnelle" },
    titre: "Formations professionnelles e-commerce | Formlist",
    description:
      "Les formations e-commerce dispensées par des organismes de formation professionnelle, avec leur prix, leur durée et leur certification, relevés à la source.",
    intitule: "Formations professionnelles e-commerce",
  },
  {
    parametres: { categorie: "ecole" },
    titre: "Formations e-commerce en école | Formlist",
    description:
      "Les parcours e-commerce proposés par des écoles : bachelors, mastères et MSc, comparés sur leur prix, leur format et leur certification.",
    intitule: "Formations e-commerce en école",
  },
  {
    parametres: { categorie: "universite" },
    titre: "Formations e-commerce à l'université | Formlist",
    description:
      "Les licences, licences professionnelles et masters e-commerce délivrés par des universités, avec leur volume horaire et leur certification.",
    intitule: "Formations e-commerce à l'université",
  },
  {
    parametres: { categorie: "formation_independante" },
    titre: "Formations e-commerce indépendantes | Formlist",
    description:
      "Les formations e-commerce vendues par des formateurs indépendants, avec leur prix publié, leur durée et les conditions d'accès annoncées.",
    intitule: "Formations e-commerce indépendantes",
  },
  {
    parametres: { categorie: "mooc_plateforme" },
    titre: "Cours e-commerce sur MOOC et plateformes | Formlist",
    description:
      "Les cours e-commerce hébergés sur des plateformes de cours en ligne, avec leur tarif, leur modalité d'accès et l'attestation délivrée.",
    intitule: "Cours e-commerce sur MOOC et plateformes",
  },
  {
    parametres: { categorie: "certification_editeur" },
    titre: "Certifications e-commerce d'éditeurs | Formlist",
    description:
      "Les parcours certifiants proposés par les éditeurs de solutions e-commerce, avec leur tarif et la certification qu'ils délivrent.",
    intitule: "Certifications e-commerce d'éditeurs",
  },
] as const;

/**
 * La page planifiée qui correspond exactement à une adresse.
 *
 * CORRESPONDANCE EXACTE, jamais par inclusion. Sans quoi
 * `?sujet=Shopify&cpf=1&format=distanciel` hériterait de l'indexabilité de
 * `?sujet=Shopify&cpf=1` — et le plan cesserait d'être un plan, puisque
 * n'importe quel filtre ajouté produirait une page indexable de plus.
 */
export function pagePlanifiee(recherche: Record<string, unknown>): PagePlanifiee | undefined {
  const poses = normaliserParametres(recherche);
  return PLAN_PAGES.find((page) => memesFiltres(page.parametres, poses));
}

/**
 * Vrai si l'adresse filtrée mérite d'être indexée — donc jamais.
 *
 * La fonction subsiste plutôt que de disparaître, et c'est délibéré : elle est
 * le seul endroit où cette décision se prend. La supprimer disperserait la
 * règle dans les `head()` des routes, où personne n'irait la relire. Le seuil
 * de données qu'elle appliquait vit maintenant dans `croisements.ts`, où il
 * décide de l'EXISTENCE de la page et plus seulement de sa balise.
 */
export function pageIndexable(): boolean {
  return false;
}
