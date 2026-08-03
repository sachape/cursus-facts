/**
 * Panneau latéral de consultation d'une fiche.
 *
 * Un comparateur se consulte en va-et-vient : on ouvre une fiche pour décider
 * si on la retient, puis on revient à sa liste filtrée. Une navigation de page
 * casse ce mouvement et perd la position de défilement. Le panneau garde le
 * catalogue derrière lui, à sa place.
 *
 * L'ADRESSE RESTE LA MÊME. Le panneau pousse `/parcours/<slug>` dans
 * l'historique : l'URL est partageable, le bouton retour referme le panneau au
 * lieu de quitter le site, et cette même adresse sert la fiche complète en
 * rendu serveur pour un accès direct ou un robot.
 */
import { useEffect, useRef, useState } from "react";
import { chargerFiche, type ParcoursFiche, type ParcoursListe } from "@/donnees/requetes";
import { ContenuFiche, EnteteFiche } from "./ContenuFiche";

/** Sélecteur des éléments qui peuvent recevoir le focus. */
const FOCUSABLES =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function PanneauFiche({
  slug,
  autresParcours,
  fermer,
}: {
  slug: string;
  /** Le catalogue déjà chargé, pour les autres parcours de l'organisme. */
  autresParcours: readonly ParcoursListe[];
  fermer: () => void;
}) {
  const [fiche, setFiche] = useState<ParcoursFiche | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const panneau = useRef<HTMLDivElement>(null);
  const boutonFermer = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let annule = false;
    setFiche(null);
    setErreur(null);
    chargerFiche(slug)
      .then((f) => {
        if (annule) return;
        if (f === null) setErreur("Cette fiche n'existe pas ou n'est plus référencée.");
        else setFiche(f);
      })
      .catch((e: unknown) => {
        if (!annule) setErreur(e instanceof Error ? e.message : String(e));
      });
    return () => {
      annule = true;
    };
  }, [slug]);

  // Verrouille le défilement du corps : sans cela, deux zones défilent en même
  // temps et la liste bouge sous le panneau.
  useEffect(() => {
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = precedent;
    };
  }, []);

  // Le focus part sur la fermeture, reste piégé dans le panneau, et l'échappe
  // referme. Un panneau modal qu'on peut quitter au clavier sans le voir est
  // un piège pour la navigation au clavier.
  useEffect(() => {
    boutonFermer.current?.focus();

    function auClavier(evenement: KeyboardEvent) {
      if (evenement.key === "Escape") {
        evenement.preventDefault();
        fermer();
        return;
      }
      if (evenement.key !== "Tab" || panneau.current === null) return;

      const cibles = [...panneau.current.querySelectorAll<HTMLElement>(FOCUSABLES)].filter(
        (e) => e.offsetParent !== null,
      );
      if (cibles.length === 0) return;

      const premier = cibles[0]!;
      const dernier = cibles[cibles.length - 1]!;
      if (evenement.shiftKey && document.activeElement === premier) {
        evenement.preventDefault();
        dernier.focus();
      } else if (!evenement.shiftKey && document.activeElement === dernier) {
        evenement.preventDefault();
        premier.focus();
      }
    }

    document.addEventListener("keydown", auClavier);
    return () => document.removeEventListener("keydown", auClavier);
  }, [fermer]);

  const autres = fiche
    ? autresParcours.filter((a) => a.organismeNom === fiche.organismeNom && a.slug !== fiche.slug)
    : [];

  return (
    <div className="fixed inset-0 z-50">
      {/* Voile : ferme au clic, et n'est pas atteignable au clavier puisque
          Échap fait le même travail. */}
      <div
        onClick={fermer}
        aria-hidden="true"
        className="absolute inset-0 bg-black/[0.28] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      />

      <div
        ref={panneau}
        role="dialog"
        aria-modal="true"
        aria-label={fiche?.nom ?? "Fiche parcours"}
        className="absolute inset-y-0 right-0 flex w-full max-w-[580px] flex-col bg-background shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-[280ms] motion-safe:[animation-timing-function:cubic-bezier(.22,.8,.28,1)]"
      >
        <header className="sticky top-0 z-10 border-b border-border bg-background px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">{fiche && <EnteteFiche p={fiche} />}</div>
            <button
              ref={boutonFermer}
              type="button"
              onClick={fermer}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {/* Sous 720 px le panneau occupe tout l'écran : une flèche de
                  retour y décrit mieux le geste qu'une croix. */}
              <span aria-hidden className="min-[720px]:hidden">
                ←
              </span>
              <span aria-hidden className="hidden min-[720px]:inline">
                ×
              </span>
              <span className="sr-only">Fermer la fiche</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-10 sm:px-6">
          {erreur !== null && (
            <p className="mt-6 rounded-md border border-destructive/40 p-4 text-sm text-destructive">
              {erreur}
            </p>
          )}
          {fiche === null && erreur === null && (
            <p className="mt-6 text-sm text-muted-foreground">Chargement de la fiche…</p>
          )}
          {fiche !== null && <ContenuFiche p={fiche} autresParcours={autres} />}
        </div>
      </div>
    </div>
  );
}
