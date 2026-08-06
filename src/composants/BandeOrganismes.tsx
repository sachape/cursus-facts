/**
 * Bande d'organismes référencés.
 *
 * POURQUOI DES ORGANISMES ET NON DES FORMATIONS. Mettre huit parcours en avant
 * sur 233 supposerait un critère de sélection, donc un classement — ce que le
 * produit refuse de produire. Montrer qui est référencé est un fait, pas un
 * jugement, et c'est la démonstration visuelle de la proposition de valeur.
 *
 * ORDRE ALÉATOIRE À CHAQUE CHARGEMENT. C'est ce qui règle définitivement la
 * question de l'équité : aucun organisme n'est durablement mieux placé qu'un
 * autre, et il n'y a aucun critère à défendre devant celui qui se plaindrait
 * d'être en fin de bande.
 *
 * Le mélange se fait APRÈS montage, jamais au rendu serveur : un ordre tiré au
 * sort des deux côtés différerait, et l'hydratation échouerait.
 */
import { useEffect, useMemo, useState } from "react";
import type { CategorieOrganisme } from "@/types/cursus";
import { LIBELLES_CATEGORIES } from "@/modele/vocabulaires";

export type OrganismeBande = {
  nom: string;
  categorie: CategorieOrganisme;
  parcours: number;
};

/** Mélange sans modifier la source. */
function melanger<T>(liste: readonly T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j]!, copie[i]!];
  }
  return copie;
}

function Element({
  organisme,
  choisir,
}: {
  organisme: OrganismeBande;
  choisir: (nom: string) => void;
}) {
  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={() => choisir(organisme.nom)}
        className="flex items-baseline gap-(--space-3) whitespace-nowrap rounded-(--radius-sm) px-(--space-2) py-(--space-1) text-left transition-colors duration-(--motion-fast) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
      >
        <span className="t-body text-(--text-primary)">{organisme.nom}</span>
        <span className="t-caption text-(--text-tertiary)">
          {LIBELLES_CATEGORIES[organisme.categorie]}
        </span>
        <span className="t-data-sm text-(--text-tertiary)">{organisme.parcours}</span>
      </button>
    </li>
  );
}

export function BandeOrganismes({
  organismes,
  choisir,
}: {
  organismes: OrganismeBande[];
  /** Filtre l'explorateur sur cet organisme. */
  choisir: (nom: string) => void;
}) {
  const [ordre, setOrdre] = useState(organismes);
  useEffect(() => setOrdre(melanger(organismes)), [organismes]);

  // Liste dupliquée : la seconde copie prend le relais quand la première sort,
  // ce qui rend la boucle continue et le raccord invisible.
  const boucle = useMemo(() => [...ordre, ...ordre], [ordre]);

  return (
    <section className="border-y border-(--border-subtle) py-(--space-4)">
      <p className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) pb-(--space-3) t-label text-(--text-tertiary)">
        <span className="chiffre">{organismes.length}</span> organismes référencés
      </p>

      {/*
        Masque de 64 px à chaque extrémité : sans lui, les éléments
        apparaissent et disparaissent net au bord, ce qui se lit comme un défaut
        de rendu plutôt que comme un défilement.
      */}
      <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_var(--bande-masque),black_calc(100%-var(--bande-masque)),transparent)]">
        <ul
          /*
            Animation par `transform` seulement : une marge ou une position de
            défilement animée recalculerait la mise en page à chaque image.
          */
          className="flex w-max items-center gap-(--space-8) will-change-transform motion-safe:animate-[defile_var(--bande-duree)_linear_infinite] group-hover:[animation-play-state:paused] max-[639px]:gap-(--space-6) max-[639px]:[--bande-duree:var(--bande-duree-mobile)]"
        >
          {boucle.map((organisme, index) => (
            <Element
              key={`${organisme.nom}-${index}`}
              organisme={organisme}
              choisir={choisir}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
