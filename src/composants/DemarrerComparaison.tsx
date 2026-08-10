/**
 * L'état vide de la vue Comparer — un point de départ, pas un renvoi.
 *
 * LA PAGE NE POUVAIT RIEN FAIRE PAR ELLE-MÊME. Elle attendait une sélection
 * faite ailleurs, donc elle renvoyait ailleurs : un aller-retour, pas une page.
 *
 * Deux façons de le régler. Sélectionner des parcours ici dupliquerait
 * l'explorateur — deux endroits pour le même geste. On garde donc l'ajout par
 * le NOM, qui est un geste différent : on sait déjà ce qu'on cherche.
 *
 * ET DES COMPARAISONS PRÊTES À OUVRIR, tirées au sort parmi celles qui
 * apprennent quelque chose. Le tirage a lieu APRÈS montage : un ordre aléatoire
 * calculé des deux côtés différerait, et l'hydratation échouerait.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ParcoursListe } from "@/donnees/requetes";
import { RechercheHero, type Suggestion } from "./RechercheHero";
import { useComparaison } from "./comparaison";
import { comparaisonsProposees, type ComparaisonProposee } from "@/modele/comparaisons-proposees";
import { formaterDateCourte } from "@/modele/dates";

const COMBIEN = 4;

/** Mélange sans modifier la source. */
function melanger<T>(liste: T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j]!, copie[i]!];
  }
  return copie;
}

export type ComparaisonEnregistree = {
  id: string;
  nom: string | null;
  parcours_ids: string[];
  cree_le: string;
};

export function DemarrerComparaison({
  catalogue,
  enregistrees,
}: {
  catalogue: readonly ParcoursListe[];
  /** Les comparaisons du compte, vides pour un visiteur déconnecté. */
  enregistrees: ComparaisonEnregistree[];
}) {
  const { ajouter, remplacer, slugs } = useComparaison();
  const naviguer = useNavigate();
  const [recherche, setRecherche] = useState("");

  /*
    Tiré au sort après montage. Le tableau vide au premier rendu est volontaire :
    c'est ce qui garantit que serveur et client produisent le même HTML.
  */
  const [proposees, setProposees] = useState<ComparaisonProposee[]>([]);
  useEffect(() => {
    setProposees(comparaisonsProposees(catalogue, COMBIEN, melanger));
  }, [catalogue]);

  /*
    Suggestions RESTREINTES AUX PARCOURS : ici on compose une comparaison, et un
    organisme ou un domaine n'y a pas sa place. Les parcours déjà retenus
    sortent de la liste — les reproposer laisserait croire à un ajout qui
    n'aurait aucun effet.
  */
  const suggestions: Suggestion[] = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (terme.length < 2) return [];
    return catalogue
      .filter((p) => !slugs.includes(p.slug) && p.nom.toLowerCase().includes(terme))
      .slice(0, 8)
      .map((p) => ({
        type: "parcours" as const,
        libelle: p.nom,
        detail: p.organismeNom,
        choisir: () => {
          ajouter({ slug: p.slug, nom: p.nom });
          // Le champ reste actif : on en ajoute un deuxième, puis un troisième.
          setRecherche("");
        },
      }));
  }, [recherche, catalogue, slugs, ajouter]);

  return (
    <main className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) py-(--space-12)">
      <h1 className="t-heading-1 text-(--text-primary)">Comparer des parcours</h1>
      <p className="mt-(--space-3) max-w-2xl t-body-sm text-(--text-secondary)">
        Sélectionnez deux à quatre parcours pour les comparer sur 21 informations vérifiables.
      </p>

      {/* Le geste principal de la page : il vient en premier et sans détour. */}
      <div className="mt-(--space-6) max-w-(--hero-chiffres-largeur)">
        <RechercheHero
          valeur={recherche}
          modifier={setRecherche}
          suggestions={suggestions}
          placeholderPersonnalise="Ajouter un parcours à comparer…"
        />
        {slugs.length === 1 && (
          <p role="status" className="mt-(--space-3) t-caption text-(--text-secondary)">
            Un parcours retenu. Ajoutez-en un second pour voir la comparaison.
          </p>
        )}
      </div>

      {/* Action secondaire : elle reste, mais elle n'est plus la seule issue. */}
      <p className="mt-(--space-4) t-body-sm">
        <Link
          to="/"
          className="text-(--text-secondary) underline-offset-2 hover:text-(--text-primary) hover:underline"
        >
          Retourner au catalogue
        </Link>
      </p>

      {enregistrees.length > 0 && (
        <section className="mt-(--space-12)">
          <h2 className="t-heading-3 text-(--text-primary)">Mes comparaisons</h2>
          <ul className="mt-(--space-4) grid gap-(--space-3) min-[768px]:grid-cols-2">
            {enregistrees.map((c) => {
              const noms = c.parcours_ids
                .map((s) => catalogue.find((p) => p.slug === s))
                .filter((p): p is ParcoursListe => p !== undefined);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() =>
                      remplacer(noms.map((p) => ({ slug: p.slug, nom: p.nom })))
                    }
                    className="w-full rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) p-(--space-4) text-left transition-[border-color,box-shadow] duration-(--motion-fast) hover:border-(--border-default) hover:shadow-(--elevation-2)"
                  >
                    <span className="flex items-baseline justify-between gap-(--space-3)">
                      <span className="t-body font-medium text-(--text-primary)">
                        {c.nom ?? noms.map((p) => p.nom).join(" · ")}
                      </span>
                      <span className="chiffre shrink-0 t-caption text-(--text-tertiary)">
                        {formaterDateCourte(c.cree_le)}
                      </span>
                    </span>
                    <span className="mt-(--space-1) block t-caption text-(--text-secondary)">
                      {noms.map((p) => p.organismeNom).join(" · ")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/*
        « Possibles », jamais « populaires » ni « recommandées ». Le premier
        décrit ce que le catalogue permet ; les deux autres affirmeraient un
        jugement que rien ne fonde — et « populaires » ferait en plus remonter
        un signal d'usage, ce que l'invariant de classement interdit.

        La section disparaît si aucune paire ne remplit les critères : mieux
        vaut rien qu'une proposition qui n'apprend rien.
      */}
      {proposees.length > 0 && (
        <section className="mt-(--space-12)">
          <h2 className="t-heading-3 text-(--text-primary)">Comparaisons possibles</h2>
          <p className="mt-(--space-2) max-w-2xl t-caption text-(--text-tertiary)">
            Des parcours du même sujet, dont le coût est publié et qui diffèrent réellement. Tirées
            au sort à chaque visite — nous ne mettons aucun organisme en avant.
          </p>
          <ul className="mt-(--space-4) grid gap-(--space-3) min-[768px]:grid-cols-2">
            {proposees.map((c) => (
              <li key={c.cle}>
                <button
                  type="button"
                  onClick={() => {
                    remplacer(c.parcours.map((p) => ({ slug: p.slug, nom: p.nom })));
                    void naviguer({ to: "/comparer" });
                  }}
                  className="flex h-full w-full flex-col gap-(--space-2) rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) p-(--space-4) text-left transition-[border-color,box-shadow] duration-(--motion-fast) hover:border-(--border-default) hover:shadow-(--elevation-2)"
                >
                  {c.parcours.map((p) => (
                    <span key={p.slug} className="block">
                      <span className="block t-body-sm font-medium text-(--text-primary)">
                        {p.nom}
                      </span>
                      <span className="block t-caption text-(--text-secondary)">
                        {p.organismeNom}
                      </span>
                    </span>
                  ))}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
