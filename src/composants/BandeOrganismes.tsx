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
 *
 * UNE VITESSE, JAMAIS UNE DURÉE. `--bande-duree` valait 50 s en dur, donc la
 * vitesse dépendait de la taille du catalogue : chaque organisme ajouté
 * accélérait la bande. La durée est maintenant DÉRIVÉE de la largeur mesurée
 * et de `--bande-vitesse`, et le catalogue peut tripler sans que rien ne bouge.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CategorieOrganisme } from "@/types/cursus";
import { LIBELLES_CATEGORIES } from "@/modele/vocabulaires";
import { slugifierOrganisme } from "@/modele/organismes";
import { IconeCategorie } from "./OrganizationMark";

export type OrganismeBande = {
  nom: string;
  categorie: CategorieOrganisme;
  parcours: number;
};

/**
 * `useLayoutEffect` côté client, `useEffect` au rendu serveur.
 *
 * La mesure doit précéder la première image, sinon la bande démarre sur la
 * durée de repli et corrige sa vitesse sous les yeux du visiteur. Mais React
 * avertit à chaque rendu serveur si `useLayoutEffect` y est appelé.
 */
const useEffetDeMise = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Mélange sans modifier la source. */
function melanger<T>(liste: readonly T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j]!, copie[i]!];
  }
  return copie;
}

/** Lit un jeton numérique sans unité sur la racine du document. */
function jeton(nom: `--${string}`, repli: number): number {
  if (typeof window === "undefined") return repli;
  const brut = getComputedStyle(document.documentElement).getPropertyValue(nom);
  const valeur = parseFloat(brut);
  return Number.isFinite(valeur) && valeur > 0 ? valeur : repli;
}

/**
 * Lit un jeton de DURÉE, en millisecondes.
 *
 * `parseFloat` sur une durée calculée est un piège : `--bande-deceleration`
 * est déclaré `400ms`, et `getComputedStyle` le rend normalisé — « .4s ».
 * `parseFloat` en tirait 0,4, et la décélération durait quatre dixièmes de
 * milliseconde. Elle s'exécutait donc, sans erreur et sans test rouge, en une
 * seule image : exactement l'arrêt net qu'elle devait remplacer.
 *
 * C'est le motif du §8 sous une forme de plus — la règle est juste, le jeton
 * est juste, la lecture en aval passe à côté. L'unité se lit, elle ne se
 * suppose pas.
 */
function jetonDuree(nom: `--${string}`, repli: number): number {
  if (typeof window === "undefined") return repli;
  const brut = getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
  const valeur = parseFloat(brut);
  if (!Number.isFinite(valeur) || valeur <= 0) return repli;
  // L'ordre compte : « ms » finit par « s ».
  return /ms$/.test(brut) ? valeur : /s$/.test(brut) ? valeur * 1000 : repli;
}

