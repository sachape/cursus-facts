/**
 * Le catalogue — la vue de liste, séparée de l'accueil.
 *
 * POURQUOI DEUX ROUTES. L'accueil faisait deux métiers : présenter le produit
 * et lister 217 fiches. Un visiteur qui arrive par un moteur sur « comparateur
 * formations e-commerce » veut la liste ; un visiteur qui arrive par le nom du
 * produit veut comprendre ce qu'il est. Servir la même page aux deux, c'est
 * mal répondre aux deux — et pour un moteur, c'est une page dont le sujet est
 * indécidable.
 *
 * CETTE PAGE EST INDEXABLE POUR ELLE-MÊME, avec son intitulé et sa description.
 * Les adresses FILTRÉES, elles, restent en `noindex` sauf si elles figurent au
 * plan de pages : dix-huit critères qui se combinent produisent des milliers
 * d'adresses servant des variantes du même contenu, et les laisser toutes
 * indexables noie les pages qui comptent.
 *
 * TOUTES LES ADRESSES FILTRÉES ONT DÉMÉNAGÉ ICI. `/?sujet=SEO%20e-commerce`
 * était une vue de liste ; elle est devenue `/catalogue?sujet=...`. L'accueil
 * redirige les anciennes adresses vers les nouvelles, sans quoi une adresse
 * déjà indexée servirait un hero sans liste — une page qui ne répond plus à la
 * requête qui l'a fait remonter.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { chargerListe } from "@/donnees/requetes";
import { RechercheHero, type Suggestion } from "@/composants/RechercheHero";
import {
  adresseFiltre,
  depuisParametres,
  normaliserParametres,
  porteUnFiltre,
  versParametres,
  type ParametresFiltres,
} from "@/modele/filtres-url";
import { pageIndexable, pagePlanifiee } from "@/modele/plan-pages";
import {
  auMoinsUnFiltre,
  compterDansPlage,
  compterPrixInconnu,
  filtrer,
  FILTRES_VIDES,
  libelleBudget,
  plageBudgetActive,
  type Filtres,
} from "@/modele/filtres";
import { classer, LIBELLES_TRIS, TRIS, TRI_PAR_DEFAUT, type Tri } from "@/modele/classement";
import { LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { PanneauFiltres } from "@/composants/PanneauFiltres";
import { OngletsDomaines, type OngletDomaine } from "@/composants/OngletsDomaines";
import { TrainingResultCard } from "@/composants/TrainingResultCard";
import { ResultToolbar } from "@/composants/ResultToolbar";
import { CatalogFreshnessBadge } from "@/composants/CatalogFreshnessBadge";
import { RailCriteres } from "@/composants/HeroBadges";
import { BandeOrganismes } from "@/composants/BandeOrganismes";
import { PanneauFiche } from "@/composants/PanneauFiche";
import { useOuvertureFiche, validerFiche, type RechercheFiche } from "@/composants/ouverture-fiche";
import { useAllerOrganisme } from "@/composants/lien-organisme";
import { declarerVue, mesurer } from "@/composants/mesure";
import type { ParcoursListe } from "@/donnees/requetes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHAMPS_INFORMATION, type DomaineParcours } from "@/types/cursus";
import { formaterNombre } from "@/modele/nombres";

export const Route = createFileRoute("/catalogue")({
  // La vue Organismes renvoie ici avec ?organisme=<nom> : le filtre vit dans
  // l'URL pour que le lien soit partageable et que le retour arrière marche.
  /*
    `?domaine=` rejoint `?organisme=` : c'est le fil d'Ariane des fiches qui
    l'exige — « Accueil → Domaine → Parcours » n'a de valeur que si le niveau
    intermédiaire est un vrai lien. Sans validateur, le paramètre serait effacé
    à la première navigation et le lien mènerait au catalogue entier.

    Ces adresses ne créent pas de contenu dupliqué : le canonique de cette
    route est auto-référent sur `https://formlist.fr/`, donc toutes les
    variantes s'y consolident.
  */
  /*
    TOUS LES FILTRES VIVENT DANS L'ADRESSE, et pas seulement `organisme` et
    `domaine`. Sans cela : aucune page de croisement possible, aucune recherche
    filtrée partageable, et la seule mesure de ce que les gens filtrent tient
    dans un événement de mesure — donc sur la seule population qui l'accepte.

    Les paramètres sont NORMALISÉS ici : une valeur inventée sort de l'adresse
    au lieu de produire une liste vide sans explication, et deux adresses
    décrivant le même état deviennent la même adresse.
  */
  validateSearch: (recherche: Record<string, unknown>): ParametresFiltres & { fiche?: string } => ({
    ...normaliserParametres(recherche),
    ...validerFiche(recherche),
  }),
  loader: () => chargerListe(),
  component: Catalogue,
  head: ({ match, loaderData }) => {
    /*
      NOINDEX PAR DÉFAUT SUR TOUTE ADRESSE FILTRÉE.

      Dix-huit critères qui se combinent produisent des milliers d'adresses
      valides servant des variantes du même contenu. Les laisser toutes
      indexables noie les pages qui comptent — c'est le mécanisme qui a coûté
      leur visibilité à tous les comparateurs à facettes.

      Deux conditions cumulatives pour y échapper : figurer au plan de pages à
      l'identique, et franchir le seuil de données, mesuré ici sur le catalogue.
      Une page de croisement qui se vide se dégrade donc d'elle-même, sans que
      personne ait à y penser.
    */
    const filtre = porteUnFiltre(normaliserParametres(match.search));
    const page = filtre ? pagePlanifiee(match.search) : undefined;
    const nombre =
      page === undefined || loaderData === undefined
        ? 0
        : filtrer(loaderData, depuisParametres(match.search)).length;
    const indexable = pageIndexable();

    return {
    meta: [
      {
        title: indexable
          ? page!.titre
          /* Le nombre est LU DU CATALOGUE. L'écrire à la main le ferait mentir
             au premier ajout — et c'est un chiffre qu'un visiteur recompte. */
          : `Le catalogue — ${loaderData?.length ?? 0} formations e-commerce comparées | Formlist`,
      },
      {
        name: "description",
        content: indexable
          ? page!.description
          : "Toutes les formations e-commerce référencées, filtrables par prix, durée, format, " +
            "financement et certification. Chaque information est relevée à la source, avec sa date.",
      },
      ...(filtre && !indexable ? [{ name: "robots", content: "noindex, follow" }] : []),
    ],
    /*
      CANONIQUE AUTO-RÉFÉRENT, POSÉ ICI ET NON À LA RACINE.

      Le panneau pousse `/?fiche=<slug>` sur cette route : chaque fiche ouverte
      fabrique une variante d'URL de l'accueil. Partagées ou crawlées, ce sont
      233 adresses servant le même contenu, sans rien pour les consolider.

      Posé dans `__root`, il s'appliquait à TOUTES les routes — les fiches
      déclaraient alors l'accueil comme canonique, ce qui les aurait sorties de
      l'index. Un canonique est une propriété de page, jamais de site.
    */
    /*
      Une adresse filtrée non planifiée se consolide sur l'accueil : c'est la
      page dont elle est une variante. Une page planifiée, elle, est sa propre
      référence — sinon elle disparaîtrait de l'index qu'on vient de lui ouvrir.
    */
    links: [
      {
        rel: "canonical",
        href: indexable
          ? adresseFiltre(page!.parametres, SITE_CANONIQUE)
          : `${SITE_CANONIQUE}/catalogue`,
      },
    ],
    };
  },
});

