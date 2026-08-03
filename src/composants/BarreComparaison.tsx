/**
 * Barre de comparaison ancrée en bas de l'écran.
 *
 * Apparaît dès le premier parcours sélectionné. Quatre emplacements, les vides
 * en pointillés : l'utilisateur voit combien il peut encore en ajouter sans
 * avoir à l'apprendre en se heurtant au refus.
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { MAX_COMPARAISON, useComparaison } from "./comparaison";
import { Button } from "@/components/ui/button";

export function BarreComparaison() {
  const { selection, retirer, vider, refus } = useComparaison();
  const surComparer = useRouterState({
    select: (etat) => etat.location.pathname === "/comparer",
  });

  if (selection.length === 0) return null;

  const emplacements = Array.from({ length: MAX_COMPARAISON }, (_, i) => selection[i] ?? null);

  return (
    <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-5 py-3 sm:px-8">
        {refus !== null && (
          <p role="status" className="mb-2 text-xs text-absent">
            {refus}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <ul className="flex flex-1 flex-wrap gap-2">
            {emplacements.map((parcours, i) => (
              <li key={i}>
                {parcours === null ? (
                  <span className="flex h-9 min-w-28 items-center justify-center rounded-md border border-dashed border-border px-3 text-xs text-muted-foreground">
                    Emplacement libre
                  </span>
                ) : (
                  <span className="flex h-9 max-w-56 items-center gap-2 rounded-md border border-border px-3">
                    <span className="truncate text-xs">{parcours.nom}</span>
                    <button
                      type="button"
                      onClick={() => retirer(parcours.slug)}
                      aria-label={`Retirer ${parcours.nom} de la comparaison`}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={vider} className="h-8 px-2 text-xs">
              Tout retirer
            </Button>
            {!surComparer && (
              <Button asChild size="sm" className="h-9">
                <Link to="/comparer">
                  Comparer <span className="chiffre">{selection.length}</span> parcours
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
