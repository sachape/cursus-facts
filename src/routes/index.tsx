
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { chargerListe, type ParcoursListe } from "@/donnees/requetes";
import { RechercheHero, type Suggestion } from "@/composants/RechercheHero";
import { CatalogFreshnessBadge } from "@/composants/CatalogFreshnessBadge";
import { RailCriteres } from "@/composants/HeroBadges";
import { Button } from "@/components/ui/button";
import { CHAMPS_INFORMATION } from "@/types/cursus";
import { formaterNombre } from "@/modele/nombres";
import { LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { normaliserParametres, porteUnFiltre } from "@/modele/filtres-url";
import { validerFiche } from "@/composants/ouverture-fiche";
import { useAllerOrganisme } from "@/composants/lien-organisme";
import { declarerVue, mesurer } from "@/composants/mesure";
import type { DomaineParcours } from "@/types/cursus";
import { chiffresGuides } from "@/modele/chiffres-guides";
import { PreuveParLeProduit, TroisPortes } from "@/composants/accueil/Produit";
import { OrganismesCouverts, PaysageDuCatalogue } from "@/composants/accueil/Catalogue";
import { PourquoiFiable } from "@/composants/accueil/Confiance";
import { Cloture, LesGuides, LesRessources } from "@/composants/accueil/Editorial";


const SITE_CANONIQUE = "https://formlist.fr";

/**
 * Délai avant qu'une frappe atteigne l'état affiché.
 *
 * Le champ reste piloté localement le temps de la frappe : Safari plafonne
 * `history.replaceState` à une centaine d'appels par tranche de trente
 * secondes, et une recherche de vingt caractères en consommerait vingt.
 */
const DELAI_RECHERCHE = 300;

export const Route = createFileRoute("/")({
  /*
    LES ANCIENNES ADRESSES NE CASSENT PAS, ELLES DÉMÉNAGENT.

    L'accueil a porté pendant des mois la liste ET ses filtres :
    `/?sujet=SEO%20e-commerce`, `/?cpf=1`, `/?organisme=LiveMentor` sont des
    adresses réelles, indexées, partagées et liées depuis les guides. Depuis que
    la liste vit sur `/catalogue`, les servir ici afficherait un hero sans
    liste — une page qui ne répond plus à la requête qui l'a fait remonter.

    On redirige donc, en conservant les paramètres à l'identique. C'est la seule
    redirection de cette route : `/` NU N'EST PAS REDIRIGÉ, l'accueil reste une
    page à part entière avec son propre contenu.

    `?fiche=` part vers la fiche elle-même : le panneau se superposait à la
    liste, il n'a plus de liste sous lui.
  */
  beforeLoad: ({ search }) => {
    const { fiche } = validerFiche(search as Record<string, unknown>);
    if (fiche !== undefined) throw redirect({ to: "/parcours/$slug", params: { slug: fiche } });
    const parametres = normaliserParametres(search as Record<string, unknown>);
    if (porteUnFiltre(parametres)) throw redirect({ to: "/catalogue", search: parametres });
  },
  validateSearch: (recherche: Record<string, unknown>) => ({
    ...normaliserParametres(recherche),
    ...validerFiche(recherche),
  }),
  loader: () => chargerListe(),
  component: Accueil,
  head: ({ loaderData }) => ({
    meta: [
      { title: "Formlist — Comparateur de formations e-commerce en France" },
      {
        name: "description",
        content:
          "Comparez les formations e-commerce en France sur des faits vérifiés : prix, programme, " +
          "durée, format, financement, certification. Sans note, sans classement acheté.",
      },
    ],
    links: [{ rel: "canonical", href: `${SITE_CANONIQUE}/` }],
    ...(loaderData === undefined ? {} : {}),
  }),
});

/**
 * L'accueil — présenter le produit, puis envoyer au catalogue.
 *
 * CE QUI A QUITTÉ CETTE PAGE : les onglets de domaine, la colonne de filtres,
 * le tri, les rangées et la pagination. Ils vivent sur `/catalogue`.
 *
 * CE QUI RESTE : le hero, la recherche avec son autocomplétion, les trois
 * chiffres, la bande d'organismes, et UN SEUL appel vers le catalogue. Un seul,
 * parce que deux appels concurrents en bas d'un hero, c'est un choix à faire
 * avant d'avoir compris ce qu'on choisit.
 *
 * LA RECHERCHE N'AFFICHE PLUS RIEN ICI. Elle emporte la requête vers le
 * catalogue : la personne tape, valide, et arrive sur la liste déjà filtrée.
 * Auparavant elle filtrait une liste située quinze écrans plus bas, ce qui ne
 * se voyait pas.
 */
function Accueil() {
  const parcours = Route.useLoaderData() as ParcoursListe[];
  const naviguer = useNavigate({ from: "/" });
  const allerOrganisme = useAllerOrganisme();

  const [saisie, setSaisie] = useState("");
  const champRecherche = useRef<HTMLInputElement | null>(null);
  const zoneRecherche = useRef<HTMLDivElement | null>(null);

  useEffect(() => declarerVue("accueil"), []);

  /** Va au catalogue en emportant l'état demandé. */
  const allerAuCatalogue = (search: Record<string, string> = {}) => {
    naviguer({ to: "/catalogue", search });
  };

  const derniereVerification =
    parcours
      .map((p) => p.dateVerification)
      .filter((d): d is string => d !== null)
      .sort()
      .at(-1) ?? null;

  const informationsVerifiees = parcours.reduce((total, p) => total + p.infosRenseignees, 0);
  const organismes = new Set(parcours.map((p) => p.organismeNom)).size;

  /*
    LES CHIFFRES DES BLOCS, calculés une fois par rendu.

    `calculeLe` reçoit une date FIXE et non `Date.now()` : l'horodatage n'est
    affiché nulle part sur l'accueil, et une valeur qui change à chaque rendu
    ferait diverger le rendu serveur du rendu client — une erreur d'hydratation
    pour un champ que personne ne lit.
  */
  const chiffres = useMemo(() => chiffresGuides(parcours, ""), [parcours]);

  /*
    Les raccourcis sous l'appel principal. Chacun porte le décompte qu'il
    ouvrira, et ceux qui tombent à zéro ne s'affichent pas : un filtre dont le
    rendement est nul se coche à l'aveugle et déçoit au premier clic.
  */
  const raccourcis = useMemo(
    () =>
      [
        { libelle: "À distance", nombre: chiffres.distanciel, search: { format: "distanciel" } },
        { libelle: "En alternance", nombre: chiffres.alternance, search: { format: "alternance" } },
        { libelle: "Éligible CPF", nombre: chiffres.eligiblesCpf, search: { cpf: "1" } },
        { libelle: "Certifiant", nombre: chiffres.certifiants, search: { certifiant: "1" } },
        { libelle: "Sans frais", nombre: chiffres.sansFrais, search: { sansFrais: "1" } },
      ].filter((r) => r.nombre > 0),
    [chiffres],
  );



  const organismesBande = useMemo(() => {
    const parNom = new Map<string, { categorie: ParcoursListe["organismeCategorie"]; parcours: number }>();
    for (const p of parcours) {
      const entree = parNom.get(p.organismeNom);
      if (entree) entree.parcours += 1;
      else parNom.set(p.organismeNom, { categorie: p.organismeCategorie, parcours: 1 });
    }
    return [...parNom].map(([nom, reste]) => ({ nom, ...reste }));
  }, [parcours]);

  /*
    Les suggestions restent ici : c'est le seul endroit de l'accueil où l'on
    peut atteindre un parcours nommé sans passer par la liste. Elles mènent
    toutes AILLEURS — fiche, page organisme, catalogue filtré — puisqu'il n'y a
    plus rien à filtrer sur cette page.
  */
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
        choisir: () => naviguer({ to: "/parcours/$slug", params: { slug: p.slug } }),
      }));

    const parOrganisme: Suggestion[] = [...new Set(parcours.map((p) => p.organismeNom))]
      .filter(correspond)
      .map((nom) => ({
        type: "organisme",
        libelle: nom,
        detail: `${parcours.filter((p) => p.organismeNom === nom).length} parcours`,
        choisir: () => allerOrganisme(nom),
      }));

    const domaines = (Object.keys(LIBELLES_DOMAINES) as DomaineParcours[]).filter((d) =>
      parcours.some((p) => p.domaine === d),
    );
    const parDomaine: Suggestion[] = domaines
      .filter((d) => correspond(LIBELLES_DOMAINES[d]))
      .map((d) => ({
        type: "domaine",
        libelle: LIBELLES_DOMAINES[d],
        detail: `${parcours.filter((p) => p.domaine === d).length} parcours`,
        choisir: () => allerAuCatalogue({ domaine: d }),
      }));

    return [...parParcours, ...parOrganisme, ...parDomaine];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saisie, parcours]);

  /*
    La frappe part au catalogue une fois retombée. Le délai est le même
    qu'auparavant, pour la même raison : une navigation par caractère
    consommerait le quota d'historique de Safari.
  */
  useEffect(() => {
    const texte = saisie.trim();
    if (texte === "") return;
    const minuterie = setTimeout(() => {
      /*
        `resultats_trouves` valait 0 EN DUR, écrit quand l'accueil ne comptait
        rien. La courbe disait donc « aucune recherche ne trouve jamais rien »
        et le taux d'échec de la recherche était inexploitable depuis le
        premier jour. Les suggestions SONT le résultat de cette recherche.
      */
      mesurer("recherche_effectuee", {
        longueur_requete: texte.length,
        resultats_trouves: suggestions.length,
      });
    }, 800);
    return () => clearTimeout(minuterie);
  }, [saisie, suggestions]);

  return (
    <div className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) pb-(--space-16)">
      <header className="relative mx-auto mt-0 w-full min-w-0 overflow-clip pb-(--space-8) pt-(--hero-padding-top) text-center min-[1280px]:min-h-(--hero-min-hauteur) min-[1280px]:pb-(--space-10) min-[1280px]:pt-(--space-16)">
        <div className="hero-layout">
        <RailCriteres cote="gauche" />
        <div className="hero-centre">
        <CatalogFreshnessBadge derniereVerification={derniereVerification} />

        {/*
          Titre court : il supporte davantage de corps qu'un titre long, et le
          hero a besoin d'un point d'ancrage visuel. `text-wrap: balance`
          répartit les deux lignes plutôt que d'isoler « e-commerce » seul en
          bas.
        */}
        {/*
          Deux lignes, obtenues par la RÉDUCTION DE LA TAILLE et non par
          l'élargissement du conteneur. La seconde ligne est insécable : c'est
          elle qui fixe la taille minimale, puisqu'elle doit tenir entière.
        */}
        {/*
          Deux lignes, obtenues par la taille et non par un `nowrap` : forcer
          l'insécable faisait déborder la seconde ligne sur les petits écrans.
        */}
        {/*
          UN SEUL TITRE, PARCE QU'IL N'Y A PLUS QU'UN RÔLE. L'accueil servait
          aussi les pages de croisement, et son h1 changeait alors d'intitulé.
          Ces adresses vivent maintenant sur `/catalogue` : le titre de
          l'accueil est fixe, et c'est ce qui le rend lisible par un moteur.
        */}
        <h1 className="hero-title mt-(--space-4)">
          <span>Comparez les</span>
          <span>formations e-commerce</span>
        </h1>

        {/*
          La proposition de valeur, et ce qui nous sépare des comparatifs
          affiliés. Ne jamais la retirer : sans elle, le titre seul se lit
          comme celui de n'importe quel comparateur.
        */}
        <p className="mx-auto mt-(--space-4) max-w-(--sous-titre-largeur-max) t-body-lg text-(--text-secondary)">
          Trouvez la formation adaptée à votre projet grâce à des informations claires et
          vérifiées.
        </p>

        {/*
          PLUS DE LIEN VERS LA MÉTHODE ICI. Il était le point d'entrée qui
          remplaçait l'onglet retiré de la navigation, mais il s'intercalait
          entre la proposition de valeur et la recherche — donc entre ce qu'on
          vient de lire et ce qu'on est venu faire. Une ligne de plus à franchir
          avant le champ, pour une question qu'on ne se pose pas encore.

          La Méthode reste atteignable là où la question se pose vraiment : le
          pied de page, le panneau mobile, les guides, et chaque mention de
          règle dans l'interface qui renvoie vers SA section.
        */}

        <div ref={zoneRecherche} className="mt-(--space-8)">
          <RechercheHero
            valeur={saisie}
            modifier={setSaisie}
            suggestions={suggestions}
            champRef={champRecherche}
          />
        </div>

        {/*
          LES RACCOURCIS PORTENT LEUR DÉCOMPTE, ET DISPARAISSENT À ZÉRO. Un
          raccourci vers une liste vide est une promesse rompue au premier clic ;
          le nombre affiché est celui que la page d'arrivée montrera.
        */}
        <ul className="mt-(--space-4) flex flex-wrap justify-center gap-(--space-2)">
          {raccourcis.map((r) => (
            <li key={r.libelle}>
              <Link
                to="/catalogue"
                search={r.search}
                className="inline-flex items-center gap-(--space-2) rounded-(--radius-full) border border-(--border-default) bg-(--surface-raised) px-(--space-4) py-(--space-2) t-body-sm text-(--text-secondary) transition-colors duration-(--motion-fast) hover:border-(--border-strong) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
              >
                {r.libelle}
                <span className="chiffre text-(--text-tertiary)">{formaterNombre(r.nombre)}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/*
          Trois chiffres vrais. Aucune métrique de vanité : « heures analysées »
          serait le premier chiffre qu'un organisme mécontent attaquerait, et il
          aurait raison. La date de vérification passe en mention sous la ligne —
          elle est vérifiable, mais elle ne pèse pas comme les trois autres.
        */}
        {/*
          UN BLOC, PAS TROIS ÉLÉMENTS FLOTTANTS. Les filets horizontaux
          l'ancrent dans la page ; l'alignement se fait sur la LIGNE DE BASE et
          non sur les boîtes, sans quoi trois valeurs de hauteurs différentes
          paraissent dériver les unes par rapport aux autres.

          Le nombre de critères est LU DEPUIS LE MODÈLE. L'écrire à la main le
          ferait mentir au premier champ ajouté — et une promesse fausse sur un
          chiffre de couverture coûte plus cher que pas de promesse du tout.
        */}
        <dl className="mx-auto mt-(--space-8) grid max-w-(--hero-chiffres-largeur) grid-cols-3 items-baseline divide-x divide-(--border-subtle) border-y border-(--border-subtle) py-(--space-5) text-left max-[639px]:grid-cols-1 max-[639px]:divide-x-0 max-[639px]:divide-y max-[639px]:py-0">
          <Chiffre
            valeur={formaterNombre(parcours.length)}
            libelle="parcours"
            qualificatif={`comparés sur ${CHAMPS_INFORMATION.length} critères`}
          />
          <Chiffre
            valeur={formaterNombre(organismes)}
            libelle="organismes"
            qualificatif="écoles, universités, indépendants"
          />
          {/*
            LE TROISIÈME N'EST PLUS UNE DATE, ET C'EST UN REVIREMENT ASSUMÉ.

            Une date de dernière vérification ne produit aucun effet et se
            périme à l'œil en quelques jours : lue un mardi, elle rassure ; lue
            trois semaines plus tard, elle inquiète, alors que le catalogue n'a
            pas bougé. Elle affirmait en outre sur l'ENSEMBLE ce qui n'est vrai
            que d'une fiche — le catalogue est vérifié par morceaux, à des dates
            différentes, et la plus récente ne dit rien des autres.

            Le total d'informations vérifiées, lui, ne se périme pas : il monte.
            Et il énonce exactement ce que le produit fait.

            La date n'a pas disparu : elle reste sur la ligne de provenance de
            chaque fiche et sur chaque page organisme, là où elle décrit l'objet
            qu'elle mesure.
          */}
          <Chiffre
            valeur={formaterNombre(informationsVerifiees)}
            libelle="informations vérifiées"
            qualificatif="une par une, à la source"
          />
        </dl>

        {/* La date de vérification vit désormais dans l'infobulle du badge. */}
        </div>
        <RailCriteres cote="droite" />
        </div>
      </header>
      {/*
        L'APPEL VERS LE CATALOGUE, ET RIEN D'AUTRE À CÔTÉ. Le nombre est lu du
        catalogue : écrit à la main, il mentirait au premier ajout, et c'est
        exactement le genre de promesse chiffrée qu'un visiteur vérifie.
      */}
      {/*
        L'APPEL EST ATTACHÉ AU HERO, PAS POSÉ EN DESSOUS. Il flottait à trois
        écarts de la ligne de chiffres — douze unités sous elle, seize de
        retrait bas, quatre au-dessus de lui : un bouton seul au milieu du
        vide se lit comme une erreur de gabarit, pas comme une invitation.
      */}
      <div className="flex flex-col items-center gap-(--space-5) text-center">
        <div className="flex w-full flex-col gap-(--space-3) sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
          {/*
            DES LIENS, PAS DES BOUTONS À onClick. Ces deux appels naviguent :
            portés par un `onClick`, ils ne répondaient à rien tant que React
            n'avait pas hydraté la page — le HTML du serveur est à l'écran et
            se laisse cliquer bien avant. Mesuré : clic immédiat, l'adresse ne
            bouge pas ; clic après hydratation, elle mène au catalogue.
            Un `<a>` est traité par le navigateur lui-même, donc dès le
            premier octet rendu. C'est aussi le rôle exact de l'élément.
          */}
          <Button size="lg" className="w-full sm:w-auto" asChild>
            <Link to="/catalogue">Voir les {formaterNombre(parcours.length)} parcours</Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
            <Link to="/aide-au-choix">Je ne sais pas quoi choisir</Link>
          </Button>
        </div>

      </div>

      {/*
        LE CONTENU VIENT APRÈS L'ACTION, JAMAIS AVANT. Le bouton reste le
        premier geste possible ; ces sections servent qui n'a pas encore décidé
        de cliquer, et le moteur qui doit comprendre de quoi parle la page.

        Les chiffres sont calculés UNE FOIS et passés aux blocs. Chaque bloc qui
        recompterait le sien créerait une source de plus, et deux sources
        finissent par diverger — c'est le défaut que ce produit passe son temps
        à corriger ailleurs.
      */}
      <PreuveParLeProduit parcours={parcours} />
      <TroisPortes parcours={parcours} chiffres={chiffres} />
      <PaysageDuCatalogue chiffres={chiffres} informationsVerifiees={informationsVerifiees} />
      <OrganismesCouverts organismes={organismesBande} />
      <PourquoiFiable chiffres={chiffres} />
      <LesGuides />
      <LesRessources />
      <Cloture parcours={parcours.length} />
    </div>
  );

}

/**
 * Un chiffre clé et ce qu'il garantit.
 *
 * UN CHIFFRE NU NE PROUVE RIEN. « 2 718 informations vérifiées » ne se rapporte
 * à rien de connu : personne ne sait si c'est beaucoup. Ce qui compte n'est pas
 * la quantité mais ce qu'elle garantit — d'où le qualificatif, qui porte la
 * promesse là où le nombre ne porte qu'une mesure.
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
    <div className="px-(--space-5) max-[639px]:py-(--space-4)">
      <dd className="whitespace-nowrap t-data-lg text-(--text-primary)">{valeur}</dd>
      <dt className="mt-(--space-1) t-body-sm text-(--text-secondary)">{libelle}</dt>
      <p className="mt-(--space-1) t-caption text-(--text-tertiary)">{qualificatif}</p>
    </div>
  );
}
