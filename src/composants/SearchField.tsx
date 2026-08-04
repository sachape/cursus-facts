/**
 * Champ de recherche — la primitive partagée.
 *
 * Le hero et le panneau de filtres cherchaient dans le même catalogue avec deux
 * champs différents : deux hauteurs, deux placeholders, deux comportements
 * d'effacement. Deux vocabulaires du même geste finissent toujours par diverger,
 * et la divergence ne se voit qu'à l'écran.
 *
 * Ce composant porte le champ et ses états. L'autocomplétion reste dans
 * `RechercheHero`, qui l'enveloppe : elle n'a de sens qu'au niveau du hero, où
 * la taille du champ promet un résultat immédiat.
 */
import { forwardRef } from "react";

export type TailleChamp = "sm" | "lg";

/** Loupe — trait 1,5 px, extrémités carrées, aucun remplissage. */
export function Loupe({ taille = 20 }: { taille?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={taille} height={taille} fill="none" aria-hidden>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function Croix({ taille = 16 }: { taille?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={taille} height={taille} fill="none" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export const SearchField = forwardRef<
  HTMLInputElement,
  {
    valeur: string;
    modifier: (v: string) => void;
    placeholder: string;
    taille?: TailleChamp;
    /** Remplace la loupe pendant une requête, aux mêmes dimensions. */
    enChargement?: boolean;
    /** Actif : la bordure et la loupe se renforcent. */
    actif?: boolean;
    /** Attributs passés au champ natif, pour l'autocomplétion notamment. */
    champProps?: React.InputHTMLAttributes<HTMLInputElement>;
  }
>(function SearchField(
  { valeur, modifier, placeholder, taille = "lg", enChargement = false, actif = false, champProps },
  ref,
) {
  const grand = taille === "lg";
  return (
    <div className="relative">
      <span
        className={`pointer-events-none absolute inset-y-0 left-(--space-3) flex items-center transition-colors duration-(--motion-fast) ${
          actif ? "text-(--text-primary)" : "text-(--text-tertiary)"
        }`}
      >
        {enChargement ? (
          <span className="motion-safe:animate-spin">
            <Loupe taille={grand ? 20 : 16} />
          </span>
        ) : (
          <Loupe taille={grand ? 20 : 16} />
        )}
      </span>

      <input
        ref={ref}
        type="text"
        value={valeur}
        onChange={(e) => modifier(e.target.value)}
        placeholder={placeholder}
        /*
          La correction orthographique du navigateur souligne en rouge des
          fragments comme « e-commer » : du bruit dans un champ de recherche,
          où l'on tape des noms propres et des sigles.
        */
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        className={`w-full rounded-(--radius-md) border bg-(--surface-raised) pr-(--space-10) text-(--text-primary) shadow-(--elevation-1) outline-none transition-[border-color,box-shadow] duration-(--motion-fast) placeholder:text-(--text-tertiary) ${
          grand
            ? "h-(--recherche-hauteur) pl-(--recherche-retrait) t-body"
            : "h-(--bouton-hauteur) pl-(--space-8) t-body-sm"
        } ${
          actif
            ? "border-(--border-strong) shadow-(--elevation-2)"
            : "border-(--border-default) hover:border-(--border-strong)"
        }`}
        {...champProps}
      />

      {valeur !== "" && (
        <button
          type="button"
          aria-label="Effacer la recherche"
          onClick={() => modifier("")}
          className="absolute inset-y-0 right-(--space-2) my-auto flex size-(--cible-hauteur-min) items-center justify-center rounded-(--radius-sm) text-(--text-tertiary) transition-colors duration-(--motion-fast) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
        >
          <Croix />
        </button>
      )}
    </div>
  );
});
