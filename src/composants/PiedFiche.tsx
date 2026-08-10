/**
 * Pied d'actions du panneau de fiche.
 *
 * Les actions vivaient en fin de contenu : sur une fiche longue, elles étaient
 * à quinze écrans du haut, et l'action que la personne cherche en priorité —
 * voir le site de l'organisme — n'était jamais visible sans défiler jusqu'au
 * bout.
 *
 * Ancré au bas du panneau, le pied les rend disponibles en permanence. Le corps
 * défile seul ; l'en-tête et le pied ne bougent pas.
 *
 * DEUX ACTIONS, PAS TROIS. Trois actions alignées déclarent trois importances
 * égales. Elles ne le sont pas — et c'est cette égalité affichée qui produisait
 * le débordement sur trois lignes, donc un pied de 137 px qui mangeait le
 * corps. « Signaler une correction » est parti en fin de contenu : on ne signale
 * une correction qu'APRÈS avoir lu la fiche, jamais avant.
 */
import type { ParcoursFiche } from "@/donnees/requetes";
import { useComparaison } from "./comparaison";
import { BoutonSauvegarde } from "./BoutonSauvegarde";
import { mesurer, proprietesParcours } from "./mesure";

export function PiedFiche({ p }: { p: ParcoursFiche }) {
  const { ajouter, retirer, contient } = useComparaison();
  const selectionne = contient(p.slug);

  /*
    Hauteur et rayon identiques sur les deux boutons : c'est le REMPLISSAGE qui
    dit lequel est premier, jamais la taille. Deux boutons de tailles
    différentes se lisent comme deux natures d'action.
  */
  const forme =
    /*
      `min-w-0` sous 640 px : sans lui, la largeur minimale d'un élément flex
      est celle de son contenu, et « Voir le site officiel » refusait de
      descendre à la moitié de la ligne — les deux boutons repartaient à des
      largeurs inégales alors que la règle demande des parts égales.

      `flex-1` et non `basis-1/2` : deux moitiés PLUS l'écart dépassent la
      ligne, donc le second bouton passait dessous — le passage à la ligne que
      toute cette barre existe pour supprimer. Avec une base nulle et une
      croissance égale, l'écart est prélevé avant le partage.
    */
    "inline-flex h-(--bouton-hauteur) items-center justify-center whitespace-nowrap rounded-(--radius-md) px-(--space-4) t-body-sm transition-colors duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) max-[639px]:h-(--bouton-hauteur-tactile) max-[639px]:min-w-0 max-[639px]:flex-1 max-[639px]:px-(--space-2)";

  return (
    <footer
      /*
        `@container` : la mention se place selon la largeur du PANNEAU, pas
        celle de la fenêtre. Le panneau est plafonné à 560 px alors que la même
        fiche s'affiche pleine largeur sur sa page dédiée — un point de rupture
        en unités de fenêtre aurait décrit la mauvaise boîte dans un cas sur
        deux.

        L'ombre est projetée vers le haut : elle dit que du contenu passe
        dessous. Sans elle, le pied se lit comme la fin du document alors que le
        corps continue derrière lui.
      */
      className="@container shrink-0 border-t border-(--border-subtle) bg-(--surface-raised) px-(--space-4) py-(--space-3) [box-shadow:0_-1px_2px_rgb(20_25_29/0.05),0_-2px_8px_rgb(20_25_29/0.04)] [padding-bottom:calc(var(--space-3)+env(safe-area-inset-bottom))]"
    >
      <div className="flex flex-wrap items-center gap-(--space-2)">
        {p.siteOfficiel !== null && (
          /*
            Action primaire : elle prend la place disponible. C'est la seule
            action qui fait sortir du produit, et la seule que la fiche existe
            pour permettre — comparer des faits sert à aller voir.
          */
          <a
            href={p.siteOfficiel.startsWith("http") ? p.siteOfficiel : `https://${p.siteOfficiel}`}
            rel="noopener noreferrer nofollow"
            target="_blank"
            aria-label="Voir le site officiel"
            /*
              L'ÉVÉNEMENT DE CONVERSION. C'est le seul geste qui prouve que la
              comparaison a servi : tout le reste — fiches ouvertes, filtres,
              comparaisons — n'est qu'un chemin vers celui-là. Toutes les
              propriétés communes y sont, `cout_etabli` en tête : c'est ici que
              se lit l'écart de conversion entre une fiche qui affiche un prix
              et une fiche qui n'en affiche pas.

              `onClick` et non un intercepteur : le lien s'ouvre dans un nouvel
              onglet, la page courante survit, et l'événement part sans qu'on
              ait à retarder la navigation pour l'attendre.
            */
            onClick={() => mesurer("site_officiel_ouvert", proprietesParcours(p))}
            className={`${forme} flex-1 bg-(--interactive-default) font-medium text-(--text-on-inverse) hover:bg-(--interactive-hover)`}
          >
            {/*
              Même arbitrage que pour l'action secondaire : sous 640 px la
              moitié de ligne fait 140 px, où le libellé complet ne tient pas.
              On le raccourcit — « officiel » reste, c'est le mot qui distingue
              ce lien d'un lien de comparateur.
            */}
            <span aria-hidden="true" className="max-[639px]:hidden">
              Voir le site officiel
            </span>
            <span aria-hidden="true" className="min-[640px]:hidden">
              Site officiel
            </span>
          </a>
        )}

        {/* Entre les deux actions : le signet est un geste de mise de côté,
            il ne dispute la place ni au lien sortant ni à la comparaison. */}
        <BoutonSauvegarde type="parcours" cibleId={p.slug} libelle={p.nom} />

        {/*
          Action secondaire : largeur adaptée à son libellé, et non à parts
          égales avec la primaire. Une fois le parcours sélectionné, « Retirer »
          raccourcit encore la ligne.

          Sous 640 px les deux passent à parts égales : c'est le seul cas où
          l'égalité de largeur vaut mieux qu'un libellé complet, parce que
          l'alternative est un passage à la ligne.
        */}
        <button
          type="button"
          onClick={() => (selectionne ? retirer(p.slug) : ajouter({ slug: p.slug, nom: p.nom }))}
          aria-label={selectionne ? "Retirer de la comparaison" : "Ajouter à la comparaison"}
          className={`${forme} border border-(--border-default) bg-(--surface-raised) text-(--text-primary) hover:border-(--border-strong) min-[640px]:shrink-0`}
        >
          {selectionne ? (
            "Retirer"
          ) : (
            <>
              {/*
                Le libellé se raccourcit plutôt que de passer à la ligne. Les
                deux variantes sont masquées aux technologies d'assistance :
                `aria-label` porte le libellé complet dans les deux cas, sinon
                un lecteur d'écran énoncerait les deux.
              */}
              <span aria-hidden="true" className="max-[639px]:hidden">
                Ajouter à la comparaison
              </span>
              <span aria-hidden="true" className="min-[640px]:hidden">
                Comparer
              </span>
            </>
          )}
        </button>

        {/*
          `basis-full` la renvoie sur sa propre ligne ; au-delà de 900 px de
          panneau elle revient à droite des boutons. La formulation complète —
          ce que nous ne percevons pas, et pourquoi — reste dans la page
          Méthode : ici il ne faut que le fait, au moment de cliquer.
        */}
        <p className="basis-full t-caption text-(--text-tertiary) @min-[900px]:ml-auto @min-[900px]:basis-auto">
          Lien non affilié
        </p>
      </div>
    </footer>
  );
}
