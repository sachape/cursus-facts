/**
 * Classification d'un parcours : domaine → sujet principal → compétences.
 *
 * Trois niveaux, parce qu'un seul ne filtre plus rien. Avec un niveau de tags
 * unique, filtrer sur CRO remontait 54 fiches sur 195. Une formation de trois
 * ans qui consacre deux heures au SEO n'est pas une formation SEO.
 *
 * Aucune de ces règles ne repose sur une appréciation humaine, à une exception
 * près et tracée : le domaine déclaré manuellement, réservé aux acteurs dont le
 * vocabulaire échappe au classificateur (« écosystème », « accompagnement »,
 * « communauté »). L'écart est alors enregistré et affiché sur la fiche.
 */
import type { DomaineParcours } from "@/types/cursus";
import {
  CATEGORIES_ACADEMIQUES,
  MOTIF_PAR_COMPETENCE,
  MOTIFS_COMPETENCES,
  MOTIFS_DOMAINES,
  SUJET_GENERALISTE,
  SUJETS_OUTILS,
} from "./vocabulaires";
import type { CategorieOrganisme } from "@/types/cursus";

/** Seuil de présence d'une compétence dans les modules publiés. */
export const SEUIL_SUJET_MODULES = 0.4;

/** Ce que la classification a besoin de connaître d'un parcours. */
export type EntreeClassification = {
  nom: string;
  organisme: string;
  categorie: CategorieOrganisme;
  /** Outils publiés. Vide si l'organisme n'en publie pas. */
  outils?: readonly string[];
  /** Titres des modules publiés. Vide si aucun programme n'est publié. */
  modules?: readonly string[];
  /** Domaine forcé à la main. Réservé aux acteurs non classifiables. */
  domaineDeclare?: DomaineParcours | null;
  /** Compétences relevées à la main lors de la collecte. */
  competencesDeclarees?: readonly string[];
  /**
   * Vrai pour les acteurs dont le vocabulaire échappe au classificateur — ceux
   * qui se présentent comme écosystème, accompagnement ou communauté. La
   * détection automatique ne s'applique alors pas : tout est déclaré.
   */
  classificationManuelle?: boolean;
};

/* -------------------------------------------------------------------------- */
/* Compétences                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Détecte les compétences citées dans l'intitulé, les outils et les modules.
 *
 * Rien n'est supposé au-delà du texte publié : un parcours sans programme ne
 * se voit attribuer aucune compétence issue d'un programme.
 */
export function detecterCompetences(entree: EntreeClassification): string[] {
  const texte = [entree.nom, ...(entree.outils ?? []), ...(entree.modules ?? [])].join(" ");
  return MOTIFS_COMPETENCES.filter(([, motif]) => motif.test(texte)).map(([nom]) => nom);
}

/**
 * Compétences retenues pour un parcours : déclarées à la collecte, puis
 * détectées dans le texte publié.
 *
 * Les fiches en classification manuelle échappent à la détection. Le
 * classificateur y produit du bruit — « Système Sphère » se voit attribuer le
 * référencement parce que le mot SEO apparaît dans un module d'audit. Sur cette
 * population, la déclaration fait foi, et l'écart est tracé par
 * `ecart_classification`.
 */
export function competencesRetenues(entree: EntreeClassification): string[] {
  const declarees = entree.competencesDeclarees ?? [];
  if (entree.classificationManuelle) return [...declarees];
  return [...new Set([...declarees, ...detecterCompetences(entree)])];
}

/* -------------------------------------------------------------------------- */
/* Domaine                                                                    */
/* -------------------------------------------------------------------------- */

export type ResultatDomaine = {
  /** Le domaine retenu : le domaine déclaré s'il existe, sinon l'automatique. */
  domaine: DomaineParcours;
  /** Ce que la règle automatique aurait produit, toujours calculé. */
  domaineAutomatique: DomaineParcours;
  /** Vrai quand la déclaration manuelle contredit la règle automatique. */
  ecart: boolean;
};

/**
 * Détermine le domaine, dans cet ordre :
 *  1. motif reconnu dans l'intitulé du parcours
 *  2. motif reconnu dans l'intitulé + le nom de l'organisme
 *  3. motif reconnu dans un module publié
 *  4. défaut selon la catégorie : « Commerce et vente » pour les universités et
 *     les écoles, « Marketing digital » sinon
 *
 * Le premier motif qui correspond emporte la décision — l'ordre de
 * `MOTIFS_DOMAINES` fait donc partie de la règle.
 */
