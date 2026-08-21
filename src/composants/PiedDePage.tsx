/**
 * Pied de page — institutionnel, jamais une signature de marque.
 *
 * LE BANDEAU REMPLACE LE GRAND LOGO. Un logo géant en pied occupe la place et
 * ne dit rien ; à la même place, la promesse du produit dit ce qui nous
 * distingue de tous les comparatifs du marché. C'est le dernier endroit qu'on
 * lit avant de partir, et c'est celui où l'on décide de revenir.
 *
 * AUCUN LIEN MORT. Une page qui n'existe pas encore ne figure pas ici. Un lien
 * mort en pied abîme la crédibilité plus qu'une colonne courte — sur un produit
 * dont toute la proposition est la vérifiabilité, c'est la première promesse
 * qu'on casse.
 *
 * CE QUI N'Y FIGURE PAS, ET C'EST UNE DÉCISION : aucune icône de réseau social
 * tant que les comptes n'existent pas, aucune inscription à une infolettre —
 * elle mérite mieux qu'un pied de page —, aucun logo de partenaire, aucun badge.
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { lienCorrection } from "@/modele/contact";
import { Route } from "@/routes/__root";
import { MotSymboleHorizontal } from "./marque/Marques";
import { formaterNombre } from "@/modele/nombres";

export type StatistiquesPied = {
  parcours: number;
  organismes: number;
  criteres: number;
};

const CORRECTION = lienCorrection();

/*
  Les colonnes, et ce qui en est absent.

  « Comment nous vérifions » et « Acteurs écartés » sont des SECTIONS de la page
  Méthode, pas des pages : les afficher comme des entrées séparées promettrait
  des pages qui n'existent pas. « À propos », « Mentions légales » et
  « Confidentialité » ne sont pas écrites. Elles reviendront ici le jour où
  elles existeront, et pas avant.
*/
const COLONNES = [
  {
    titre: "Explorer",
    liens: [
      { to: "/catalogue", libelle: "Tous les parcours" },
      { to: "/organismes", libelle: "Organismes" },
      { to: "/comparer", libelle: "Comparer" },
      { to: "/aide-au-choix", libelle: "Aide au choix" },
    ],
  },
  {
    titre: "Comprendre",
    liens: [
      /* En tête de la colonne : c'est le point d'entrée le plus large, celui
         qui répond à une question posée avant même de savoir quoi comparer. */
      { to: "/guides", libelle: "Guides" },
      { to: "/methode", libelle: "Méthode" },
      /* Dans « Comprendre » et non dans « Explorer », à dessein : ces ressources
         ne font pas partie du catalogue et ne s'explorent pas comme lui. Les
         ranger à côté des parcours suggérerait qu'elles se comparent. */
      { to: "/ressources", libelle: "Ressources gratuites" },
    ],
  },
  /*
    CONTRIBUER — SÉPARÉE DE « COMPRENDRE », ET CE N'EST PAS UN RÉÉQUILIBRAGE.

    « Ajouter un organisme » et « Signaler une correction » vivaient sous
    « Comprendre », qui portait cinq entrées contre quatre. Le déséquilibre
    n'était que le symptôme : ces deux entrées ne s'adressent pas à quelqu'un
    qui cherche à comprendre le produit, mais à quelqu'un qui veut y PARTICIPER
    — un organisme qui demande son référencement, un visiteur qui a repéré une
    erreur. Deux intentions distinctes rangées sous un même titre restent
    invisibles ; nommées, elles s'adressent enfin à qui elles concernent.
  */
  {
    titre: "Contribuer",
    liens: [{ to: "/ajouter-un-organisme", libelle: "Ajouter un organisme" }],
    externes: [{ href: CORRECTION, libelle: "Signaler une correction" }],
  },
] as const;

/*
  ABSENT DES VUES PERSONNELLES. Un pied institutionnel qui vante l'indépendance
  du catalogue n'a rien à faire sous « Mes formations » : la personne y est chez
  elle, pas en train d'évaluer le produit.
*/
const SANS_PIED = ["/mes-formations", "/mes-comparaisons", "/mes-alertes", "/connexion"];

