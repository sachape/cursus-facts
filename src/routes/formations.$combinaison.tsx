/**
 * Une page de croisement — `/formations/shopify-a-distance`.
 *
 * ELLE N'EXISTE QUE TANT QUE LA DONNÉE LA JUSTIFIE. Le loader recalcule les
 * croisements au chargement ; un slug qui ne franchit plus le seuil répond 404,
 * sans qu'aucune liste n'ait été tenue à jour. C'est la différence entre une
 * page générée et une page écrite : la première disparaît toute seule.
 *
 * TOUT CE QUE LA PAGE AFFICHE EST LU DANS LA LISTE — titre, description,
 * introduction, fourchette de prix. Aucun chiffre en dur : une page qui annonce
 * douze formations en annonce onze le jour où l'une sort du catalogue.
 *
 * AUCUN CLASSEMENT PAR QUALITÉ, ici comme partout : l'ordre est le tri par
 * défaut du catalogue, et son libellé est affiché sous la liste. Une page
 * d'atterrissage est exactement l'endroit où l'on serait tenté de « mettre en
 * avant » — c'est donc l'endroit où la règle doit être la plus visible.
 */
import { useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { chargerListe, type ParcoursListe } from "@/donnees/requetes";
import {
  chiffres,
  croisementParSlug,
  croisements,
  description,
  introduction,
  titre,
  voisins,
  type ChiffresCroisement,
} from "@/modele/croisements";
import { adresseFiltre, versParametres } from "@/modele/filtres-url";
import { filtrer } from "@/modele/filtres";
import { classer, LIBELLES_TRIS, TRI_PAR_DEFAUT } from "@/modele/classement";
import { TrainingResultCard } from "@/composants/TrainingResultCard";
import { balisageFilAriane, FilAriane, type Miette } from "@/composants/FilAriane";
import { declarerVue } from "@/composants/mesure";
import { formaterNombre } from "@/modele/nombres";

const SITE = "https://formlist.fr";

type Voisin = { slug: string; libelle: string };

type DonneesCroisement = {
  slug: string;
  axeLibelle: string;
  critereLibelle: string;
  resultats: ParcoursListe[];
  ch: ChiffresCroisement;
  /** L'adresse du catalogue portant les mêmes filtres. */
  adresseCatalogue: string;
  voisins: Voisin[];
};

function miettes(d: DonneesCroisement): Miette[] {
  return [
    { libelle: "Accueil", chemin: "/" },
    { libelle: "Catalogue", chemin: "/catalogue" },
    { libelle: `${d.axeLibelle} ${d.critereLibelle}` },
  ];
}

export const Route = createFileRoute("/formations/$combinaison")({
  /*
    LE SEUIL EST APPLIQUÉ ICI, PAS À L'AFFICHAGE. `croisementParSlug` ne rend
    que les combinaisons qui réunissent cinq parcours dont trois avec un prix ;
    tout le reste tombe en 404. Une page sous le seuil n'est donc ni vide, ni en
    `noindex` : elle n'est pas servie du tout, ce qui est la seule réponse
    honnête à une adresse qui ne décrit plus rien.
  */
  loader: async ({ params }) => {
    const parcours = await chargerListe();
    const croisement = croisementParSlug(parcours, params.combinaison);
    if (croisement === undefined) throw notFound();

    const resultats = classer(filtrer(parcours, croisement.filtres), TRI_PAR_DEFAUT);
    return {
      slug: croisement.slug,
      axeLibelle: croisement.axeLibelle,
      critereLibelle: croisement.critereLibelle,
      resultats,
      ch: chiffres(resultats),
      adresseCatalogue: adresseFiltre(versParametres(croisement.filtres), "/catalogue"),
      voisins: voisins(croisements(parcours), croisement).map((v) => ({
        slug: v.slug,
        libelle: `${v.axeLibelle} ${v.critereLibelle}`,
      })),
    } satisfies DonneesCroisement;
  },
  component: PageCroisement,
  head: ({ loaderData }) => {
    if (loaderData === undefined) return {};
    const d = loaderData;
    const url = `${SITE}/formations/${d.slug}`;
    const c = { axeLibelle: d.axeLibelle, critereLibelle: d.critereLibelle };
    const t = titre(c, d.ch);
    const desc = description(c, d.ch);

    return {
      meta: [
        { title: t },
        { name: "description", content: desc },
        { property: "og:title", content: t },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      // Auto-référente : cette combinaison n'a qu'une adresse indexable, et
      // c'est celle-ci — l'équivalent à paramètres reste en `noindex`.
      links: [{ rel: "canonical", href: url }],
      scripts: [
        balisageFilAriane(miettes(d)),
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${d.axeLibelle} ${d.critereLibelle}`,
            description: desc,
            url,
            numberOfItems: d.resultats.length,
            /*
              L'ORDRE EST DÉCLARÉ NON ORDONNÉ, et c'est exact : le tri par
              défaut décrit l'état des fiches, pas la qualité des formations.
              Annoncer `ItemListOrderAscending` laisserait entendre un
              classement — le seul mensonge que ce balisage pourrait porter.
            */
            itemListOrder: "https://schema.org/ItemListUnordered",
            itemListElement: d.resultats.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE}/parcours/${p.slug}`,
              name: p.nom,
            })),
          }),
        },
      ],
    };
  },
});

