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
import { RechercheHero, type Suggestion } from "./RechercheHero";
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
                  /*
                    L'indicateur radio de shadcn est positionné en absolu à
                    gauche, où il chevauche le texte dès qu'on retire le retrait
                    de 32 px qu'il attend. Le fond de sélection dit déjà ce qui
                    est choisi : un second marqueur n'ajoute rien.
                  */
                  className="min-h-(--option-hauteur) rounded-(--radius-md) px-(--space-3) t-body-sm data-[state=checked]:bg-(--accent-10) [&:not(:last-child)]:mb-(--space-2) [&>span:first-child]:hidden"
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
  suggestions,
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
  /** Les mêmes suggestions que le hero : une seule logique de recherche. */
  suggestions: Suggestion[];
}) {
  return (
    <>
      {/*
        Collante sous la navigation des domaines. Le fond est exactement celui
        de la page — il n'existe que pour empêcher les cartes de transparaître
        pendant le défilement, pas pour recréer un bandeau.
      */}
      {/*
        Sous 1024 px, la barre passe en colonne : titre puis ligne de tri. Sur
        une largeur de téléphone, les mettre côte à côte écrase le select à
        quelques dizaines de pixels ou le pousse hors de la barre.
      */}
      <div className="sticky top-[calc(var(--app-header-height)+var(--domain-navigation-height))] z-30 m-0 flex flex-wrap items-center gap-(--space-4) border-b border-(--border-subtle) bg-(--catalog-canvas) px-(--nav-padding) pb-(--space-5) pt-(--space-4) min-[768px]:py-(--space-5) min-[1024px]:w-full min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:justify-between min-[1024px]:gap-x-(--space-12) min-[1024px]:px-0 min-[1024px]:pb-(--space-6) min-[1024px]:pt-(--space-5)">
        {/*
          Titre, recherche, tri sur une seule ligne. Le champ est présent dès le
          départ : le faire apparaître en cours de défilement déplacerait le
          titre à chaque franchissement du seuil.
        */}
        <h2 className="m-0 shrink-0 t-heading-4 leading-[1.2] text-(--text-primary)">
          {titre} <CountBadge>{nombre}</CountBadge>
        </h2>

        <div className="min-w-0 flex-1 max-[959px]:order-last max-[959px]:w-full max-[959px]:flex-none">
          <RechercheHero
            valeur={recherche}
            modifier={modifierRecherche}
            suggestions={suggestions}
            compact
          />
        </div>

        <div className="flex shrink-0 items-center gap-(--space-4)">
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
