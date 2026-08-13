/**
 * Le plan de pages — quelles adresses filtrées méritent d'être indexées.
 *
 * NOINDEX PAR DÉFAUT, ET C'EST LA RÈGLE QUI COMPTE. Les filtres se combinent :
 * dix-huit critères produisent des milliers d'adresses valides, toutes servant
 * une variante du même contenu. Les laisser toutes indexables noierait les
 * pages qui comptent sous des centaines de pages faibles — le mécanisme qui a
 * coûté leur visibilité à tous les comparateurs à facettes.
 *
 * Une adresse filtrée n'est donc indexable qu'à deux conditions cumulatives :
 *
 *  1. elle figure dans ce plan, à l'identique — un croisement choisi, pas un
 *     croisement possible ;
 *  2. elle franchit le seuil de données, mesuré à la lecture.
 *
 * LE SEUIL SE MESURE, IL NE SE SUPPOSE PAS. Une page de croisement qui remonte
 * trois parcours n'a rien à dire de plus que le catalogue entier ; elle se
 * dégradera d'elle-même en `noindex` si le catalogue bouge, sans qu'on ait à
 * y penser. C'est la même logique que le seuil de profondeur de collecte : on
 * ne publie pas ce qu'on n'a pas encore.
 */
import type { ParametresFiltres } from "./filtres-url";
import { memesFiltres, normaliserParametres } from "./filtres-url";

/**
 * Nombre minimal de parcours pour qu'une page de croisement soit indexable.
 *
 * Huit : en deçà, la page tient sur moins d'un écran de résultats et
 * n'apprend rien qu'un filtre posé à la main n'apprendrait. Le chiffre est
 * discutable ; ce qui ne l'est pas, c'est qu'il existe et qu'il se mesure.
 */
export const SEUIL_PAGE_INDEXABLE = 8;

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
 * Vrai si l'adresse mérite d'être indexée.
 *
 * Une adresse sans aucun filtre n'est pas concernée : c'est l'accueil, qui est
 * indexable pour d'autres raisons.
 */
export function pageIndexable(
  page: PagePlanifiee | undefined,
  nombreResultats: number,
): boolean {
  return page !== undefined && nombreResultats >= SEUIL_PAGE_INDEXABLE;
}
