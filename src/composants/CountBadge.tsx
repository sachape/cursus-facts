/**
 * Compteur en pastille.
 *
 * Neutre par construction : il dit combien, jamais si c'est bien. Aucun accent,
 * aucune couleur sémantique — un compteur teinté se lirait comme une
 * qualification du domaine qu'il accompagne.
 *
 * L'onglet actif garde son libellé en noir ; son compteur, lui, reste
 * identique aux autres. C'est le libellé qui porte la sélection.
 */
export function CountBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-(--badge-compteur-hauteur) min-w-(--badge-compteur-hauteur) items-center justify-center whitespace-nowrap rounded-(--radius-full) bg-(--badge-compteur-fond) px-(--badge-compteur-padding) text-(--badge-compteur-texte) [font-size:var(--caption-size)] font-semibold leading-none [font-variant-numeric:tabular-nums]">
      {children}
    </span>
  );
}
