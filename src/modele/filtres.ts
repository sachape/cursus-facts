/**
 * Filtrage du catalogue.
 *
 * Le filtre principal est le sujet, pas la compétence couverte. C'est toute la
 * raison des trois niveaux de classification : filtrer sur *sujet = SEO*
 * remonte les parcours dont c'est réellement l'objet ; filtrer sur *compétence
 * couverte = SEO* remonte ceux qui l'abordent. Un filtre qui remonte 54
 * résultats sur 195 ne filtre plus rien.
 *
 * Un filtre ne retire jamais une fiche parce qu'elle est incomplète. Le budget
 * fait exception explicite : une fiche sans prix publié reste visible quelle
 * que soit la plage, faute de quoi ne pas publier son prix deviendrait un moyen
 * d'échapper au filtre — ou d'y figurer indûment.
 *
 * Cette exception est désormais un CHOIX AFFICHÉ et non un comportement
 * silencieux : `inclurePrixInconnu` la porte, cochée par défaut, et le nombre
 * de fiches concernées est publié sous les résultats. Une plage de prix élimine
 * mécaniquement tout ce dont le prix n'est pas établi — la majorité du
 * catalogue — et un compteur qui s'effondre sans explication se lit comme un
 * catalogue vide, pas comme une information manquante.
 */
import type { ParcoursListe } from "@/donnees/requetes";
import type {
  CategorieOrganisme,
  DomaineParcours,
  FormatParcours,
  NiveauEntree,
} from "@/types/cursus";
import { formaterNombre } from "./nombres";
import { PARTIELLEMENT_GRATUIT, SANS_FRAIS } from "./modalite-acces";
import { accessibleIndividuellement, prixAffichable } from "./modalite-commerciale";
import { coutDuParcours, filtreDe, type FiltreCondition } from "./condition-cout";

/** Tranches de volume horaire publiées dans la page Méthode. */
export const TRANCHES_DUREE = [
  "moins_20h",
  "de_20_a_100h",
  "de_100_a_500h",
  "plus_500h",
  "non_communique",
] as const;
export type TrancheDuree = (typeof TRANCHES_DUREE)[number];

export const LIBELLES_DUREES: Record<TrancheDuree, string> = {
  moins_20h: "Moins de 20 h",
  de_20_a_100h: "20 à 100 h",
  de_100_a_500h: "100 à 500 h",
  plus_500h: "Plus de 500 h",
  non_communique: "Non communiqué",
};

/** Tranche d'un volume horaire, ou `non_communique` s'il n'est pas publié. */
export function trancheDe(volumeHoraire: number | null): TrancheDuree {
  if (volumeHoraire === null) return "non_communique";
  if (volumeHoraire < 20) return "moins_20h";
  if (volumeHoraire <= 100) return "de_20_a_100h";
  if (volumeHoraire <= 500) return "de_100_a_500h";
  return "plus_500h";
}

/* -------------------------------------------------------------------------- */
/* Budget — une plage, et le sort des prix inconnus                           */
/* -------------------------------------------------------------------------- */

/**
 * Plafond haut d'une saisie. Au-delà, la valeur est ramenée ici.
 *
 * Il ne borne pas le catalogue, il borne la SAISIE : un zéro de trop dans un
 * champ produirait une plage vide et un catalogue en apparence disparu.
 */
export const BUDGET_PLAFOND = 50_000;

/**
 * Tranches rapides.
 *
 * LES MÊMES CLÉS QUE L'ASSISTANT (`BUDGETS`, dans `adequation.ts`). Quelqu'un
 * qui a répondu « 500 à 2 500 € » à l'assistant doit retrouver sa tranche à
 * l'identique dans le filtre ; deux découpages concurrents du même axe feraient
 * dire deux choses différentes au même produit.
 *
 * BORNES INCLUSES AUX DEUX EXTRÉMITÉS, comme `PLAFOND_BUDGET` côté assistant.
 * Un parcours à exactement 500 € appartient donc à deux tranches — les deux
 * énoncés sont vrais de lui. Retrancher un euro pour obtenir une partition
 * nette inventerait une précision que le prix n'a pas.
 *
 * « 0 € » et non « Gratuit » : le libellé « Gratuit » seul a été retiré du
 * produit le 3 août 2026 parce qu'il recouvrait cinq réalités distinctes. Ici
 * la tranche ne dit rien de la modalité d'accès, seulement du montant — et
 * c'est exactement ce que « 0 € » énonce.
 */
