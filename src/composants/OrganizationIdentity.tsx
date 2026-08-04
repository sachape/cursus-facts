/**
 * Identité de l'organisme — monogramme et nom.
 *
 * Pas de logo distant : nous n'en hébergeons aucun, et en charger depuis les
 * sites des organismes leur enverrait le trafic de chaque affichage de liste
 * tout en nous rendant dépendants de leur disponibilité. Le monogramme est
 * dérivé du nom, donc toujours présent et toujours exact.
 *
 * Aucune couleur par organisme : une teinte attribuée les distinguerait
 * visuellement, et une distinction visuelle se lit comme une hiérarchie.
 */
import type { CategorieOrganisme } from "@/types/cursus";
import { LIBELLES_CATEGORIES } from "@/modele/vocabulaires";

/**
 * Initiales d'un nom d'organisme.
 *
 * Deux lettres au plus. Les sigles déjà courts — ESSEC, HETIC — sont conservés
 * tels quels sur deux caractères plutôt que décomposés, ce qui les rendrait
 * méconnaissables.
 */
export function monogramme(nom: string): string {
  const mots = nom
    .replace(/[—–-]/g, " ")
    .split(/\s+/)
    .filter((m) => m.length > 1 && !/^(de|du|des|la|le|les|et|en)$/i.test(m));
  if (mots.length === 0) return nom.slice(0, 2).toUpperCase();
  if (mots.length === 1) return mots[0]!.slice(0, 2).toUpperCase();
  return `${mots[0]![0]}${mots[1]![0]}`.toUpperCase();
}

export function OrganizationIdentity({
  nom,
  categorie,
  compact = false,
}: {
  nom: string;
  categorie: CategorieOrganisme;
  /** Sur une rangée dense, la catégorie passe sur la même ligne. */
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-(--space-3)">
      <span
        aria-hidden
        className="flex size-(--monogramme-taille) shrink-0 items-center justify-center rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-sunken) t-data-sm text-(--text-secondary)"
      >
        {monogramme(nom)}
      </span>
      <div className="min-w-0">
        <p className="truncate t-body-sm font-medium text-(--text-primary)">{nom}</p>
        <p className={`truncate t-caption text-(--text-tertiary) ${compact ? "sr-only" : ""}`}>
          {LIBELLES_CATEGORIES[categorie]}
        </p>
      </div>
    </div>
  );
}
