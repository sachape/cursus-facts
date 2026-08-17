/**
 * Bouton de comparaison.
 *
 * TOUJOURS VISIBLE, À TOUTES LES LARGEURS. Il s'effaçait hors survol sur
 * bureau. Une action qui n'apparaît qu'au survol est invisible pour qui ne la
 * cherche pas, ne survit pas à la navigation au clavier, et n'existe tout
 * simplement pas au toucher : sur mobile, il n'y a pas de survol.
 *
 * Il porte ses cinq états, et reste visible quand le parcours est sélectionné :
 * le masquer priverait de l'action de retrait — on pourrait ajouter à la
 * comparaison sans pouvoir en sortir depuis la liste.
 *
 * Il annonce aussi la limite avant de la heurter : un bouton qui refuse au
 * clic sans avoir prévenu se lit comme une panne.
 */
import type { ParcoursListe } from "@/donnees/requetes";
import { MAX_COMPARAISON, useComparaison } from "./comparaison";
import { proprietesParcours } from "./mesure";

export function CompareButton({ p }: { p: ParcoursListe }) {
  const { slug, nom } = p;
  const { ajouter, retirer, contient, selection } = useComparaison();
  const selectionne = contient(slug);
  const plein = !selectionne && selection.length >= MAX_COMPARAISON;

  return (
    <button
      type="button"
      aria-pressed={selectionne}
      disabled={plein}
      title={plein ? `Comparaison limitée à ${MAX_COMPARAISON} parcours` : undefined}
      onClick={() => (selectionne ? retirer(slug) : ajouter({ slug, nom }, proprietesParcours(p)))}
      className={`h-(--bouton-hauteur) rounded-(--radius-md) border px-(--space-3) t-body-sm transition-[color,background-color,border-color,opacity] duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) disabled:cursor-not-allowed disabled:border-(--border-subtle) disabled:text-(--text-disabled) ${
        selectionne
          ? "border-(--accent-border) bg-(--accent-surface) text-(--accent-default)"
          : "border-(--border-default) text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary)"
      }`}
    >
      {selectionne ? "Retirer de la comparaison" : "Comparer"}
    </button>
  );
}
