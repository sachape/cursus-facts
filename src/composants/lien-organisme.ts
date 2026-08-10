/**
 * Aller à un organisme — un seul point d'appel, pour toutes les vues.
 *
 * TROISIÈME CORRECTION DU MÊME DÉFAUT EN UN JOUR. La vue Organismes filtrait
 * l'explorateur, puis la bande défilante, puis l'autocomplétion. Chaque fois la
 * même cause : la consigne d'origine — « organisme pose un filtre, c'est son
 * rôle » — datait d'AVANT la page dédiée, et chaque vue l'appliquait pour son
 * compte.
 *
 * Corriger au cas par cas garantit un quatrième cas au prochain point d'entrée
 * ajouté. C'est le même remède que pour l'ouverture des fiches : une vue ne
 * décide pas où mène un organisme, elle consomme.
 *
 * UN `href`, JAMAIS UN GESTIONNAIRE DE CLIC là où c'est possible. Ces 163 pages
 * sont de la traîne longue et un robot ne déclenche pas de `onClick`. Là où le
 * contexte impose un gestionnaire — une liste de suggestions, où l'entrée n'est
 * pas un lien —, la navigation passe par `useAllerOrganisme`.
 */
import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { slugifierOrganisme } from "@/modele/organismes";

/** L'adresse de la page d'un organisme, depuis son nom. */
export function hrefOrganisme(nom: string): string {
  return `/organismes/${slugifierOrganisme(nom)}`;
}

/**
 * Navigue vers la page d'un organisme.
 *
 * Réservé aux contextes où l'élément ne peut pas être un lien. Partout
 * ailleurs, `hrefOrganisme` sur un `<a>` — c'est ce qui rend la page
 * indexable.
 */
export function useAllerOrganisme(): (nom: string) => void {
  const naviguer = useNavigate();
  return useCallback(
    (nom: string) => {
      void naviguer({ to: "/organismes/$slug", params: { slug: slugifierOrganisme(nom) } });
    },
    [naviguer],
  );
}
