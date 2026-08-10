/**
 * Piège de focus et verrou de défilement — une seule implémentation.
 *
 * Le panneau de fiche portait la sienne. Le menu mobile en aurait écrit une
 * seconde, et c'est le motif qu'on a passé la journée à fermer : trois
 * interceptions de clic locales, deux regroupements d'organismes, une ouverture
 * de fiche par vue. Une mécanique dupliquée diverge, et ici elle diverge sur
 * l'accessibilité — c'est-à-dire là où personne ne s'en aperçoit.
 *
 * CE QUE LE PIÈGE GARANTIT. Un dialogue modal qu'on peut quitter au clavier
 * sans le voir est un piège pour la navigation au clavier : le focus part
 * derrière le voile, sur des commandes invisibles et inertes. Échap referme,
 * Tab tourne en boucle à l'intérieur, et le focus revient d'où il venait.
 */
import { useEffect, type RefObject } from "react";

/** Ce qui peut recevoir le focus. */
const FOCUSABLES =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function usePiegeFocus({
  actif,
  conteneur,
  fermer,
  focusInitial,
  retourFocus,
}: {
  actif: boolean;
  conteneur: RefObject<HTMLElement | null>;
  fermer: () => void;
  /** Ce qui prend le focus à l'ouverture. À défaut, le premier focusable. */
  focusInitial?: RefObject<HTMLElement | null> | undefined;
  /** Où le focus revient à la fermeture — le déclencheur, en général. */
  retourFocus?: RefObject<HTMLElement | null> | undefined;
}): void {
  useEffect(() => {
    if (!actif) return;

    const cibles = () =>
      [...(conteneur.current?.querySelectorAll<HTMLElement>(FOCUSABLES) ?? [])].filter(
        (e) => e.offsetParent !== null,
      );

    (focusInitial?.current ?? cibles()[0])?.focus();

    function auClavier(evenement: KeyboardEvent) {
      if (evenement.key === "Escape") {
        evenement.preventDefault();
        fermer();
        return;
      }
      if (evenement.key !== "Tab") return;

      const liste = cibles();
      if (liste.length === 0) return;
      const premier = liste[0]!;
      const dernier = liste[liste.length - 1]!;

      if (evenement.shiftKey && document.activeElement === premier) {
        evenement.preventDefault();
        dernier.focus();
      } else if (!evenement.shiftKey && document.activeElement === dernier) {
        evenement.preventDefault();
        premier.focus();
      }
    }

    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("keydown", auClavier);
      /*
        Le focus revient au déclencheur, et seulement s'il est encore attaché :
        un élément détaché ne peut pas le recevoir, et le lui donner quand même
        le renvoie silencieusement au corps du document — d'où l'impression que
        la touche Tab « repart du début ».
      */
      const retour = retourFocus?.current;
      if (retour?.isConnected === true) retour.focus();
    };
  }, [actif, conteneur, fermer, focusInitial, retourFocus]);
}

/**
 * Verrouille le défilement du corps tant que le dialogue est ouvert.
 *
 * Sans lui, deux zones défilent en même temps et le contenu bouge derrière le
 * panneau — le repère visuel qu'on venait de quitter n'est plus là au retour.
 */
export function useVerrouDefilement(actif: boolean): void {
  useEffect(() => {
    if (!actif) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = precedent;
    };
  }, [actif]);
}