export const TRANCHES_BUDGET = [
  { cle: "zero", libelle: "0 €", min: 0, max: 0 },
  { cle: "moins_500", libelle: "Moins de 500 €", min: 0, max: 500 },
  { cle: "de_500_a_2500", libelle: "500 à 2 500 €", min: 500, max: 2500 },
  { cle: "plus_2500", libelle: "Plus de 2 500 €", min: 2500, max: null },
] as const;

export type TrancheBudget = (typeof TRANCHES_BUDGET)[number];

/** Une borne saisie, ramenée à une valeur utilisable ou à `null`. */
function borne(valeur: number | null): number | null {
  if (valeur === null || !Number.isFinite(valeur)) return null;
  // Négatif refusé plutôt que ramené à zéro : « de -100 » n'est pas « de 0 »,
  // c'est une saisie sans intention lisible.
  if (valeur < 0) return null;
  return Math.min(valeur, BUDGET_PLAFOND);
}

/**
 * Normalise une plage saisie.
 *
 * INTERVERSION SILENCIEUSE plutôt que message d'erreur : « de 2 500 à 500 » n'a
 * qu'une lecture possible, et refuser une saisie dont on a compris l'intention
 * fait porter à la personne le coût d'une ambiguïté qui n'existe pas.
 */
export function normaliserBudget(
  min: number | null,
  max: number | null,
): { budgetMin: number | null; budgetMax: number | null } {
  const bas = borne(min);
  const haut = borne(max);
  if (bas !== null && haut !== null && bas > haut) return { budgetMin: haut, budgetMax: bas };
  return { budgetMin: bas, budgetMax: haut };
}

/** Vrai dès qu'une des deux bornes est posée. */
export function plageBudgetActive(f: Filtres): boolean {
  return f.budgetMin !== null || f.budgetMax !== null;
}

/*
  `formaterNombre` et non `toLocaleString` : ce dernier dépend des données ICU
  du moteur, qui diffèrent entre Node et le navigateur. Un séparateur de
  milliers rendu côté serveur puis réhydraté autrement suffit à faire jeter
  l'arbre entier à React.
*/
const EUROS = (v: number) => `${formaterNombre(v)} €`;

/**
 * Le libellé de la plage, tel qu'il apparaît dans les filtres posés.
 *
 * `null` quand aucune borne n'est posée : il n'y a alors pas de filtre à
 * retirer, et une pastille vide serait un filtre fantôme.
 */
export function libelleBudget(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return `${EUROS(min)} – ${EUROS(max)}`;
  if (max !== null) return `Jusqu'à ${EUROS(max)}`;
  if (min !== null) return `À partir de ${EUROS(min)}`;
  return null;
}

/** Financements qui relèvent d'une prise en charge par l'employeur. */
const FINANCEMENTS_ENTREPRISE = /OPCO|plan de développement|entreprise|alternance/i;

