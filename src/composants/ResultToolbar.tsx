/**
 * Barre d'outils des résultats.
 *
 * Elle réunit ce qui était éparpillé : le compte, les filtres actifs, le tri.
 * Un en-tête qui ne porte qu'un titre et un menu déroulant oblige à remonter
 * dans la colonne de filtres pour savoir ce qui est appliqué — et à y
 * redescendre pour en retirer un.
 *
 * COLLANTE. Elle reste disponible pendant le défilement de la liste : c'est là
 * qu'on décide de changer de tri ou de retirer un filtre, et ces décisions se
 * prennent en lisant les résultats, pas avant.
 */
import type { Tri } from "@/modele/classement";
import { LIBELLES_TRIS, LIBELLES_TRIS_COURTS, TRIS } from "@/modele/classement";

/* -------------------------------------------------------------------------- */
/* ActiveFilter — un filtre posé, retirable d'un clic                         */
/* -------------------------------------------------------------------------- */

export function ActiveFilter({ libelle, retirer }: { libelle: string; retirer: () => void }) {
  return (
    <button
      type="button"
      onClick={retirer}
      className="group inline-flex items-center gap-(--space-2) rounded-(--radius-full) border border-(--accent-border) bg-(--accent-surface) py-(--space-1) pl-(--space-3) pr-(--space-2) t-caption text-(--accent-default) transition-colors duration-(--motion-fast) hover:border-(--accent-default) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
    >
      {libelle}
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden>
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      </svg>
      <span className="sr-only">Retirer ce filtre</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* SortSelect — tri, sans contrôle natif                                      */
/* -------------------------------------------------------------------------- */

/**
 * Le tri, avec son libellé publié.
 *
 * Le libellé complet accompagne le choix : un tri qui ne dit pas ce qu'il
 * ordonne se lit comme un classement par qualité, et ce produit n'en fait
 * aucun.
 */
export function SortSelect({ tri, choisir }: { tri: Tri; choisir: (t: Tri) => void }) {
  return (
    <div className="flex items-center gap-(--space-2)">
      <label htmlFor="tri" className="t-body-sm text-(--text-secondary)">
        Trier par
      </label>
      <div className="relative">
        <select
          id="tri"
          value={tri}
          onChange={(e) => choisir(e.target.value as Tri)}
          /*
            `appearance-none` retire la flèche du système : un contrôle au style
            natif jure avec le reste et change d'aspect d'un système à l'autre.
          */
          className="h-(--bouton-hauteur) appearance-none rounded-(--radius-md) border border-(--border-default) bg-(--surface-raised) py-(--space-1) pl-(--space-3) pr-(--space-8) t-body-sm text-(--text-primary) transition-colors duration-(--motion-fast) hover:border-(--border-strong) focus-visible:border-(--border-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
        >
          {TRIS.map((t) => (
            <option key={t} value={t}>
              {LIBELLES_TRIS_COURTS[t]}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-(--space-2) my-auto text-(--text-tertiary)"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
        </svg>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ResultToolbar                                                              */
/* -------------------------------------------------------------------------- */

export type FiltreActif = { libelle: string; retirer: () => void };

export function ResultToolbar({
  titre,
  nombre,
  filtresActifs,
  toutRetirer,
  tri,
  choisirTri,
  comparateur,
}: {
  titre: string;
  nombre: number;
  filtresActifs: FiltreActif[];
  toutRetirer: () => void;
  tri: Tri;
  choisirTri: (t: Tri) => void;
  /** Rendu du comparateur, quand des parcours sont sélectionnés. */
  comparateur?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-(--z-collant) -mx-(--space-1) bg-(--surface-page)/95 px-(--space-1) pb-(--space-3) pt-(--space-3) backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-(--space-3)">
        <h2 className="t-heading-4 text-(--text-primary)">
          {titre} <span className="t-data text-(--text-tertiary)">{nombre}</span>
        </h2>
        <div className="flex items-center gap-(--space-3)">
          {comparateur}
          <SortSelect tri={tri} choisir={choisirTri} />
        </div>
      </div>

      {/*
        Les filtres posés s'affichent ici, retirables d'un clic. Les garder
        uniquement dans la colonne latérale oblige à remonter pour savoir ce
        qui est appliqué, et à y redescendre pour en retirer un.
      */}
      {filtresActifs.length > 0 && (
        <div className="mt-(--space-3) flex flex-wrap items-center gap-(--space-2)">
          {filtresActifs.map((f) => (
            <ActiveFilter key={f.libelle} libelle={f.libelle} retirer={f.retirer} />
          ))}
          <button
            type="button"
            onClick={toutRetirer}
            className="rounded-(--radius-sm) px-(--space-2) py-(--space-1) t-caption text-(--text-secondary) transition-colors duration-(--motion-fast) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
          >
            Tout retirer
          </button>
        </div>
      )}

      <p className="mt-(--space-2) t-caption text-(--text-tertiary)">{LIBELLES_TRIS[tri]}</p>
    </div>
  );
}
