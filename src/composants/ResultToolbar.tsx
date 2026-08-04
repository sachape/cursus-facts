/**
 * Barre d'outils des résultats.
 *
 * Elle réunit ce qui était éparpillé : le compte, les filtres actifs, le tri.
 * Un en-tête qui ne porte qu'un titre et un menu déroulant oblige à remonter
 * dans la colonne de filtres pour savoir ce qui est appliqué — et à y
 * redescendre pour en retirer un.
 *
 * POSÉE SUR LA PAGE, sans fond ni conteneur : un bandeau autour du titre et du
 * tri ajoutait une surface de plus dans une vue qui en compte déjà deux — la
 * colonne de filtres et les cartes. La hiérarchie se fait par l'espacement.
 */
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchField } from "./SearchField";
import { CountBadge } from "./CountBadge";
import type { Tri } from "@/modele/classement";
import { LIBELLES_TRIS_COURTS, TRIS } from "@/modele/classement";

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
  /*
    Radix plutôt qu'un `<select>` natif : sur macOS, le menu système est un
    panneau gris que rien ne permet d'harmoniser, et son contour de focus noir
    jure avec tout le reste. Le rendu en portail évite aussi qu'un parent en
    `overflow` ne le coupe — la toolbar est collante, et une liste rendue dans
    son flux disparaîtrait sous les cartes.
  */
  return (
    <div className="flex min-w-0 flex-1 items-center gap-(--space-3) max-[419px]:flex-col max-[419px]:items-stretch max-[419px]:gap-(--space-2)">
      <label htmlFor="tri" className="shrink-0 t-body-sm text-(--text-secondary)">
        Trier par
      </label>
      <div className="relative min-w-0 flex-1 min-[768px]:min-w-(--select-largeur-min) min-[1024px]:w-[clamp(280px,24vw,360px)] min-[1024px]:flex-none">
        {/*
          DropdownMenu plutôt que Select : Radix Select n'expose PAS de
          `modal={false}` et verrouille toujours le défilement du corps. Ce
          verrou pose `overflow: hidden` sur le corps, qui devient conteneur de
          défilement — les éléments collants perdent alors leur référence et
          toute la pile disparaît à l'ouverture du menu.

          Un menu de tri n'est pas une boîte de dialogue : il n'a pas à
          confisquer le défilement de la page.
        */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            id="tri"
            aria-label="Trier les résultats"
            className="flex h-(--bouton-hauteur) w-full items-center justify-between gap-(--space-2) rounded-(--radius-md) border border-(--border-default) bg-(--surface-raised) px-(--space-3) t-body-sm text-(--text-primary) transition-colors duration-(--motion-fast) hover:border-(--border-strong) focus:outline-none focus:ring-0 focus:[box-shadow:var(--select-focus)] max-[1023px]:min-h-12 min-[1024px]:h-12"
          >
            <span className="truncate">{LIBELLES_TRIS_COURTS[tri]}</span>
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden className="shrink-0 text-(--text-tertiary)">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={8}
            className="w-(--radix-dropdown-menu-trigger-width) rounded-(--radius-lg) border-(--select-bordure) bg-(--surface-raised) p-(--space-2) shadow-(--elevation-3)"
          >
            <DropdownMenuRadioGroup value={tri} onValueChange={(v) => choisir(v as Tri)}>
              {TRIS.map((t) => (
                <DropdownMenuRadioItem
                  key={t}
                  value={t}
                  className="min-h-(--option-hauteur) rounded-(--radius-md) px-(--space-3) t-body-sm data-[state=checked]:bg-(--accent-10) [&:not(:last-child)]:mb-(--space-2)"
                >
                  {LIBELLES_TRIS_COURTS[t]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
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
  recherche,
  modifierRecherche,
  declencheurVisible = false,
}: {
  titre: string;
  nombre: number;
  filtresActifs: FiltreActif[];
  toutRetirer: () => void;
  tri: Tri;
  choisirTri: (t: Tri) => void;
  /** Rendu du comparateur, quand des parcours sont sélectionnés. */
  comparateur?: React.ReactNode;
  /** LA MÊME requête que le hero : aucune seconde logique de recherche. */
  recherche: string;
  modifierRecherche: (v: string) => void;
  /** Vrai quand la recherche du hero a quitté la fenêtre. */
  declencheurVisible?: boolean;
}) {
  /*
    Le champ compact remplace la ligne de titre, à hauteur constante. Il reste
    ouvert tant qu'une requête est active : la refermer en défilant ferait
    disparaître le seul rappel de ce qui filtre la liste.
  */
  const [ouvert, setOuvert] = useState(false);
  const declencheur = useRef<HTMLButtonElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const actif = ouvert || recherche.trim() !== "";

  useEffect(() => {
    if (ouvert) champ.current?.focus();
  }, [ouvert]);

  const fermer = () => {
    setOuvert(false);
    // Le focus revient d'où il venait : sans ça, il retombe sur le document et
    // la navigation au clavier repart du haut de la page.
    declencheur.current?.focus();
  };
  return (
    <>
      {/*
        Collante sous la navigation des domaines. Elle ne porte que le titre, le
        compteur et le tri : y garder les filtres actifs ferait varier sa
        hauteur au fil des sélections, et une barre collante dont la hauteur
        change décale toute la pile sous elle.

        Le fond est exactement celui de la page — il n'existe que pour empêcher
        les cartes de transparaître pendant le défilement, pas pour recréer un
        bandeau.
      */}
      {/*
        Sous 1024 px, la barre passe en colonne : titre puis ligne de tri. Sur
        une largeur de téléphone, les mettre côte à côte écrase le select à
        quelques dizaines de pixels ou le pousse hors de la barre.
      */}
      <div className="sticky top-[calc(var(--app-header-height)+var(--domain-navigation-height))] z-30 flex m-0 flex-col gap-(--space-4) border-b border-(--border-subtle) bg-(--catalog-canvas) px-(--nav-padding) pb-(--space-5) pt-(--space-4) min-[768px]:py-(--space-5) min-[1024px]:w-full min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:justify-between min-[1024px]:gap-x-(--space-12) min-[1024px]:px-0 min-[1024px]:pb-(--space-6) min-[1024px]:pt-(--space-5)">
        {/*
          La recherche compacte est réservée au mobile et à la tablette. Sur
          bureau, elle vit dans la colonne de filtres, toujours visible : un
          second point d'entrée y ferait doublon.
        */}
        <div className="flex w-full flex-col gap-(--space-4) min-[1024px]:hidden">
        {actif ? (
          <div className="flex min-h-(--bouton-hauteur-tactile) w-full items-center gap-(--space-2)">
            <div className="min-w-0 flex-1">
              <SearchField
                ref={champ}
                taille="sm"
                valeur={recherche}
                modifier={modifierRecherche}
                placeholder="Rechercher une formation"
                actif
                champProps={{
                  onKeyDown: (e) => {
                    if (e.key === "Escape") fermer();
                  },
                }}
              />
            </div>
            {/*
              Fermer le mode recherche est distinct d'effacer la requête : la
              croix du champ vide la saisie, ce bouton referme sans la perdre.
            */}
            <button
              type="button"
              onClick={fermer}
              aria-label="Fermer la recherche"
              className="flex size-(--bouton-hauteur-tactile) shrink-0 items-center justify-center rounded-(--radius-md) text-(--text-secondary) transition-colors duration-(--motion-fast) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden>
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex min-h-(--bouton-hauteur-tactile) w-full items-center justify-between gap-(--space-3) min-[1024px]:w-auto">
            <h2 className="m-0 t-heading-4 leading-[1.2] text-(--text-primary)">
              {titre} <CountBadge>{nombre}</CountBadge>
            </h2>
            {/*
              L'emplacement est toujours réservé — seule l'opacité change. Le
              faire apparaître par affichage conditionnel décalerait le titre à
              chaque franchissement du seuil.
            */}
            <button
              ref={declencheur}
              type="button"
              onClick={() => setOuvert(true)}
              aria-label="Rechercher une formation"
              tabIndex={declencheurVisible ? 0 : -1}
              className={`flex size-(--bouton-hauteur-tactile) shrink-0 items-center justify-center gap-(--space-2) rounded-(--radius-md) border border-(--border-default) bg-(--surface-raised) text-(--text-secondary) transition-[opacity,transform,color] duration-(--motion-exit) ease-(--ease-standard) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) min-[768px]:w-auto min-[768px]:px-(--space-3) ${
                declencheurVisible
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none -translate-y-1 opacity-0"
              }`}
            >
              <Search size={19} strokeWidth={1.75} aria-hidden />
              <span className="hidden t-body-sm min-[768px]:inline">Rechercher</span>
            </button>
          </div>
        )}
          <div className="flex min-w-0 w-full items-center gap-(--space-3)">
            {comparateur}
            <SortSelect tri={tri} choisir={choisirTri} />
          </div>
        </div>

        {/* Bureau : titre à gauche, tri à droite, rien d'autre. */}
        <h2 className="m-0 hidden shrink-0 t-heading-4 leading-[1.2] text-(--text-primary) min-[1024px]:block">
          {titre} <CountBadge>{nombre}</CountBadge>
        </h2>
        <div className="ml-auto hidden shrink-0 items-center gap-(--space-4) min-[1024px]:flex">
          {comparateur}
          <SortSelect tri={tri} choisir={choisirTri} />
        </div>
      </div>

      {/*
        Hors de la barre collante, dans le flux normal : ils disparaissent
        d'eux-mêmes en défilant, sans qu'aucun JavaScript ne les masque.
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

      {/*
        La phrase explicative du tri a été retirée de la liste. L'invariant 4
        reste tenu : le LIBELLÉ du tri est affiché — dans le déclencheur — et la
        règle complète, avec ce qu'elle décrit et ce qu'elle ne décrit pas, est
        publiée dans la vue Méthode.
      */}
    </>
  );
}
