/**
 * Ouverture d'une fiche — un seul point d'appel, pour toutes les vues.
 *
 * POURQUOI CENTRALISER. Le panneau n'existait que dans l'explorateur. Depuis
 * l'aide au choix, un clic sur une correspondance ouvrait une page dédiée, et
 * le retour renvoyait à l'accueil : les réponses au questionnaire et les
 * correspondances étaient perdues. Chaque vue avait sa propre implémentation,
 * et c'est exactement ce qui a produit la divergence.
 *
 * C'est la même correction que celle appliquée au coût : une vue ne décide pas
 * comment ouvrir une fiche, elle consomme. Aucune variante selon l'origine.
 *
 * L'ADRESSE VIT DANS LA RECHERCHE DE LA ROUTE COURANTE, jamais via un appel
 * direct à `window.history.pushState` : `@tanstack/history` patche `pushState`,
 * et un appel direct est interprété par le routeur comme une navigation — il
 * rendait alors `/parcours/<slug>` PAR-DESSUS le panneau. En passant par le
 * routeur sur la route courante, on ne change jamais de route, et le retour
 * arrière, le partage et l'accès direct sont gérés nativement.
 *
 * LES ENTRÉES RESTENT DE VRAIS LIENS. `proprietesLien` rend un `href` réel vers
 * `/parcours/<slug>`, servi en rendu serveur pour un accès direct ou un robot ;
 * le JavaScript n'intercepte que le clic simple sans modificateur. Un
 * Ctrl-clic, un clic milieu ou un « ouvrir dans un nouvel onglet » continuent
 * de fonctionner — ce qu'un `onClick` sur un `<div>` interdit.
 */
import { useCallback, useRef, type MouseEvent, type RefObject } from "react";
import { useNavigate } from "@tanstack/react-router";

/** Le paramètre de recherche qui porte la fiche ouverte, sur toute route. */
export type RechercheFiche = { fiche?: string };

/**
 * Extrait `?fiche=` d'une recherche de route.
 *
 * Chaque route qui ouvre des fiches l'appelle dans son `validateSearch` : sans
 * ça le paramètre est effacé à la première navigation, et le panneau se referme
 * tout seul au premier changement de filtre.
 */
export function validerFiche(recherche: Record<string, unknown>): RechercheFiche {
  return typeof recherche["fiche"] === "string" ? { fiche: recherche["fiche"] } : {};
}

export function useOuvertureFiche({
  retourParDefaut,
}: {
  /**
   * Où renvoyer le focus quand l'élément d'origine a disparu du document.
   *
   * Facultatif : une entrée de liste est toujours encore attachée à la
   * fermeture, donc un composant de liste n'a rien à déclarer. Le repli ne sert
   * qu'aux origines volatiles — l'autocomplétion, dont la liste s'est refermée.
   *
   * Le retour au focus avait été conçu pour un clic sur une rangée, où
   * l'élément existe toujours à la fermeture. Depuis l'autocomplétion il a
   * disparu — la liste s'est refermée. Chaque vue déclare donc son point de
   * repli : le champ de recherche dans l'explorateur, le titre des résultats
   * dans l'aide au choix.
   */
  retourParDefaut?: RefObject<HTMLElement | null> | undefined;
} = {}) {
  /*
    `useNavigate` est typé PAR ROUTE : il n'accepte que la forme de recherche de
    la route depuis laquelle il est appelé. Ce point d'appel est justement
    route-agnostique — c'est sa raison d'être — donc l'inférence ne peut pas
    tenir, et la contrainte est reportée sur `validerFiche`, que chaque route
    appelle dans son `validateSearch`.

    Une seule conversion, à la frontière, et rien au-delà : c'est cette
    conversion qui remplace les trois implémentations divergentes.
  */
  const naviguer = useNavigate() as unknown as (options: {
    search: (actuel: RechercheFiche) => RechercheFiche;
  }) => Promise<void>;
  const origineFocus = useRef<HTMLElement | null>(null);

  const ouvrir = useCallback(
    (slug: string, origine?: HTMLElement | null) => {
      origineFocus.current = origine ?? retourParDefaut?.current ?? null;
      void naviguer({
        search: (actuel: RechercheFiche) => ({ ...actuel, fiche: slug }),
      });
    },
    [naviguer, retourParDefaut],
  );

  const fermer = useCallback(() => {
    void naviguer({
      search: ({ fiche: _ignore, ...reste }: RechercheFiche) => reste,
    });
    // Un élément détaché du document ne peut plus recevoir le focus : on
    // retombe alors sur le point de repli plutôt que de le perdre.
    const cible = origineFocus.current;
    (cible?.isConnected ? cible : retourParDefaut?.current ?? null)?.focus();
    origineFocus.current = null;
  }, [naviguer, retourParDefaut]);

  /**
   * À étaler sur un `<a>` d'entrée de liste.
   *
   * Le `href` est réel et mène à la page complète. Le clic simple est
   * intercepté pour ouvrir le panneau ; tout le reste — modificateurs, clic
   * milieu, menu contextuel — passe au navigateur.
   */
  const proprietesLien = useCallback(
    (slug: string) => ({
      href: `/parcours/${slug}`,
      onClick: (evenement: MouseEvent<HTMLAnchorElement>) => {
        if (
          evenement.defaultPrevented ||
          evenement.button !== 0 ||
          evenement.metaKey ||
          evenement.ctrlKey ||
          evenement.shiftKey ||
          evenement.altKey ||
          // Un lien qui déclare sa cible veut ouvrir ailleurs : l'intercepter
          // contredirait ce qu'il annonce.
          evenement.currentTarget.hasAttribute("target")
        ) {
          return;
        }
        evenement.preventDefault();
        ouvrir(slug, evenement.currentTarget);
      },
    }),
    [ouvrir],
  );

  return { ouvrir, fermer, proprietesLien };
}
