/**
 * Agent de rafraîchissement — la première passe n'est pas la fin du travail.
 *
 * Une fois le catalogue vérifié une fois, le pipeline devient un agent continu.
 * Sa cadence dépend de la catégorie, parce qu'un référentiel national et
 * l'offre d'un créateur indépendant ne bougent pas au même rythme : revérifier
 * un BTS tous les mois gaspille des requêtes, laisser un an à une formation
 * indépendante publie un prix périmé.
 *
 * L'AGENT PROPOSE, IL N'ÉCRIT PAS — sauf pour une valeur nouvelle et citée.
 * Toute modification d'une valeur existante passe en validation (voir
 * `ecritureAutomatique` dans `journal.ts`). Un agent qui réécrit sans
 * supervision dans un catalogue dont l'unique actif est l'exactitude est un
 * risque de réputation concentré, et le coût de la validation est faible.
 */
import type { CategorieOrganisme } from "@/types/cursus";

/** Nombre de mois entre deux vérifications, par catégorie. */
export const CADENCE_MOIS: Record<CategorieOrganisme, number> = {
  // Référentiels nationaux : maquettes et frais changent une fois par an.
  universite: 12,
  ecole: 3,
  bootcamp: 3,
  formation_professionnelle: 3,
  // Tarifs et catalogues remaniés en continu.
  certification_editeur: 1,
  mooc_plateforme: 1,
  formation_independante: 1,
};

export const DECLENCHEURS = [
  "cadence",
  "sitemap_modifie",
  "signalement_utilisateur",
  "revendication_organisme",
] as const;
export type Declencheur = (typeof DECLENCHEURS)[number];

/**
 * Les déclencheurs événementiels priment sur la cadence.
 *
 * Une page dont le sitemap annonce une modification, une fiche signalée ou
 * revendiquée doivent passer devant, quelle que soit la date de la dernière
 * vérification : ce sont les seuls signaux qui portent une information sur le
 * changement lui-même, là où la cadence ne fait que présumer.
 */
export const PRIORITE: Record<Declencheur, number> = {
  revendication_organisme: 0,
  signalement_utilisateur: 1,
  sitemap_modifie: 2,
  cadence: 3,
};

export type Candidat = {
  id: number;
  categorie: CategorieOrganisme;
  /** Date de la dernière vérification en profondeur. */
  verifieeLe: string | null;
  /** `lastmod` déclaré par le sitemap au dernier passage. */
  sitemapLastmod: string | null;
  signale?: boolean;
  revendique?: boolean;
};

export type Echeance = { id: number; declencheur: Declencheur; priorite: number };

/** Nombre de mois entiers écoulés entre deux dates ISO. */
export function moisEcoules(depuis: string, jusqua: string): number {
  const a = new Date(depuis);
  const b = new Date(jusqua);
  const mois = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return b.getDate() < a.getDate() ? mois - 1 : mois;
}

/**
 * Détermine si une fiche est à revérifier, et pourquoi.
 *
 * Une fiche jamais vérifiée est toujours candidate : c'est la première passe,
 * et elle n'a pas de cadence à respecter.
 */
export function echeance(candidat: Candidat, aujourdhui: string): Echeance | null {
  if (candidat.revendique) {
    return { id: candidat.id, declencheur: "revendication_organisme", priorite: 0 };
  }
  if (candidat.signale) {
    return { id: candidat.id, declencheur: "signalement_utilisateur", priorite: 1 };
  }
  if (candidat.verifieeLe === null) {
    return { id: candidat.id, declencheur: "cadence", priorite: PRIORITE.cadence };
  }
  // Le sitemap annonce une modification postérieure à notre lecture.
  if (candidat.sitemapLastmod !== null && candidat.sitemapLastmod > candidat.verifieeLe) {
    return { id: candidat.id, declencheur: "sitemap_modifie", priorite: 2 };
  }
  if (moisEcoules(candidat.verifieeLe, aujourdhui) >= CADENCE_MOIS[candidat.categorie]) {
    return { id: candidat.id, declencheur: "cadence", priorite: PRIORITE.cadence };
  }
  return null;
}

/** La file de rafraîchissement, déclencheurs événementiels en tête. */
export function fileDeRafraichissement(
  candidats: readonly Candidat[],
  aujourdhui = new Date().toISOString().slice(0, 10),
): Echeance[] {
  return candidats
    .map((c) => echeance(c, aujourdhui))
    .filter((e): e is Echeance => e !== null)
    .sort((a, b) => a.priorite - b.priorite || a.id - b.id);
}
