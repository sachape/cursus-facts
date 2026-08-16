/**
 * Les ressources gratuites — une page à part, et c'est le point important.
 *
 * ELLES NE SONT PAS DANS LE CATALOGUE, et cette page ne les y ramène pas. Aucun
 * prix, aucune durée, aucun code-barres, aucune certification comparée, aucun
 * compteur, aucun bouton de comparaison. Rien de ce qui sert à comparer des
 * parcours payants n'a de sens ici, et l'emprunter donnerait à croire qu'une
 * chaîne gratuite et un mastère se choisissent l'un contre l'autre.
 *
 * GROUPÉ PAR SUJET, PAS PAR TYPE. Quelqu'un cherche à apprendre Klaviyo ; il ne
 * cherche pas à parcourir des « plateformes d'éditeur ». Le type reste écrit sur
 * chaque carte, en information et non en rubrique.
 *
 * ALPHABÉTIQUE, SANS NOTE ET SANS ORDRE DE MÉRITE. Le produit ne note rien ;
 * une page de ressources classée « par pertinence » serait le premier endroit
 * où il commencerait.
 */
import { createFileRoute } from "@tanstack/react-router";
import { FilAriane, type Miette } from "@/composants/FilAriane";
import { LIBELLES_TYPES_RESSOURCE, RESSOURCES, ressourcesParSujet } from "@/modele/ressources";
import { formaterDateLongue } from "@/modele/dates";

const SITE = "https://formlist.fr";

const MIETTES: Miette[] = [{ libelle: "Accueil", chemin: "/" }, { libelle: "Ressources gratuites" }];

const DESCRIPTION =
  "Plateformes d'éditeur, documentations et certifications gratuites pour apprendre le e-commerce. Ce ne sont pas des formations : nous ne les évaluons pas et ne les comparons pas.";

/** Le nom de la langue, écrit en toutes lettres. Un code ISO ne se lit pas. */
const LANGUES: Record<string, string> = { fr: "Français", en: "Anglais" };

export const Route = createFileRoute("/ressources")({
  component: PageRessources,
  head: () => ({
    meta: [
      { title: "Ressources gratuites pour apprendre le e-commerce | Formlist" },
      { name: "description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE}/ressources` }],
  }),
});

function Carte({ ressource }: { ressource: (typeof RESSOURCES)[number] }) {
  return (
    <li className="border-t border-(--border-subtle) py-(--space-5)">
      <article>
        <h3 className="t-heading-3 text-(--text-primary)">
          {/*
            LIEN EXTERNE ASSUMÉ, ET JAMAIS AFFILIÉ. `rel="noopener"` est une
            hygiène ; l'absence de toute balise de suivi est une décision — le
            pied de page promet qu'aucun lien du site n'est affilié, et cette
            page est celle où la promesse serait la plus facile à trahir.
          */}
          <a
            href={ressource.url}
            rel="noopener nofollow"
            className="rounded-(--radius-sm) underline-offset-4 transition-colors duration-(--motion-fast) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
          >
            {ressource.nom}
          </a>
        </h3>
        <p className="mt-(--space-2) t-body-sm text-(--text-secondary)">{ressource.description}</p>
        <p className="mt-(--space-3) flex flex-wrap items-center gap-x-(--space-3) gap-y-(--space-1) t-caption text-(--text-tertiary)">
          <span>{ressource.editeurOuAuteur}</span>
          <span aria-hidden="true">·</span>
          <span>{LIBELLES_TYPES_RESSOURCE[ressource.type]}</span>
          {/*
            LA LANGUE NON ÉTABLIE NE S'AFFICHE PAS COMME « MULTILINGUE ».
            C'est un état de collecte : nous n'avons pas pu la lire sur la
            ressource elle-même. L'écrire serait une information déduite.
          */}
          {ressource.langue !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span>{LANGUES[ressource.langue] ?? ressource.langue}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>
            Vérifiée le{" "}
            <span className="chiffre">{formaterDateLongue(ressource.verifieeLe)}</span>
          </span>
        </p>
      </article>
    </li>
  );
}

function PageRessources() {
  const groupes = ressourcesParSujet();

  return (
    <main className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) py-(--space-10)">
      <FilAriane miettes={MIETTES} />

      <header className="mt-(--space-4) max-w-(--lecture-largeur-max)">
        <h1 className="t-display-2 text-(--text-primary)">Ressources gratuites</h1>
        {/*
          DEUX PHRASES. La première dit ce que c'est, la seconde ce que ce n'est
          pas — et la seconde est la plus importante : sans elle, un visiteur
          arrivé par un moteur lit cette page comme une liste de formations
          recommandées.
        */}
        <p className="mt-(--space-4) t-body-lg text-(--text-secondary)">
          Des plateformes d'éditeur, des documentations et des certifications gratuites, rangées par
          sujet. Ce ne sont pas des formations : elles n'entrent pas dans le catalogue, nous ne les
          évaluons pas et nous ne les comparons à rien.
        </p>
      </header>

      <div className="mt-(--space-10) max-w-(--lecture-largeur-max)">
        {groupes.map((groupe) => (
          <section key={groupe.sujet} className="mt-(--space-10) first:mt-0">
            <h2 className="t-heading-1 text-(--text-primary)">{groupe.sujet}</h2>
            <ul className="mt-(--space-4) flex flex-col">
              {groupe.ressources.map((r) => (
                <Carte key={`${groupe.sujet}-${r.id}`} ressource={r} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
