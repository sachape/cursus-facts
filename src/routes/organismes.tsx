/**
 * Organismes — le niveau supérieur de la hiérarchie.
 *
 * Organisme → Parcours → Variante → Session. Son rôle produit : éviter qu'un
 * seul acteur occupe artificiellement les résultats. Voir qu'un organisme porte
 * 24 parcours est une information sur le catalogue, pas sur sa qualité — et
 * c'est ce qui permet de comprendre pourquoi son nom revient souvent.
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { chargerListe, type ParcoursListe } from "@/donnees/requetes";
import { LIBELLES_CATEGORIES, LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/organismes")({
  loader: () => chargerListe(),
  component: Organismes,
  head: () => ({
    meta: [
      { title: "Organismes de formation e-commerce | Formlist" },
      {
        name: "description",
        content:
          "Les organismes référencés, leur nombre de parcours, les domaines couverts et leurs principaux sujets.",
      },
    ],
  }),
});

type Organisme = {
  nom: string;
  categorie: ParcoursListe["organismeCategorie"];
  parcours: number;
  domaines: number;
  sujets: string[];
};

function regrouperParOrganisme(parcours: readonly ParcoursListe[]): Organisme[] {
  const par = new Map<string, ParcoursListe[]>();
  for (const p of parcours) {
    const existant = par.get(p.organismeNom);
    if (existant) existant.push(p);
    else par.set(p.organismeNom, [p]);
  }

  return [...par.entries()]
    .map(([nom, liste]) => {
      // Sujets les plus portés d'abord : ce qui décrit le mieux l'organisme.
      const compte = new Map<string, number>();
      for (const p of liste) compte.set(p.sujetPrincipal, (compte.get(p.sujetPrincipal) ?? 0) + 1);
      const sujets = [...compte.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
        .slice(0, 3)
        .map(([sujet]) => sujet);

      return {
        nom,
        categorie: liste[0]!.organismeCategorie,
        parcours: liste.length,
        domaines: new Set(liste.map((p) => p.domaine)).size,
        sujets,
      };
    })
    .sort((a, b) => b.parcours - a.parcours || a.nom.localeCompare(b.nom, "fr"));
}

function Organismes() {
  const parcours = Route.useLoaderData();
  const [recherche, setRecherche] = useState("");

  const organismes = useMemo(() => regrouperParOrganisme(parcours), [parcours]);
  const filtres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (terme === "") return organismes;
    return organismes.filter((o) => o.nom.toLowerCase().includes(terme));
  }, [organismes, recherche]);

  const multiCatalogue = organismes.filter((o) => o.parcours > 1).length;

  return (
    <main className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) py-(--space-12)">
      <h1 className="font-titre text-2xl font-semibold sm:text-3xl">Organismes</h1>
      <p className="mt-3 max-w-2xl t-body-sm text-(--text-secondary)">
        Le niveau au-dessus des parcours. Le nombre de parcours référencés décrit l&apos;étendue
        d&apos;un catalogue, pas la qualité d&apos;un organisme.
      </p>

      <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 t-body-sm">
        <div>
          <dd className="chiffre text-xl">{organismes.length.toLocaleString("fr-FR")}</dd>
          <p className="t-caption text-(--text-secondary)">organismes</p>
        </div>
        <div>
          <dd className="chiffre text-xl">{multiCatalogue.toLocaleString("fr-FR")}</dd>
          <p className="t-caption text-(--text-secondary)">portent plusieurs parcours</p>
        </div>
        <div>
          <dd className="chiffre text-xl">{parcours.length.toLocaleString("fr-FR")}</dd>
          <p className="t-caption text-(--text-secondary)">parcours au total</p>
        </div>
      </dl>

      <div className="mt-6 max-w-sm">
        <Input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un organisme…"
          aria-label="Rechercher un organisme"
        />
      </div>

      {filtres.length === 0 ? (
        <p className="py-16 text-center t-body-sm text-(--text-secondary)">
          Aucun organisme ne correspond à cette recherche.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtres.map((organisme) => (
            <li key={organisme.nom}>
              <Link
                to="/"
                search={{ organisme: organisme.nom }}
                className="flex h-full flex-col rounded-(--carte-rayon) border border-(--border-subtle) bg-(--surface-raised) p-(--space-5) transition-[border-color,box-shadow,transform] duration-(--motion-fast) ease-(--ease-standard) hover:border-(--border-default) hover:shadow-(--elevation-2) motion-safe:hover:-translate-y-px"
              >
                <h2 className="font-titre t-body-sm font-medium leading-snug">{organisme.nom}</h2>
                <p className="mt-1 t-caption text-(--text-secondary)">
                  {LIBELLES_CATEGORIES[organisme.categorie]}
                </p>

                <p className="mt-3 t-caption text-(--text-secondary)">
                  <span className="chiffre text-(--text-primary)">{organisme.parcours}</span>{" "}
                  {organisme.parcours > 1 ? "parcours" : "parcours"}
                  <span aria-hidden> · </span>
                  <span className="chiffre text-(--text-primary)">{organisme.domaines}</span>{" "}
                  {organisme.domaines > 1 ? "domaines" : "domaine"}
                </p>

                <ul className="mt-3 flex flex-wrap gap-1">
                  {organisme.sujets.map((sujet) => (
                    <li
                      key={sujet}
                      className="rounded-full border border-(--border-subtle) px-3 py-1 t-caption text-(--text-secondary)"
                    >
                      {sujet}
                    </li>
                  ))}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 border-t border-(--border-subtle) pt-4 t-caption text-(--text-secondary)">
        Un clic sur un organisme filtre le catalogue sur ses parcours.{" "}
        <Link to="/methode" className="underline underline-offset-4">
          Les sept catégories d&apos;organisme sont publiées dans la Méthode
        </Link>{" "}
        — elles évitent qu&apos;un cours à 15 € et un mastère de deux ans se retrouvent dans la
        même liste.
      </p>
    </main>
  );
}

export { regrouperParOrganisme };
