/**
 * Une page guide.
 *
 * `/guides/<slug>`, JAMAIS `/blog`. Un blog promet de l'actualité qu'il faudra
 * alimenter, et son adresse porte cette promesse : une section qui n'a pas
 * publié depuis six mois s'y voit. Un guide reste utile deux ans et se met à
 * jour plutôt que de se périmer — d'où une date de mise à jour affichée, et
 * aucune date de publication.
 *
 * IL QUALIFIE, IL NE CONCLUT PAS. Le guide capte une question posée en amont de
 * la décision et renvoie vers le catalogue. Il ne recommande aucun organisme :
 * les invariants 1 et 6 ne s'arrêtent pas à la porte du contenu éditorial.
 *
 * Les chiffres qu'il cite viennent tous de `chiffresGuides`, calculés dans le
 * loader sur le catalogue du jour. Aucun n'est écrit dans le texte.
 */
import { useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { declarerVue } from "@/composants/mesure";
import { chargerListe } from "@/donnees/requetes";
import { chiffresGuides, type ChiffresGuides } from "@/modele/chiffres-guides";
import { autresGuides, guideParSlug } from "@/contenu/guides";
import { lire, type Guide } from "@/contenu/guides/format";
import { CorpsGuide, FaqGuide, SommaireAccordeon, SommaireLateral } from "@/composants/guide";
import { balisageFilAriane, FilAriane, type Miette } from "@/composants/FilAriane";
import { formaterDateLongue } from "@/modele/dates";

const SITE = "https://formlist.fr";

function miettes(guide: Guide): Miette[] {
  return [
    { libelle: "Accueil", chemin: "/" },
    { libelle: "Guides", chemin: "/guides" },
    { libelle: guide.titre },
  ];
}

export const Route = createFileRoute("/guides/$slug")({
  /*
    LE LOADER NE RENVOIE QUE DES DONNÉES SÉRIALISABLES — jamais le guide.

    Un `Guide` porte des fonctions : ses textes sont des fonctions des chiffres,
    et c'est ce qui les empêche de figer un nombre. Renvoyé par le loader, il
    part à la déshydratation, les fonctions n'y survivent pas, et le routeur
    lève « Expected to find a dehydrated data » — la page s'affiche, puis toute
    navigation ultérieure échoue. Un défaut qui ne se voit qu'au deuxième clic.

    Le contenu est donc lu depuis le registre, des deux côtés : c'est un module,
    il est présent au serveur comme au client. Seuls les chiffres voyagent.
  */
  loader: async ({ params }) => {
    if (guideParSlug(params.slug) === undefined) throw notFound();
    const parcours = await chargerListe();
    /*
      L'horodatage est posé ICI, côté serveur, et voyage avec les chiffres. Lu
      au rendu, il différerait entre le serveur et le client et ferait jeter
      l'arbre à React — le défaut documenté dans `nombres.ts`.
    */
    return { chiffres: chiffresGuides(parcours, new Date().toISOString()) };
  },
  component: PageGuide,
  head: ({ params, loaderData }) => {
    const guide = guideParSlug(params.slug);
    if (guide === undefined || loaderData === undefined) return {};
    const { chiffres } = loaderData;
    const url = `${SITE}/guides/${guide.slug}`;

    return {
      meta: [
        { title: guide.titreMeta },
        { name: "description", content: guide.description },
        { property: "og:title", content: guide.titreMeta },
        { property: "og:description", content: guide.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
      ],
      // Canonique auto-référent : un guide n'a qu'une adresse.
      links: [{ rel: "canonical", href: url }],
      scripts: [
        balisageFilAriane(miettes(guide)),
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: guide.titre,
            description: guide.description,
            url,
            /*
              `dateModified` SEUL, sans `datePublished`. Déclarer une date de
              publication ferait de ce guide une actualité, ce qu'il n'est pas :
              il n'a pas paru un jour, il est à jour à une date.
            */
            dateModified: guide.misAJourLe,
            inLanguage: "fr-FR",
            author: { "@type": "Organization", name: "Formlist", url: SITE },
            publisher: { "@type": "Organization", name: "Formlist", url: SITE },
            /* Aucune image : nous n'en avons pas, et une illustration générique
               abîmerait le registre autant dans le balisage qu'à l'écran. */
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: guide.faq.map((entree) => ({
              "@type": "Question",
              name: entree.question,
              acceptedAnswer: {
                "@type": "Answer",
                /* La MÊME réponse que celle rendue à l'écran, chiffres compris.
                   Un balisage qui promet un texte que la page n'affiche pas est
                   un mensonge structuré. */
                text: lire(entree.reponse, chiffres),
              },
            })),
          }),
        },
      ],
    };
  },
});

