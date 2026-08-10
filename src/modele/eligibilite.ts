/**
 * Éligibilité au référencement — la règle, en un seul endroit.
 *
 * POURQUOI EXTRAIT DE LA PAGE MÉTHODE. Ces deux listes y vivaient en constantes
 * locales. La page « Ajouter un organisme » doit les énoncer aussi : c'est
 * exactement là qu'un organisme se demande s'il est concerné. Les recopier
 * aurait produit deux versions de la même règle, et c'est le défaut qui s'est
 * répété trois fois sur ce projet — l'ouverture de fiche, le lien vers
 * l'organisme, la carte de parcours.
 *
 * Une règle publiée à deux endroits qui divergent n'est plus une règle : c'est
 * une promesse dont on ne sait plus laquelle est vraie.
 */

/**
 * Les sept critères. Un acteur est référencé s'il en vérifie AU MOINS TROIS.
 *
 * Le seuil compte autant que la liste : exiger les sept écarterait des
 * organismes réels dont la page publique est simplement avare, et référencer
 * sur un seul critère laisserait entrer n'importe quelle page de vente.
 */
export const CRITERES_ELIGIBILITE = [
  "Offre structurée",
  "Objectif pédagogique explicite",
  "Contenu ou modules identifiables",
  "Durée ou modalités",
  "Prix ou processus d'inscription",
  "Accompagnement pédagogique",
  "Offre actuellement commercialisée",
] as const;

/** Combien de critères suffisent. Publié, comme le reste. */
export const CRITERES_MINIMUM = 3;

/**
 * Les six motifs de non-référencement.
 *
 * FORMULÉS COMME DES FAITS, JAMAIS COMME UN REFUS. « Chaîne gratuite sans offre
 * payante » décrit ce qu'est l'acteur ; « nous refusons les chaînes gratuites »
 * décrirait ce que nous pensons de lui. La première formulation se vérifie, la
 * seconde s'argumente — et le catalogue ne porte aucun jugement.
 *
 * « Média de comparatifs » ferme la boucle : nous n'indexons pas nos
 * semblables, parce qu'une comparaison de comparateurs n'apporte aucun fait sur
 * une formation.
 */
export const JAMAIS_REFERENCE = [
  "Chaîne gratuite sans offre payante",
  "Consultant qui ne vend aucune formation",
  "Agence proposant une prestation",
  "Masterclass ponctuelle sans parcours",
  "Page abandonnée",
  "Média de comparatifs",
] as const;
