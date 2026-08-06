/**
 * Moteur d'adéquation.
 *
 * CE N'EST PAS UN MOTEUR DE RECOMMANDATION. La distinction est structurante et
 * non négociable : il répond à « quelle formation pour moi », jamais à « quelle
 * est la meilleure formation ». Un comparateur d'assurance, pas une évaluation.
 *
 * Conséquence directe sur l'implémentation : le calcul produit deux listes
 * symétriques — ce qui correspond, et ce qui ne correspond pas. L'écart n'est
 * pas un défaut à masquer, c'est l'information la plus utile de la sortie. Une
 * correspondance sans aucun écart est suspecte, et le plus souvent le signe
 * d'une fiche trop peu renseignée pour qu'un écart ait pu être constaté.
 *
 * Tout est déterministe et calculé à partir des champs publiés. Le modèle de
 * langage n'intervient qu'à l'étape suivante, pour rédiger une phrase factuelle
 * à partir de ces listes — il ne choisit pas les écarts et n'en invente aucun.
 */
import type { ParcoursListe } from "@/donnees/requetes";
import { LIBELLES_DOMAINES } from "./vocabulaires";

/* -------------------------------------------------------------------------- */
/* Les quatre questions                                                       */
/* -------------------------------------------------------------------------- */

export const OBJECTIFS = {
  lancer_boutique: "Lancer ma boutique",
  developper_activite: "Développer une activité existante",
  trouver_emploi: "Trouver un emploi",
  diplome_reconnu: "Obtenir un diplôme reconnu",
} as const;

export const BUDGETS = {
  zero: "0 €",
  moins_500: "Moins de 500 €",
  de_500_a_2500: "500 à 2 500 €",
  plus_2500: "Plus de 2 500 €",
  finance: "Financé par le CPF ou l'entreprise",
} as const;

export const TEMPS = {
  moins_3h: "Moins de 3 h",
  de_3_a_10h: "3 à 10 h",
  plus_10h: "Plus de 10 h",
  temps_plein: "À temps plein",
} as const;

/*
  LE POINT DE DÉPART A ÉTÉ RETIRÉ le 6 août 2026, sur mesure.

  Écart entre ses réponses : 17,8 points, neutres exclues — l'avant-dernière des
  cinq. Et sa faiblesse est STRUCTURELLE, pas conjoncturelle : `niveau_entree`
  est publié sur 93 % du catalogue, donc la question disposait de sa donnée et
  ne triait quand même pas.

  C'est ce qui la distingue de la question du temps, qui mesure plus bas encore
  (16,1 points) mais dont le champ n'est couvert qu'à 30 % : sa faiblesse est un
  fait sur nous, pas sur elle. Retirer les deux au même motif aurait verrouillé
  une lacune de collecte en décision produit.

  Conséquence assumée : `niveau_entree` n'entre plus dans l'adéquation, alors
  que c'est le champ le mieux couvert des cinq. Le prérequis reste un fait
  publié sur la fiche, il ne pèse simplement plus sur le choix des trois
  correspondances.

  Rejouer `bun run scripts/pouvoir-discriminant.ts` après le crawl.
*/

export const CANAUX = {
  boutique_propre: "Ma propre boutique",
  marketplaces: "Amazon ou marketplaces",
  reseaux_sociaux: "Réseaux sociaux",
  pas_decide: "Pas encore décidé",
} as const;

export type Objectif = keyof typeof OBJECTIFS;
export type Budget = keyof typeof BUDGETS;
export type Temps = keyof typeof TEMPS;
export type Canal = keyof typeof CANAUX;

export type Situation = {
  objectif: Objectif;
  budget: Budget;
  temps: Temps;
  canal: Canal;
};

/** Les quatre questions, dans l'ordre d'affichage. */
export const QUESTIONS = [
  { cle: "objectif", intitule: "Quel est votre objectif ?", options: OBJECTIFS },
  { cle: "budget", intitule: "Quel budget pouvez-vous engager ?", options: BUDGETS },
  { cle: "temps", intitule: "Combien de temps par semaine ?", options: TEMPS },
  { cle: "canal", intitule: "Sur quel canal voulez-vous vendre ?", options: CANAUX },
] as const;

