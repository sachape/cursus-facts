/**
 * Navigation persistante.
 *
 * Cinq vues, l'onglet actif marqué. Sur mobile la barre défile
 * horizontalement plutôt que de se replier dans un menu : cinq entrées se
 * parcourent plus vite qu'un menu à ouvrir, et masquer la page Méthode
 * derrière un bouton reviendrait à masquer les règles.
 */
import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useHauteurPubliee } from "./pile-collante";
import { MotSymboleHorizontal, Symbole } from "./marque/Marques";

const VUES = [
  { to: "/", libelle: "Explorer" },
  { to: "/comparer", libelle: "Comparer" },
  { to: "/aide-au-choix", libelle: "Aide au choix" },
  { to: "/organismes", libelle: "Organismes" },
  { to: "/methode", libelle: "Méthode" },
] as const;

export function Navigation() {
  const barre = useRef<HTMLElement>(null);
  useHauteurPubliee(barre, "--app-header-height");

  return (
    <header ref={barre} className="sticky top-0 z-50 mb-0 h-(--app-header-height) py-0 border-b border-(--border-subtle) bg-(--surface-page)">
      <div className="mx-auto flex h-full max-w-(--contenu-largeur-max) items-center gap-(--space-8) px-(--space-6) py-0">
        {/*
          Le mot-symbole précède la navigation et ramène à l'accueil : c'est le
          seul repère qui dit où l'on est quand on arrive par une fiche
          indexée.
        */}
        <Link
          to="/"
          aria-label="Formlist — accueil"
          className="shrink-0 rounded-(--radius-sm) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--border-strong)"
        >
          {/*
            Le mot-symbole complet à partir de 1 024 px ; le symbole seul en
            dessous, où la largeur manque et où le nom figure déjà dans l'onglet
            du navigateur.
          */}
          <MotSymboleHorizontal className="hidden h-(--space-8) w-auto text-(--text-primary) min-[1024px]:block" />
          <Symbole className="block size-(--space-8) text-(--text-primary) min-[1024px]:hidden" />
        </Link>

        <nav aria-label="Navigation principale">
          <ul className="-mx-1 flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {VUES.map((vue) => (
              <li key={vue.to} className="shrink-0">
                <Link
                  to={vue.to}
                  activeOptions={{ exact: vue.to === "/" }}
                  className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-foreground data-[status=active]:text-background"
                >
                  {vue.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