export function determinerDomaine(entree: EntreeClassification): ResultatDomaine {
  const modules = entree.modules ?? [];

  const parIntitule = MOTIFS_DOMAINES.find(([, motif]) => motif.test(entree.nom));
  const parIntituleEtOrganisme = MOTIFS_DOMAINES.find(([, motif]) =>
    motif.test(`${entree.nom} ${entree.organisme}`),
  );
  const parModule = MOTIFS_DOMAINES.find(([, motif]) => modules.some((m) => motif.test(m)));

  const defaut: DomaineParcours = CATEGORIES_ACADEMIQUES.includes(entree.categorie)
    ? "commerce_vente"
    : "marketing_digital";

  const domaineAutomatique =
    parIntitule?.[0] ?? parIntituleEtOrganisme?.[0] ?? parModule?.[0] ?? defaut;

  const declare = entree.domaineDeclare ?? null;

  return {
    domaine: declare ?? domaineAutomatique,
    domaineAutomatique,
    ecart: declare !== null && declare !== domaineAutomatique,
  };
}

/* -------------------------------------------------------------------------- */
/* Sujet principal                                                            */
/* -------------------------------------------------------------------------- */

export type ResultatSujet = {
  /** Un seul sujet, toujours renseigné. */
  sujetPrincipal: string;
  /** Toutes les autres compétences, sans hiérarchie interne. */
  competencesCouvertes: string[];
  /** Laquelle des quatre règles a tranché — pour la page Méthode. */
  regleAppliquee: "intitule" | "modules" | "outils" | "generaliste";
};

/**
 * Détermine le sujet principal, dans cet ordre strict :
 *  1. la compétence citée dans l'intitulé
 *  2. sinon, la compétence présente dans au moins 40 % des modules publiés
 *  3. sinon, la compétence citée dans les outils — uniquement si aucun
 *     programme n'est publié
 *  4. sinon, le sujet généraliste du domaine
 *
 * Le seuil de 40 % remplace les 25 % de la version 1, qui produisait des
 * aberrations : une formation Shopify de sept modules dont un sur le SEO n'est
 * pas une formation SEO.
 *
 * Les candidats sont parcourus dans l'ordre de `SUJETS_OUTILS`. Le tri par
 * score étant stable, une égalité se départage par ce même ordre.
 */
export function determinerSujetPrincipal(
  entree: EntreeClassification,
  competences: readonly string[],
  domaine: DomaineParcours,
): ResultatSujet {
  const modules = entree.modules ?? [];
  const outils = entree.outils ?? [];
  const candidats = SUJETS_OUTILS.filter((sujet) => competences.includes(sujet));
  const motif = (sujet: string) => MOTIF_PAR_COMPETENCE.get(sujet)!;

  let sujet: string | undefined;
  let regle: ResultatSujet["regleAppliquee"] = "generaliste";

  // 1. cité dans l'intitulé
  sujet = candidats.find((s) => motif(s).test(entree.nom));
  if (sujet) regle = "intitule";

  // 2. présent dans au moins 40 % des modules publiés
  if (!sujet && modules.length > 0) {
    const scores = candidats
      .map((s) => [s, modules.filter((m) => motif(s).test(m)).length / modules.length] as const)
      .sort((a, b) => b[1] - a[1]);
    const meilleur = scores[0];
    if (meilleur && meilleur[1] >= SEUIL_SUJET_MODULES) {
      sujet = meilleur[0];
      regle = "modules";
    }
  }

  // 3. cité dans les outils, uniquement si aucun programme n'est publié
  if (!sujet && modules.length === 0) {
    sujet = candidats.find((s) => outils.some((o) => motif(s).test(o)));
    if (sujet) regle = "outils";
  }

  // 4. sujet généraliste du domaine
  if (!sujet) {
    sujet = SUJET_GENERALISTE[domaine];
    regle = "generaliste";
  }

  return {
    sujetPrincipal: sujet,
    competencesCouvertes: competences.filter((c) => c !== sujet),
    regleAppliquee: regle,
  };
}

/* -------------------------------------------------------------------------- */
/* Classification complète                                                    */
/* -------------------------------------------------------------------------- */

export type ResultatClassification = ResultatDomaine & ResultatSujet;

/** Applique les trois règles dans l'ordre : compétences, domaine, sujet. */
export function classifier(entree: EntreeClassification): ResultatClassification {
  const competences = competencesRetenues(entree);
  const domaine = determinerDomaine(entree);
  const sujet = determinerSujetPrincipal(entree, competences, domaine.domaine);
  return { ...domaine, ...sujet };
}
