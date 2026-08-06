/**
 * Pile collante — hauteurs mesurées, jamais déclarées.
 *
 * Chaque barre s'ancre sous la somme de celles qui la précèdent. Tant que ces
 * hauteurs étaient écrites à la main dans les jetons, elles se désynchronisaient
 * du premier changement de padding : la toolbar passe en colonne sous 1 024 px,
 * sa hauteur double, et l'offset suivant reste faux — les cartes défilent alors
 * derrière une barre au lieu de passer dessous.
 *
 * Rien ne le signale. Ni erreur, ni test rouge : c'est le motif de toute cette
 * journée, et la seule réponse fiable est de mesurer.
 */
import { useEffect, useState, type RefObject } from "react";

/**
 * Publie la hauteur réelle d'un élément dans une variable CSS globale.
 *
 * La variable vit sur `documentElement` : les barres sont dans des arbres
 * distincts — l'en-tête est dans la racine, la navigation dans la vue — et une
 * variable posée sur un parent commun n'existe pas ici.
 */
export function useHauteurPubliee(
  cible: RefObject<HTMLElement | null>,
  variable: `--${string}`,
): void {
  useEffect(() => {
    const element = cible.current;
    if (element === null) return;

    const publier = () => {
      // `getBoundingClientRect` et non `offsetHeight` : il rend les fractions
      // de pixel, et une demi-pixel accumulée sur trois barres se voit.
      const hauteur = element.getBoundingClientRect().height;
      document.documentElement.style.setProperty(variable, `${hauteur}px`);
    };

    publier();
    const observateur = new ResizeObserver(publier);
    observateur.observe(element);

    return () => {
      observateur.disconnect();
      // La variable est retirée à la disparition de la barre : la laisser
      // figerait un offset pour une barre qui n'existe plus.
      document.documentElement.style.removeProperty(variable);
    };
  }, [cible, variable]);
}

/**
 * Vrai quand la barre a atteint sa position collante — donc quand du contenu
 * passe dessous.
 *
 * C'est ce qui autorise le filet de séparation à n'exister qu'à ce moment-là :
 * posé en permanence, il dessine un trait sous un titre qui ne sépare rien.
 *
 * Mesuré, jamais déduit d'un seuil de défilement écrit à la main. La position
 * collante est un `calc()` de deux hauteurs elles-mêmes mesurées ; un seuil en
 * dur redeviendrait faux au premier changement de padding — exactement la
 * dérive que `useHauteurPubliee` existe pour empêcher.
 */
export function useEstAncree(cible: RefObject<HTMLElement | null>): boolean {
  const [ancree, setAncree] = useState(false);

  useEffect(() => {
    const element = cible.current;
    if (element === null) return;

    let demande: number | null = null;
    const evaluer = () => {
      demande = null;
      const haut = element.getBoundingClientRect().top;
      // `top` calculé : la valeur résolue du `calc()`, en pixels.
      const ancrage = parseFloat(getComputedStyle(element).top);
      if (!Number.isFinite(ancrage)) return;
      // Un pixel de tolérance : les hauteurs publiées portent des fractions.
      setAncree(haut <= ancrage + 1);
    };

    const planifier = () => {
      if (demande === null) demande = requestAnimationFrame(evaluer);
    };

    evaluer();
    window.addEventListener("scroll", planifier, { passive: true });
    window.addEventListener("resize", planifier);
    return () => {
      if (demande !== null) cancelAnimationFrame(demande);
      window.removeEventListener("scroll", planifier);
      window.removeEventListener("resize", planifier);
    };
  }, [cible]);

  return ancree;
}
