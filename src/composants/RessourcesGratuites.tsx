/**
 * Le bloc « Ressources gratuites sur ce sujet », sur une fiche de parcours.
 *
 * SA PLACE EST APRÈS LES FAITS VÉRIFIABLES ET AVANT LA PROVENANCE. Plus haut,
 * il concurrencerait la fiche ; plus bas, personne ne le voit. À cet endroit, il
 * arrive quand la personne a fini de lire ce qu'elle était venue lire.
 *
 * AUCUN JUGEMENT COMPARATIF, ET LA RÈGLE EST ABSOLUE.
 * Jamais « moins cher », jamais « avant de payer », jamais « alternative »,
 * jamais « pour commencer sans investir ». Le produit ne conseille pas, et un
 * conseil glissé dans une transition — « avant d'investir, ces ressources
 * gratuites… » — reste un conseil : il dit à la personne que le parcours qu'elle
 * consulte est un investissement qu'elle devrait peut-être différer. C'est un
 * jugement sur l'offre de l'organisme, rendu sans aucune mesure.
 *
 * La mention explicite n'est donc pas une précaution juridique : elle dit ce que
 * sont ces liens, pour que leur présence ne se lise pas comme une suggestion.
 *
 * PAS DE BLOC SANS RESSOURCE. Un bloc vide, ou pire un bloc rempli avec les
 * ressources d'un autre sujet, transformerait une information en remplissage.
 */
import { ressourcesDuSujet } from "@/modele/ressources";

/** Trois au plus : au-delà, la fiche cesse d'être une fiche. */
const MAXIMUM = 3;

export function RessourcesGratuites({ sujet }: { sujet: string }) {
  const ressources = ressourcesDuSujet(sujet, MAXIMUM);
  if (ressources.length === 0) return null;

  return (
    <section className="border-t border-border py-(--space-5)">
      <div className="rounded-(--radius-md) bg-(--surface-sunken) p-(--space-5)">
        <h2 className="t-heading-3 text-(--text-primary)">Ressources gratuites sur ce sujet</h2>
        <p className="mt-(--space-2) t-caption text-(--text-tertiary)">
          Ces ressources sont gratuites et ne sont pas des formations. Nous ne les évaluons pas.
        </p>

        <ul className="mt-(--space-4) flex flex-col gap-(--space-3)">
          {ressources.map((r) => (
            <li key={r.id}>
              <a
                href={r.url}
                rel="noopener nofollow"
                className="rounded-(--radius-sm) t-body-sm text-(--text-primary) underline-offset-2 transition-colors duration-(--motion-fast) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
              >
                {r.nom}
              </a>
              <span className="t-body-sm text-(--text-tertiary)"> — {r.editeurOuAuteur}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