export type Filtres = {
  recherche: string;
  /** Nom exact d'un organisme, tel que passé par la vue Organismes. */
  organisme: string | null;
  domaine: DomaineParcours | null;
  sujets: string[];
  competences: string[];
  categories: CategorieOrganisme[];
  formats: FormatParcours[];
  niveaux: NiveauEntree[];
  /** Plancher en euros, borne incluse. `null` = pas de plancher. */
  budgetMin: number | null;
  /** Plafond en euros, borne incluse. `null` = pas de plafond. */
  budgetMax: number | null;
  /**
   * Garder les parcours dont le prix individuel n'est pas établi lorsqu'une
   * plage est posée. Vrai par défaut, et c'est la décision qui compte.
   *
   * Sans elle, une plage écarte en silence tout ce que les organismes ne
   * publient pas : le filtre récompenserait mécaniquement ceux qui affichent
   * leur prix et effacerait les autres — la même incitation inversée que la
   * règle de fusion cherche à supprimer. Décochée, c'est un choix explicite,
   * et le nombre de fiches ainsi masquées reste affiché.
   */
  inclurePrixInconnu: boolean;
  eligibleCpf: boolean;
  certifiantSeulement: boolean;
  /**
   * L'apprenant ne débourse rien pour le parcours : accès libre, compte requis,
   * compte produit requis, ou prise en charge par un tiers.
   */
  sansFrais: boolean;
  /** Financement par l'employeur : OPCO, plan de développement des compétences. */
  financementEntreprise: boolean;
  /** Ne garder que les parcours dont le prix est effectivement publié. */
  prixCommunique: boolean;
  /**
   * Ne retenir que les parcours qu'une personne peut acheter elle-même.
   *
   * Critère d'accessibilité, pas de budget : un parcours réservé aux
   * entreprises reste au catalogue et reste visible sans ce filtre — il
   * intéresse un dirigeant qui forme son équipe.
   */
  accessibleIndividuellement: boolean;
  /**
   * Conditions d'accès retenues. Critère de faisabilité, pas de prix : pour
   * beaucoup, trouver un contrat d'alternance est plus difficile que payer.
   */
  conditionsAcces: FiltreCondition[];
  /**
   * Tranches de volume horaire. `non_communique` est une tranche explicite et
   * sélectionnable : une fiche sans volume publié doit pouvoir être cherchée,
   * pas seulement subie.
   */
  durees: TrancheDuree[];
  /**
   * Une partie seulement est gratuite : freemium, ou contenu libre à
   * certification payante. Distinct de « sans frais » — les confondre était
   * précisément l'ambiguïté du filtre « Gratuit ».
   */
  accesPartiel: boolean;
};

export const FILTRES_VIDES: Filtres = {
  recherche: "",
  organisme: null,
  domaine: null,
  sujets: [],
  competences: [],
  categories: [],
  formats: [],
  niveaux: [],
  budgetMin: null,
  budgetMax: null,
  inclurePrixInconnu: true,
  eligibleCpf: false,
  certifiantSeulement: false,
  sansFrais: false,
  financementEntreprise: false,
  prixCommunique: false,
  accessibleIndividuellement: false,
  conditionsAcces: [],
  durees: [],
  accesPartiel: false,
};

