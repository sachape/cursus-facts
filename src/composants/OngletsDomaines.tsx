/**
 * Onglets de domaines — premier niveau de navigation.
 *
 * Le domaine n'est pas un filtre parmi d'autres : c'est le premier niveau de
 * la hiérarchie Domaine → Sujet principal → Compétences couvertes. Le placer
 * dans la colonne de filtres, entre le format et le niveau d'entrée, le
 * ferait lire comme une case à cocher de plus. Il se lit ici comme une
 * navigation, en pleine largeur, avant la zone de résultats.
 *
 * Un seul domaine actif à la fois, et cliquer sur l'onglet actif ne le
 * désactive pas : on revient à l'ensemble par « Tous les domaines ». Un onglet
 * de navigation qui se décoche au second clic est une bascule déguisée.
 */
import { useRef } from "react";
import type { DomaineParcours } from "@/types/cursus";
import { useHauteurPubliee } from "./pile-collante";
import { CountBadge } from "./CountBadge";

export type OngletDomaine = {
  /** `null` pour l'onglet « Tous les domaines ». */
  domaine: DomaineParcours | null;
  libelle: string;
  nombre: number;
};

export function OngletsDomaines({
  onglets,
  actif,
  choisir,
}: {
  onglets: readonly OngletDomaine[];
  actif: DomaineParcours | null;
  choisir: (domaine: DomaineParcours | null) => void;
}) {
  const barre = useRef<HTMLElement>(null);
  useHauteurPubliee(barre, "--domain-navigation-height");

  return (
    /*
      Collante : le domaine est le premier niveau de navigation, et le perdre
      en défilant oblige à remonter pour savoir dans quel rayon on se trouve.
      Défilable horizontalement — neuf domaines ne tiennent pas sous 960 px, et
      un retour à la ligne casserait la lecture en une seule bande.
    */
    <nav
      aria-label="Domaines"
      ref={barre}
      className="sticky top-(--app-header-height) z-40 m-0 w-full max-w-full border-b border-(--border-subtle) bg-(--catalog-canvas) px-(--nav-padding)"
    >
      <ul
        className="flex max-w-full min-h-(--nav-hauteur) [overscroll-behavior-x:contain] items-stretch gap-(--nav-gap) overflow-x-auto overflow-y-hidden whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {onglets.map((onglet) => {
          const estActif = onglet.domaine === actif;
          return (
            <li key={onglet.domaine ?? "tous"} className="shrink-0">
              {/*
                Le trait actif REMPLACE la portion du séparateur, il ne s'ajoute
                pas au-dessus : posé en `bottom: -1px`, il recouvre exactement le
                filet du conteneur. Une bordure sur le bouton produisait deux
                lignes concurrentes à quelques pixels l'une de l'autre.
              */}
              <button
                type="button"
                aria-current={estActif ? "true" : undefined}
                onClick={() => choisir(onglet.domaine)}
                className={`relative inline-flex min-h-(--nav-hauteur) items-center gap-(--space-2) whitespace-nowrap t-body-sm transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:content-[''] ${
                  estActif
                    ? "font-medium text-(--text-primary) after:bg-(--text-primary)"
                    : "text-(--text-secondary) after:bg-transparent hover:text-(--text-primary)"
                }`}
              >
                {onglet.libelle}
                <CountBadge>{onglet.nombre}</CountBadge>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
