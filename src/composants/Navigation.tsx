/**
 * Navigation persistante.
 *
 * QUATRE VUES, ET MÉTHODE N'EN FAIT PLUS PARTIE. On n'ouvre pas la Méthode en
 * naviguant : on y va quand une question précise se pose — pourquoi ce
 * classement, pourquoi ce sujet, d'où vient cette information. Une entrée de
 * menu répond à cette question au mauvais moment, et occupe une place qui
 * revient aux quatre vues qu'on utilise vraiment.
 *
 * Elle reste dans le pied de page, colonne « Comprendre », et surtout : chaque
 * mention de méthode dans l'interface renvoie désormais vers SA section. C'est
 * plus utile qu'un onglet — le lien est là au moment où la question se pose.
 *
 * AU-DESSUS DE 1 024 PX, les quatre vues en ligne, l'onglet actif marqué.
 *
 * EN DESSOUS, un vrai en-tête mobile. La barre défilante horizontale a été
 * essayée et abandonnée : elle coupait les entrées sous 900 px, et un libellé
 * tronqué ne se parcourt pas plus vite qu'un menu — il se devine.
 *
 * TROIS ZONES, ET LA TROISIÈME EST VIDE À DESSEIN. Burger à gauche, logo au
 * centre, emplacement d'action à droite — réservé à la même largeur que le
 * burger. Il accueillera l'inscription ; sans lui, le logo se décalerait le jour
 * où on l'ajoute, et un logo qui bouge d'un chantier à l'autre se remarque plus
 * que le bouton qu'on a ajouté.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useHauteurPubliee } from "./pile-collante";
import { usePiegeFocus, useVerrouDefilement } from "./piege-focus";
import { MotSymboleHorizontal, Symbole } from "./marque/Marques";
import { MenuCompte } from "./MenuCompte";
import { useAuth } from "./authentification";
import { Route as RouteRacine } from "@/routes/__root";
import { formaterNombre } from "@/modele/nombres";

const VUES = [
  /*
    « Le catalogue », et vers `/catalogue`. L'onglet menait à `/`, où mène déjà
    le logo : deux entrées de navigation pour une seule destination, dont l'une
    ne disait pas ce qu'elle ouvrait. Le logo ramène à l'accueil, l'onglet ouvre
    la liste.
  */
  { to: "/catalogue", libelle: "Le catalogue" },
  { to: "/comparer", libelle: "Comparer" },
  { to: "/aide-au-choix", libelle: "Aide au choix" },
  { to: "/organismes", libelle: "Organismes" },
] as const;

/*
  CE QUE LA BARRE DE BUREAU NE PORTE PAS, LE PANNEAU LE PORTE.

  Les quatre vues suffisent en haut d'écran : elles se parcourent d'un regard et
  la place y est comptée. Un panneau plein écran n'a pas cette contrainte — et
  s'il ne montre QUE ces quatre entrées, il ne fait que répéter en grand ce
  qu'on voyait déjà, avec un écran de vide dessous.

  Les mêmes groupes que le pied de page, dans le même ordre : deux
  architectures concurrentes pour un seul site obligeraient à réapprendre le
  produit selon l'endroit d'où on le regarde.
*/
const COMPRENDRE = [
  { to: "/guides", libelle: "Guides" },
  { to: "/methode", libelle: "Méthode" },
  { to: "/ajouter-un-organisme", libelle: "Ajouter un organisme" },
] as const;

const ESPACE_COMPTE = [
  { to: "/mes-formations", libelle: "Mes formations" },
  { to: "/mes-comparaisons", libelle: "Mes comparaisons" },
  { to: "/mes-alertes", libelle: "Mes alertes" },
] as const;

