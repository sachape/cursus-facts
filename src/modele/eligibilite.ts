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

/**
 * LE PÉRIMÈTRE — écrit le 13 août 2026, après avoir tranché quatre fiches.
 *
 * Marketing Mania, dixmilleheures, Jedha et Le Wagon sont sortis du catalogue
 * ce jour-là sur un critère de périmètre qui n'était écrit NULLE PART. Une règle
 * appliquée sans être publiée est exactement ce que l'invariant 7 interdit :
 * elle transforme chaque décision en négociation, faute de pouvoir être
 * contestée en tant que règle.
 *
 * DEUX TEMPS, ET LE SECOND EST INDISPENSABLE. « Le catalogue référence les
 * parcours dont l'objet est le commerce en ligne » paraît suffire ; appliqué
 * seul au catalogue du jour, il emporte 134 fiches sur 221 — tout sauf
 * e-commerce et marketplaces, y compris le marketing digital, le référencement
 * et la publicité, qui sont précisément les disciplines qu'un vendeur en ligne
 * vient apprendre. Le périmètre est donc le commerce en ligne ET ce qui le sert
 * directement.
 *
 * Le critère porte sur l'OBJET du parcours, jamais sur son public : c'est ce qui
 * le rend vérifiable. Une formation Shopify destinée à des développeurs entre ;
 * un bootcamp de développement web qui consacre un module au e-commerce n'entre
 * pas.
 */
export const REGLE_PERIMETRE = [
  "Un parcours entre au catalogue quand son objet principal est de vendre en ligne, ou d'exercer un métier du commerce en ligne : boutique, marketplace, acquisition, conversion, relation client, logistique de la vente.",
  "Un parcours dont l'objet principal est une autre discipline n'entre pas, même si le e-commerce y figure comme module : développement, data, cybersécurité, création de contenu, outillage no-code, management général.",
  "Le critère porte sur l'objet du parcours, jamais sur son public. Une formation Shopify destinée à des développeurs entre ; un bootcamp de développement web qui consacre un module au e-commerce n'entre pas.",
] as const;

/** Combien de critères suffisent. Publié, comme le reste. */
export const CRITERES_MINIMUM = 3;

/**
 * LA FORMULATION COURTE DE LA RÈGLE — et elle porte son seuil.
 *
 * Le 13 août 2026, cette règle a été citée « les sept critères d'éligibilité »,
 * comme s'ils étaient cumulatifs, pour justifier d'écarter des fiches que la
 * règle **admettait** : une Academy d'éditeur en vérifie quatre. L'erreur ne
 * venait pas de la mémoire mais de l'abréviation — « les sept critères » est
 * une manière de citer cette règle qui en inverse le sens.
 *
 * D'où la leçon, et cette constante : **une règle à seuil énonce son seuil dans
 * sa formulation courte.** Le seuil vivait dans `CRITERES_MINIMUM`, à côté de la
 * liste, et rien n'obligeait à les citer ensemble.
 *
 * Elle est aussi la source unique de la phrase. Les deux pages qui publient la
 * règle la composaient chacune de leur côté : les nombres étaient partagés, la
 * phrase non. Deux pages qui énoncent la même règle avec leurs propres mots
 * peuvent diverger sans que rien ne le signale — c'est exactement le défaut que
 * l'extraction de ce module devait supprimer.
 */
export const REGLE_ELIGIBILITE_COURTE =
  `Un acteur est référencé s'il vérifie au moins ${CRITERES_MINIMUM} des ${CRITERES_ELIGIBILITE.length} critères suivants.`;

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
  /*
    ÉTENDU LE 13 AOÛT 2026, de « Chaîne gratuite sans offre payante » aux
    plateformes d'éditeur. Dix-neuf « Academy » — Shopify, Klaviyo, Semrush,
    Hotjar… — étaient fichées comme des parcours alors qu'aucun prix, aucune
    durée et aucun programme uniques ne peuvent en être vrais.

    LES DEUX CONDITIONS SONT CUMULATIVES, et ce n'est pas une nuance de
    rédaction. Le catalogue portait 73 fiches à prix nul ; une règle sur la
    seule gratuité en aurait emporté 54 de plus que les 19 visées, dont
    34 licences et BTS en établissement public. Leur coût est PRIS EN CHARGE,
    il n'est pas absent : elles ont un parcours borné et un prix, payé par un
    tiers. Le 3 août, un motif voisin appliqué à une seule condition avait
    effacé trois parcours que Google publie lui-même « gratuites ».

    Ce critère n'existait pas : c'est une modification de règle, pas
    l'application d'une règle. Les sept critères d'éligibilité en demandent
    TROIS, et une Academy en vérifie quatre — elle passait le seuil.
  */
  "Ressource gratuite sans offre payante ni parcours borné",
  "Consultant qui ne vend aucune formation",
  "Agence proposant une prestation",
  "Masterclass ponctuelle sans parcours",
  "Page abandonnée",
  "Média de comparatifs",
] as const;
