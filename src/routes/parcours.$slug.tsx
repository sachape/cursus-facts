/**
 * La fiche d'un parcours — page complète, rendue côté serveur.
 *
 * CONTRAINTE NON NÉGOCIABLE. Chaque parcours garde une URL propre servant la
 * fiche entière en rendu serveur : title, méta-description et canonique
 * auto-référent. C'est cette page qu'obtiennent un accès direct, un lien
 * partagé, un robot, ou un navigateur sans JavaScript.
 *
 * Le panneau latéral du catalogue est un raccourci de consultation ; il pousse
 * cette même adresse dans l'historique et affiche le même contenu, via
 * `ContenuFiche`. Une seule source pour les deux surfaces.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { chargerFiche } from "@/donnees/requetes";
import { descriptionFiche, titreFiche } from "@/modele/description-fiche";
import { ContenuFiche, EnteteFiche } from "@/composants/ContenuFiche";

const SITE = "https://formlist.fr";

export const Route = createFileRoute("/parcours/$slug")({
  /*
    NE CHARGE QUE CE QUE LA PAGE AFFICHE.

    Le loader ramenait le CATALOGUE ENTIER — 233 fiches — pour en lister six
    sous « autres parcours du même organisme ». Deux appels en série avant le
    premier octet, dont l'un cent fois trop gros pour son usage.

    La section renvoie désormais vers la page de l'organisme, qui existe depuis
    peu et fait ce travail mieux : elle porte la liste complète, ses filtres et
    sa provenance. Une fiche n'a plus à charger le catalogue pour parler de son
    voisinage.
  */
  loader: async ({ params }) => {
    const fiche = await chargerFiche(params.slug);
    if (!fiche) throw notFound();
    return { fiche };
  },
  component: Fiche,
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { fiche } = loaderData;
    return {
      meta: [
        { title: titreFiche(fiche) },
        /*
          Bâtie sur ce qui VARIE — lieu, prix, durée, volume, certification.
          L'ancienne formule reprenait le nom et un compteur : 51 fiches au même
          sujet en sortaient indiscernables, et Google les traite alors comme
          des doublons.
        */
        { name: "description", content: descriptionFiche(fiche) },
      ],
      // Canonique auto-référent : cette page est l'adresse de référence de la
      // fiche, y compris quand le panneau l'a poussée dans l'historique.
      links: [{ rel: "canonical", href: `${SITE}/parcours/${fiche.slug}` }],
      /*
        DONNÉES STRUCTURÉES — les mêmes faits que la page, jamais davantage.

        `Course` décrit une formation, et c'est le seul type honnête ici. On
        n'émet NI `aggregateRating` NI `review` : ce sont les propriétés que
        Google met en avant, et les publier supposerait des notes que le produit
        refuse de produire. Un balisage qui promet une étoile qu'on n'affiche
        pas est un mensonge structuré.

        Le prix n'est déclaré que s'il est publié. Un `offers` à 0 par défaut
        ferait passer une absence de collecte pour une gratuité — la même faute
        que l'effacement des 61 prix du 3 août.
      */
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Course",
            name: fiche.nom,
            description: fiche.sujetPrincipal,
            url: `${SITE}/parcours/${fiche.slug}`,
            provider: {
              "@type": "Organization",
              name: fiche.organismeNom,
              ...(fiche.siteOfficiel !== null ? { url: fiche.siteOfficiel } : {}),
            },
            ...(fiche.prixMin !== null
              ? {
                  offers: {
                    "@type": "Offer",
                    price: fiche.prixMin,
                    priceCurrency: "EUR",
                    url: `${SITE}/parcours/${fiche.slug}`,
                  },
                }
              : {}),
            ...(fiche.codeRncpRs !== null
              ? { educationalCredentialAwarded: fiche.codeRncpRs }
              : {}),
          }),
        },
      ],
    };
  },
});

function Fiche() {
  const { fiche } = Route.useLoaderData();

  return (
    <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link to="/" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Retour au catalogue
      </Link>

      <header className="mt-6 border-b border-border pb-6">
        <EnteteFiche p={fiche} />
      </header>

      <ContenuFiche p={fiche} />
    </article>
  );
}