function PiedGuide({ guide, chiffres }: { guide: Guide; chiffres: ChiffresGuides }) {
  const autres = autresGuides(guide.slug);

  return (
    <footer className="mt-(--space-12) border-t border-(--border-subtle) pt-(--space-8)">
      {/*
        LE BLOC DE CONVERSION. Le guide a expliqué ; c'est ici que la personne
        passe au catalogue. Le chiffre est calculé, comme tous les autres.
      */}
      <div className="rounded-(--carte-rayon) border border-(--border-subtle) bg-(--surface-sunken) p-(--space-6)">
        <p className="t-heading-3 text-(--text-primary)">Comparer les formations</p>
        <p className="mt-(--space-2) max-w-(--lecture-largeur-max) t-body-sm text-(--text-secondary)">
          <span className="chiffre">{chiffres.parcours}</span> parcours de{" "}
          <span className="chiffre">{chiffres.organismes}</span> organismes, comparés sur des
          informations relevées à la source. Aucune note, aucun classement par qualité.
        </p>
        <p className="mt-(--space-4)">
          <Link
            to="/catalogue"
            className="inline-flex items-center rounded-(--radius-sm) bg-(--accent-default) px-(--space-4) py-(--space-2) t-body-sm font-medium text-(--surface-page) transition-opacity duration-(--motion-fast) hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
          >
            Ouvrir le comparateur
          </Link>
        </p>
      </div>

      {autres.length > 0 && (
        <nav aria-label="Autres guides" className="mt-(--space-8)">
          <p className="t-label text-(--text-tertiary)">Autres guides</p>
          <ul className="mt-(--space-4) flex flex-col gap-(--space-4)">
            {autres.map((autre) => (
              <li key={autre.slug}>
                <Link
                  to="/guides/$slug"
                  params={{ slug: autre.slug }}
                  className="block rounded-(--radius-sm) underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
                >
                  <span className="t-body font-medium text-(--text-primary) hover:underline">
                    {autre.titre}
                  </span>
                  <span className="mt-(--space-1) block max-w-(--lecture-largeur-max) t-body-sm text-(--text-secondary)">
                    {autre.chapo}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </footer>
  );
}

function PageGuide() {
  const { slug } = Route.useParams();
  const { chiffres } = Route.useLoaderData();
  /* Le loader a déjà refusé un slug inconnu : ici il existe forcément. */
  const guide = guideParSlug(slug)!;

  /*
    LA VUE, PAS UN ÉVÉNEMENT DE PAGE VUE. Le plan interdit les pages vues
    automatiques — elles noient les gestes utiles sous du volume. Mais un guide
    est un point d'ENTRÉE : sans le déclarer, la chaîne « guide lu → fiche
    ouverte → site de l'organisme » est invisible, et rien ne dit si les guides
    amènent qui que ce soit au catalogue. Ce n'est pas la page qui est comptée,
    ce sont les gestes qui la suivent qui savent d'où ils viennent.
  */
  useEffect(() => declarerVue("guide"), []);

  return (
    <main className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) py-(--space-10)">
      <FilAriane miettes={miettes(guide)} />

      <header className="mt-(--space-4) max-w-(--lecture-largeur-max)">
        <p className="t-label text-(--text-tertiary)">Guide</p>
        <h1 className="mt-(--space-2) t-display-2 text-(--text-primary)">{guide.titre}</h1>
        <p className="mt-(--space-4) t-body-lg text-(--text-secondary)">{guide.chapo}</p>
        {/*
          MISE À JOUR, PAS PUBLICATION. Un guide ne paraît pas, il est à jour —
          et sur un sujet réglementaire, cette date est ce que le lecteur doit
          voir avant de faire confiance à une règle.
        */}
        <p className="mt-(--space-4) t-caption text-(--text-tertiary)">
          Mis à jour le{" "}
          <span className="chiffre">{formaterDateLongue(guide.misAJourLe)}</span>
        </p>
      </header>

      <div className="flex gap-(--space-12)">
        <div className="min-w-0 flex-1">
          <SommaireAccordeon sections={guide.sections} />
          <CorpsGuide sections={guide.sections} chiffres={chiffres} />
          <FaqGuide questions={guide.faq} chiffres={chiffres} />
          <PiedGuide guide={guide} chiffres={chiffres} />
        </div>
        <SommaireLateral sections={guide.sections} />
      </div>
    </main>
  );
}
