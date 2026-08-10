/**
 * Navigation persistante.
 *
 * AU-DESSUS DE 1 024 PX, cinq vues en ligne, l'onglet actif marqué.
 *
 * EN DESSOUS, un vrai en-tête mobile. La barre défilante horizontale a été
 * essayée et abandonnée : elle coupait les entrées sous 900 px, et un libellé
 * tronqué ne se parcourt pas plus vite qu'un menu — il se devine. Le menu ne
 * masque rien puisqu'il expose les cinq entrées d'un coup, Méthode comprise.
 *
 * TROIS ZONES, ET LA TROISIÈME EST VIDE À DESSEIN. Burger à gauche, logo au
 * centre, emplacement d'action à droite — réservé à la même largeur que le
 * burger. Il accueillera l'inscription ; sans lui, le logo se décalerait le jour
 * où on l'ajoute, et un logo qui bouge d'un chantier à l'autre se remarque plus
 * que le bouton qu'on a ajouté.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useHauteurPubliee } from "./pile-collante";
import { usePiegeFocus, useVerrouDefilement } from "./piege-focus";
import { MotSymboleHorizontal, Symbole } from "./marque/Marques";

const VUES = [
  { to: "/", libelle: "Explorer" },
  { to: "/comparer", libelle: "Comparer" },
  { to: "/aide-au-choix", libelle: "Aide au choix" },
  { to: "/organismes", libelle: "Organismes" },
  { to: "/methode", libelle: "Méthode" },
] as const;

/** Les trois traits, qui deviennent une croix. */
function IconeBurger({ ouvert }: { ouvert: boolean }) {
  const trait =
    "absolute h-(--burger-trait-epaisseur) w-(--burger-trait-largeur) rounded-(--radius-full) bg-current transition-transform duration-(--motion-fast)";
  return (
    <span
      aria-hidden="true"
      className="relative grid size-(--burger-trait-largeur) place-items-center"
    >
      <span
        className={`${trait} ${ouvert ? "translate-y-0 rotate-45" : "-translate-y-(--burger-trait-ecart)"}`}
      />
      {/* Le trait du milieu s'efface plutôt que de pivoter : trois traits
          superposés à 45° épaississent la croix. */}
      <span
        className={`${trait} transition-opacity duration-(--motion-fast) ${ouvert ? "opacity-0" : "opacity-100"}`}
      />
      <span
        className={`${trait} ${ouvert ? "translate-y-0 -rotate-45" : "translate-y-(--burger-trait-ecart)"}`}
      />
    </span>
  );
}

export function Navigation() {
  const barre = useRef<HTMLElement>(null);
  useHauteurPubliee(barre, "--app-header-height");

  const [ouvert, setOuvert] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const fermer = useCallback(() => setOuvert(false), []);

  usePiegeFocus({ actif: ouvert, conteneur: menu, fermer, retourFocus: burger });
  useVerrouDefilement(ouvert);

  /*
    Le menu se referme au changement de route. Sans ça, choisir une entrée
    laisse le panneau ouvert par-dessus la vue qu'on vient de demander — et
    l'utilisateur croit que son clic n'a rien fait.
  */
  const chemin = useRouterState({ select: (e) => e.location.pathname });
  useEffect(() => setOuvert(false), [chemin]);

  const lienDeVue =
    "block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-foreground data-[status=active]:text-background";

  return (
    <header
      ref={barre}
      className="sticky top-0 z-(--z-entete) mb-0 h-(--header-hauteur) border-b border-(--border-subtle) bg-(--surface-page) py-0"
    >
      <div className="mx-auto flex h-full max-w-(--contenu-largeur-max) items-center gap-(--space-8) px-(--space-6) py-0 max-[1023px]:gap-0 max-[1023px]:px-(--space-4)">
        <button
          ref={burger}
          type="button"
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
          aria-controls="menu-principal"
          aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
          className="grid size-(--burger-cible) shrink-0 place-items-center rounded-(--radius-md) text-(--text-primary) transition-colors duration-(--motion-fast) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) min-[1024px]:hidden"
        >
          <IconeBurger ouvert={ouvert} />
        </button>

        {/*
          Le mot-symbole précède la navigation et ramène à l'accueil : c'est le
          seul repère qui dit où l'on est quand on arrive par une fiche indexée.

          Sous 1 024 px il est centré — `flex-1` de chaque côté, et le logo au
          milieu. C'est le centrage OPTIQUE que réclame la composition à trois
          zones, et il n'est juste que si les deux zones latérales font la même
          largeur ; d'où l'emplacement réservé à droite.
        */}
        <div className="flex min-w-0 items-center max-[1023px]:flex-1 max-[1023px]:justify-center">
          <Link
            to="/"
            aria-label="Formlist — accueil"
            className="shrink-0 rounded-(--radius-sm) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--border-strong)"
          >
            <MotSymboleHorizontal className="hidden h-(--space-8) w-auto text-(--text-primary) min-[1024px]:block" />
            <Symbole className="block size-(--space-8) text-(--text-primary) min-[1024px]:hidden" />
          </Link>
        </div>

        <nav aria-label="Navigation principale" className="min-w-0 max-[1023px]:hidden">
          <ul className="-mx-1 flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {VUES.map((vue) => (
              <li key={vue.to} className="shrink-0">
                <Link to={vue.to} activeOptions={{ exact: vue.to === "/" }} className={lienDeVue}>
                  {vue.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/*
          EMPLACEMENT D'ACTION, vide et occupant sa place. Il équilibre le
          burger pour que le logo tombe au centre réel de la barre. Le remplir
          plus tard ne déplacera donc rien.
        */}
        <div
          aria-hidden="true"
          className="size-(--burger-cible) shrink-0 min-[1024px]:hidden"
        />
      </div>

      {ouvert && (
        <>
          {/* Voile : ferme au clic, hors du parcours clavier puisque Échap fait
              le même travail. */}
          <div
            onClick={fermer}
            aria-hidden="true"
            className="fixed inset-0 z-(--z-voile) bg-(--neutral-100)/30 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-(--motion-panel) min-[1024px]:hidden"
          />
          <div
            ref={menu}
            id="menu-principal"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation principale"
            className="fixed inset-y-0 left-0 z-(--z-panneau) flex w-(--menu-largeur) flex-col border-r border-(--border-subtle) bg-(--surface-raised) motion-safe:animate-in motion-safe:slide-in-from-left motion-safe:duration-(--motion-panel) min-[1024px]:hidden"
          >
            <div className="flex h-(--header-hauteur) shrink-0 items-center px-(--space-4)">
              <button
                type="button"
                onClick={fermer}
                aria-label="Fermer le menu"
                className="grid size-(--burger-cible) place-items-center rounded-(--radius-md) text-(--text-primary) transition-colors duration-(--motion-fast) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
              >
                <IconeBurger ouvert />
              </button>
            </div>

            <ul className="flex flex-col px-(--space-3)">
              {VUES.map((vue) => (
                <li key={vue.to}>
                  <Link
                    to={vue.to}
                    activeOptions={{ exact: vue.to === "/" }}
                    onClick={fermer}
                    className="flex h-(--menu-entree-hauteur) items-center rounded-(--radius-md) px-(--space-3) t-body text-(--text-primary) transition-colors duration-(--motion-fast) hover:bg-(--surface-hover) data-[status=active]:bg-foreground data-[status=active]:text-background"
                  >
                    {vue.libelle}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </header>
  );
}
