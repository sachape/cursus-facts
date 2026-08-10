/**
 * L'emplacement d'action de l'en-tête, enfin rempli.
 *
 * Il a été réservé vide au chantier de l'en-tête mobile, à la LARGEUR EXACTE du
 * burger, pour que le logo tombe au centre réel de la barre. C'est ce qui
 * permet de le remplir aujourd'hui sans que rien ne bouge — le logo reste
 * exactement où il était.
 *
 * `--burger-cible` est donc réutilisé ici : ce n'est pas un hasard de valeur,
 * c'est la même contrainte. Les deux doivent rester liés.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "./authentification";

const ENTREES = [
  { to: "/mes-formations", libelle: "Mes formations" },
  { to: "/mes-comparaisons", libelle: "Mes comparaisons" },
  { to: "/mes-alertes", libelle: "Mes alertes" },
] as const;

export function MenuCompte() {
  const { utilisateur, chargement, deconnecter } = useAuth();
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLDivElement>(null);

  /*
    Fermeture au clic extérieur et à Échap. Un menu qu'on ne peut fermer qu'en
    recliquant le déclencheur reste ouvert par accident, et masque le contenu
    sous lui sur un écran étroit.
  */
  useEffect(() => {
    if (!ouvert) return;
    const auClic = (e: MouseEvent) => {
      if (zone.current !== null && !zone.current.contains(e.target as Node)) setOuvert(false);
    };
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", auClic);
    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("mousedown", auClic);
      document.removeEventListener("keydown", auClavier);
    };
  }, [ouvert]);

  /*
    Tant qu'on ne sait pas, on n'affiche NI l'un NI l'autre — mais on garde la
    place. Afficher « Se connecter » puis le remplacer par une initiale une
    demi-seconde plus tard fait clignoter l'en-tête à chaque chargement, et
    c'est le genre de détail qui donne l'impression d'un site qui hésite.
  */
  if (chargement) {
    return <div aria-hidden="true" className="size-(--burger-cible) shrink-0" />;
  }

  if (utilisateur === null) {
    /*
      DEUX FORMES, ET CE N'EST PAS UN CAPRICE. Sous 1 024 px, cet emplacement
      doit faire EXACTEMENT la largeur du burger, sinon le logo n'est plus au
      centre — l'invariant de rendu l'a attrapé dès le premier essai, avec un
      libellé texte qui débordait de la zone réservée.

      Le pictogramme tient dans 44 px ; le libellé complet apparaît en version
      bureau, où la barre n'est plus une composition à trois zones.
    */
    return (
      <Link
        to="/connexion"
        aria-label="Se connecter"
        className="inline-flex h-(--burger-cible) shrink-0 items-center justify-center rounded-(--radius-md) text-(--text-primary) transition-colors duration-(--motion-fast) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) max-[1023px]:w-(--burger-cible) min-[1024px]:px-(--space-3)"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-(--signet-taille) min-[1024px]:hidden"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
        </svg>
        <span className="hidden t-body-sm min-[1024px]:inline">Se connecter</span>
      </Link>
    );
  }

  const initiale = (utilisateur.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div ref={zone} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-haspopup="menu"
        aria-label="Menu du compte"
        className="grid size-(--burger-cible) place-items-center rounded-(--radius-full) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
      >
        <span className="grid size-(--space-8) place-items-center rounded-(--radius-full) bg-(--interactive-default) t-body-sm font-medium text-(--text-on-inverse)">
          {initiale}
        </span>
      </button>

      {ouvert && (
        <div
          role="menu"
          className="absolute right-0 top-full z-(--z-suggestions) mt-(--space-2) w-(--menu-compte-largeur) overflow-hidden rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) py-(--space-2) shadow-(--elevation-3)"
        >
          <p className="truncate px-(--space-4) pb-(--space-2) t-caption text-(--text-tertiary)">
            {utilisateur.email}
          </p>
          {ENTREES.map((e) => (
            <Link
              key={e.to}
              to={e.to}
              role="menuitem"
              onClick={() => setOuvert(false)}
              className="flex h-(--menu-entree-hauteur) items-center px-(--space-4) t-body-sm text-(--text-primary) transition-colors duration-(--motion-fast) hover:bg-(--surface-hover)"
            >
              {e.libelle}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOuvert(false);
              void deconnecter();
            }}
            className="flex h-(--menu-entree-hauteur) w-full items-center border-t border-(--border-subtle) px-(--space-4) t-body-sm text-(--text-secondary) transition-colors duration-(--motion-fast) hover:bg-(--surface-hover) hover:text-(--text-primary)"
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
