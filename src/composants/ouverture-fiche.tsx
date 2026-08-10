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
import type { ParcoursListe } from "@/donnees/requetes";
import { mesurer, proprietesParcours, type SourceVue } from "./mesure";

/**
 * La position de défilement au moment du clic.
 *
 * Partagée au niveau du module, et c'est assumé : le verrou de défilement
 * s'applique au MONTAGE du panneau, c'est-à-dire après que quelque chose a déjà
 * ramené la liste de 2 600 px à 721. Il ne peut donc pas capter la bonne valeur
 * lui-même — il faut la lui transmettre depuis l'instant du clic, qui est le
 * seul où elle est encore juste.
 */
let positionAvantPanneau: number | null = null;

export function positionAConserver(): number | null {
  return positionAvantPanneau;
}

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
  source,
}: {
  /**
   * L'origine du geste, quand elle est plus précise que la vue courante.
   *
   * Une suggestion d'autocomplétion et une entrée de liste vivent sur la même
   * page mais ne sont pas la même intention : l'une vient d'un nom qu'on
   * connaissait déjà, l'autre d'un parcours dans les résultats. Sans ce
   * paramètre, les deux se confondraient sous `explorateur`.
   */
  source?: SourceVue | undefined;
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
    resetScroll?: boolean;
  }) => Promise<void>;
  const origineFocus = useRef<HTMLElement | null>(null);

  const ouvrir = useCallback(
    (parcours: ParcoursListe, origine?: HTMLElement | null) => {
      origineFocus.current = origine ?? retourParDefaut?.current ?? null;
      /*
        LE PARCOURS, ET NON SON SLUG. C'est ce qui permet à l'ouverture d'être
        le point d'appel unique de `fiche_ouverte` : les propriétés communes se
        construisent ici, une fois, à partir de l'objet que chaque vue possède
        déjà. Une vue qui n'aurait qu'un slug devrait recomposer — et c'est
        exactement comme ça qu'on obtient six variantes du même événement.

        Mesuré sur le GESTE, pas sur le montage du panneau : un accès direct à
        `/parcours/<slug>` par un robot ou un lien partagé n'est pas quelqu'un
        qui ouvre une fiche, et le compter le ferait mentir dans le sens de nos
        400 URL indexées.
      */
      mesurer("fiche_ouverte", {
        ...proprietesParcours(parcours),
        ...(source !== undefined ? { source_vue: source } : {}),
      });
      /*
        LA POSITION EST CAPTÉE AVANT LA NAVIGATION, et rendue après.

        `resetScroll: false` ne suffit pas : quelque chose entre le clic et le
        montage du panneau ramenait la liste de 2 600 px à 721. Plutôt que de
        chercher lequel des maillons, on rétablit ce qu'on avait — la mesure
        décide, pas la théorie sur le coupable.
      */
      positionAvantPanneau = window.scrollY;
      void naviguer({
        search: (actuel: RechercheFiche) => ({ ...actuel, fiche: parcours.slug }),
        /*
          AUCUN DÉFILEMENT. Le routeur remonte en haut à chaque navigation —
          c'est le bon comportement pour un changement de page, et le mauvais
          ici : ouvrir un panneau n'est pas quitter la vue. Sans cette ligne,
          la personne perdait sa position dans la liste à l'ouverture, et la
          retrouvait en haut à la fermeture.
        */
        resetScroll: false,
      });
    },
    [naviguer, retourParDefaut, source],
  );

  const fermer = useCallback(() => {
    void naviguer({
      search: ({ fiche: _ignore, ...reste }: RechercheFiche) => reste,
      // Même raison qu'à l'ouverture : la fermeture rend la vue telle quelle.
      resetScroll: false,
    });
    positionAvantPanneau = null;
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
    (parcours: ParcoursListe) => ({
      href: `/parcours/${parcours.slug}`,
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
        ouvrir(parcours, evenement.currentTarget);
      },
    }),
    [ouvrir],
  );

  return { ouvrir, fermer, proprietesLien };
}
