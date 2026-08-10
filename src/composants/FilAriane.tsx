/**
 * Fil d'Ariane — la profondeur, dite à l'écran et aux robots.
 *
 * DEUX SURFACES, UNE SEULE SOURCE. Le même tableau de miettes produit le
 * `<nav>` visible et le balisage `BreadcrumbList`. Les écrire séparément
 * garantirait qu'ils divergent : Google afficherait dans ses résultats un
 * chemin que la page ne montre pas, ce qui est précisément ce que le balisage
 * structuré interdit.
 *
 * LA DERNIÈRE MIETTE N'EST PAS UN LIEN. C'est la page courante ; un lien vers
 * soi-même n'aide personne et ajoute une adresse au maillage sans rien y
 * apporter. Elle porte `aria-current="page"`.
 *
 * PAS DE FIL SUR L'ACCUEIL. Un chemin à un seul élément ne décrit aucune
 * hiérarchie, et Google ne l'affiche pas.
 */
import { Link } from "@tanstack/react-router";

/** Une étape du chemin. `chemin` absent = page courante, donc pas de lien. */
export type Miette = { libelle: string; chemin?: string };

const SITE = "https://formlist.fr";

/**
 * Le balisage `BreadcrumbList`, à poser dans le `head()` de la route.
 *
 * Les adresses sont ABSOLUES : le vocabulaire schema.org attend un
 * identifiant, et un chemin relatif n'en est pas un.
 */
export function balisageFilAriane(miettes: readonly Miette[]): {
  type: string;
  children: string;
} {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: miettes.map((m, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: m.libelle,
        ...(m.chemin !== undefined ? { item: `${SITE}${m.chemin}` } : {}),
      })),
    }),
  };
}

export function FilAriane({ miettes }: { miettes: readonly Miette[] }) {
  if (miettes.length < 2) return null;

  return (
    <nav aria-label="Fil d'Ariane" className="mb-(--space-4)">
      {/*
        Une liste ordonnée, parce que c'en est une : l'ordre porte le sens, et
        un lecteur d'écran annonce « 2 sur 3 ». Une suite de `<span>` séparés
        par des chevrons ne dirait rien de la profondeur.
      */}
      <ol className="flex flex-wrap items-center gap-(--space-2) t-caption text-(--text-tertiary)">
        {miettes.map((m, i) => (
          <li key={`${m.libelle}-${i}`} className="flex items-center gap-(--space-2)">
            {i > 0 && (
              // Le séparateur est décoratif : il n'est jamais énoncé, sinon
              // chaque niveau s'entendrait « barre oblique ».
              <span aria-hidden="true" className="text-(--text-tertiary)">
                /
              </span>
            )}
            {m.chemin === undefined ? (
              <span aria-current="page" className="text-(--text-secondary)">
                {m.libelle}
              </span>
            ) : (
              <Link
                to={m.chemin}
                className="rounded-(--radius-sm) underline-offset-2 transition-colors duration-(--motion-fast) hover:text-(--text-secondary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
              >
                {m.libelle}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
