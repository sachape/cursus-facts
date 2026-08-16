/**
 * Mes formations — ce que la personne a mis de côté.
 *
 * LES MÊMES RANGÉES QUE L'EXPLORATEUR, sans duplication de composant. C'est le
 * point d'appel unique du chantier 6 appliqué ici : une seconde rangée
 * divergerait au premier ajustement, et deux vues afficheraient alors le même
 * parcours différemment.
 *
 * L'ÉTAT VIDE EST UNE INVITATION, PAS UN CONSTAT. « Aucune formation
 * sauvegardée » décrit un manque et laisse la personne devant un mur ; dire où
 * aller et pourquoi lui rend la main.
 *
 * `noindex` : c'est une page personnelle, elle n'a rien à faire dans l'index.
 */
import { useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { chargerListe, type ParcoursListe } from "@/donnees/requetes";
import { useAuth } from "@/composants/authentification";
import { useSauvegardes } from "@/composants/sauvegardes";
import { TrainingResultCard } from "@/composants/TrainingResultCard";
import { regrouperParOrganisme } from "@/modele/organismes";
import { BoutonSauvegarde } from "@/composants/BoutonSauvegarde";
import { hrefOrganisme } from "@/composants/lien-organisme";
import { LIBELLES_CATEGORIES } from "@/modele/vocabulaires";
import { declarerVue } from "@/composants/mesure";

export const Route = createFileRoute("/mes-formations")({
  loader: () => chargerListe(),
  component: MesFormations,
  head: () => ({
    meta: [{ title: "Mes formations | Formlist" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

function Invitation({ quoi }: { quoi: string }) {
  return (
    <p className="py-(--space-12) text-center t-body-sm text-(--text-secondary)">
      Vous n&apos;avez pas encore mis de {quoi} de côté.{" "}
      <Link to="/catalogue" className="text-(--text-primary) underline underline-offset-2">
        Parcourez le catalogue
      </Link>{" "}
      et touchez le signet pour retrouver ici ce qui vous intéresse.
    </p>
  );
}

function MesFormations() {
  useEffect(() => declarerVue("mes_formations"), []);
  /* Assertion volontaire : l'arbre de routes atteint le plafond d'inférence de
     TypeScript, et `useLoaderData()` s'effondre en `any` sans elle. Motif
     détaillé dans `parcours.$slug.tsx`. */
  const catalogue = Route.useLoaderData() as ParcoursListe[];
  const { utilisateur, chargement } = useAuth();
  const { cles, chargement: chargementSauvegardes } = useSauvegardes();

  const parcours = useMemo(
    () => catalogue.filter((p) => cles.has(`parcours:${p.slug}`)),
    [catalogue, cles],
  );
  const organismes = useMemo(
    () => regrouperParOrganisme(catalogue).filter((o) => cles.has(`organisme:${o.slug}`)),
    [catalogue, cles],
  );

  if (chargement) return <main className="py-(--space-16)" />;

  if (utilisateur === null) {
    return (
      <main className="mx-auto max-w-(--formulaire-largeur) px-(--space-6) py-(--space-16) text-center">
        <h1 className="t-heading-1 text-(--text-primary)">Mes formations</h1>
        <p className="mt-(--space-4) t-body-sm text-(--text-secondary)">
          Créez un compte pour retrouver vos formations d&apos;une visite à l&apos;autre.
        </p>
        <p className="mt-(--space-6)">
          <Link
            to="/connexion"
            search={{ retour: "/mes-formations" }}
            className="inline-flex h-(--bouton-hauteur) items-center rounded-(--radius-md) bg-(--interactive-default) px-(--space-4) t-body-sm font-medium text-(--text-on-inverse)"
          >
            Se connecter
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) py-(--space-12)">
      <h1 className="t-heading-1 text-(--text-primary)">Mes formations</h1>

      <section className="mt-(--space-10)">
        <h2 className="t-heading-3 text-(--text-primary)">
          Parcours
          <span className="chiffre ml-(--space-2) t-body-sm text-(--text-secondary)">
            {parcours.length}
          </span>
        </h2>
        {chargementSauvegardes ? (
          <p className="py-(--space-8) t-body-sm text-(--text-secondary)">Chargement…</p>
        ) : parcours.length === 0 ? (
          <Invitation quoi="parcours" />
        ) : (
          /* Même liste que l'explorateur : cartes espacées sur le fond de
             page, jamais des rangées séparées par un filet. */
          <ul className="mt-(--space-4) flex flex-col gap-(--space-4)">
            {parcours.map((p) => (
              <TrainingResultCard key={p.id} parcours={p} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-(--space-12)">
        <h2 className="t-heading-3 text-(--text-primary)">
          Organismes
          <span className="chiffre ml-(--space-2) t-body-sm text-(--text-secondary)">
            {organismes.length}
          </span>
        </h2>
        {organismes.length === 0 ? (
          <Invitation quoi="organisme" />
        ) : (
          <ul className="mt-(--space-4) grid gap-(--space-3) sm:grid-cols-2 lg:grid-cols-3">
            {organismes.map((o) => (
              <li key={o.slug} className="relative">
                <a
                  href={hrefOrganisme(o.nom)}
                  className="flex h-full flex-col rounded-(--carte-rayon) border border-(--border-subtle) bg-(--surface-raised) p-(--space-5) pr-(--space-12) transition-[border-color,box-shadow] duration-(--motion-fast) hover:border-(--border-default) hover:shadow-(--elevation-2)"
                >
                  <span className="font-titre t-body-sm font-medium">{o.nom}</span>
                  <span className="mt-(--space-1) t-caption text-(--text-secondary)">
                    {LIBELLES_CATEGORIES[o.categorie]} · <span className="chiffre">{o.parcours}</span>
                  </span>
                </a>
                <span className="absolute right-(--space-3) top-(--space-3)">
                  <BoutonSauvegarde type="organisme" cibleId={o.slug} libelle={o.nom} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
