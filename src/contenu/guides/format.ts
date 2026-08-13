/**
 * Le format d'un guide.
 *
 * DES GUIDES, PAS UN BLOG. Un blog promet de l'actualité qu'il faudra
 * alimenter, et vieillit à la première semaine sans publication. Un guide reste
 * utile deux ans et se met à jour plutôt que de se périmer — d'où `/guides`,
 * une date de mise à jour affichée, et aucune notion de publication.
 *
 * LE GUIDE QUALIFIE, IL NE CONCLUT PAS. Il capte une question posée en amont de
 * la décision, l'explique, et renvoie vers le catalogue. Il ne recommande aucun
 * organisme et n'en classe aucun : ce sont les invariants 1 et 6, qui ne
 * s'arrêtent pas à la porte du contenu éditorial.
 *
 * TOUT CHIFFRE DU CATALOGUE PASSE PAR `ChiffresGuides`. Un texte est soit une
 * chaîne — et elle ne contient alors aucun chiffre du catalogue —, soit une
 * fonction des chiffres calculés à la lecture. C'est ce qui distingue ces pages
 * des contenus d'affiliés qui affirment des fourchettes que rien ne soutient.
 */
import type { ChiffresGuides } from "@/modele/chiffres-guides";
import { formaterNombre } from "@/modele/nombres";

/**
 * Un montant, formaté comme partout ailleurs dans le produit.
 *
 * `formaterNombre` et non `toLocaleString` : ce dernier dépend des données ICU
 * du moteur, qui diffèrent entre Node et le navigateur, et un séparateur rendu
 * côté serveur puis réhydraté autrement fait jeter l'arbre entier à React.
 */
export function euros(valeur: number | null): string {
  return valeur === null ? "non établi" : `${formaterNombre(valeur)} €`;
}

/** Un nombre de parcours. « Parcours » est invariable, l'accord porte ailleurs. */
export function fiches(nombre: number): string {
  return `${formaterNombre(nombre)} parcours`;
}

/** Un texte, éventuellement dépendant des chiffres du catalogue. */
export type Texte = string | ((c: ChiffresGuides) => string);

export function lire(texte: Texte, chiffres: ChiffresGuides): string {
  return typeof texte === "function" ? texte(chiffres) : texte;
}

/** Une ligne d'un bloc de données : un libellé, une valeur, parfois un détail. */
export type LigneDonnee = {
  libelle: string;
  valeur: string;
  precision?: string;
};

export type BlocGuide =
  | { type: "paragraphe"; texte: Texte }
  | { type: "liste"; items: Texte[] }
  /**
   * Un chiffre du catalogue, encadré et daté.
   *
   * ENCADRÉ ET NON FONDU DANS LA PHRASE : un nombre au fil du texte se lit comme
   * une affirmation d'auteur. Encadré, daté et lié aux fiches qui le composent,
   * il se lit comme une mesure — et se vérifie.
   */
  | {
      type: "donnees";
      titre: string;
      lignes: (c: ChiffresGuides) => LigneDonnee[];
      /** Où aller voir les fiches qui composent le chiffre. */
      sortie: Sortie;
    }
  /** Un lien vers le catalogue. Une section sans sortie ne sert à rien. */
  | { type: "sortie"; sortie: Sortie }
  /** Une source officielle. Toute affirmation réglementaire en porte une. */
  | { type: "sources"; items: Array<{ libelle: string; href: string }> };

export type Sortie = {
  libelle: Texte;
  /** Adresse interne. Les guides ne renvoient jamais hors du produit. */
  to: string;
  /** Paramètres d'adresse, quand la vue en accepte. */
  search?: Record<string, string>;
  hash?: string;
};

export type SectionGuide = {
  /**
   * L'ancre, DÉCLARÉE et non dérivée du titre — même règle que la page Méthode.
   * Un identifiant calculé sur l'intitulé casse tous les liens entrants le jour
   * où la section est reformulée, sans que rien ne le signale.
   */
  ancre: string;
  titre: string;
  blocs: BlocGuide[];
};

export type Guide = {
  slug: string;
  /** Le titre de la page, en display-2. */
  titre: string;
  /** Le titre de l'onglet et des résultats de recherche. */
  titreMeta: string;
  /** La méta-description. Une phrase, ce que la page répond. */
  description: string;
  /** Le chapô, en body-lg sous le titre. */
  chapo: string;
  /** Date de dernière mise à jour éditoriale, ISO. */
  misAJourLe: string;
  sections: SectionGuide[];
  /** Trois à cinq questions réelles, balisées `FAQPage`. */
  faq: Array<{ question: string; reponse: Texte }>;
};