/** Vrai seulement si toutes les réponses attendues sont renseignées. */
export function situationComplete(partielle: Partial<Situation>): partielle is Situation {
  return (
    partielle.objectif !== undefined &&
    partielle.budget !== undefined &&
    partielle.temps !== undefined &&
    partielle.canal !== undefined
  );
}

/* -------------------------------------------------------------------------- */
/* Seuils publiés                                                             */
/* -------------------------------------------------------------------------- */

/** Plafond de prix par tranche de budget, en euros. `null` = sans limite. */
const PLAFOND_BUDGET: Record<Budget, number | null> = {
  zero: 0,
  moins_500: 500,
  de_500_a_2500: 2500,
  plus_2500: null,
  finance: null,
};

/**
 * Volume horaire total compatible avec la charge hebdomadaire annoncée.
 *
 * Le volume publié est un total, pas une cadence : ce seuil est donc une
 * approximation assumée et publiée, pas une mesure. Un volume non publié ne
 * produit ni correspondance ni écart — on ne déduit rien d'une absence.
 */
const PLAFOND_VOLUME: Record<Temps, number | null> = {
  moins_3h: 50,
  de_3_a_10h: 200,
  plus_10h: 500,
  temps_plein: null,
};

/** Compétences et sujets qui attestent la couverture d'un canal de vente. */
const COMPETENCES_CANAL: Record<Canal, readonly string[]> = {
  boutique_propre: ["Shopify", "WooCommerce", "PrestaShop", "No-code", "Création de boutique"],
  marketplaces: ["Amazon FBA", "Etsy", "Marketplace", "Vente sur marketplaces"],
  reseaux_sociaux: ["Meta Ads", "TikTok Ads", "Pinterest Ads"],
  pas_decide: [],
};

/** Domaines qui attestent la couverture d'un canal, à défaut de compétence. */
const DOMAINES_CANAL: Record<Canal, readonly string[]> = {
  boutique_propre: ["creation_site", "ecommerce"],
  marketplaces: ["marketplaces"],
  reseaux_sociaux: ["publicite_payante"],
  pas_decide: [],
};

/* -------------------------------------------------------------------------- */
/* Résultat                                                                   */
/* -------------------------------------------------------------------------- */

export type Adequation = {
  parcours: ParcoursListe;
  /** Critères factuels satisfaits. */
  correspond: string[];
  /** Écarts constatés, énoncés sans euphémisme. */
  ecarts: string[];
};

const COMPETENCES = (p: ParcoursListe) => [p.sujetPrincipal, ...p.competencesCouvertes];

/**
 * Évalue un parcours contre une situation. Ne classe pas, ne juge pas.
 *
 * La situation peut être PARTIELLE. Une question sans réponse ne pose aucun
 * critère — exactement comme une réponse neutre — ce qui permet de compter les
 * candidats encore compatibles au fil du parcours guidé sans dupliquer la
 * moindre règle. Une seconde fonction de comptage aurait divergé de celle-ci au
 * premier ajustement, et l'écran aurait annoncé un nombre que la sortie
 * n'aurait pas tenu.
 */
