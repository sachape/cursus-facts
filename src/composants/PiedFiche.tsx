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
 */
import { Button } from "@/components/ui/button";
import type { ParcoursFiche } from "@/donnees/requetes";
import { useComparaison } from "./comparaison";

export function PiedFiche({ p }: { p: ParcoursFiche }) {
  const { ajouter, retirer, contient } = useComparaison();
  const selectionne = contient(p.slug);

  const lienCorrection =
    `mailto:corrections@cursus.fr` +
    `?subject=${encodeURIComponent(`Correction — ${p.nom}`)}` +
    `&body=${encodeURIComponent(`Fiche concernée : ${p.slug}\n\nInformation à corriger :\n`)}`;

  return (
    <footer
      /*
        L'ombre est projetée vers le haut : elle dit que du contenu passe
        dessous. Sans elle, le pied se lit comme la fin du document alors que le
        corps continue derrière lui.
      */
      className="shrink-0 border-t border-(--border-subtle) bg-(--surface-raised) px-(--space-4) py-(--space-3) [box-shadow:0_-1px_2px_rgb(20_25_29/0.05),0_-2px_8px_rgb(20_25_29/0.04)] [padding-bottom:calc(var(--space-3)+env(safe-area-inset-bottom))]"
    >
      <div className="flex flex-wrap items-center gap-(--space-2) max-[639px]:flex-col max-[639px]:items-stretch">
        <div className="flex flex-1 gap-(--space-2) max-[639px]:w-full">
          {p.siteOfficiel !== null && (
            <Button
              asChild
              className="h-(--bouton-hauteur) rounded-(--radius-md) max-[639px]:h-(--bouton-hauteur-tactile) max-[639px]:flex-1"
            >
              {/* Lien sortant non affilié — le seul actif défendable face aux
                  comparateurs existants. */}
              <a
                href={
                  p.siteOfficiel.startsWith("http") ? p.siteOfficiel : `https://${p.siteOfficiel}`
                }
                rel="noopener noreferrer nofollow"
                target="_blank"
              >
                Voir le site officiel
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => (selectionne ? retirer(p.slug) : ajouter({ slug: p.slug, nom: p.nom }))}
            className="h-(--bouton-hauteur) rounded-(--radius-md) border-(--border-default) max-[639px]:h-(--bouton-hauteur-tactile) max-[639px]:flex-1"
          >
            {selectionne ? "Retirer de la comparaison" : "Ajouter à la comparaison"}
          </Button>
        </div>

        <Button
          asChild
          variant="ghost"
          className="h-(--bouton-hauteur) text-(--text-secondary) max-[639px]:w-full max-[639px]:t-body-sm"
        >
          <a href={lienCorrection}>Signaler une correction</a>
        </Button>
      </div>

      {/*
        La mention d'absence de commission accompagne le lien sortant, pas une
        section perdue en fin de fiche : c'est au moment de cliquer qu'elle
        informe.
      */}
      <p className="mt-(--space-2) t-caption text-(--text-tertiary)">
        Ce lien n&apos;est pas affilié — nous ne percevons aucune commission.
      </p>
    </footer>
  );
}
