/**
 * Explorer — la liste du catalogue.
 *
 * Le tri par défaut classe par nombre d'informations disponibles, et son
 * libellé est affiché sous la liste : un tri dont on ne publie pas la règle est
 * un classement éditorial déguisé.
 *
 * Le domaine est traité comme une navigation (onglets pleine largeur), pas
 * comme un filtre de la colonne de gauche : c'est le premier niveau de la
 * hiérarchie Domaine → Sujet principal → Compétences couvertes.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { chargerListe } from "@/donnees/requetes";
import {
  auMoinsUnFiltre,
  compterEcartesFauteInformation,
  filtrer,
  FILTRES_VIDES,
  type Filtres,
} from "@/modele/filtres";
import { classer, LIBELLES_TRIS, TRIS, TRI_PAR_DEFAUT, type Tri } from "@/modele/classement";
import { LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { PanneauFiltres } from "@/composants/PanneauFiltres";
import { OngletsDomaines, type OngletDomaine } from "@/composants/OngletsDomaines";
import { RangeeParcours } from "@/composants/RangeeParcours";
import { PanneauFiche } from "@/composants/PanneauFiche";
import type { ParcoursListe } from "@/donnees/requetes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DomaineParcours } from "@/types/cursus";

export const Route = createFileRoute("/")({
  // La vue Organismes renvoie ici avec ?organisme=<nom> : le filtre vit dans
  // l'URL pour que le lien soit partageable et que le retour arrière marche.
  validateSearch: (recherche: Record<string, unknown>): { organisme?: string; fiche?: string } => ({
    ...(typeof recherche["organisme"] === "string" ? { organisme: recherche["organisme"] } : {}),
    ...(typeof recherche["fiche"] === "string" ? { fiche: recherche["fiche"] } : {}),
  }),
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
  const parcours = Route.useLoaderData() as ParcoursListe[];
  const { organisme, fiche } = Route.useSearch();
  const naviguer = useNavigate({ from: "/" });
  const [filtres, setFiltres] = useState<Filtres>({
    ...FILTRES_VIDES,
    organisme: organisme ?? null,
  });
  const [tri, setTri] = useState<Tri>(TRI_PAR_DEFAUT);
  const [limite, setLimite] = useState(PAR_PAGE);
  // Sous 960 px la colonne devient un panneau dépliable, replié au chargement.
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  /*
   * La fiche ouverte vit dans l'URL, en paramètre de recherche sur la route
   * courante — surtout pas via `window.history.pushState`.
   *
   * @tanstack/history patche `history.pushState` : un appel direct est
   * interprété par le routeur comme une navigation, qui rendait alors la page
   * `/parcours/<slug>` par-dessus le panneau. C'était la cause du double
   * comportement. En passant par le routeur sur la route courante, on ne
   * change jamais de route.
   *
   * Bénéfice : le retour arrière, le partage et l'accès direct sont gérés
   * nativement — `?fiche=<slug>` rouvre le catalogue avec le panneau déployé,
   * sans gestionnaire `popstate` à écrire.
   */
  const origineFocus = useRef<HTMLElement | null>(null);

  const ouvrirEnPanneau = useCallback(
    (parcours: ParcoursListe, origine: HTMLElement) => {
      origineFocus.current = origine;
      void naviguer({
        search: (actuel: { fiche?: string }) => ({ ...actuel, fiche: parcours.slug }),
      });
    },
    [naviguer],
  );

  const fermerPanneau = useCallback(() => {
    void naviguer({
      search: ({ fiche: _ignore, ...reste }: { fiche?: string }) => reste,
    });
    origineFocus.current?.focus();
    origineFocus.current = null;
  }, [naviguer]);

  const modifier = (patch: Partial<Filtres>) => {
    setFiltres((f) => ({ ...f, ...patch }));
    setLimite(PAR_PAGE);
  };

  const resultats = useMemo(
    () => classer(filtrer(parcours, filtres), tri),
    [parcours, filtres, tri],
  );

  const informationsTotales = parcours.reduce((s, p) => s + p.infosRenseignees, 0);
  // Vérifiable : c'est la date la plus récente réellement portée par une fiche.
  const derniereVerification = parcours
    .map((p) => p.dateVerification)
    .filter((d): d is string => d !== null)
    .sort()
    .at(-1) ?? null;
  const ecartesFauteInfo = compterEcartesFauteInformation(parcours, filtres);
  const organismes = new Set(parcours.map((p) => p.organismeNom)).size;
  const domaines = (Object.keys(LIBELLES_DOMAINES) as DomaineParcours[]).filter((d) =>
    parcours.some((p) => p.domaine === d),
  );

  // Le décompte des onglets ignore le domaine mais respecte les autres filtres :
  // un onglet annonce ce qu'il donnerait, pas ce que vaut le catalogue entier.
  const onglets: OngletDomaine[] = [
    {
      domaine: null,
      libelle: "Tous les domaines",
      nombre: filtrer(parcours, { ...filtres, domaine: null }).length,
    },
    ...domaines.map((domaine) => ({
      domaine,
      libelle: LIBELLES_DOMAINES[domaine],
      nombre: filtrer(parcours, { ...filtres, domaine }).length,
    })),
  ];

  const titreListe =
    filtres.domaine === null ? "Tous les parcours" : LIBELLES_DOMAINES[filtres.domaine];

  const colonneFiltres = (
    <>
      <Input
        type="search"
        value={filtres.recherche}
        onChange={(e) => modifier({ recherche: e.target.value })}
        placeholder="Intitulé, organisme, code RNCP…"
        aria-label="Rechercher dans le catalogue"
      />

      {filtres.organisme !== null && (
        <p className="mt-4 rounded-md border border-border px-3 py-2 text-xs">
          Catalogue filtré sur <span className="font-medium">{filtres.organisme}</span>
        </p>
      )}

      <PanneauFiltres parcours={parcours} filtres={filtres} modifier={modifier} />

      {auMoinsUnFiltre(filtres) && (
        <Button
          variant="outline"
          size="sm"
          className="mb-2 mt-4 w-full"
          onClick={() => {
            setFiltres(FILTRES_VIDES);
            setLimite(PAR_PAGE);
          }}
        >
          Tout réinitialiser
        </Button>
      )}
    </>
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <header className="pb-6">
        <h1 className="font-titre text-3xl font-semibold tracking-tight sm:text-4xl">
          Comparez les formations avant de dépenser plusieurs milliers d&apos;euros.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          On vous aide à choisir la bonne formation — pas à vous dire laquelle est la meilleure.
          Aucune note, aucun classement par qualité, aucun lien affilié.{" "}
          <Link to="/methode" className="underline underline-offset-4 hover:text-foreground">
            Comment ce catalogue est construit
          </Link>
        </p>
        {/*
          Le titre parle de dépense, mais un tiers du catalogue est gratuit ou
          pris en charge : sans cette ligne, il laisserait croire que le
          comparateur ne traite que les formations coûteuses.
        */}
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Des formations gratuites d&apos;éditeurs aux mastères à plusieurs milliers d&apos;euros,
          en passant par les diplômes publics en alternance.
        </p>

        {/*
          Trois chiffres vrais, et une date vérifiable. Aucune métrique de
          vanité : « heures analysées » serait le premier chiffre qu'un
          organisme mécontent attaquerait, et il aurait raison.
        */}
        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-sm">
          <Chiffre valeur={parcours.length} libelle="parcours" />
          <Chiffre valeur={organismes} libelle="organismes" />
          <Chiffre valeur={informationsTotales} libelle="informations vérifiées" />
          {derniereVerification !== null && (
            <div>
              <dt className="sr-only">Dernière vérification du catalogue</dt>
              <dd className="chiffre text-xl">
                {new Date(derniereVerification).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </dd>
              <p className="text-xs text-muted-foreground">dernière vérification</p>
            </div>
          )}
        </dl>
      </header>

      <OngletsDomaines
        onglets={onglets}
        actif={filtres.domaine}
        choisir={(domaine) => modifier({ domaine })}
      />

      <div className="mt-8 flex flex-col gap-8 min-[960px]:flex-row">
        {/*
          Au-delà de 960 px la colonne suit le défilement de la liste ; elle
          défile sur elle-même pour ne jamais couper ses derniers groupes.
        */}
        <aside className="min-[960px]:sticky min-[960px]:top-[--space-6] min-[960px]:max-h-[calc(100vh-96px)] min-[960px]:w-72 min-[960px]:shrink-0 min-[960px]:overflow-y-auto min-[960px]:[scrollbar-width:none] min-[960px]:[&::-webkit-scrollbar]:hidden">
          {/* Sous 960 px : panneau dépliable, replié au chargement. */}
          <div className="min-[960px]:hidden">
            <Button
              variant="outline"
              className="w-full justify-between"
              aria-expanded={filtresOuverts}
              onClick={() => setFiltresOuverts((ouvert) => !ouvert)}
            >
              <span>Filtres</span>
              <span className="chiffre text-xs text-muted-foreground">
                {resultats.length} résultats
              </span>
            </Button>
            {filtresOuverts && <div className="mt-4">{colonneFiltres}</div>}
          </div>

          <div className="hidden min-[960px]:block">{colonneFiltres}</div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-3">
            <h2 className="font-titre text-lg font-medium">
              {titreListe}{" "}
              <span className="chiffre text-sm font-normal text-muted-foreground">
                {resultats.length}
              </span>
            </h2>
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

          {ecartesFauteInfo > 0 && (
            /*
              Sans ce décompte, le filtrage récompenserait mécaniquement les
              organismes qui publient et effacerait les autres — ce qui
              contredit la règle d'exhaustivité.
            */
            <p className="mt-3 rounded-md border border-absent/30 px-3 py-2 text-xs text-absent">
              <span className="chiffre">{ecartesFauteInfo}</span>{" "}
              {ecartesFauteInfo > 1 ? "parcours ont été écartés" : "parcours a été écarté"} faute
              d&apos;information publiée, et non parce qu&apos;ils ne correspondent pas.{" "}
              <button
                type="button"
                onClick={() =>
                  modifier({
                    eligibleCpf: false,
                    certifiantSeulement: false,
                    sansFrais: false,
                    accesPartiel: false,
                    financementEntreprise: false,
                    niveaux: [],
                    formats: [],
                  })
                }
                className="underline underline-offset-2 hover:text-foreground"
              >
                Les réafficher
              </button>
            </p>
          )}

          {resultats.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Aucun parcours ne correspond à ces critères. Élargissez la recherche — aucune fiche
              n&apos;est retirée du catalogue, elle ne correspond simplement pas.
            </p>
          ) : (
            <ul>
              {resultats.slice(0, limite).map((p) => (
                <RangeeParcours key={p.id} parcours={p} ouvrirEnPanneau={ouvrirEnPanneau} />
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

      {fiche !== undefined && (
        <PanneauFiche
          slug={fiche}
          autresParcours={parcours}
          fermer={fermerPanneau}
        />
      )}
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