/** Texte indexé pour la recherche plein texte. */
function texteRecherchable(p: ParcoursListe): string {
  return [
    p.nom,
    p.organismeNom,
    p.sujetPrincipal,
    ...p.competencesCouvertes,
    p.certification ?? "",
    p.codeRncpRs ?? "",
    p.lieu ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function correspond(p: ParcoursListe, f: Filtres): boolean {
  if (f.recherche.trim() !== "") {
    const termes = f.recherche.toLowerCase().trim().split(/\s+/);
    const texte = texteRecherchable(p);
    if (!termes.every((t) => texte.includes(t))) return false;
  }

  if (f.organisme !== null && p.organismeNom !== f.organisme) return false;
  if (f.domaine !== null && p.domaine !== f.domaine) return false;
  if (f.sujets.length > 0 && !f.sujets.includes(p.sujetPrincipal)) return false;
  if (f.competences.length > 0 && !f.competences.some((c) => p.competencesCouvertes.includes(c))) {
    return false;
  }
  if (f.categories.length > 0 && !f.categories.includes(p.organismeCategorie)) return false;
  if (f.formats.length > 0 && !f.formats.some((fmt) => p.formats.includes(fmt))) return false;
  if (f.niveaux.length > 0 && (p.niveauEntree === null || !f.niveaux.includes(p.niveauEntree))) {
    return false;
  }

  /*
    LE PRIX FILTRÉ EST CELUI QUE LA PERSONNE DÉBOURSE, jamais le coût du
    parcours. `prixAffichable` renvoie le tarif inter et `null` pour un parcours
    en intra seul : facturé au groupe, il n'a pas de tarif individuel, et
    l'écarter sur un chiffre d'entreprise ferait renoncer sur un montant qui ne
    concerne pas l'acheteur. Un intra seul est donc un prix INCONNU, et suit le
    sort des prix inconnus — pas celui des prix élevés.

    Les bornes sont incluses, et un parcours à 0 € entre dans toute plage qui
    contient zéro : un parcours en alternance figure bien sous « moins de
    500 € », puisque c'est exactement ce que l'alternant débourse.
  */
  const prixIndividuel = prixAffichable(p.prixMin, p, p.unitePrix);
  if (plageBudgetActive(f)) {
    if (prixIndividuel === null) {
      if (!f.inclurePrixInconnu) return false;
    } else if (
      (f.budgetMin !== null && prixIndividuel < f.budgetMin) ||
      (f.budgetMax !== null && prixIndividuel > f.budgetMax)
    ) {
      return false;
    }
  }

  if (f.durees.length > 0 && !f.durees.includes(trancheDe(p.volumeHoraire))) return false;

  // Un prix non publié n'est pas un prix : ce filtre sert à ne voir que les
  // fiches sur lesquelles une comparaison budgétaire est possible.
  if (f.prixCommunique && prixIndividuel === null) return false;

  // Ne promet que ce qui a été constaté : une disponibilité non tranchée ne
  // vaut pas une disponibilité vérifiée.
  if (f.accessibleIndividuellement && !accessibleIndividuellement(p)) return false;

  if (f.conditionsAcces.length > 0) {
    const condition = filtreDe(coutDuParcours(p).cle);
    if (condition === null || !f.conditionsAcces.includes(condition)) return false;
  }

  if (
    f.financementEntreprise &&
    !(p.financements ?? []).some((x) => FINANCEMENTS_ENTREPRISE.test(x))
  ) {
    return false;
  }

  if (f.eligibleCpf && p.eligibleCpf !== true) return false;
  if (f.certifiantSeulement && p.codeRncpRs === null) return false;

  // Une gratuité non qualifiée n'est pas une gratuité : une fiche dont la
  // modalité n'a pas été vérifiée ne remonte dans aucun des deux filtres.
  if (f.sansFrais && (p.modaliteAcces === null || !SANS_FRAIS.includes(p.modaliteAcces))) {
    return false;
  }
  if (
    f.accesPartiel &&
    (p.modaliteAcces === null || !PARTIELLEMENT_GRATUIT.includes(p.modaliteAcces))
  ) {
    return false;
  }

  return true;
}

export function filtrer(parcours: readonly ParcoursListe[], f: Filtres): ParcoursListe[] {
  return parcours.filter((p) => correspond(p, f));
}

/**
 * Décompte d'une valeur de filtre, tous les autres filtres restant actifs.
 *
 * Affiché à côté de chaque option : un filtre dont on ignore le rendement se
 * coche à l'aveugle, et une option à zéro résultat doit se voir avant d'être
 * cliquée, pas après.
 */
export function compterAvec(
  parcours: readonly ParcoursListe[],
  f: Filtres,
  remplacement: Partial<Filtres>,
): number {
  return filtrer(parcours, { ...f, ...remplacement }).length;
}

/**
 * Les parcours dont le prix EST établi et tombe dans la plage.
 *
 * Calculé en forçant l'exclusion des prix inconnus, quel que soit l'état de la
 * case : les deux nombres de la mention doivent se lire ensemble, et l'un ne
 * peut pas dépendre du réglage que l'autre sert à expliquer.
 */
export function compterDansPlage(parcours: readonly ParcoursListe[], f: Filtres): number {
  return filtrer(parcours, { ...f, inclurePrixInconnu: false }).length;
}

/**
 * Les parcours que la plage n'atteint pas, faute de prix établi.
 *
 * Obtenu par différence plutôt que par un second prédicat : une fiche sans prix
 * peut aussi être écartée par un autre filtre, et la compter alors ferait
 * promettre un « plus 61 » que réafficher ne produirait pas.
 */
export function compterPrixInconnu(parcours: readonly ParcoursListe[], f: Filtres): number {
  if (!plageBudgetActive(f)) return 0;
  return (
    filtrer(parcours, { ...f, inclurePrixInconnu: true }).length - compterDansPlage(parcours, f)
  );
}

/** Vrai si au moins un filtre est actif — pilote l'affichage du bouton d'effacement. */
export function auMoinsUnFiltre(f: Filtres): boolean {
  return (
    f.recherche.trim() !== "" ||
    f.organisme !== null ||
    f.domaine !== null ||
    f.sujets.length > 0 ||
    f.competences.length > 0 ||
    f.categories.length > 0 ||
    f.formats.length > 0 ||
    f.niveaux.length > 0 ||
    /* `inclurePrixInconnu` n'est pas compté : seul, il ne filtre rien. C'est un
       modificateur de la plage, pas un filtre. */
    plageBudgetActive(f) ||
    f.eligibleCpf ||
    f.certifiantSeulement ||
    f.sansFrais ||
    f.accesPartiel ||
    f.financementEntreprise ||
    f.prixCommunique ||
    f.accessibleIndividuellement ||
    f.conditionsAcces.length > 0 ||
    f.durees.length > 0
  );
}

/* -------------------------------------------------------------------------- */
/* Écartées faute d'information                                               */
/* -------------------------------------------------------------------------- */

/**
 * Champs sur lesquels un filtre actif peut écarter une fiche pour la seule
 * raison que l'organisme ne publie pas l'information.
 *
 * LE BUDGET N'Y FIGURE PAS, et ce n'est pas un oubli : il porte sa propre
 * mention, qui nomme le nombre de fiches concernées et propose de les masquer
 * plutôt que de les réafficher. L'ajouter ici les compterait deux fois, dans
 * deux phrases qui se contrediraient à l'écran.
 */
const CHAMPS_SILENCIEUX: Array<{
  actif: (f: Filtres) => boolean;
  absent: (p: ParcoursListe) => boolean;
}> = [
  { actif: (f) => f.eligibleCpf, absent: (p) => p.eligibleCpf === null },
  { actif: (f) => f.certifiantSeulement, absent: (p) => p.codeRncpRs === null },
  { actif: (f) => f.sansFrais || f.accesPartiel, absent: (p) => p.modaliteAcces === null },
  { actif: (f) => f.financementEntreprise, absent: (p) => (p.financements ?? []).length === 0 },
  { actif: (f) => f.niveaux.length > 0, absent: (p) => p.niveauEntree === null },
  { actif: (f) => f.formats.length > 0, absent: (p) => p.formats.length === 0 },
];

/**
 * Compte les parcours écartés parce qu'une information manque, et non parce
 * qu'ils ne correspondent pas.
 *
 * Sans ce décompte, le filtrage récompense mécaniquement les organismes qui
 * publient et efface les autres — ce qui contredit la règle d'exhaustivité et
 * reproduit, au niveau du filtre, l'incitation inversée que le regroupement
 * cherche à supprimer.
 *
 * La tranche « non communiqué » du filtre de durée est un choix explicite de
 * l'utilisateur : elle n'entre pas dans ce décompte.
 */
export function compterEcartesFauteInformation(
  parcours: readonly ParcoursListe[],
  f: Filtres,
): number {
  const actifs = CHAMPS_SILENCIEUX.filter((champ) => champ.actif(f));
  if (actifs.length === 0) return 0;

  // Une fiche n'est comptée que si elle échoue *uniquement* à cause d'un champ
  // absent : si elle serait écartée de toute façon, ce n'est pas le silence de
  // l'organisme qui l'exclut.
  const sansCesFiltres: Filtres = {
    ...f,
    eligibleCpf: false,
    certifiantSeulement: false,
    sansFrais: false,
    accesPartiel: false,
    financementEntreprise: false,
    niveaux: [],
    formats: [],
  };

  return parcours.filter(
    (p) =>
      !correspond(p, f) && correspond(p, sansCesFiltres) && actifs.some((champ) => champ.absent(p)),
  ).length;
}