const SITE_CANONIQUE = "https://formlist.fr";

const PAR_PAGE = 25;

/**
 * Délai avant qu'une frappe atteigne l'adresse.
 *
 * PAS UN CONFORT, UNE LIMITE DE NAVIGATEUR. Safari plafonne
 * `history.replaceState` à une centaine d'appels par tranche de trente
 * secondes, puis lève. Une recherche de vingt caractères en consommerait vingt,
 * et deux ou trois recherches suffiraient à casser la navigation — sur le seul
 * navigateur où l'on ne s'en apercevrait pas en développant.
 *
 * Le champ reste donc piloté localement le temps de la frappe, et l'adresse
 * reçoit la requête une fois la frappe retombée.
 */
const DELAI_RECHERCHE = 300;

function Catalogue() {
  const parcours = Route.useLoaderData() as ParcoursListe[];
  const recherche = Route.useSearch();
  const { fiche } = recherche;
  const naviguer = useNavigate({ from: "/catalogue" });
  /*
    L'ADRESSE FAIT FOI, il n'y a plus d'état de filtres à côté d'elle. Deux
    sources obligeraient à répondre en permanence à « laquelle des deux
    gagne », et la réponse serait « les deux » — c'est le défaut que le second
    champ de recherche a coûté à la barre d'outils.
  */
  const filtres = useMemo(() => depuisParametres(recherche), [recherche]);

  /*
    LA SEULE EXCEPTION À « L'ADRESSE FAIT FOI », et elle est bornée à la durée
    d'une frappe. `saisie` n'est pas un second état de filtre : c'est l'écho du
    champ, qui rejoint l'adresse dès que la frappe retombe, et que l'adresse
    reprend dès qu'elle change par ailleurs.
  */
  const [saisie, setSaisie] = useState(filtres.recherche);
  useEffect(() => setSaisie(filtres.recherche), [filtres.recherche]);
  const [tri, setTri] = useState<Tri>(TRI_PAR_DEFAUT);
  const [limite, setLimite] = useState(PAR_PAGE);
  // Sous 960 px la colonne devient un panneau dépliable, replié au chargement.
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  /** Point de retour du focus quand l'élément d'origine a disparu. */
  const champRecherche = useRef<HTMLInputElement | null>(null);
  /*
    Le déclencheur de recherche de la toolbar n'apparaît que lorsque la
    recherche du hero a quitté la fenêtre : tant qu'elle est visible, un second
    champ ferait doublon à l'écran.
  */
  const zoneRecherche = useRef<HTMLDivElement | null>(null);
  const [heroHorsEcran, setHeroHorsEcran] = useState(false);

  useEffect(() => {
    const cible = zoneRecherche.current;
    if (cible === null) return;
    const observateur = new IntersectionObserver(
      ([entree]) => setHeroHorsEcran(!(entree?.isIntersecting ?? true)),
      { threshold: 0 },
    );
    observateur.observe(cible);
    return () => observateur.disconnect();
  }, []);

  /*
    L'ouverture passe par le point d'appel partagé. Le repli de focus est le
    champ de recherche : il est présent, visible, et il correspond à ce que fait
    la personne — elle referme la fiche et continue sa recherche.
  */
  const allerOrganisme = useAllerOrganisme();
  const { ouvrir, fermer: fermerPanneau } = useOuvertureFiche({
    retourParDefaut: champRecherche,
  });
  const ouvrirEnPanneau = useCallback(
    (parcours: ParcoursListe, origine?: HTMLElement | null) => ouvrir(parcours, origine),
    [ouvrir],
  );
  /*
    Une seconde ouverture, identique en tout sauf sa source. Ouvrir une fiche
    depuis une suggestion et l'ouvrir depuis la liste ne sont pas la même
    intention : l'une vient d'un nom qu'on connaissait déjà, l'autre d'un
    parcours trouvé dans les résultats. Confondues sous `explorateur`, elles
    diraient que l'autocomplétion ne sert à rien — ou l'inverse, sans moyen de
    trancher.
  */
  const { ouvrir: ouvrirDepuisSuggestion } = useOuvertureFiche({
    retourParDefaut: champRecherche,
    source: "autocompletion",
  });

  const modifier = (patch: Partial<Filtres>) => {
    /*
      REMPLACER L'ENTRÉE COURANTE, JAMAIS EN EMPILER UNE.

      Chaque case cochée ajouterait sinon un point d'historique : sortir de
      l'explorateur demanderait dix retours arrière, et le geste le plus
      courant du navigateur deviendrait inutilisable. Le retour arrière doit
      ramener d'où l'on vient, pas défaire un filtre à la fois.
    */
    naviguer({
      /* Type écrit : l'arbre de routes atteint le plafond d'inférence de
         TypeScript et ce paramètre s'effondre en `any` sans lui. Motif détaillé
         dans `parcours.$slug.tsx`. */
      search: (precedente: RechercheFiche) => ({
        ...versParametres({ ...filtres, ...patch }),
        // La fiche ouverte survit à un changement de filtre : le panneau est
        // au-dessus de la liste, il n'en dépend pas.
        ...(precedente.fiche !== undefined ? { fiche: precedente.fiche } : {}),
      }),
      replace: true,
      /*
        NE PAS REMONTER LA PAGE. Une navigation restaure le défilement par
        défaut : depuis que poser un filtre EST une navigation, cocher une case
        au milieu de la colonne renvoyait au sommet du hero, et il fallait
        redescendre après chaque geste. Le filtre change la liste, pas la
        position de lecture.
      */
      resetScroll: false,
    });
    setLimite(PAR_PAGE);
    /*
      `filtre_applique` est émis ICI, et pas dans les vingt endroits qui posent
      un filtre — la barre, les onglets, les puces de retrait, les suggestions.
      `modifier` est déjà le point unique de mutation ; en faire aussi le point
      unique de mesure garantit qu'aucun filtre ajouté plus tard ne sera oublié.

      `recherche` en sort : elle change à chaque frappe, et un événement par
      caractère mesurerait la vitesse de frappe, pas la recherche. Elle est
      traitée plus bas, une fois la saisie retombée.
    */
    for (const [filtre, valeur] of Object.entries(patch)) {
      if (filtre === "recherche") continue;
      mesurer("filtre_applique", {
        filtre_nom: filtre,
        // Une liste de sujets ou de compétences se lit par sa taille, pas par
        // son contenu : « 3 sujets » se compare, la concaténation ne se compare
        // à rien.
        filtre_valeur: Array.isArray(valeur) ? `${valeur.length}` : `${valeur}`,
        /* Ce que le filtre LAISSE, et non seulement ce qu'il vaut : un filtre
           qui ne retire rien ne filtre pas, un filtre qui ne laisse rien
           décourage, et ni l'un ni l'autre ne se lit dans son nom. */
        resultats_restants: filtrer(parcours, { ...filtres, ...patch }).length,
      });
    }
  };

  const resultats = useMemo(
    () => classer(filtrer(parcours, filtres), tri),
    [parcours, filtres, tri],
  );

  /*
    LA RECHERCHE SE MESURE QUAND ELLE RETOMBE, PAS QUAND ELLE S'ÉCRIT.

    Le champ filtre à chaque frappe — c'est le bon comportement à l'écran, et le
    mauvais pour la mesure : « formation » produirait dix événements dont neuf
    décrivent une requête que personne n'a voulu faire.

    LE TEXTE NE SORT JAMAIS. On remonte sa longueur et le nombre de résultats :
    de quoi voir qu'une recherche sur trente caractères ne donne rien, sans
    jamais constituer un journal de ce que les gens cherchent.
  */
  const requete = filtres.recherche;
  /*
    Le décompte passe par une référence, et non par une dépendance de l'effet :
    en dépendance, tout changement de filtre relancerait la minuterie et
    finirait par émettre une recherche que personne n'a refaite. La requête est
    la seule chose dont l'événement dépend ; le décompte est lu au moment de
    l'émission.
  */
  const decompte = useRef(0);
  decompte.current = resultats.length;
  useEffect(() => {
    const texte = requete.trim();
    if (texte === "") return;
    const minuterie = setTimeout(
      () => mesurer("recherche_effectuee", {
        longueur_requete: texte.length,
        resultats_trouves: decompte.current,
      }),
      800,
    );
    return () => clearTimeout(minuterie);
  }, [requete]);

  useEffect(() => {
    if (saisie === filtres.recherche) return;
    const minuterie = setTimeout(() => modifier({ recherche: saisie }), DELAI_RECHERCHE);
    return () => clearTimeout(minuterie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saisie, filtres.recherche]);

  /*
    La vue courante, déclarée une fois : chaque événement la porte ensuite.

    UNE PAGE DE CROISEMENT N'EST PAS LE CATALOGUE, même si c'est le même
    composant. « Formations Shopify éligibles au CPF » est une porte d'entrée
    référencée, atteinte depuis un moteur de recherche ; le catalogue est
    atteint depuis le site. Les confondre rendrait invisible ce que le plan de
    pages rapporte réellement — et c'est la seule mesure qui dise s'il faut en
    ouvrir d'autres.
  */
  useEffect(() => declarerVue(pagePlanifiee(recherche) ? "croisement" : "catalogue"), []);

  // Vérifiable : c'est la date la plus récente réellement portée par une fiche.
  const derniereVerification = parcours
    .map((p) => p.dateVerification)
    .filter((d): d is string => d !== null)
    .sort()
    .at(-1) ?? null;
  /*
    LE CHIFFRE QUI DIT CE QUE FAIT LE PRODUIT. Chaque information de chaque
    fiche relevée à la source, une par une — c'est ce qu'aucun comparatif
    rémunéré à l'affiliation ne peut afficher, parce qu'ils recopient là où
    nous vérifions.

    `infosRenseignees` compte les états `renseigne` et `derive` : une valeur
    dérivée vient d'une règle publiée et opposable, donc vérifiable au même
    titre. Somme lue à chaque rendu, jamais écrite : elle bougerait au premier
    champ collecté.
  */
  const informationsVerifiees = parcours.reduce((total, p) => total + p.infosRenseignees, 0);
  /*
    Les deux nombres de la mention de budget. Calculés ici, comme les autres
    décomptes de la vue, et non dans la barre d'outils : celle-ci restitue, elle
    ne connaît pas la forme de `Filtres`.
  */
  const dansPlage = compterDansPlage(parcours, filtres);
  const prixInconnus = compterPrixInconnu(parcours, filtres);
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

  /*
    UNE PAGE DE CROISEMENT PORTE SON PROPRE INTITULÉ, en titre de page comme en
    titre de liste. Servir « Comparez les formations e-commerce » sur une
    adresse indexée pour « formation Shopify éligible au CPF » revient à
    indexer une page qui ne répond pas à la requête qui l'a fait remonter.

    Le croisement doit figurer au plan : un intitulé dérivé automatiquement des
    filtres posés fabriquerait un titre pour chacune des milliers de
    combinaisons possibles, ce que le plan existe précisément pour empêcher.
  */
  const planifiee = pagePlanifiee(recherche);

  const titreListe =
    planifiee?.intitule ??
    (filtres.domaine === null ? "Tous les parcours" : LIBELLES_DOMAINES[filtres.domaine]);

  /*
    Un seul conteneur pour toute la colonne : la recherche et la carte des
    filtres en sont deux enfants, et c'est LUI qui colle. Coller chacun
    séparément les faisait se rejoindre au défilement — l'écart n'était qu'une
    marge, et une marge ne survit pas à deux ancrages indépendants.
  */
  const colonneFiltres = (
    /*
      Le retrait intérieur laisse la place au halo de focus du champ. Sans lui,
      la colonne défilante le rogne au ras du champ — le composant paraît coupé
      alors qu'il est simplement au bord de la zone qui défile.
    */
    <div className="flex flex-col gap-(--space-4) px-(--space-2) py-(--space-3)">
      {/*
        Le champ de recherche a quitté cette colonne pour la barre de résultats.
        Deux champs sur la même valeur n'apportaient rien et se disputaient la
        saisie.
      */}

      {filtres.organisme !== null && (
        <p className="rounded-(--radius-md) border border-(--border-subtle) px-(--space-3) py-(--space-2) t-caption">
          Catalogue filtré sur <span className="font-medium">{filtres.organisme}</span>
        </p>
      )}

      <PanneauFiltres parcours={parcours} filtres={filtres} modifier={modifier} />

      {auMoinsUnFiltre(filtres) && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => modifier(FILTRES_VIDES)}
        >
          Tout réinitialiser
        </Button>
      )}
    </div>
  );

  /*
    Les suggestions sont calculées ici, pas dans le champ : il affiche, il
    n'interroge rien. Trois groupes du plus précis au plus large — un parcours
    nommé est une réponse, un domaine n'est qu'une piste.
  */
  /*
    Tous les organismes, jamais une sélection : la bande boucle sur les 163.
    Le décompte de parcours vient du catalogue, comme le total du surtitre.
  */
  const organismesBande = useMemo(() => {
    const parNom = new Map<string, { categorie: ParcoursListe["organismeCategorie"]; parcours: number }>();
    for (const p of parcours) {
      const entree = parNom.get(p.organismeNom);
      if (entree) entree.parcours += 1;
      else parNom.set(p.organismeNom, { categorie: p.organismeCategorie, parcours: 1 });
    }
    return [...parNom].map(([nom, reste]) => ({ nom, ...reste }));
  }, [parcours]);

  const suggestions: Suggestion[] = useMemo(() => {
    const q = saisie.trim().toLowerCase();
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
        choisir: () => ouvrirDepuisSuggestion(p),
      }));

    const organismesTrouves = [...new Set(parcours.map((p) => p.organismeNom))].filter(correspond);
    const parOrganisme: Suggestion[] = organismesTrouves.map((nom) => ({
      type: "organisme",
      libelle: nom,
      detail: `${parcours.filter((p) => p.organismeNom === nom).length} parcours`,
      /*
        MÈNE À LA PAGE, PLUS À UN FILTRE. La consigne d'origine — « organisme
        pose un filtre, c'est son rôle » — datait d'avant la page dédiée.
        Une suggestion de domaine, elle, pose toujours un filtre : un domaine
        n'a pas de page.
      */
      choisir: () => allerOrganisme(nom),
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
  }, [saisie, parcours, onglets]);

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
    ...(libelleBudget(filtres.budgetMin, filtres.budgetMax) !== null
      ? [
          {
            libelle: libelleBudget(filtres.budgetMin, filtres.budgetMax) ?? "",
            /* La case d'inclusion revient à son état par défaut avec la plage :
               elle ne modifie plus rien une fois la plage retirée, et la
               laisser décochée ferait réapparaître un masquage invisible à la
               prochaine plage posée. */
            retirer: () =>
              modifier({ budgetMin: null, budgetMax: null, inclurePrixInconnu: true }),
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
      {/*
        `overflow-clip` : la couche ambiante déborde volontairement des marges
        latérales, et sans rognage elle créerait un défilement horizontal. Clip
        plutôt que hidden — hidden ferait du hero un conteneur de défilement et
        casserait les éléments collants qui le suivent.
      */}

      {/*
        Pleine largeur : la bande déborde volontairement la grille de contenu,
        c'est ce qui donne la continuité horizontale. Les marges négatives
        compensent exactement le retrait du conteneur, jamais davantage.
      */}

      <OngletsDomaines
        onglets={onglets}
        actif={filtres.domaine}
        choisir={(domaine) => modifier({ domaine })}
      />

      {/*
        Aucune marge au-dessus : la toolbar doit pouvoir venir toucher la
        navigation quand elle s'ancre. Un `mt-8` ici laissait un vide où les
        cartes apparaissaient entre deux couches collantes.
      */}
      <div className="flex flex-col gap-(--space-6) min-[960px]:flex-row min-[960px]:gap-(--space-8)">
        {/*
          Au-delà de 960 px la colonne suit le défilement de la liste ; elle
          défile sur elle-même pour ne jamais couper ses derniers groupes.
        */}
        <aside className="pt-(--space-6) min-[960px]:pt-(--space-8) min-[960px]:sticky min-[960px]:top-[calc(var(--app-header-height)+var(--domain-navigation-height)+var(--space-4))] min-[960px]:max-h-[calc(100vh-var(--app-header-height)-var(--domain-navigation-height)-var(--space-8))] min-[960px]:w-72 min-[960px]:shrink-0 min-[960px]:overflow-y-auto min-[960px]:[scrollbar-width:none] min-[960px]:[&::-webkit-scrollbar]:hidden">
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
            toutRetirer={() => modifier(FILTRES_VIDES)}
            tri={tri}
            choisirTri={(t) => {
              setTri(t);
              mesurer("tri_change", { tri_valeur: t });
            }}
          />

          {plageBudgetActive(filtres) && prixInconnus > 0 && (
            /*
              LA PHRASE QUI EMPÊCHE LE FILTRE DE MENTIR. Une plage de prix
              n'atteint que les fiches dont le prix est établi ; le reste du
              catalogue disparaîtrait sans un mot, et un compteur qui s'effondre
              se lit comme « il n'existe rien à ce prix » alors qu'il faut lire
              « nous ne savons pas encore ».

              Les deux nombres sont donnés ensemble, dans cet ordre : celui de
              la fourchette d'abord, parce que c'est la question posée.
            */
            <p className="mt-3 rounded-md border border-absent/30 px-3 py-2 text-xs text-absent">
              {filtres.inclurePrixInconnu ? (
                <>
                  <span className="chiffre">{formaterNombre(dansPlage)}</span> parcours dans cette
                  fourchette, plus <span className="chiffre">{formaterNombre(prixInconnus)}</span>{" "}
                  dont le prix n&apos;est pas encore connu.{" "}
                  <button
                    type="button"
                    onClick={() => modifier({ inclurePrixInconnu: false })}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Les masquer
                  </button>
                </>
              ) : (
                <>
                  <span className="chiffre">{formaterNombre(prixInconnus)}</span>{" "}
                  {prixInconnus > 1
                    ? "parcours ne sont pas affichés"
                    : "parcours n'est pas affiché"}{" "}
                  faute de prix publié, et non parce que le prix dépasse la fourchette.{" "}
                  <button
                    type="button"
                    onClick={() => modifier({ inclurePrixInconnu: true })}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Les réafficher
                  </button>
                </>
              )}
            </p>
          )}

          {resultats.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Aucun parcours ne correspond à ces critères. Élargissez la recherche — aucune fiche
              n&apos;est retirée du catalogue, elle ne correspond simplement pas.
            </p>
          ) : (
            /*
              Les cartes sont des surfaces autonomes : chacune garde sa bordure
              complète, son rayon et son fond. Un `divide-y` ou une marge
              négative les fusionnerait en un seul bloc, ce qui annulerait la
              carte.
            */
            <ul className="flex flex-col gap-(--space-4) pt-(--space-4)">
              {resultats.slice(0, limite).map((p) => (
                <TrainingResultCard key={p.id} parcours={p} />
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
            {LIBELLES_TRIS[tri]}{" "}
            {/* La règle est énoncée ici ; la section Classement dit POURQUOI
                c'est celle-là, et ce qu'elle interdit. */}
            <Link to="/methode" hash="classement" className="underline underline-offset-2">
              Comment les résultats sont classés
            </Link>
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

/**
 * Un chiffre clé et ce qu'il garantit.
 *
 * UN CHIFFRE NU NE PROUVE RIEN. « 2 718 informations vérifiées » ne se
 * rapporte à rien de connu : personne ne sait si c'est beaucoup. Ce qui compte
 * n'est pas la quantité mais ce qu'elle garantit — d'où le qualificatif, qui
 * porte la promesse là où le nombre ne porte qu'une mesure.
 *
 * Aucun pictogramme, aucune couleur, aucune animation de comptage : un chiffre
 * qui défile à l'arrivée appartient au registre des pages de vente, et il
 * demande d'attendre pour lire un fait.
 */
function Chiffre({
  valeur,
  libelle,
  qualificatif,
}: {
  valeur: string;
  libelle: string;
  qualificatif: string;
}) {
  return (
    /*
      Sous 640 px la ligne se retourne : valeur à gauche, libellé à droite.
      Trois chiffres côte à côte à 375 px sont illisibles, et c'est ce qui
      produisait le chiffre orphelin sur une seconde ligne.
    */
    <div className="px-(--space-4) max-[639px]:flex max-[639px]:items-baseline max-[639px]:justify-between max-[639px]:gap-(--space-4) max-[639px]:px-0 max-[639px]:py-(--space-3)">
      <dt className="sr-only">{libelle}</dt>
      {/* La valeur ne se coupe jamais : « 4 août » sur deux lignes se lit
          comme deux informations. C'est au qualificatif de céder la place. */}
      <dd className="whitespace-nowrap t-data-lg text-(--text-primary)">{valeur}</dd>
      <div className="min-w-0 max-[639px]:text-right">
        <p className="mt-(--space-1) t-body-sm text-(--text-secondary) max-[639px]:mt-0">
          {libelle}
        </p>
        <p className="mt-(--space-1) t-caption italic text-(--text-tertiary)">{qualificatif}</p>
      </div>
    </div>
  );
}