export function evaluer(parcours: ParcoursListe, situation: Partial<Situation>): Adequation {
  const correspond: string[] = [];
  const ecarts: string[] = [];

  /* Budget — un prix non publié n'est ni un écart ni une correspondance. */
  if (situation.budget !== undefined) {
    const plafond = PLAFOND_BUDGET[situation.budget];
    if (situation.budget === "finance") {
      if (parcours.eligibleCpf === true) correspond.push("Éligible au CPF");
      else if ((parcours.financements?.length ?? 0) > 0) {
        correspond.push(`Financements acceptés : ${parcours.financements!.join(", ")}`);
      } else {
        ecarts.push("Aucun financement CPF ou entreprise n'est publié pour ce parcours");
      }
    } else if (parcours.prixMin === null) {
      ecarts.push("Le prix n'est pas publié : la compatibilité budgétaire ne peut pas être vérifiée");
    } else if (plafond !== null && parcours.prixMin > plafond) {
      ecarts.push(
        `Budget dépassé : ${parcours.prixMin.toLocaleString("fr-FR")} € pour un budget annoncé de ${BUDGETS[situation.budget].toLowerCase()}`,
      );
    } else if (parcours.prixMin === 0) {
      correspond.push("Gratuit");
    } else {
      correspond.push(`Prix dans votre budget : ${parcours.prixMin.toLocaleString("fr-FR")} €`);
    }
    }

  /* Charge horaire — approximation publiée à partir du volume total. */
  if (situation.temps !== undefined && parcours.volumeHoraire !== null) {
    const plafondVolume = PLAFOND_VOLUME[situation.temps];
    if (plafondVolume !== null && parcours.volumeHoraire > plafondVolume) {
      ecarts.push(
        `Charge horaire incompatible : ${parcours.volumeHoraire} h au total pour une disponibilité de ${TEMPS[situation.temps].toLowerCase()} par semaine`,
      );
    } else {
      correspond.push(`Volume horaire compatible : ${parcours.volumeHoraire} h`);
    }
  }

  /* Canal de vente. */
  if (situation.canal !== undefined && situation.canal !== "pas_decide") {
    const attendues = COMPETENCES_CANAL[situation.canal];
    const couvert = COMPETENCES(parcours).some((c) => attendues.includes(c));
    const parDomaine = DOMAINES_CANAL[situation.canal].includes(parcours.domaine);
    if (couvert) {
      correspond.push(`Canal couvert : ${CANAUX[situation.canal].toLowerCase()}`);
    } else if (parDomaine) {
      correspond.push(`Domaine cohérent avec le canal : ${LIBELLES_DOMAINES[parcours.domaine]}`);
    } else {
      ecarts.push(
        `Canal non couvert : aucune compétence publiée ne porte sur ${CANAUX[situation.canal].toLowerCase()}`,
      );
    }
  }

  /* Objectif. */
  if (situation.objectif !== undefined) switch (situation.objectif) {
    case "diplome_reconnu":
      if (parcours.codeRncpRs !== null) {
        correspond.push(`Certification enregistrée : ${parcours.codeRncpRs}`);
      } else {
        ecarts.push("Aucun code RNCP ou RS publié : ce parcours ne délivre pas de diplôme reconnu");
      }
      break;
    case "trouver_emploi":
      if (parcours.codeRncpRs !== null) {
        correspond.push(`Certification enregistrée : ${parcours.codeRncpRs}`);
      } else if (parcours.formats.includes("alternance")) {
        correspond.push("Disponible en alternance");
      } else {
        ecarts.push("Ni certification enregistrée ni alternance : aucun signal d'insertion publié");
      }
      break;
    case "lancer_boutique":
      if (["ecommerce", "creation_site", "marketplaces"].includes(parcours.domaine)) {
        correspond.push(`Domaine adapté au lancement : ${LIBELLES_DOMAINES[parcours.domaine]}`);
      } else {
        ecarts.push(
          `Domaine éloigné du lancement d'une boutique : ${LIBELLES_DOMAINES[parcours.domaine]}`,
        );
      }
      break;
    case "developper_activite":
      correspond.push(`Domaine : ${LIBELLES_DOMAINES[parcours.domaine]}`);
      break;
  }

  return { parcours, correspond, ecarts };
}

/**
 * Classe les parcours par adéquation à la situation.
 *
 * Ordre, dans cet ordre strict :
 *  1. moins d'écarts constatés
 *  2. un parcours gratuit passe avant un parcours payant
 *  3. plus de correspondances
 *  4. plus d'informations disponibles
 *
 * Le critère 2 est une règle produit explicite : à adéquation équivalente, le
 * parcours qui ne coûte rien passe devant. Aucun critère n'est achetable, et
 * ce classement ne dit rien de la qualité des formations.
 */
