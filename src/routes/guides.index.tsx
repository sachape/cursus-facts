/**
 * La liste des guides.
 *
 * AUCUNE VIGNETTE. Nous n'avons pas d'images, et des illustrations génériques —
 * les mêmes ordinateurs sur les mêmes bureaux que tous les comparatifs du
 * marché — abîmeraient le registre plus qu'elles ne serviraient la lecture. Le
 * titre, le chapô et la date suffisent à choisir.
 *
 * `noindex` SOUS TROIS GUIDES. Une liste de deux entrées n'a pas de valeur
 * propre pour un moteur, et la faire indexer trop tôt installe une page pauvre
 * à une adresse qu'on voudra ensuite faire remonter. Le seuil vit dans le
 * registre, à côté de ce qu'il compte.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { FilAriane, type Miette } from "@/composants/FilAriane";
import { GUIDES, indexIndexable } from "@/contenu/guides";
import { formaterDateLongue } from "@/modele/dates";

const SITE = "https://formlist.fr";

const MIETTES: Miette[] = [{ libelle: "Accueil", chemin: "/" }, { libelle: "Guides" }];

const DESCRIPTION =
  "Des guides sur le prix, le financement et les certifications des formations e-commerce, appuyés sur un catalogue relevé à la source.";

export const Route = createFileRoute("/guides/")({
  component: IndexGuides,
  head: () => ({
    meta: [
      { title: "Guides — comprendre avant de choisir | Formlist" },
      { name: "description", content: DESCRIPTION },
      ...(indexIndexable() ? [] : [{ name: "robots", content: "noindex, follow" }]),
    ],
    links: [{ rel: "canonical", href: `${SITE}/guides` }],
  }),
});

function IndexGuides() {
  return (
    <main className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) py-(--space-10)">
      <FilAriane miettes={MIETTES} />

      <header className="mt-(--space-4) max-w-(--lecture-largeur-max)">
        <h1 className="t-display-2 text-(--text-primary)">Guides</h1>
        <p className="mt-(--space-4) t-body-lg text-(--text-secondary)">
          Ce qu'il faut comprendre avant de choisir une formation e-commerce : ce que coûtent les
          parcours, comment ils se financent, et ce que valent les certifications qu'on y croise.
          Les chiffres cités sont calculés sur le catalogue à chaque lecture.
        </p>
      </header>

      <ul className="mt-(--space-10) flex max-w-(--lecture-largeur-max) flex-col">
        {GUIDES.map((guide) => (
          <li key={guide.slug} className="border-t border-(--border-subtle) py-(--space-6)">
            <article>
              <h2 className="t-heading-2 text-(--text-primary)">
                <Link
                  to="/guides/$slug"
                  params={{ slug: guide.slug }}
                  className="rounded-(--radius-sm) underline-offset-4 transition-colors duration-(--motion-fast) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
                >
                  {guide.titre}
                </Link>
              </h2>
              <p className="mt-(--space-3) t-body text-(--text-secondary)">{guide.chapo}</p>
              <p className="mt-(--space-3) t-caption text-(--text-tertiary)">
                Mis à jour le{" "}
                <span className="chiffre">{formaterDateLongue(guide.misAJourLe)}</span>
              </p>
            </article>
          </li>
        ))}
      </ul>

      <p className="mt-(--space-10) max-w-(--lecture-largeur-max) border-t border-(--border-subtle) pt-(--space-6) t-caption text-(--text-secondary)">
        Ces guides expliquent, ils ne conseillent aucun organisme et n'en classent aucun par
        qualité. Ils renvoient au catalogue, où chaque information porte sa source et sa date de
        vérification.
      </p>
    </main>
  );
}
