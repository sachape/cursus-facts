/**
 * Attribution d'une valeur à une fiche, sur une page qui n'est pas la sienne.
 *
 * LE PROBLÈME QUE CE MODULE EXISTE POUR RÉSOUDRE.
 *
 * `verifierCorrespondance` demande que le `<h1>` de la page corresponde au nom
 * du parcours, à 0,8. C'est le bon garde-fou sur une page de détail, et c'est
 * exactement le mauvais sur une page tarifs : son `<h1>` dit « Tarifs », son
 * score contre « MSc in AI Marketing & Business » vaut zéro, et la page est
 * rejetée alors qu'elle porte précisément le prix qu'on cherche.
 *
 * Or c'est là que vit le prix chez beaucoup d'organismes. Baisser le seuil pour
 * les laisser passer supprimerait le garde-fou au moment précis où il protège
 * le plus : une page tarifs porte le prix de DIX formations, et rien dans le
 * nombre ne dit à laquelle il appartient. C'est le pire résultat possible du
 * produit — une valeur juste sur la mauvaise fiche, que personne ne verra.
 *
 * LA PARADE : déplacer la question, pas le seuil. Sur une page de détail, on
 * demande « cette PAGE est-elle celle du parcours ? ». Sur une page tarifs, on
 * demande « ce PRIX est-il celui du parcours ? » — en exigeant que le nom du
 * parcours figure dans le voisinage immédiat de la citation. Le seuil reste
 * 0,8, et l'incertitude fait toujours rejeter.
 *
 * Un tableau de tarifs met le libellé de la formation sur la ligne de son prix ;
 * une liste met le titre au-dessus. Dans les deux cas le nom est proche. S'il ne
 * l'est pas, alors rien sur la page ne rattache ce nombre à cette fiche, et
 * c'est bien un rejet qu'il faut.
 */
import { normaliser } from "./citation";
import { motsCles } from "./sitemaps";

/**
 * Part des mots discriminants du nom qui doit figurer autour de la citation.
 * Même valeur que `SEUIL_CORRESPONDANCE`, même motif : l'asymétrie des coûts.
 * Un rejet coûte une information manquante que la file reprendra ; une
 * acceptation à tort écrit une information fausse que personne ne verra.
 */
export const SEUIL_ATTRIBUTION = 0.8;

/**
 * Voisinage inspecté de part et d'autre de la citation, en caractères.
 *
 * Assez large pour couvrir une ligne de tableau et son en-tête, assez étroit
 * pour ne pas attraper le titre d'une AUTRE formation plus bas dans la page —
 * ce qui rendrait le garde-fou décoratif.
 */
export const FENETRE_ATTRIBUTION = 600;

export type VerdictAttribution = {
  attribue: boolean;
  score: number;
  /** Mots du nom absents du voisinage — ce qui manque pour conclure. */
  manquants: string[];
  /** Le voisinage retenu, tronqué, pour que le rejet soit relisible. */
  contexte: string | null;
};

/**
 * Ce prix appartient-il bien à ce parcours ?
 *
 * `page` doit être EXACTEMENT le texte envoyé au modèle : c'est celui dans
 * lequel la citation a déjà été vérifiée. Comparer à un texte retraité rendrait
 * l'introuvable, et le rejet porterait alors sur notre retraitement.
 */
export function attribuerExtrait(
  nomParcours: string,
  page: string,
  extrait: string,
  options: { seuil?: number; fenetre?: number } = {},
): VerdictAttribution {
  const seuil = options.seuil ?? SEUIL_ATTRIBUTION;
  const fenetre = options.fenetre ?? FENETRE_ATTRIBUTION;

  const attendus = motsCles(nomParcours);
  // Un nom sans mot discriminant ne peut rien attester : on ne conclut pas.
  if (attendus.size === 0) {
    return { attribue: false, score: 0, manquants: [], contexte: null };
  }

  const pageN = normaliser(page);
  const extraitN = normaliser(extrait);
  const position = pageN.indexOf(extraitN);
  // La citation a déjà été vérifiée en amont ; si elle est introuvable ici,
  // c'est un défaut de notre chaîne, pas une absence sur la page. On rejette
  // quand même — mais le contexte nul le dit.
  if (position < 0) {
    return { attribue: false, score: 0, manquants: [...attendus], contexte: null };
  }

  const debut = Math.max(0, position - fenetre);
  const fin = Math.min(pageN.length, position + extraitN.length + fenetre);
  const contexte = pageN.slice(debut, fin);
  const presents = motsCles(contexte);

  const manquants = [...attendus].filter((mot) => !presents.has(mot));
  const score = (attendus.size - manquants.length) / attendus.size;

  return {
    attribue: score >= seuil,
    score,
    manquants,
    contexte: contexte.slice(0, 300),
  };
}
