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
import { RechercheHero, type Suggestion } from "@/composants/RechercheHero";
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
import { TrainingResultCard } from "@/composants/TrainingResultCard";
import { ResultToolbar } from "@/composants/ResultToolbar";
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
  /** Point de retour du focus quand l'élément d'origine a disparu. */
  const champRecherche = useRef<HTMLInputElement | null>(null);

  /*
    L'élément de retour est optionnel.

    Le retour au focus avait été conçu pour un clic sur une rangée, où
    l'élément d'origine existe toujours à la fermeture. Depuis
    l'autocomplétion, il a disparu — la liste s'est refermée. Le point de
    retour par défaut est alors le champ de recherche : il est présent, il est
    visible, et il correspond à ce que fait la personne — elle referme la fiche
    et continue sa recherche.
  */
  const ouvrirEnPanneau = useCallback(
    (parcours: ParcoursListe, origine?: HTMLElement | null) => {
      origineFocus.current = origine ?? champRecherche.current;
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
    // Un élément détaché du document ne peut plus recevoir le focus : on
    // retombe alors sur le champ de recherche plutôt que de le perdre.
    const cible = origineFocus.current;
    (cible?.isConnected ? cible : champRecherche.current)?.focus();
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

  /*
    Les suggestions sont calculées ici, pas dans le champ : il affiche, il
    n'interroge rien. Trois groupes du plus précis au plus large — un parcours
    nommé est une réponse, un domaine n'est qu'une piste.
  */
  const suggestions: Suggestion[] = useMemo(() => {
    const q = filtres.recherche.trim().toLowerCase();
    if (q.length < 3) return [];
    const correspond = (t: string) => t.toLowerCase().includes(q);

    const parParcours: Suggestion[] = parcours
      .filter((p) => correspond(p.nom))
      .map((p) => ({
        type: "parcours",
        libelle: p.nom,
        detail: p.organismeNom,
        // Choisir un parcours nommé dans une liste, c'est vouloir le voir.
        // Poser la recherche sur son intitulé transformerait l'autocomplétion
        // en simple aide à la saisie.
        choisir: () => ouvrirEnPanneau(p),
      }));

    const organismesTrouves = [...new Set(parcours.map((p) => p.organismeNom))].filter(correspond);
    const parOrganisme: Suggestion[] = organismesTrouves.map((nom) => ({
      type: "organisme",
      libelle: nom,
      detail: `${parcours.filter((p) => p.organismeNom === nom).length} parcours`,
      choisir: () => modifier({ recherche: nom }),
    }));

    const parDomaine: Suggestion[] = onglets
      .filter((o) => o.domaine !== null && correspond(o.libelle))
      .map((o) => ({
        type: "domaine",
        libelle: o.libelle,
        detail: `${o.nombre} parcours`,
        choisir: () => modifier({ domaine: o.domaine, recherche: "" }),
      }));

    return [...parParcours, ...parOrganisme, ...parDomaine];
  }, [filtres.recherche, parcours, onglets]);

  /*
    Les filtres posés, à plat et retirables. Construits ici parce que seule
    cette vue connaît la forme de `Filtres` ; la toolbar ne fait que les
    restituer.
  */
  const filtresActifs = [
    ...filtres.sujets.map((v) => ({
      libelle: v,
      retirer: () => modifier({ sujets: filtres.sujets.filter((x) => x !== v) }),
    })),
    ...filtres.competences.map((v) => ({
      libelle: v,
      retirer: () => modifier({ competences: filtres.competences.filter((x) => x !== v) }),
    })),
    ...(filtres.recherche.trim() !== ""
      ? [{ libelle: `« ${filtres.recherche} »`, retirer: () => modifier({ recherche: "" }) }]
      : []),
    ...(filtres.budget !== null
      ? [
          {
            libelle: `Jusqu'à ${filtres.budget} €`,
            retirer: () => modifier({ budget: null }),
          },
        ]
      : []),
    ...(filtres.certifiantSeulement
      ? [{ libelle: "Certifiant", retirer: () => modifier({ certifiantSeulement: false }) }]
      : []),
    ...(filtres.eligibleCpf
      ? [{ libelle: "Éligible CPF", retirer: () => modifier({ eligibleCpf: false }) }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) pb-(--space-16)">
      {/*
        Le hero tient en une idée. La méthode reste accessible par la
        navigation : l'y rappeler ici ajouterait une seconde proposition à
        lire avant la première.
      */}
      <header className="mx-auto max-w-(--hero-largeur-max) pt-(--space-16) pb-(--space-16) text-center">
        <p className="t-label text-(--text-tertiary)">Comparateur indépendant · France</p>

        {/*
          Titre court : il supporte davantage de corps qu'un titre long, et le
          hero a besoin d'un point d'ancrage visuel. `text-wrap: balance`
          répartit les deux lignes plutôt que d'isoler « e-commerce » seul en
          bas.
        */}
        <h1 className="mx-auto mt-(--space-4) max-w-(--titre-largeur-max) text-balance t-display-1 max-[639px]:t-heading-1">
          Comparez les formations e-commerce
        </h1>

        {/*
          La proposition de valeur, et ce qui nous sépare des comparatifs
          affiliés. Ne jamais la retirer : sans elle, le titre seul se lit
          comme celui de n'importe quel comparateur.
        */}
        <p className="mx-auto mt-(--space-4) max-w-(--sous-titre-largeur-max) t-body-lg text-(--text-secondary)">
          On vous aide à choisir la bonne formation — pas à vous dire laquelle est la meilleure.
        </p>

        <div className="mt-(--space-8)">
          <RechercheHero
            valeur={filtres.recherche}
            modifier={(v: string) => modifier({ recherche: v })}
            suggestions={suggestions}
            champRef={champRecherche}
          />
        </div>

        {/*
          Trois chiffres vrais. Aucune métrique de vanité : « heures analysées »
          serait le premier chiffre qu'un organisme mécontent attaquerait, et il
          aurait raison. La date de vérification passe en mention sous la ligne —
          elle est vérifiable, mais elle ne pèse pas comme les trois autres.
        */}
        <dl className="mt-(--space-10) flex flex-wrap justify-center gap-x-(--space-12) gap-y-(--space-6)">
          <Chiffre valeur={parcours.length} libelle="parcours" />
          <Chiffre valeur={organismes} libelle="organismes" />
          <Chiffre valeur={informationsTotales} libelle="informations vérifiées" />
        </dl>

        {derniereVerification !== null && (
          <p className="mt-(--space-4) t-caption text-(--text-tertiary)">
            Dernière vérification du catalogue le{" "}
            <span className="chiffre">
              {new Date(derniereVerification).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </p>
        )}
      </header>

      {/* space-16 entre les KPIs et la barre de domaines : le hero respire. */}
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
        <aside className="min-[960px]:sticky min-[960px]:top-(--space-6) min-[960px]:max-h-[calc(100vh-96px)] min-[960px]:w-72 min-[960px]:shrink-0 min-[960px]:overflow-y-auto min-[960px]:[scrollbar-width:none] min-[960px]:[&::-webkit-scrollbar]:hidden">
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
          <ResultToolbar
            titre={titreListe}
            nombre={resultats.length}
            filtresActifs={filtresActifs}
            toutRetirer={() => setFiltres(FILTRES_VIDES)}
            tri={tri}
            choisirTri={setTri}
          />

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
                <TrainingResultCard key={p.id} parcours={p} ouvrirEnPanneau={ouvrirEnPanneau} />
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
      <dd className="t-data-lg text-(--text-primary)">{valeur.toLocaleString("fr-FR")}</dd>
      <p className="mt-(--space-1) t-caption text-(--text-tertiary)">{libelle}</p>
    </div>
  );
}
