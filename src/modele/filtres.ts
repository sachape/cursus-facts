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
 * fait exception explicite : une fiche sans prix publié reste visible quel que
 * soit le plafond, faute de quoi ne pas publier son prix deviendrait un moyen
 * d'échapper au filtre — ou d'y figurer indûment.
 */
import type { ParcoursListe } from "@/donnees/requetes";
import type {
  CategorieOrganisme,
  DomaineParcours,
  FormatParcours,
  NiveauEntree,
} from "@/types/cursus";

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
  /** Plafond en euros. `null` = sans limite. */
  budget: number | null;
  eligibleCpf: boolean;
  certifiantSeulement: boolean;
  gratuitSeulement: boolean;
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
  budget: null,
  eligibleCpf: false,
  certifiantSeulement: false,
  gratuitSeulement: false,
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

  // Un prix non publié n'exclut pas : l'absence d'information ne doit ni
  // profiter ni nuire. La fiche reste visible, son prix reste inconnu.
  if (f.budget !== null && p.prixMin !== null && p.prixMin > f.budget) return false;

  if (f.eligibleCpf && p.eligibleCpf !== true) return false;
  if (f.certifiantSeulement && p.codeRncpRs === null) return false;
  if (f.gratuitSeulement && p.prixMin !== 0) return false;

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
    f.budget !== null ||
    f.eligibleCpf ||
    f.certifiantSeulement ||
    f.gratuitSeulement
  );
}
