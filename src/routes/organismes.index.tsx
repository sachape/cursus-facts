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
import { chargerListe } from "@/donnees/requetes";
import { regrouperParOrganisme } from "@/modele/organismes";
import { hrefOrganisme } from "@/composants/lien-organisme";
import { BoutonSauvegarde } from "@/composants/BoutonSauvegarde";
import { formaterDateCourte } from "@/modele/dates";
import { LIBELLES_CATEGORIES, LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/organismes/")({
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
            <li key={organisme.nom} className="relative">
              <a
                href={hrefOrganisme(organisme.nom)}
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

                {/*
                  Ce qui permet de CHOISIR quel organisme ouvrir. Le nombre de
                  parcours seul ne le dit pas : entre deux organismes à six
                  fiches, celui dont les coûts sont établis et la vérification
                  récente est celui sur lequel on peut décider.
                */}
                <p className="mt-(--space-2) t-caption text-(--text-tertiary)">
                  <span className="chiffre">{organisme.parcoursAvecCout}</span> avec un coût
                  renseigné
                  {organisme.derniereVerification !== null && (
                    <>
                      <span aria-hidden> · </span>
                      vérifié le{" "}
                      <span className="chiffre">
                        {formaterDateCourte(organisme.derniereVerification)}
                      </span>
                    </>
                  )}
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
              </a>
              {/* En haut à droite, hors de l'ancre : la carte entière est un
                  lien, et un bouton dedans serait avalé par la navigation. */}
              <span className="absolute right-(--space-3) top-(--space-3)">
                <BoutonSauvegarde type="organisme" cibleId={organisme.slug} libelle={organisme.nom} />
              </span>
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
