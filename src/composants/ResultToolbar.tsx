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
 *
 * UN SEUL CHAMP DE RECHERCHE DANS L'EXPLORATEUR, celui du hero. Le second champ
 * a vécu ici : deux champs synchronisés obligent à répondre en permanence à
 * « lequel des deux fait foi », et la réponse était « les deux », ce qui a
 * coûté un état partagé, un test de rendu dédié, et des frappes perdues. Un
 * seul champ ne pose plus la question.
 */
import { useRef } from "react";
import { CountBadge } from "./CountBadge";
import { SelecteurListe } from "./SelecteurListe";
import { useEstAncree } from "./pile-collante";
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
  return (
    <div className="flex min-w-0 flex-1 items-center gap-(--space-3) max-[419px]:flex-col max-[419px]:items-stretch max-[419px]:gap-(--space-2)">
      <label htmlFor="tri" className="shrink-0 t-body-sm text-(--text-secondary)">
        Trier par
      </label>
      <div className="min-w-0 flex-1 min-[1024px]:w-[clamp(280px,24vw,360px)] min-[1024px]:flex-none">
        {/* Le composant du design system, extrait d'ici même : ce sélecteur
            était le seul conforme, il est devenu le seul tout court. */}
        <SelecteurListe
          id="tri"
          etiquette="Trier les résultats"
          valeur={tri}
          choisir={(v) => choisir(v as Tri)}
          options={TRIS.map((t) => ({ valeur: t, libelle: LIBELLES_TRIS_COURTS[t] }))}
        />
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
  const barre = useRef<HTMLDivElement>(null);
  const ancree = useEstAncree(barre);

  return (
    <>
      {/*
        Collante sous la navigation des domaines.

        FOND OPAQUE, jamais translucide. Une barre collante sans fond plein
        laisse voir le contenu qui passe dessous quel que soit le plan de
        superposition : le texte se superpose au texte et les deux deviennent
        illisibles. `--catalog-canvas` et non `--surface-page` — la barre doit
        se confondre avec la surface sur laquelle les cartes défilent, pas avec
        le fond général, sinon elle redevient le bandeau gris qu'on a retiré.

        NIVEAU EXPLICITE, jamais l'ordre du document. `--z-barre-resultats` est
        déclaré sous `--z-barre-domaines`, lui-même sous `--z-entete` : la pile
        se lit dans les jetons, et non dans l'ordre où les composants ont été
        écrits.
      */}
      {/*
        Sous 1024 px, la barre passe en colonne : titre puis ligne de tri. Sur
        une largeur de téléphone, les mettre côte à côte écrase le select à
        quelques dizaines de pixels ou le pousse hors de la barre.
      */}
      <div
        ref={barre}
        /*
          Le filet n'apparaît qu'une fois la barre ancrée. Posé en permanence,
          il trace un trait sous un titre qui ne sépare encore rien ; il ne
          devient une information qu'au moment où du contenu passe dessous.
          `border-transparent` plutôt qu'absence de bordure : retirer la
          bordure décalerait la barre d'un pixel au franchissement du seuil.
        */
        className={`sticky top-[calc(var(--app-header-height)+var(--domain-navigation-height))] z-(--z-barre-resultats) m-0 flex flex-wrap items-center gap-(--space-4) border-b bg-(--catalog-canvas) px-(--nav-padding) pb-(--space-5) pt-(--space-4) transition-colors duration-(--motion-fast) min-[768px]:py-(--space-5) min-[1024px]:w-full min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:justify-between min-[1024px]:gap-x-(--space-12) min-[1024px]:px-0 min-[1024px]:pb-(--space-6) min-[1024px]:pt-(--space-5) ${
          ancree ? "border-(--border-subtle)" : "border-transparent"
        }`}
      >
        {/*
          `h2` : ce titre décrit l'ÉTAT DE LA LISTE — « Tous les parcours », un
          domaine, ou l'intitulé du croisement — pas le sujet de la page, que
          porte le `h1` de l'en-tête du catalogue.

          Il a été promu `h1` le 18 août, quand la page n'en avait aucun : la
          séparation du 17 avait laissé le titre dans le hero de l'accueil, et
          `/catalogue` servait zéro `h1`. L'en-tête de page l'a rendu inutile,
          et deux `h1` sur une page valent mieux qu'aucun mais restent un.
        */}
        <h2 className="m-0 shrink-0 t-heading-4 leading-[1.2] text-(--text-primary)">
          {titre} <CountBadge>{nombre}</CountBadge>
        </h2>

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
