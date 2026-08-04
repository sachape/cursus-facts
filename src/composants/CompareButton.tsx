/**
 * Bouton de comparaison.
 *
 * Il porte ses cinq états, et surtout : il reste visible quand le parcours est
 * sélectionné. Le masquer hors survol priverait de l'action de retrait — on
 * pourrait ajouter à la comparaison sans pouvoir en sortir depuis la liste.
 *
 * Il annonce aussi la limite avant de la heurter : un bouton qui refuse au
 * clic sans avoir prévenu se lit comme une panne.
 */
import { MAX_COMPARAISON, useComparaison } from "./comparaison";

export function CompareButton({
  slug,
  nom,
  /** Sur une carte, l'action reste discrète tant qu'elle n'est pas engagée. */
  discretHorsSurvol = false,
}: {
  slug: string;
  nom: string;
  discretHorsSurvol?: boolean;
}) {
  const { ajouter, retirer, contient, selection } = useComparaison();
  const selectionne = contient(slug);
  const plein = !selectionne && selection.length >= MAX_COMPARAISON;

  return (
    <button
      type="button"
      aria-pressed={selectionne}
      disabled={plein}
      title={plein ? `Comparaison limitée à ${MAX_COMPARAISON} parcours` : undefined}
      onClick={() => (selectionne ? retirer(slug) : ajouter({ slug, nom }))}
      className={`h-(--bouton-hauteur) rounded-(--radius-md) border px-(--space-3) t-body-sm transition-[color,background-color,border-color,opacity] duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) disabled:cursor-not-allowed disabled:border-(--border-subtle) disabled:text-(--text-disabled) ${
        selectionne
          ? "border-(--accent-border) bg-(--accent-surface) text-(--accent-default)"
          : `border-(--border-default) text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary) ${
              discretHorsSurvol
                ? "min-[840px]:opacity-0 min-[840px]:group-hover:opacity-100 min-[840px]:group-focus-within:opacity-100 min-[840px]:focus-visible:opacity-100"
                : ""
            }`
      }`}
    >
      {selectionne ? "Retirer de la comparaison" : "Comparer"}
    </button>
  );
}
