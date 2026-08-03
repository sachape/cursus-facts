/**
 * Explorer — la liste du catalogue.
 *
 * Le tri par défaut classe par nombre d'informations disponibles, et son
 * libellé est affiché sous la liste : un tri dont on ne publie pas la règle est
 * un classement éditorial déguisé.
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { chargerListe } from "@/donnees/requetes";
import { auMoinsUnFiltre, filtrer, FILTRES_VIDES, type Filtres } from "@/modele/filtres";
import { classer, LIBELLES_TRIS, TRIS, TRI_PAR_DEFAUT, type Tri } from "@/modele/classement";
import { LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { PanneauFiltres } from "@/composants/PanneauFiltres";
import { RangeeParcours } from "@/composants/RangeeParcours";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DomaineParcours } from "@/types/cursus";

export const Route = createFileRoute("/")({
  // La vue Organismes renvoie ici avec ?organisme=<nom> : le filtre vit dans
  // l'URL pour que le lien soit partageable et que le retour arrière marche.
  validateSearch: (recherche: Record<string, unknown>): { organisme?: string } =>
    typeof recherche["organisme"] === "string" ? { organisme: recherche["organisme"] } : {},
  loader: () => chargerListe(),
  component: Explorer,
  head: () => ({
    meta: [
      { title: "Cursus — comparateur de formations e-commerce" },
      {
        name: "description",
        content:
          "Comparez les formations e-commerce sur des faits vérifiables. Aucune note, aucun classement par qualité, aucun lien affilié.",
      },
    ],
  }),
});

const PAR_PAGE = 25;

const LIBELLES_TRIS_COURTS: Record<Tri, string> = {
  informations: "Informations disponibles",
  verification: "Dernière vérification",
  alphabetique: "Ordre alphabétique",
  prix: "Prix croissant",
  duree: "Volume horaire",
};

function Explorer() {
  const parcours = Route.useLoaderData();
  const { organisme } = Route.useSearch();
  const [filtres, setFiltres] = useState<Filtres>({
    ...FILTRES_VIDES,
    organisme: organisme ?? null,
  });
  const [tri, setTri] = useState<Tri>(TRI_PAR_DEFAUT);
  const [limite, setLimite] = useState(PAR_PAGE);

  const modifier = (patch: Partial<Filtres>) => {
    setFiltres((f) => ({ ...f, ...patch }));
    setLimite(PAR_PAGE);
  };

  const resultats = useMemo(() => classer(filtrer(parcours, filtres), tri), [parcours, filtres, tri]);

  const informationsTotales = parcours.reduce((s, p) => s + p.infosRenseignees, 0);
  const organismes = new Set(parcours.map((p) => p.organismeNom)).size;
  const domaines = (Object.keys(LIBELLES_DOMAINES) as DomaineParcours[]).filter((d) =>
    parcours.some((p) => p.domaine === d),
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <header className="border-b border-border pb-8">
        <h1 className="font-titre text-3xl font-semibold tracking-tight sm:text-4xl">
          Comparateur de formations e-commerce
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          On vous aide à choisir la bonne formation — pas à vous dire laquelle est la
          meilleure. Aucune note, aucun classement par qualité, aucun lien affilié.{" "}
          <Link to="/methode" className="underline underline-offset-4 hover:text-foreground">
            Comment ce catalogue est construit
          </Link>
        </p>

        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-sm">
          <Chiffre valeur={parcours.length} libelle="parcours" />
          <Chiffre valeur={organismes} libelle="organismes" />
          <Chiffre valeur={domaines.length} libelle="domaines" />
          <Chiffre valeur={informationsTotales} libelle="informations vérifiées" />
        </dl>
      </header>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-72 lg:shrink-0">
          <Input
            type="search"
            value={filtres.recherche}
            onChange={(e) => modifier({ recherche: e.target.value })}
            placeholder="Intitulé, organisme, code RNCP…"
            aria-label="Rechercher dans le catalogue"
          />

          <div className="mt-4 flex flex-wrap gap-1.5">
            <ChipDomaine
              actif={filtres.domaine === null}
              libelle="Tous"
              nombre={parcours.length}
              choisir={() => modifier({ domaine: null })}
            />
            {domaines.map((domaine) => (
              <ChipDomaine
                key={domaine}
                actif={filtres.domaine === domaine}
                libelle={LIBELLES_DOMAINES[domaine]}
                nombre={parcours.filter((p) => p.domaine === domaine).length}
                choisir={() => modifier({ domaine: filtres.domaine === domaine ? null : domaine })}
              />
            ))}
          </div>

          {filtres.organisme !== null && (
            <p className="mt-4 rounded-md border border-border px-3 py-2 text-xs">
              Catalogue filtré sur <span className="font-medium">{filtres.organisme}</span>
            </p>
          )}

          {auMoinsUnFiltre(filtres) && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 h-8 px-2 text-xs"
              onClick={() => {
                setFiltres(FILTRES_VIDES);
                setLimite(PAR_PAGE);
              }}
            >
              Effacer les filtres
            </Button>
          )}

          <PanneauFiltres parcours={parcours} filtres={filtres} modifier={modifier} />
        </aside>

        <main className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-3">
            <p className="text-sm">
              <span className="chiffre">{resultats.length}</span> parcours
            </p>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Trier par</span>
              <select
                value={tri}
                onChange={(e) => setTri(e.target.value as Tri)}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              >
                {TRIS.map((t) => (
                  <option key={t} value={t}>
                    {LIBELLES_TRIS_COURTS[t]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {resultats.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Aucun parcours ne correspond à ces critères. Élargissez la recherche — aucune
              fiche n&apos;est retirée du catalogue, elle ne correspond simplement pas.
            </p>
          ) : (
            <ul>
              {resultats.slice(0, limite).map((p) => (
                <RangeeParcours key={p.id} parcours={p} />
              ))}
            </ul>
          )}

          {limite < resultats.length && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => setLimite((l) => l + PAR_PAGE)}>
                Afficher {Math.min(PAR_PAGE, resultats.length - limite)} parcours de plus
              </Button>
            </div>
          )}

          {/*
            Invariant : le libellé du tri est toujours affiché. Il énonce la
            règle appliquée et ce qu'elle ne signifie pas.
          */}
          <p className="mt-8 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            {LIBELLES_TRIS[tri]}
          </p>
        </main>
      </div>
    </div>
  );
}

function Chiffre({ valeur, libelle }: { valeur: number; libelle: string }) {
  return (
    <div>
      <dt className="sr-only">{libelle}</dt>
      <dd className="chiffre text-xl">{valeur.toLocaleString("fr-FR")}</dd>
      <p className="text-xs text-muted-foreground">{libelle}</p>
    </div>
  );
}

function ChipDomaine({
  actif,
  libelle,
  nombre,
  choisir,
}: {
  actif: boolean;
  libelle: string;
  nombre: number;
  choisir: () => void;
}) {
  return (
    <button
      type="button"
      onClick={choisir}
      aria-pressed={actif}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
        actif
          ? "border-foreground bg-foreground text-background"
          : "border-border hover:border-foreground/40"
      }`}
    >
      {libelle} <span className="chiffre opacity-60">{nombre}</span>
    </button>
  );
}