export function classerParAdequation(
  parcours: readonly ParcoursListe[],
  situation: Situation,
): Adequation[] {
  return parcours
    .map((p) => evaluer(p, situation))
    .sort((a, b) => {
      if (a.ecarts.length !== b.ecarts.length) return a.ecarts.length - b.ecarts.length;
      const gratuitA = a.parcours.prixMin === 0 ? 0 : 1;
      const gratuitB = b.parcours.prixMin === 0 ? 0 : 1;
      if (gratuitA !== gratuitB) return gratuitA - gratuitB;
      if (a.correspond.length !== b.correspond.length) {
        return b.correspond.length - a.correspond.length;
      }
      return b.parcours.infosRenseignees - a.parcours.infosRenseignees;
    });
}

/** Les trois correspondances retenues. */
export function troisCorrespondances(
  parcours: readonly ParcoursListe[],
  situation: Situation,
): Adequation[] {
  return classerParAdequation(parcours, situation).slice(0, 3);
}

/* -------------------------------------------------------------------------- */
/* Garde-fou de vocabulaire                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Mots interdits en sortie de l'assistant.
 *
 * L'assistant produit une adéquation, jamais un jugement. Ces termes
 * transformeraient une correspondance factuelle en recommandation.
 */
export const MOTS_INTERDITS = [
  "meilleur",
  "meilleure",
  "meilleurs",
  "meilleures",
  "top",
  "recommandé",
  "recommandée",
  "recommandés",
  "recommandées",
  "idéal",
  "idéale",
  "idéaux",
  "idéales",
] as const;

/**
 * Renvoie les mots interdits présents dans un texte.
 *
 * Les limites de mot sont posées sur les lettres et chiffres Unicode, pas sur
 * `\b` : celui de JavaScript est ASCII, et ne reconnaît pas la fin d'un mot
 * terminé par « é ». « recommandé » passerait alors inaperçu, ce qui est
 * exactement le cas que ce garde-fou existe pour attraper.
 */
export function motsInterditsPresents(texte: string): string[] {
  return MOTS_INTERDITS.filter((mot) =>
    new RegExp(`(?<![\\p{L}\\p{N}])${mot}(?![\\p{L}\\p{N}])`, "iu").test(texte),
  );
}

/* -------------------------------------------------------------------------- */
/* Parcours guidé                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Les questions à poser, compte tenu des réponses déjà données.
 *
 * Le canal de vente ne veut rien dire pour quelqu'un qui vise un diplôme
 * reconnu ou un emploi : il ne cherche pas où vendre, il cherche à être
 * certifié ou embauché. La question est donc écartée dans ces deux cas — et
 * l'indicateur de progression compte sur CETTE liste, jamais sur `QUESTIONS`,
 * sinon il annoncerait un total que le parcours n'atteindra pas.
 */
export function questionsApplicables(reponses: Partial<Situation>): typeof QUESTIONS[number][] {
  const sansCanal = reponses.objectif === "diplome_reconnu" || reponses.objectif === "trouver_emploi";
  return QUESTIONS.filter((q) => !(q.cle === "canal" && sansCanal));
}

/** Vrai si toutes les questions applicables ont reçu une réponse. */
export function parcoursTermine(reponses: Partial<Situation>): boolean {
  return questionsApplicables(reponses).every((q) => reponses[q.cle as keyof Situation] !== undefined);
}

/**
 * Combien de parcours restent compatibles avec les réponses déjà données.
 *
 * Compté par `evaluer` sur une situation partielle, jamais par une règle
 * parallèle : c'est ce nombre qui transforme un questionnaire en exploration,
 * et il doit désigner exactement les mêmes parcours que la sortie finale. Un
 * comptage écrit à part aurait divergé au premier ajustement d'un seuil, et
 * l'écran aurait promis un chiffre que les trois correspondances démentaient.
 */
export function compterCandidats(
  parcours: readonly ParcoursListe[],
  reponses: Partial<Situation>,
): number {
  return parcours.filter((p) => evaluer(p, reponses).ecarts.length === 0).length;
}