function Carte({ organisme }: { organisme: OrganismeBande }) {
  return (
    <li className="shrink-0">
      {/*
        UN VRAI LIEN, PAS UN GESTIONNAIRE DE CLIC.

        La carte filtrait l'explorateur — la personne quittait la bande, perdait
        sa position, et atterrissait dans une liste qui ne disait rien de
        l'organisme. La vue Organismes a été corrigée au chantier de la page
        dédiée ; la bande n'avait pas suivi.

        Et un `href` réel n'est pas un détail de forme : ces 163 pages sont de
        la traîne longue, et un robot ne déclenche pas de gestionnaire de clic.
        Un `<button>` les aurait rendues invisibles depuis l'accueil.
      */}
      <a
        href={`/organismes/${slugifierOrganisme(organisme.nom)}`}
        /*
          Une carte, pas un bloc de texte au fond gris : le fond au survol
          appartient au registre d'une liste de résultats, où le survol désigne
          une ligne parmi d'autres. Ici chaque organisme est une unité, et c'est
          le filet plus l'élévation qui le disent.

          Transition sur `box-shadow` et `border-color` seulement : animer
          `all` reprendrait la transformation de défilement à chaque image.
        */
        className="group/carte flex h-(--bande-carte-hauteur) min-w-(--bande-carte-min) max-w-(--bande-carte-max) items-center gap-(--space-3) overflow-hidden rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) px-(--space-4) py-(--space-3) text-left shadow-(--elevation-1) transition-[box-shadow,border-color] duration-(--motion-fast) hover:border-(--border-default) hover:shadow-(--elevation-2) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
      >
        {/*
          ANCRAGE, PAS DÉCORATION. Le pictogramme porte la catégorie — retirer
          l'un fait perdre l'autre — et il donne à l'œil un point d'entrée dans
          une bande dense. C'est le jeu de `IconeCategorie`, celui des rangées
          de résultats : un second vocabulaire de formes obligerait à apprendre
          deux fois la même chose.

          Une catégorie sans pictogramme reçoit le générique, jamais un vide :
          une carte sans cadre romprait l'alignement de toute la bande.

          Taille et épaisseur passent par le CSS et non par les props du
          composant d'icône, pour que les jetons restent la seule source.
        */}
        <span className="grid size-(--bande-picto-cadre) shrink-0 place-items-center rounded-(--radius-md) bg-(--surface-sunken) text-(--text-secondary) transition-colors duration-(--motion-fast) group-hover/carte:text-(--text-primary) [&>svg]:size-(--bande-picto-taille) [&>svg]:[stroke-width:var(--bande-picto-trait)]">
          <IconeCategorie categorie={organisme.categorie} />
        </span>

        <span className="flex min-w-0 flex-col gap-(--space-1)">
          <span className="t-body truncate font-medium text-(--text-primary)">
            {organisme.nom}
          </span>
          <span className="t-caption truncate text-(--text-tertiary)">
            {LIBELLES_CATEGORIES[organisme.categorie]}
          </span>
        </span>

        {/*
          Le mot « parcours » a quitté la carte : le surtitre de la bande donne
          le contexte une fois, le répéter cent soixante-trois fois n'apprend
          rien. Il reste à la lecture d'écran, où le contexte ne se déduit pas
          d'une position à l'écran.
        */}
        <span className="ml-auto inline-flex h-(--bande-badge-hauteur) shrink-0 items-center rounded-(--radius-full) bg-(--surface-sunken) px-(--space-2) t-data-sm text-(--text-secondary) transition-colors duration-(--motion-fast) group-hover/carte:bg-(--surface-hover)">
          {organisme.parcours}
          <span className="sr-only"> parcours référencés</span>
        </span>
      </a>
    </li>
  );
}

