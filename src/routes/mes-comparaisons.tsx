/**
 * Mes comparaisons — les rapprochements mis de côté.
 *
 * Une comparaison enregistrée n'est pas un classement : c'est un ensemble de
 * parcours que la personne a voulu voir côte à côte. Rien de ce qui est
 * enregistré ici ne remonte nulle part — l'invariant de classement l'interdit,
 * et c'est vrai des comparaisons comme des sauvegardes.
 *
 * `noindex` : page personnelle.
 */
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/composants/authentification";
import { useComparaison } from "@/composants/comparaison";
import { chargerListe } from "@/donnees/requetes";
import { formaterDateCourte } from "@/modele/dates";

type Enregistree = {
  id: string;
  nom: string | null;
  parcours_ids: string[];
  cree_le: string;
};

export const Route = createFileRoute("/mes-comparaisons")({
  loader: () => chargerListe(),
  component: MesComparaisons,
  head: () => ({
    meta: [
      { title: "Mes comparaisons | Formlist" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function MesComparaisons() {
  const catalogue = Route.useLoaderData();
  const { utilisateur, chargement } = useAuth();
  const { remplacer } = useComparaison();
  const naviguer = useNavigate();

  const [liste, setListe] = useState<Enregistree[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [aSupprimer, setASupprimer] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    if (utilisateur === null) return;
    setEnCours(true);
    const { data } = await supabase
      .from("comparaisons")
      .select("id, nom, parcours_ids, cree_le")
      .order("cree_le", { ascending: false });
    setListe((data ?? []) as Enregistree[]);
    setEnCours(false);
  }, [utilisateur]);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  if (chargement) return <main className="py-(--space-16)" />;

  if (utilisateur === null) {
    return (
      <main className="mx-auto max-w-(--formulaire-largeur) px-(--space-6) py-(--space-16) text-center">
        <h1 className="t-heading-1 text-(--text-primary)">Mes comparaisons</h1>
        <p className="mt-(--space-4) t-body-sm text-(--text-secondary)">
          Créez un compte pour retrouver vos comparaisons d&apos;une visite à l&apos;autre.
        </p>
        <p className="mt-(--space-6)">
          <Link
            to="/connexion"
            search={{ retour: "/mes-comparaisons" }}
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
      <h1 className="t-heading-1 text-(--text-primary)">Mes comparaisons</h1>

      {enCours && liste.length === 0 ? (
        <p className="py-(--space-8) t-body-sm text-(--text-secondary)">Chargement…</p>
      ) : liste.length === 0 ? (
        <p className="py-(--space-12) text-center t-body-sm text-(--text-secondary)">
          Vous n&apos;avez pas encore enregistré de comparaison.{" "}
          <Link to="/" className="text-(--text-primary) underline underline-offset-2">
            Sélectionnez deux parcours
          </Link>{" "}
          depuis le catalogue pour les mettre côte à côte.
        </p>
      ) : (
        <ul className="mt-(--space-6) flex flex-col gap-(--space-3)">
          {liste.map((c) => {
            const noms = c.parcours_ids
              .map((slug) => catalogue.find((p) => p.slug === slug)?.nom)
              .filter((n): n is string => n !== undefined);
            return (
              <li
                key={c.id}
                className="rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) p-(--space-5)"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-(--space-3)">
                  <h2 className="t-body font-medium text-(--text-primary)">
                    {c.nom ?? noms.join(" · ")}
                  </h2>
                  <span className="chiffre t-caption text-(--text-tertiary)">
                    {formaterDateCourte(c.cree_le)}
                  </span>
                </div>
                <p className="mt-(--space-2) t-caption text-(--text-secondary)">
                  {noms.length > 0 ? noms.join(" · ") : "Parcours retirés du catalogue"}
                </p>

                <div className="mt-(--space-4) flex flex-wrap items-center gap-(--space-3)">
                  <button
                    type="button"
                    onClick={() => {
                      /*
                        Recharger REMPLACE la sélection en cours. Fusionner
                        produirait un ensemble que la personne n'a jamais
                        composé — et le plafond de quatre parcours la ferait
                        échouer sans qu'elle comprenne pourquoi.
                      */
                      remplacer(
                        c.parcours_ids
                          .map((slug) => catalogue.find((p) => p.slug === slug))
                          .filter((p): p is NonNullable<typeof p> => p !== undefined)
                          .map((p) => ({ slug: p.slug, nom: p.nom })),
                      );
                      void naviguer({ to: "/comparer" });
                    }}
                    className="inline-flex h-(--bouton-hauteur) items-center rounded-(--radius-md) border border-(--border-default) px-(--space-4) t-body-sm text-(--text-primary) transition-colors duration-(--motion-fast) hover:border-(--border-strong)"
                  >
                    Recharger
                  </button>

                  {aSupprimer === c.id ? (
                    <>
                      <span className="t-caption text-(--text-secondary)">Confirmer ?</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await supabase.from("comparaisons").delete().eq("id", c.id);
                          setASupprimer(null);
                          void recharger();
                        }}
                        className="t-body-sm text-(--status-error) underline underline-offset-2"
                      >
                        Supprimer
                      </button>
                      <button
                        type="button"
                        onClick={() => setASupprimer(null)}
                        className="t-body-sm text-(--text-secondary) underline underline-offset-2"
                      >
                        Annuler
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setASupprimer(c.id)}
                      className="t-body-sm text-(--text-tertiary) underline-offset-2 hover:text-(--text-secondary) hover:underline"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
