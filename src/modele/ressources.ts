/**
 * Ressources gratuites — un objet DISTINCT du catalogue.
 *
 * CE QUE C'EST. Des plateformes d'éditeur, des documentations, des chaînes, des
 * certifications gratuites. Elles apprennent quelque chose ; elles ne sont pas
 * des parcours de formation. Elles sont nées d'un retrait : le 15 août 2026, la
 * règle d'éligibilité a écarté du catalogue 19 « Academies » d'éditeur au motif
 * « ressource gratuite sans offre payante ni parcours borné ». Le motif disait
 * bien « ce n'est pas un parcours au sens du catalogue » — jamais « la fiche est
 * incomplète ». Ces ressources ont donc une valeur, ailleurs.
 *
 * CE QUE CE N'EST PAS, ET AUCUN DE CES POINTS N'EST NÉGOCIABLE :
 *   - pas de prix, pas de durée, pas de certification comparée, pas de code-barres
 *   - pas de compteur : une ressource n'entre pas dans le nombre de parcours
 *   - pas de filtre, pas d'aide au choix, pas de comparaison
 *   - AUCUN JUGEMENT COMPARATIF. Jamais « moins cher », jamais « avant de
 *     payer », jamais « alternative ». Une ressource gratuite et un parcours
 *     payant ne se remplacent pas l'un l'autre, et suggérer qu'ils le font
 *     serait exactement le conseil déguisé que le produit refuse de donner.
 *
 * L'invariant 13 vérifie la première de ces exclusions sur les données ; les
 * autres tiennent au fait que ce module ne partage AUCUN type avec le catalogue.
 * Une ressource ne peut pas se retrouver dans un résultat de recherche parce
 * qu'elle n'est pas une `OffreNormalisee` et ne le devient jamais.
 */
import { SUJETS } from "./vocabulaires";
import brut from "@/donnees/ressources.json";

/* -------------------------------------------------------------------------- */
/* Vocabulaire fermé des types                                                */
/* -------------------------------------------------------------------------- */

/**
 * Les cinq natures de ressource.
 *
 * DEUX SONT VIDES AUJOURD'HUI — `chaine_video` et `cours_en_ligne_gratuit` — et
 * c'est normal : le recensement n'est pas fait. Le vocabulaire décrit ce qu'une
 * ressource PEUT être, pas ce que nous avons déjà collecté. Un type vide ne
 * s'affiche nulle part puisque la page groupe par sujet ; il n'a donc rien à
 * corriger, et surtout rien à retirer en attendant son premier occupant.
 */
export const TYPES_RESSOURCE = [
  "plateforme_editeur",
  "chaine_video",
  "cours_en_ligne_gratuit",
  "certification_gratuite",
  "documentation",
] as const;

export type TypeRessource = (typeof TYPES_RESSOURCE)[number];

export const LIBELLES_TYPES_RESSOURCE: Record<TypeRessource, string> = {
  plateforme_editeur: "Plateforme d'éditeur",
  chaine_video: "Chaîne vidéo",
  cours_en_ligne_gratuit: "Cours en ligne gratuit",
  certification_gratuite: "Certification gratuite",
  documentation: "Documentation",
};

/* -------------------------------------------------------------------------- */
/* Le type                                                                    */
/* -------------------------------------------------------------------------- */

export type Ressource = {
  id: number;
  nom: string;
  /**
   * L'éditeur pour une plateforme, l'auteur pour une chaîne.
   *
   * UN SEUL CHAMP POUR LES DEUX, à dessein. Séparer « éditeur » et « auteur »
   * obligerait à trancher le cas d'une chaîne tenue par une entreprise, et
   * l'affichage les rendrait de toute façon à la même place. Le nom du champ
   * porte l'ambiguïté plutôt que de la cacher derrière un mot trop étroit.
   */
  editeurOuAuteur: string;
  type: TypeRessource;
  /** Sujets du vocabulaire fermé du catalogue. Aucun terme nouveau. */
  sujets: readonly string[];
  /**
   * Code de langue, ou `null` quand elle n'est pas établie.
   *
   * `null` N'EST PAS « MULTILINGUE ». C'est un état de collecte : la langue n'a
   * pu être lue que sur les adresses précises, celles dont le titre prouve
   * qu'on est bien sur la ressource. Lire l'attribut `lang` de l'accueil
   * commercial d'un éditeur qualifierait la vitrine, pas la ressource —
   * `klaviyo.com` est servi en français quand Klaviyo Academy est en anglais.
   */
  langue: string | null;
  url: string;
  /** Une phrase, descriptive. Jamais d'appréciation, jamais de comparaison. */
  description: string;
  verifieeLe: string;
};

/* -------------------------------------------------------------------------- */
/* Chargement                                                                 */
/* -------------------------------------------------------------------------- */

export const RESSOURCES: readonly Ressource[] = (brut as Ressource[])
  .slice()
  .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

/* -------------------------------------------------------------------------- */
/* Accès                                                                      */
/* -------------------------------------------------------------------------- */

/** Une ressource est-elle valide au sens du modèle ? Utilisé par les tests. */
export function ressourceValide(r: Ressource): boolean {
  return (
    TYPES_RESSOURCE.includes(r.type) &&
    r.sujets.length > 0 &&
    r.sujets.every((s) => SUJETS.includes(s)) &&
    r.url.startsWith("https://") &&
    r.description.trim().length > 0
  );
}

/**
 * Les ressources qui couvrent un sujet, par ordre alphabétique.
 *
 * ALPHABÉTIQUE ET NON CLASSÉ. Trier par pertinence supposerait une mesure de
 * pertinence, donc un jugement ; c'est précisément ce que le produit ne fait
 * pas. L'ordre alphabétique n'avantage personne et se vérifie d'un coup d'œil.
 */
export function ressourcesDuSujet(sujet: string, maximum = Infinity): readonly Ressource[] {
  return RESSOURCES.filter((r) => r.sujets.includes(sujet)).slice(0, maximum);
}

/**
 * Les sujets qui portent au moins une ressource, avec leurs ressources.
 *
 * GROUPÉ PAR SUJET, PAS PAR TYPE. Quelqu'un cherche à apprendre Klaviyo, pas à
 * parcourir des « plateformes d'éditeur » : le type est une propriété de la
 * ressource, le sujet est la question de la personne.
 *
 * Une ressource qui couvre deux sujets apparaît sous les deux. Ce n'est pas un
 * doublon : ce sont deux réponses à deux questions différentes.
 */
export function ressourcesParSujet(): { sujet: string; ressources: readonly Ressource[] }[] {
  return SUJETS.map((sujet) => ({ sujet, ressources: ressourcesDuSujet(sujet) })).filter(
    (g) => g.ressources.length > 0,
  );
}
