/**
 * Identité de l'organisme — marque, nom et catégorie.
 *
 * La marque est traitée par `OrganizationMark` : logo officiel s'il existe,
 * icône de catégorie sinon. Aucune couleur par organisme — seulement par
 * catégorie, et de même intensité entre elles : une teinte propre à un
 * organisme le distinguerait visuellement, et une distinction visuelle se lit
 * comme une hiérarchie.
 */
import type { CategorieOrganisme } from "@/types/cursus";
import { LIBELLES_CATEGORIES } from "@/modele/vocabulaires";
import { OrganizationMark } from "./OrganizationMark";

/*
  Le monogramme a été retiré. « RU » ou « NU » n'apprenaient rien : ils
  répétaient en abrégé un nom figurant en toutes lettres à côté, et deux
  organismes aux mêmes initiales devenaient indiscernables. L'icône de
  catégorie porte, elle, une information que le nom ne donne pas.
*/
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
      <OrganizationMark categorie={categorie} nom={nom} />
      <div className="min-w-0">
        <p className="truncate t-body-sm font-medium text-(--text-primary)">{nom}</p>
        <p className={`truncate t-caption text-(--text-tertiary) ${compact ? "sr-only" : ""}`}>
          {LIBELLES_CATEGORIES[categorie]}
        </p>
      </div>
    </div>
  );
}