function PageCroisement() {
  const d = Route.useLoaderData() as DonneesCroisement;

  // Une porte d'entrée référencée, pas le catalogue atteint depuis le site.
  useEffect(() => declarerVue("croisement"), []);

  const intro = introduction({ axeLibelle: d.axeLibelle, critereLibelle: d.critereLibelle }, d.ch);

  return (
    <main className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) py-(--space-10)">
      <FilAriane miettes={miettes(d)} />

      <header className="mt-(--space-4) max-w-(--lecture-largeur-max)">
        <h1 className="t-display-2 text-(--text-primary)">
          Formations {d.axeLibelle} {d.critereLibelle}
        </h1>
        <p className="mt-(--space-4) t-body-lg text-(--text-secondary)">{intro}</p>
      </header>

      <ul className="mt-(--space-8) grid gap-(--space-4)">
        {d.resultats.map((p) => (
          <li key={p.id}>
            <TrainingResultCard parcours={p} />
          </li>
        ))}
      </ul>

      {/*
        LE LIBELLÉ DU TRI SOUS LA LISTE, comme au catalogue. Une liste sans
        règle affichée se lit comme un classement, et c'est précisément ce que
        ce produit ne fait pas.
      */}
      <p className="mt-(--space-6) t-caption text-(--text-tertiary)">
        {LIBELLES_TRIS[TRI_PAR_DEFAUT]}
      </p>

      <p className="mt-(--space-6) t-body-sm text-(--text-secondary)">
        <Link to={d.adresseCatalogue} className="underline underline-offset-2">
          Ouvrir ces {formaterNombre(d.ch.total)} parcours dans le catalogue complet
        </Link>{" "}
        pour affiner sur le prix, la durée ou l'organisme.
      </p>

      {d.voisins.length > 0 ? (
        <nav aria-label="Croisements voisins" className="mt-(--space-10) border-t border-(--border-subtle) pt-(--space-6)">
          <h2 className="t-label text-(--text-tertiary)">Voir aussi</h2>
          <ul className="mt-(--space-3) flex flex-wrap gap-(--space-3)">
            {d.voisins.map((v) => (
              <li key={v.slug}>
                <Link
                  to="/formations/$combinaison"
                  params={{ combinaison: v.slug }}
                  className="t-body-sm text-(--text-secondary) underline underline-offset-2 hover:text-(--text-primary)"
                >
                  Formations {v.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </main>
  );
}