export function PiedDePage() {
  const stats = Route.useLoaderData();
  const chemin = useRouterState({ select: (e) => e.location.pathname });
  if (SANS_PIED.includes(chemin)) return null;

  return (
    <footer className="mt-(--space-20)">
      {/* Bandeau — la promesse, à la place où l'on met d'ordinaire un logo. */}
      <div className="bg-(--surface-sunken) py-(--space-16)">
        <div className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6)">
          {/*
            DIT EN POSITIF CE QUE LE VISITEUR OBTIENT, et non ce que nous
            refusons. Trois refus enchaînés décrivent nos principes, pas son
            bénéfice : quelqu'un qui cherche une formation n'est pas venu
            arbitrer entre comparateurs.

            L'engagement d'indépendance ne disparaît pas — il nous distingue et
            doit figurer — mais il passe en second, comme la CONSÉQUENCE de la
            méthode plutôt que comme le message.
          */}
          <p className="max-w-3xl text-balance t-heading-1 text-(--text-primary) max-[767px]:t-heading-2">
            Les prix, les programmes et les certifications. Vérifiés un par un, avec leur source.
          </p>
          {/*
            Les chiffres viennent du catalogue. Les écrire en dur les ferait
            mentir au premier ajout — et c'est précisément le genre de promesse
            chiffrée qu'un visiteur vérifie.
          */}
          <p className="mt-(--space-4) max-w-2xl t-body text-(--text-secondary)">
            <span className="chiffre">{formaterNombre(stats.parcours)}</span> parcours de{" "}
            <span className="chiffre">{formaterNombre(stats.organismes)}</span> organismes, comparés
            sur <span className="chiffre">{stats.criteres}</span> critères. Nous ne notons rien,
            nous ne classons rien par qualité, et aucune position n&apos;est achetable.
          </p>
        </div>
      </div>

      {/* Corps — les colonnes. */}
      <div className="border-t border-(--border-subtle) bg-(--surface-page) py-(--space-12)">
        {/*
          AUTANT DE COLONNES QUE DE CONTENU. La grille était fixée à quatre pour
          trois blocs : la dernière restait vide et le pied paraissait tronqué à
          mi-largeur. Un pied à moitié vide se remarque plus qu'un pied court.

          Le compte de colonnes suit donc `COLONNES` — la mise en page cesse
          d'anticiper des pages qui n'existent pas, et se rééquilibrera d'
          elle-même le jour où « Le projet » sera écrite.
        */}
        <div
          className="mx-auto grid max-w-(--contenu-largeur-max) gap-(--space-8) px-(--space-6) min-[768px]:grid-cols-(--pied-colonnes)"
          style={{ "--pied-colonnes": `repeat(${COLONNES.length + 1}, minmax(0, 1fr))` } as React.CSSProperties}
        >
          {/*
            LE MOT-SYMBOLE SEUL. La phrase qui l'accompagnait — « comparateur
            indépendant… » — est descendue dans la barre inférieure, où elle
            clôt le pied au lieu de l'ouvrir. L'écrire aux deux endroits la
            répétait à trente centimètres d'intervalle, ce qui l'affaiblit :
            une promesse redite dans le même bloc se lit comme un slogan.
          */}
          <div>
            <MotSymboleHorizontal className="h-(--space-8) w-auto text-(--text-primary)" />
          </div>

          {COLONNES.map((colonne) => (
            <nav key={colonne.titre} aria-label={colonne.titre}>
              <p className="t-label text-(--text-tertiary)">{colonne.titre}</p>
              <ul className="mt-(--space-4) flex flex-col gap-(--space-3)">
                {colonne.liens.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="t-body-sm text-(--text-secondary) underline-offset-2 transition-colors duration-(--motion-fast) hover:text-(--text-primary) hover:underline"
                    >
                      {l.libelle}
                    </Link>
                  </li>
                ))}
                {"externes" in colonne &&
                  colonne.externes.map((l) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        className="t-body-sm text-(--text-secondary) underline-offset-2 transition-colors duration-(--motion-fast) hover:text-(--text-primary) hover:underline"
                      >
                        {l.libelle}
                      </a>
                    </li>
                  ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/*
        Barre inférieure.

        SANS DATE DE VÉRIFICATION, ET C'EST UNE DÉCISION. « Catalogue vérifié le
        4 août » était la date la plus récente portée par une fiche, présentée
        comme un fait sur l'ensemble. Le catalogue est vérifié par morceaux, à
        des dates différentes : la plus récente ne dit rien des autres. C'est
        une information déduite — invariant 2 — et la plus coûteuse, puisqu'elle
        porte précisément sur ce que nous promettons.

        La date n'a pas disparu, elle est retournée là où elle décrit ce qu'elle
        mesure : la ligne de provenance de chaque fiche, la ligne de faits de
        chaque organisme, et les chiffres clés de l'accueil (qui, eux, disent
        « dernière vérification » et non « catalogue vérifié »).

        L'ANNÉE EST CALCULÉE, JAMAIS ÉCRITE. « © 2026 » figé devient faux le
        1er janvier, et un pied de page qui affiche la mauvaise année est le
        premier signe qu'un site n'est plus tenu — sur un produit dont
        l'argument est la fraîcheur des informations, c'est le pire endroit où
        laisser une valeur périmée.

        LA MENTION D'AFFILIATION A QUITTÉ CETTE BARRE, et elle n'a pas disparu :
        `PiedFiche` la porte au moment du clic sortant, à côté du lien vers le
        site de l'organisme — là où elle informe une décision plutôt que de
        décorer un pied. Elle figure aussi dans le bandeau ci-dessus et dans le
        panneau de navigation mobile. Vérifié avant retrait.
      */}
      <div className="border-t border-(--border-subtle) bg-(--surface-page) py-(--space-6)">
        {/*
          Sous 768 px : deux lignes centrées. Côte à côte, les deux mentions
          tiennent sur 320 px en se coupant au milieu d'un mot.
        */}
        <div className="mx-auto flex max-w-(--contenu-largeur-max) flex-col items-center gap-(--space-2) px-(--space-6) text-center t-caption text-(--text-tertiary) min-[768px]:flex-row min-[768px]:justify-between min-[768px]:gap-(--space-3) min-[768px]:text-left">
          <p>© {new Date().getFullYear()} Formlist</p>
          <p>Comparateur indépendant de formations e-commerce en France</p>
        </div>
      </div>
    </footer>
  );
}
