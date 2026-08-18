/**
 * Mes alertes — ce que le compte suit, et comment cesser de le suivre.
 *
 * L'ÉCRAN EXISTAIT AVANT LA FONCTIONNALITÉ, et annonçait son arrivée. Il la
 * porte depuis le 18 août 2026.
 *
 * IL NOMME LES PARCOURS, IL NE LES COMPTE PAS. « 3 alertes actives » ne permet
 * pas de vérifier que ce sont bien les trois voulues — et c'est exactement ce
 * qu'on vient chercher ici quand on a reçu un email qu'on n'attendait pas.
 *
 * Il porte son `noindex` dès le premier jour : une page de compte n'a rien à
 * faire dans un index.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/composants/authentification";
import { useAlertesSuivies } from "@/composants/alertes-suivi";
import { chargerListe, type ParcoursListe } from "@/donnees/requetes";
import { LIBELLES_CHAMPS } from "@/courriel/changement";
import { CHAMPS_SURVEILLES } from "@/modele/alertes";

export const Route = createFileRoute("/mes-alertes")({
  component: MesAlertes,
  head: () => ({
    meta: [{ title: "Mes alertes | Formlist" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

function MesAlertes() {
  const { utilisateur, chargement: chargementCompte } = useAuth();
  const { suivis, basculer, chargement } = useAlertesSuivies();
  const [catalogue, setCatalogue] = useState<ParcoursListe[]>([]);

  useEffect(() => {
    let annule = false;
    void chargerListe().then((liste) => {
      if (!annule) setCatalogue(liste);
    });
    return () => {
      annule = true;
    };
  }, []);

  const parcoursSuivis = suivis
    .map((slug) => catalogue.find((p) => p.slug === slug) ?? null)
    .filter((p): p is ParcoursListe => p !== null);

  const champs = CHAMPS_SURVEILLES.map((c) => LIBELLES_CHAMPS[c] ?? c).join(", ").toLowerCase();

  return (
    <main className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) py-(--space-12)">
      <h1 className="t-heading-1 text-(--text-primary)">Mes alertes</h1>

      <p className="mt-(--space-4) max-w-(--lecture-largeur-max) t-body-sm text-(--text-secondary)">
        Vous êtes prévenu par email lorsqu&apos;une information change sur un parcours que vous
        suivez — {champs}. Seule une valeur qui change déclenche un email : une fiche relue sans
        modification n&apos;en produit aucun.
      </p>

      {chargementCompte ? null : utilisateur === null ? (
        <p className="mt-(--space-6) t-body-sm text-(--text-secondary)">
          <Link to="/connexion" className="underline underline-offset-2">
            Connectez-vous
          </Link>{" "}
          pour voir les parcours que vous suivez.
        </p>
      ) : chargement ? (
        <p className="mt-(--space-6) t-body-sm text-(--text-tertiary)">Chargement…</p>
      ) : parcoursSuivis.length === 0 ? (
        /*
          L'ÉTAT VIDE DIT OÙ SE FAIT LE GESTE. « Aucune alerte » seul laisse
          chercher : le suivi s'active depuis une fiche, sur la ligne qui porte
          la date de vérification, et rien à cet écran ne le laisserait deviner.
        */
        <p className="mt-(--space-6) max-w-(--lecture-largeur-max) t-body-sm text-(--text-secondary)">
          Vous ne suivez aucun parcours pour l&apos;instant. Ouvrez une fiche depuis{" "}
          <Link to="/catalogue" className="underline underline-offset-2">
            le catalogue
          </Link>{" "}
          : sous les informations, la ligne « Vérifié le… » porte le bouton « Me prévenir si ça
          change ».
        </p>
      ) : (
        <ul className="mt-(--space-8) flex flex-col gap-(--space-3)">
          {parcoursSuivis.map((p) => (
            <li
              key={p.slug}
              className="flex flex-wrap items-center justify-between gap-(--space-3) rounded-(--radius-md) border border-(--border-subtle) p-(--space-4)"
            >
              <div className="min-w-0">
                <Link
                  to="/parcours/$slug"
                  params={{ slug: p.slug }}
                  className="t-body font-medium text-(--text-primary) underline-offset-2 hover:underline"
                >
                  {p.nom}
                </Link>
                <p className="mt-(--space-1) t-caption text-(--text-secondary)">{p.organismeNom}</p>
              </div>
              <button
                type="button"
                onClick={() => void basculer(p.slug)}
                className="shrink-0 rounded-(--radius-sm) t-caption text-(--text-secondary) underline underline-offset-2 transition-colors duration-(--motion-fast) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
              >
                Ne plus suivre
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-(--space-8) t-body-sm">
        <Link to="/catalogue" className="text-(--text-secondary) underline underline-offset-2">
          ← Retour au catalogue
        </Link>
      </p>
    </main>
  );
}
