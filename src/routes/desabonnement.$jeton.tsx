/**
 * La page de désabonnement, atteinte depuis un email.
 *
 * DEUX CHEMINS, LE MÊME EFFET. Le lien du pied ouvre cette page ; le bouton
 * natif des messageries envoie un POST sans jamais l'ouvrir — c'est ce que
 * l'en-tête `List-Unsubscribe-Post` promet. Déclarer cette promesse sans
 * répondre au POST ferait échouer le bouton chez Gmail et Outlook, là où il est
 * le plus utilisé.
 *
 * `noindex` : une adresse qui porte un jeton n'a rien à faire dans un index.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { desabonner, type ResultatDesabonnement } from "@/courriel/desabonnement.functions";

export const Route = createFileRoute("/desabonnement/$jeton")({
  loader: ({ params }): Promise<ResultatDesabonnement> => desabonner({ data: { jeton: params.jeton } }),
  server: {
    handlers: {
      POST: async ({ params }) => {
        await desabonner({ data: { jeton: params["jeton"] as string } });
        // Un client One-Click n'affiche rien : seul le code compte.
        return new Response(null, { status: 200 });
      },
    },
  },
  component: Desabonnement,
  head: () => ({
    meta: [
      { title: "Désabonnement | Formlist" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const MESSAGES: Record<ResultatDesabonnement["statut"], { titre: string; corps: string }> = {
  ok: {
    titre: "C'est fait",
    corps:
      "Vous ne recevrez plus d'email de Formlist. Votre adresse reste enregistrée comme désabonnée, sans quoi nous ne saurions pas qu'il ne faut plus vous écrire.",
  },
  introuvable: {
    titre: "Ce lien n'est plus valide",
    corps:
      "Il a peut-être déjà servi. Si vous recevez encore des emails, répondez à celui que vous avez reçu et nous le ferons à la main.",
  },
  echec: {
    titre: "Le désabonnement n'a pas abouti",
    corps:
      "Rien n'a été modifié. Réessayez dans un instant, ou répondez à l'email que vous avez reçu.",
  },
};

function Desabonnement() {
  const resultat = Route.useLoaderData();
  const message = MESSAGES[resultat.statut];

  return (
    <main className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) py-(--space-12)">
      <h1 className="t-heading-1 text-(--text-primary)">{message.titre}</h1>
      <p className="mt-(--space-4) max-w-(--lecture-largeur-max) t-body-sm text-(--text-secondary)">
        {message.corps}
      </p>
      <p className="mt-(--space-6) t-body-sm">
        <Link to="/catalogue" className="text-(--text-secondary) underline underline-offset-2">
          ← Retour au catalogue
        </Link>
      </p>
    </main>
  );
}
