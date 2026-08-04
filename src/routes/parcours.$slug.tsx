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
import { chargerFiche, chargerListe } from "@/donnees/requetes";
import { ContenuFiche, EnteteFiche } from "@/composants/ContenuFiche";

const SITE = "https://www.formlist.fr";

export const Route = createFileRoute("/parcours/$slug")({
  loader: async ({ params }) => {
    const fiche = await chargerFiche(params.slug);
    if (!fiche) throw notFound();
    // Le catalogue sert à lister les autres parcours du même organisme.
    const catalogue = await chargerListe();
    return {
      fiche,
      autres: catalogue.filter(
        (p) => p.organismeNom === fiche.organismeNom && p.slug !== fiche.slug,
      ),
    };
  },
  component: Fiche,
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { fiche } = loaderData;
    return {
      meta: [
        { title: `${fiche.nom} — ${fiche.organismeNom} | Formlist` },
        {
          name: "description",
          content: `${fiche.nom} par ${fiche.organismeNom}. ${fiche.infosRenseignees} informations vérifiées sur ${fiche.infosApplicables} applicables. Faits comparables, sans note ni classement.`,
        },
      ],
      // Canonique auto-référent : cette page est l'adresse de référence de la
      // fiche, y compris quand le panneau l'a poussée dans l'historique.
      links: [{ rel: "canonical", href: `${SITE}/parcours/${fiche.slug}` }],
    };
  },
});

function Fiche() {
  const { fiche, autres } = Route.useLoaderData();

  return (
    <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link to="/" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Retour au catalogue
      </Link>

      <header className="mt-6 border-b border-border pb-6">
        <EnteteFiche p={fiche} />
      </header>

      <ContenuFiche p={fiche} autresParcours={autres} />
    </article>
  );
}
