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
import { useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { declarerVue } from "@/composants/mesure";
import { chargerFiche, chargerVoisins, type ParcoursFiche } from "@/donnees/requetes";
import { voisinsDeParcours, type VoisinageParcours } from "@/modele/maillage";
import { FilAriane, balisageFilAriane, type Miette } from "@/composants/FilAriane";
import { LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { slugifierOrganisme } from "@/modele/organismes";
import type { DomaineParcours } from "@/types/cursus";
import { descriptionFiche, titreFiche } from "@/modele/description-fiche";
import { ContenuFiche, EnteteFiche } from "@/composants/ContenuFiche";

const SITE = "https://formlist.fr";

/*
  CE QUE LE LOADER REND, ÉCRIT UNE FOIS ET EMPLOYÉ AUX DEUX BOUTS.

  L'inférence de TanStack Router traverse tout l'arbre de routes, et le dépôt en
  atteint le plafond : le 16 août 2026, l'ajout d'UNE route — même vide, même
  sans loader — a suffi à faire s'effondrer `useLoaderData()` en `any` ici et
  sur la page organisme, deux fichiers que la nouvelle route ne touchait pas.
  Rien ne plante et rien ne rougit à l'exécution ; les composants perdent
  simplement leurs types. C'est le motif du §8 dans sa version la plus discrète :
  la couche qui lit renonce, en silence.

  Le remède existait déjà dans ce dépôt — `index.tsx` et `methode.tsx` portent la
  même assertion depuis une rencontre antérieure du même plafond. L'alias la rend
  sûre : employé par le loader ET par la lecture, il fait d'une divergence entre
  les deux une erreur de compilation, ce qu'une assertion posée seule ne serait
  pas.
*/
type DonneesFiche = { fiche: ParcoursFiche; voisinage: VoisinageParcours };

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
  loader: async ({ params }): Promise<DonneesFiche> => {
    const fiche = await chargerFiche(params.slug);
    if (!fiche) throw notFound();
    /*
      Les voisins arrivent APRÈS la fiche, et par une requête ciblée sur le
      seul domaine concerné : la décision ci-dessus tient toujours, on ne
      recharge pas 233 fiches pour en montrer cinq.

      En série et non en parallèle, parce que le domaine n'est connu qu'une
      fois la fiche lue. Le coût est un aller-retour sur une requête plafonnée,
      contre une page orpheline — 21 fiches du catalogue n'ont pas trois
      voisins de même sujet, et sans ce lien elles ne seraient désignées par
      rien.
    */
    const candidats = await chargerVoisins(fiche.domaine, fiche.organismeNom);
    return { fiche, voisinage: voisinsDeParcours(candidats, fiche) };
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
        /*
          Le fil d'Ariane est déclaré à partir des MÊMES miettes que celles
          rendues à l'écran. Deux sources produiraient deux chemins, et Google
          afficherait dans ses résultats une hiérarchie que la page ne montre
          pas — ce que le balisage structuré interdit.
        */
        balisageFilAriane(miettesDeFiche(fiche)),
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

/** Le chemin d'une fiche : accueil, son domaine, son intitulé. */
function miettesDeFiche(fiche: { nom: string; domaine: DomaineParcours }): Miette[] {
  return [
    { libelle: "Accueil", chemin: "/" },
    /* Le niveau intermédiaire est la LISTE, pas l'accueil : un fil d'Ariane
       décrit le chemin par lequel on atteint la page, et on atteint une fiche
       depuis le catalogue. */
    { libelle: "Le catalogue", chemin: "/catalogue" },
    { libelle: LIBELLES_DOMAINES[fiche.domaine], chemin: `/?domaine=${fiche.domaine}` },
    { libelle: fiche.nom },
  ];
}

function Fiche() {
  const { fiche, voisinage } = Route.useLoaderData() as DonneesFiche;

  /*
    LA SEULE VUE QUI N'ÉTAIT PAS DÉCLARÉE, alors que deux événements partent
    d'ici — `site_officiel_ouvert` et `correction_signalee`. Faute de
    déclaration, ils portaient la vue de la page PRÉCÉDENTE : une sortie vers
    le site de l'organisme était attribuée au catalogue. Le chiffre existait,
    se lisait, et désignait la mauvaise page.
  */
  useEffect(() => declarerVue("fiche"), []);

  return (
    <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      {/*
        Le fil remplace le lien « ← Retour au catalogue », qui disait moins :
        il ne nommait ni le domaine, ni la position de la page dans le site.
        Un seul chemin à l'écran, le même que celui déclaré aux robots.
      */}
      <FilAriane miettes={miettesDeFiche(fiche)} />

      <header className="mt-6 border-b border-border pb-6">
        <EnteteFiche p={fiche} />
      </header>

      <ContenuFiche p={fiche} />

      {voisinage.parcours.length > 0 && (
        /*
          CE N'EST PAS UNE RECOMMANDATION. La section ne conseille rien, ne
          classe rien et ne met rien en avant : elle dit que d'autres
          organismes enseignent le même sujet, et publie la règle d'ordre
          appliquée. Aucune formule du type « formations similaires
          recommandées » — ce serait un jugement.

          Les ancres portent l'intitulé du parcours, jamais « voir la fiche » :
          c'est le texte du lien qui dit de quoi parle la page visée.
        */
        <section className="mt-(--space-10) border-t border-(--border-subtle) pt-(--space-6)">
          <h2 className="t-heading-3 text-(--text-primary)">{voisinage.titre}</h2>
          <ul className="mt-(--space-4) space-y-(--space-3)">
            {voisinage.parcours.map((p) => (
              <li key={p.slug}>
                <Link
                  to="/parcours/$slug"
                  params={{ slug: p.slug }}
                  className="t-body-sm text-(--text-primary) underline-offset-4 hover:underline"
                >
                  {p.nom}
                </Link>
                <p className="t-caption text-(--text-secondary)">
                  <Link
                    to="/organismes/$slug"
                    params={{ slug: slugifierOrganisme(p.organismeNom) }}
                    className="underline-offset-2 hover:underline"
                  >
                    {p.organismeNom}
                  </Link>
                  {" · "}
                  <span className="chiffre">
                    {p.infosRenseignees} sur {p.infosApplicables} applicables
                  </span>
                </p>
              </li>
            ))}
          </ul>
          {/* La règle d'ordre est publiée, comme sous la liste : un ordre dont
              on ne dit pas la règle est un classement éditorial déguisé. */}
          <p className="mt-(--space-4) t-caption text-(--text-tertiary)">
            {voisinage.regleOrdre}
          </p>
        </section>
      )}
    </article>
  );
}