/** Les trois traits, qui deviennent une croix. */
function IconeBurger({ ouvert }: { ouvert: boolean }) {
  const trait =
    "absolute h-(--burger-trait-epaisseur) w-(--burger-trait-largeur) rounded-(--radius-full) bg-current transition-transform duration-(--motion-fast)";
  return (
    <span
      aria-hidden="true"
      className="relative grid size-(--burger-trait-largeur) place-items-center"
    >
      <span
        className={`${trait} ${ouvert ? "translate-y-0 rotate-45" : "-translate-y-(--burger-trait-ecart)"}`}
      />
      {/* Le trait du milieu s'efface plutôt que de pivoter : trois traits
          superposés à 45° épaississent la croix. */}
      <span
        className={`${trait} transition-opacity duration-(--motion-fast) ${ouvert ? "opacity-0" : "opacity-100"}`}
      />
      <span
        className={`${trait} ${ouvert ? "translate-y-0 -rotate-45" : "translate-y-(--burger-trait-ecart)"}`}
      />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Les pièces du panneau mobile                                               */
/* -------------------------------------------------------------------------- */

/**
 * Une entrée du panneau.
 *
 * L'ÉTAT ACTIF N'EST PLUS UN BLOC NOIR PLEINE LARGEUR. En pastille, dans la
 * barre de bureau, il se lit comme un onglet ; étiré sur 320 px, il se lit
 * comme la ligne sélectionnée d'un tableau — le contraste maximal du produit
 * dépensé sur « vous êtes ici », qui est l'information la moins urgente de
 * l'écran.
 *
 * Un liseré à gauche et une teinte d'accent disent la même chose sans crier, et
 * laissent le noir à ce qui appelle une action.
 */
function EntreePanneau({
  to,
  libelle,
  fermer,
}: {
  to: string;
  libelle: string;
  fermer: () => void;
}) {
  return (
    <li>
      <Link
        to={to}
        activeOptions={{ exact: to === "/" }}
        onClick={fermer}
        className="group flex h-(--menu-entree-hauteur) items-center gap-(--space-3) rounded-(--radius-md) px-(--space-3) t-body text-(--text-secondary) transition-colors duration-(--motion-fast) hover:bg-(--surface-hover) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) data-[status=active]:bg-(--accent-surface) data-[status=active]:font-medium data-[status=active]:text-(--accent-default)"
      >
        {/* Le liseré n'existe que sur l'entrée active : réservé partout, il
            décalerait tous les libellés d'un cran sans rien dire. */}
        <span
          aria-hidden="true"
          className="h-(--space-5) w-(--space-1) shrink-0 rounded-(--radius-full) bg-transparent group-data-[status=active]:bg-(--accent-default)"
        />
        {libelle}
      </Link>
    </li>
  );
}

function GroupePanneau({
  titre,
  entrees,
  fermer,
}: {
  titre: string;
  entrees: ReadonlyArray<{ to: string; libelle: string }>;
  fermer: () => void;
}) {
  return (
    <nav aria-label={titre} className="px-(--space-3) pb-(--space-4)">
      <p className="px-(--space-3) pb-(--space-2) t-label text-(--text-tertiary)">{titre}</p>
      <ul className="flex flex-col">
        {entrees.map((entree) => (
          <EntreePanneau key={entree.to} to={entree.to} libelle={entree.libelle} fermer={fermer} />
        ))}
      </ul>
    </nav>
  );
}

/**
 * Les vues personnelles, quand il y a quelqu'un.
 *
 * Elles n'existaient sur mobile que dans le menu déroulant du compte, en haut à
 * droite — donc à un endroit qu'on n'ouvre pas pour naviguer. Rien ici quand
 * personne n'est connecté : une section grisée annonçant ce qu'on n'a pas est
 * une publicité, pas une navigation.
 */
function EspaceCompte({ fermer }: { fermer: () => void }) {
  const { utilisateur } = useAuth();
  if (utilisateur === null) return null;
  return <GroupePanneau titre="Mon espace" entrees={ESPACE_COMPTE} fermer={fermer} />;
}

/**
 * Le pied du panneau.
 *
 * CE QUI REMPLIT LE VIDE EST CE QUI DISTINGUE LE PRODUIT, pas une décoration.
 * Le panneau montrait quatre entrées et un écran de blanc dessous ; la même
 * place porte désormais l'action de connexion et la promesse chiffrée — les
 * mêmes chiffres que le pied de page, lus sur le catalogue et jamais écrits.
 */
function PiedPanneau({ fermer }: { fermer: () => void }) {
  const { utilisateur, chargement, deconnecter } = useAuth();
  const stats = RouteRacine.useLoaderData();

  return (
    <div className="shrink-0 border-t border-(--border-subtle) bg-(--surface-sunken) px-(--space-4) py-(--space-4)">
      {/*
        Tant qu'on ne sait pas, on n'affiche NI l'un NI l'autre mais on garde la
        place : afficher « Se connecter » puis le remplacer une demi-seconde
        plus tard fait clignoter le panneau à chaque ouverture.
      */}
      {chargement ? (
        <div aria-hidden="true" className="h-(--bouton-hauteur)" />
      ) : utilisateur === null ? (
        /*
          UN BOUTON À CONTOUR, comme dans l'en-tête. Le catalogue est public et
          la connexion reste secondaire : un aplat plein en ferait l'action
          principale du panneau, devant les sept entrées de navigation.
        */
        <Link
          to="/connexion"
          onClick={fermer}
          className="flex h-(--bouton-hauteur) items-center justify-center rounded-(--radius-md) border border-(--border-default) bg-(--surface-raised) t-body-sm font-medium text-(--text-primary) transition-colors duration-(--motion-fast) hover:border-(--border-strong) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
        >
          Se connecter
        </Link>
      ) : (
        <div className="flex items-center justify-between gap-(--space-3)">
          <p className="min-w-0 truncate t-caption text-(--text-secondary)">{utilisateur.email}</p>
          <button
            type="button"
            onClick={() => {
              void deconnecter();
              fermer();
            }}
            className="shrink-0 rounded-(--radius-sm) t-caption text-(--text-secondary) underline-offset-2 transition-colors duration-(--motion-fast) hover:text-(--text-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
          >
            Se déconnecter
          </button>
        </div>
      )}

    </div>
  );
}

export function Navigation() {
  const barre = useRef<HTMLElement>(null);
  useHauteurPubliee(barre, "--app-header-height");

  const [ouvert, setOuvert] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const fermer = useCallback(() => setOuvert(false), []);

  usePiegeFocus({ actif: ouvert, conteneur: menu, fermer, retourFocus: burger });
  useVerrouDefilement(ouvert);

  /*
    Le menu se referme au changement de route. Sans ça, choisir une entrée
    laisse le panneau ouvert par-dessus la vue qu'on vient de demander — et
    l'utilisateur croit que son clic n'a rien fait.
  */
  const chemin = useRouterState({ select: (e) => e.location.pathname });
  useEffect(() => setOuvert(false), [chemin]);

  const lienDeVue =
    "block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-foreground data-[status=active]:text-background";

  return (
    <header
      ref={barre}
      className="sticky top-0 z-(--z-entete) mb-0 h-(--header-hauteur) border-b border-(--border-subtle) bg-(--surface-page) py-0"
    >
      <div className="mx-auto flex h-full max-w-(--contenu-largeur-max) items-center gap-(--space-8) px-(--space-6) py-0 max-[1023px]:gap-0 max-[1023px]:px-(--space-4)">
        <button
          ref={burger}
          type="button"
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
          aria-controls="menu-principal"
          aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
          className="grid size-(--burger-cible) shrink-0 place-items-center rounded-(--radius-md) text-(--text-primary) transition-colors duration-(--motion-fast) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) min-[1024px]:hidden"
        >
          <IconeBurger ouvert={ouvert} />
        </button>

        {/*
          Le mot-symbole précède la navigation et ramène à l'accueil : c'est le
          seul repère qui dit où l'on est quand on arrive par une fiche indexée.

          Sous 1 024 px il est centré — `flex-1` de chaque côté, et le logo au
          milieu. C'est le centrage OPTIQUE que réclame la composition à trois
          zones, et il n'est juste que si les deux zones latérales font la même
          largeur ; d'où l'emplacement réservé à droite.
        */}
        <div className="flex min-w-0 items-center max-[1023px]:flex-1 max-[1023px]:justify-center">
          <Link
            to="/"
            aria-label="Formlist — accueil"
            className="shrink-0 rounded-(--radius-sm) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--border-strong)"
          >
            <MotSymboleHorizontal className="hidden h-(--space-8) w-auto text-(--text-primary) min-[1024px]:block" />
            <Symbole className="block size-(--space-8) text-(--text-primary) min-[1024px]:hidden" />
          </Link>
        </div>

        <nav aria-label="Navigation principale" className="min-w-0 max-[1023px]:hidden">
          <ul className="-mx-1 flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {VUES.map((vue) => (
              <li key={vue.to} className="shrink-0">
                {/*
                  Plus de correspondance exacte à imposer : elle n'existait que
                  pour l'onglet `/`, préfixe de toutes les autres adresses, qui
                  se serait affiché actif partout. Le logo porte seul l'accueil
                  désormais, et la correspondance par préfixe est ce qu'on veut
                  ailleurs — `/organismes` reste actif sur la page d'un
                  organisme.
                */}
                <Link to={vue.to} className={lienDeVue}>
                  {vue.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/*
          L'EMPLACEMENT D'ACTION, désormais rempli. Il a été réservé vide à la
          largeur exacte du burger pour que le logo tombe au centre réel : c'est
          ce qui permet de le remplir aujourd'hui sans que le logo ne bouge d'un
          pixel. `MenuCompte` occupe la même largeur dans ses trois états —
          chargement, déconnecté, connecté.

          Visible aux DEUX tailles : à droite de la navigation en version
          bureau, dans la troisième zone en mobile.
        */}
        <div className="ml-auto shrink-0 max-[1023px]:ml-0">
          <MenuCompte />
        </div>
      </div>

      {ouvert && (
        <>
          {/* Voile : ferme au clic, hors du parcours clavier puisque Échap fait
              le même travail. */}
          <div
            onClick={fermer}
            aria-hidden="true"
            className="fixed inset-0 z-(--z-voile) bg-(--neutral-100)/30 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-(--motion-panel) min-[1024px]:hidden"
          />
          <div
            ref={menu}
            id="menu-principal"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation principale"
            className="fixed inset-y-0 left-0 z-(--z-panneau) flex w-(--menu-largeur) flex-col border-r border-(--border-subtle) bg-(--surface-raised) motion-safe:animate-in motion-safe:slide-in-from-left motion-safe:duration-(--motion-panel) min-[1024px]:hidden"
          >
            {/*
              LA CROIX NE BOUGE PAS D'UN PIXEL. Elle occupe l'emplacement exact
              du burger : ouvrir et refermer se fait du même pouce, au même
              endroit. Déplacée à droite — la disposition la plus courante —
              elle serait plus jolie et obligerait à traverser l'écran pour
              annuler un geste qu'on vient de faire.

              Le mot-symbole la suit et remplit une barre qui n'affichait
              jusqu'ici qu'une croix dans 72 px de vide. Il ramène aussi à
              l'accueil : c'est le seul repère de quelqu'un arrivé par une fiche
              indexée.
            */}
            <div className="flex h-(--header-hauteur) shrink-0 items-center gap-(--space-2) border-b border-(--border-subtle) px-(--space-4)">
              <button
                type="button"
                onClick={fermer}
                aria-label="Fermer le menu"
                className="grid size-(--burger-cible) shrink-0 place-items-center rounded-(--radius-md) text-(--text-primary) transition-colors duration-(--motion-fast) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
              >
                <IconeBurger ouvert />
              </button>
              <Link
                to="/"
                onClick={fermer}
                aria-label="Formlist — accueil"
                className="rounded-(--radius-sm) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--border-strong)"
              >
                <MotSymboleHorizontal className="h-(--space-6) w-auto text-(--text-primary)" />
              </Link>
            </div>

            {/* Le corps défile, le pied reste : sur un écran court, l'action de
                connexion ne doit pas sortir de la vue avec la liste. */}
            <div className="min-h-0 flex-1 overflow-y-auto py-(--space-4)">
              <GroupePanneau titre="Explorer" entrees={VUES} fermer={fermer} />
              <GroupePanneau titre="Comprendre" entrees={COMPRENDRE} fermer={fermer} />
              <EspaceCompte fermer={fermer} />
            </div>

            <PiedPanneau fermer={fermer} />
          </div>
        </>
      )}
    </header>
  );
}
