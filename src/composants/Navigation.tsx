/**
 * Navigation persistante.
 *
 * Cinq vues, l'onglet actif marqué. Sur mobile la barre défile
 * horizontalement plutôt que de se replier dans un menu : cinq entrées se
 * parcourent plus vite qu'un menu à ouvrir, et masquer la page Méthode
 * derrière un bouton reviendrait à masquer les règles.
 */
import { Link } from "@tanstack/react-router";

const VUES = [
  { to: "/", libelle: "Explorer" },
  { to: "/comparer", libelle: "Comparer" },
  { to: "/aide-au-choix", libelle: "Aide au choix" },
  { to: "/organismes", libelle: "Organismes" },
  { to: "/methode", libelle: "Méthode" },
] as const;

export function Navigation() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
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