export function BandeOrganismes({ organismes }: { organismes: OrganismeBande[] }) {
  const [ordre, setOrdre] = useState(organismes);
  useEffect(() => setOrdre(melanger(organismes)), [organismes]);

  // Liste dupliquée : la seconde copie prend le relais quand la première sort,
  // ce qui rend la boucle continue et le raccord invisible.
  const boucle = useMemo(() => [...ordre, ...ordre], [ordre]);

  const piste = useRef<HTMLUListElement>(null);

  /*
    La durée dérivée de la largeur mesurée.

    `defile` translate de -50 % : la distance réellement parcourue en un cycle
    vaut la MOITIÉ de la largeur de la piste dupliquée, soit une copie de la
    liste. C'est cette distance-là, et non la largeur totale, qu'il faut diviser
    par la vitesse — sinon la bande défile deux fois trop vite tout en affichant
    un chiffre qui semble juste.

    Remesuré à chaque changement de taille : les polices d'affichage arrivent
    après le premier rendu et élargissent les cartes.
  */
  useEffetDeMise(() => {
    const element = piste.current;
    if (element === null) return;

    const publier = () => {
      const parcourue = element.getBoundingClientRect().width / 2;
      if (parcourue <= 0) return;
      const secondes = parcourue / jeton("--bande-vitesse", 40);
      element.style.setProperty("--bande-duree", `${secondes}s`);
    };

    publier();
    const observateur = new ResizeObserver(publier);
    observateur.observe(element);
    return () => observateur.disconnect();
  }, [boucle.length]);

  /*
    Décélération à la mise en pause.

    `animation-play-state: paused` arrête l'image en cours, ce qui se lit comme
    un accroc. On tempère le taux de lecture de l'animation à la main : c'est le
    seul levier qui ralentisse un défilement continu sans toucher à sa durée
    déclarée — celle-là reste lisible par les invariants de rendu, qui en
    déduisent la vitesse effective.
  */
  const tween = useRef<number | null>(null);
  const viser = useCallback((cible: number) => {
    const element = piste.current;
    if (element === null) return;
    const animation = element.getAnimations()[0];
    // Absente sous `prefers-reduced-motion` : il n'y a alors rien à ralentir.
    if (animation === undefined) return;

    if (tween.current !== null) cancelAnimationFrame(tween.current);
    const depart = animation.playbackRate;
    if (depart === cible) return;
    const duree = jetonDuree("--bande-deceleration", 400);
    const debut = performance.now();

    const pas = (maintenant: number) => {
      /*
        Borné des DEUX côtés. L'horodatage passé à `requestAnimationFrame` est
        celui du début de l'image courante, qui peut PRÉCÉDER le
        `performance.now()` capté dans le gestionnaire d'événement : l'écart
        devenait négatif, la courbe partait à l'envers, et la bande accélérait
        à 2 326 fois sa vitesse avant de retomber.
      */
      const avancement = Math.min(Math.max((maintenant - debut) / duree, 0), 1);
      // Sortie cubique : le gros du ralentissement au début, la fin s'éteint.
      const ease = 1 - (1 - avancement) ** 3;
      animation.playbackRate = depart + (cible - depart) * ease;
      tween.current = avancement < 1 ? requestAnimationFrame(pas) : null;
    };
    tween.current = requestAnimationFrame(pas);
  }, []);

  useEffect(() => () => {
    if (tween.current !== null) cancelAnimationFrame(tween.current);
  }, []);

  const ralentir = useCallback(() => viser(0), [viser]);
  const reprendre = useCallback(() => viser(1), [viser]);

  return (
    /*
      La section porte SON fond, et les voiles le reprennent. Tant qu'elle n'en
      avait pas, un voile ne pouvait que parier sur ce qu'il y avait derrière —
      juste en thème clair, faux en thème sombre, où le fond du document et
      `--catalog-canvas` ne coïncident pas.
    */
    <section className="border-y border-(--border-subtle) bg-(--catalog-canvas) py-(--space-4)">
      <p className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) pb-(--space-3) t-label text-(--text-tertiary)">
        <span className="chiffre">{organismes.length}</span> organismes référencés
      </p>

      <div
        className="relative overflow-hidden"
        onPointerEnter={ralentir}
        onPointerLeave={reprendre}
        // Le clavier aussi : une carte qui prend le focus puis sort de l'écran
        // est inatteignable.
        onFocusCapture={ralentir}
        onBlurCapture={reprendre}
      >
        <ul
          ref={piste}
          // Nom accessible, et point d'ancrage stable pour les invariants de
          // rendu : les repérer par leur texte les faisait dépendre du tirage
          // aléatoire des organismes.
          aria-label="Organismes référencés"
          /*
            Animation par `transform` seulement : une marge ou une position de
            défilement animée recalculerait la mise en page à chaque image.
          */
          className="flex w-max items-center gap-(--space-4) will-change-transform motion-safe:animate-[defile_var(--bande-duree)_linear_infinite]"
        >
          {boucle.map((organisme, index) => (
            <Carte key={`${organisme.nom}-${index}`} organisme={organisme} />
          ))}
        </ul>

        {/*
          Deux voiles dégradés, et non un `mask-image`.

          Le masque partait du noir vers le transparent, ce qui masque bien en
          théorie — mais il ne s'appliquait pas, et les cartes se coupaient net
          aux deux bords. Un voile part du FOND RÉEL de la section : il n'a rien
          à négocier avec le moteur de rendu, et il suit le thème puisqu'il lit
          le même jeton que la section.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-(--bande-masque) bg-[linear-gradient(to_right,var(--catalog-canvas),transparent)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-(--bande-masque) bg-[linear-gradient(to_left,var(--catalog-canvas),transparent)]"
        />
      </div>
    </section>
  );
}
