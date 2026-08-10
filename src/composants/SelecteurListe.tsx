/**
 * Le sélecteur du design system — extrait du tri, partagé partout.
 *
 * POURQUOI PAS UN `<select>` NATIF. Sur macOS, le menu système est un panneau
 * gris que rien ne permet d'harmoniser, et son contour de focus noir jure avec
 * tout le reste. Il affiche en outre les valeurs telles qu'on les lui donne :
 * la page organisme montrait « distanciel » et « presentiel », c'est-à-dire le
 * vocabulaire de la base rendu à l'utilisateur.
 *
 * POURQUOI EXTRAIT PLUTÔT QUE RECOPIÉ. C'est le troisième cas du jour où une
 * vue écrite après les autres n'a pas repris le composant existant — après
 * l'ouverture de fiche et le lien vers l'organisme. Recopier aurait produit un
 * quatrième divergent au prochain écran.
 *
 * `DropdownMenu` et non `Select` de Radix : `Select` n'expose pas
 * `modal={false}` et verrouille toujours le défilement du corps. Ce verrou pose
 * `overflow: hidden` sur le corps, qui devient conteneur de défilement — les
 * éléments collants perdent alors leur référence et toute la pile disparaît à
 * l'ouverture du menu. Un menu de filtre n'est pas une boîte de dialogue.
 */
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type OptionSelecteur = {
  valeur: string;
  libelle: string;
  /**
   * Combien d'éléments correspondent. `undefined` quand le décompte n'a pas de
   * sens — un tri s'applique à tout.
   */
  compte?: number;
};

export function SelecteurListe({
  id,
  etiquette,
  valeur,
  options,
  choisir,
  /** Ce qu'affiche le déclencheur quand rien n'est choisi. */
  libelleVide,
}: {
  id: string;
  etiquette: string;
  valeur: string;
  options: OptionSelecteur[];
  choisir: (v: string) => void;
  libelleVide?: string;
}) {
  const choisie = options.find((o) => o.valeur === valeur);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        id={id}
        aria-label={etiquette}
        /*
          La largeur minimale ne s'applique qu'à partir de 768 px : à 320 px
          elle poussait le document à 324 px de large. Un plancher de largeur
          est une commodité de lecture, jamais une raison de faire déborder la
          page.
        */
        className="flex h-(--bouton-hauteur) w-full items-center justify-between gap-(--space-2) rounded-(--radius-md) border border-(--border-default) bg-(--surface-raised) px-(--space-3) t-body-sm text-(--text-primary) transition-colors duration-(--motion-fast) hover:border-(--border-strong) focus:outline-none focus:ring-0 focus:[box-shadow:var(--select-focus)] max-[767px]:h-(--bouton-hauteur-tactile)"
      >
        <span className="truncate">{choisie?.libelle ?? libelleVide ?? etiquette}</span>
        <svg
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-(--text-tertiary)"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
        </svg>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="max-h-(--menu-hauteur-max) w-(--radix-dropdown-menu-trigger-width) overflow-y-auto rounded-(--radius-lg) border-(--select-bordure) bg-(--surface-raised) p-(--space-2) shadow-(--elevation-3)"
      >
        <DropdownMenuRadioGroup value={valeur} onValueChange={choisir}>
          {options.map((o) => (
            <DropdownMenuRadioItem
              key={o.valeur}
              value={o.valeur}
              /*
                Une option à zéro reste AFFICHÉE mais désactivée : elle informe
                — cet organisme ne porte aucun parcours de ce format — sans
                laisser cliquer dans le vide. La masquer laisserait croire que
                la valeur n'existe pas.
              */
              disabled={o.compte === 0}
              className="flex min-h-(--option-hauteur) items-center justify-between gap-(--space-3) rounded-(--radius-md) px-(--space-3) t-body-sm data-[state=checked]:bg-(--accent-10) data-[disabled]:opacity-50 [&:not(:last-child)]:mb-(--space-2) [&>span:first-child]:hidden"
            >
              <span className="truncate">{o.libelle}</span>
              {o.compte !== undefined && (
                <span className="chiffre shrink-0 t-caption text-(--text-tertiary)">
                  {o.compte}
                </span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
