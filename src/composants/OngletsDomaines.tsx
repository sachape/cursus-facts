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
import type { DomaineParcours } from "@/types/cursus";

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
  return (
    <nav aria-label="Domaines" className="border-t border-border">
      <ul
        className="-mb-px flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {onglets.map((onglet) => {
          const estActif = onglet.domaine === actif;
          return (
            <li key={onglet.domaine ?? "tous"} className="shrink-0 mr-[--space-6] last:mr-0">
              <button
                type="button"
                aria-current={estActif ? "true" : undefined}
                onClick={() => choisir(onglet.domaine)}
                className={`whitespace-nowrap border-b-2 py-[--space-3] t-body-sm transition-colors ${
                  estActif
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {onglet.libelle}
                <span className="chiffre ml-1.5 text-xs text-muted-foreground/60">
                  {onglet.nombre}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
