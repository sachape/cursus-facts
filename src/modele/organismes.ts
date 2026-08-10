/**
 * L'organisme comme objet du modèle, et non comme filtre de l'explorateur.
 *
 * POURQUOI IL EXISTE. Le regroupement vivait dans la vue Organismes, et la
 * page dédiée en aurait écrit un second — c'est le motif qu'on vient de fermer
 * sur l'ouverture des fiches. Deux regroupements divergent au premier
 * ajustement, et les deux vues annoncent alors des chiffres différents pour le
 * même organisme.
 *
 * CE QUE LES COMPTEURS DISENT, ET CE QU'ILS NE DISENT PAS. `parcours` compte
 * les fiches QUE NOUS AVONS COLLECTÉES, jamais le catalogue de l'organisme. La
 * distinction est la même que `non_collecte` / `non_communique` : un organisme
 * dont nous ne détenons qu'une fiche n'est pas un petit organisme, c'est un
 * organisme que nous avons peu lu. Toute vue qui affiche ce nombre doit
 * afficher la mention qui l'accompagne — c'est un fait sur nous.
 */
import type { ParcoursListe } from "@/donnees/requetes";
import type { CategorieOrganisme } from "@/types/cursus";

export type Organisme = {
  nom: string;
  /** Adresse stable de la page dédiée. Dérivée du nom, jamais stockée. */
  slug: string;
  categorie: CategorieOrganisme;
  /** Fiches collectées, pas taille du catalogue de l'organisme. */
  parcours: number;
  domaines: number;
  /** Les trois sujets les plus portés : ce qui décrit le mieux l'organisme. */
  sujets: string[];
  /** Parcours dont le coût est établi — le critère qui aide à choisir. */
  parcoursAvecCout: number;
  /** La plus récente parmi ses fiches. `null` si aucune n'est datée. */
  derniereVerification: string | null;
  site: string | null;
  certifications: string[];
};

/**
 * Slug d'organisme, dérivé du nom.
 *
 * Dérivé et non stocké : la table `organismes` n'en porte pas, et en ajouter un
 * exigerait une migration — hors de notre portée. Le nom est déjà la clé
 * naturelle du regroupement, donc l'adresse en découle sans rien inventer.
 *
 * Conséquence à connaître : deux organismes dont les noms ne diffèrent que par
 * la ponctuation partageraient une adresse. `trouverOrganisme` retourne alors
 * le premier dans l'ordre d'affichage, de façon déterministe — mais c'est une
 * collision qu'un slug stocké réglerait mieux, le jour où le schéma bougera.
 */
export function slugifierOrganisme(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** Vrai si le coût du parcours est établi, au sens du modèle de coût. */
function coutEtabli(p: ParcoursListe): boolean {
  return p.prixMin !== null || p.modaliteAcces !== null;
}

/**
 * Regroupe le catalogue par organisme.
 *
 * Trié par nombre de parcours décroissant : c'est une description de notre
 * collecte, pas un classement par qualité. Le libellé qui le dit est affiché
 * par les vues, comme pour tout tri du produit.
 */
export function regrouperParOrganisme(parcours: readonly ParcoursListe[]): Organisme[] {
  const par = new Map<string, ParcoursListe[]>();
  for (const p of parcours) {
    const existant = par.get(p.organismeNom);
    if (existant) existant.push(p);
    else par.set(p.organismeNom, [p]);
  }

  return [...par.entries()]
    .map(([nom, liste]) => {
      const compte = new Map<string, number>();
      for (const p of liste) compte.set(p.sujetPrincipal, (compte.get(p.sujetPrincipal) ?? 0) + 1);
      const sujets = [...compte.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
        .slice(0, 3)
        .map(([sujet]) => sujet);

      return {
        nom,
        slug: slugifierOrganisme(nom),
        categorie: liste[0]!.organismeCategorie,
        parcours: liste.length,
        domaines: new Set(liste.map((p) => p.domaine)).size,
        sujets,
        parcoursAvecCout: liste.filter(coutEtabli).length,
        // Une date ISO courte se compare comme une chaîne : `sort` suffit.
        derniereVerification:
          liste
            .map((p) => p.dateVerification)
            .filter((d): d is string => d !== null)
            .sort()
            .at(-1) ?? null,
        // Ces deux champs sont portés par l'organisme, donc identiques sur
        // toutes ses fiches : la première suffit.
        site: liste[0]!.organismeSite,
        certifications: liste[0]!.organismeCertifications,
      };
    })
    .sort((a, b) => b.parcours - a.parcours || a.nom.localeCompare(b.nom, "fr"));
}

/** L'organisme d'une adresse, et ses parcours. */
export function trouverOrganisme(
  parcours: readonly ParcoursListe[],
  slug: string,
): { organisme: Organisme; fiches: ParcoursListe[] } | null {
  const organisme = regrouperParOrganisme(parcours).find((o) => o.slug === slug);
  if (organisme === undefined) return null;
  return {
    organisme,
    fiches: parcours.filter((p) => p.organismeNom === organisme.nom),
  };
}
