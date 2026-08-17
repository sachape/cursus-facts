/**
 * Les blocs de contenu de l'accueil.
 *
 * POURQUOI ILS EXISTENT. En sortant la liste vers `/catalogue`, l'accueil a
 * perdu l'essentiel de son texte. Ces sections le regarnissent, pour le
 * visiteur qui n'a pas encore cliqué comme pour le moteur qui doit comprendre
 * de quoi parle la page.
 *
 * CE QUI A CHANGÉ LE 17 AOÛT 2026, ET POURQUOI.
 *
 * La première version empilait six sections identiques — même largeur, même
 * graisse, même rythme, séparées par des filets. Une page se lit d'abord comme
 * une forme : six blocs de forme identique ne disent pas « voici six choses »,
 * ils disent « voici un document ». Rien n'accrochait l'œil, donc rien
 * n'était lu.
 *
 * Trois leviers, aucun décoratif :
 *   - LE RYTHME. Les sections alternent le fond de page et un fond creusé
 *     pleine largeur. C'est ce qui remplace les filets : une bande change la
 *     lecture, un filet la ponctue à peine.
 *   - LA HIÉRARCHIE. Chaque section porte un surtitre court, un titre en
 *     display, et une seule phrase d'appui. Le surtitre situe, le titre annonce.
 *   - LES CHIFFRES COMME OBJETS. Les répartitions étaient des lignes de tableau
 *     avec un nombre aligné à droite — la forme d'un export, pas d'une page.
 *     Elles deviennent des tuiles dont le nombre est l'élément principal.
 *
 * CE QUI EN A ÉTÉ RETIRÉ, SUR DEMANDE : toute mention de date, et les réserves
 * de collecte du type « leur prix n'est pas encore vérifié ». Les réponses
 * énoncent ce que nous savons ; ce que nous ignorons se lit sur la fiche, qui
 * est l'endroit où cela porte.
 *
 * TOUS LES CHIFFRES VIENNENT DE `chiffresGuides`, jamais d'une saisie — la même
 * fonction qui alimente les guides. Deux calculs séparés finiraient par
 * diverger, et c'est la page la moins lue qui mentirait sans qu'on le voie.
 *
 * AUCUN JUGEMENT, NULLE PART. Ni note, ni « top », ni classement par
 * popularité, qui serait un classement par le trafic.
 */
import { Link } from "@tanstack/react-router";
import type { ChiffresGuides } from "@/modele/chiffres-guides";
import { GUIDES } from "@/contenu/guides";
import { LIBELLES_CATEGORIES } from "@/modele/vocabulaires";
import {
  CHAMPS_INFORMATION,
  LIBELLES_CHAMPS_INFORMATION,
  type ChampInformation,
} from "@/types/cursus";
import { formaterNombre } from "@/modele/nombres";
import { RESSOURCES } from "@/modele/ressources";
import { pagePlanifiee } from "@/modele/plan-pages";
import type { ParametresFiltres } from "@/modele/filtres-url";

/* -------------------------------------------------------------------------- */
/* Les pièces communes                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Une section, sur le fond de page ou sur une bande creusée pleine largeur.
 *
 * La bande déborde le conteneur par des marges négatives qui compensent
 * exactement son retrait, jamais davantage — au-delà, elle créerait un
 * défilement horizontal.
 */
function Section({ creusee = false, children }: { creusee?: boolean; children: React.ReactNode }) {
  if (!creusee) return <section className="py-(--space-20)">{children}</section>;
  return (
    <section className="-mx-(--space-6) bg-(--surface-sunken) px-(--space-6) py-(--space-20)">
      <div className="mx-auto max-w-(--contenu-largeur-max)">{children}</div>
    </section>
  );
}

/** Surtitre, titre, et une seule phrase d'appui. */
function Entete({ surtitre, titre, appui }: { surtitre: string; titre: string; appui?: string }) {
  return (
    <header className="max-w-(--lecture-largeur-max)">
      <p className="t-label text-(--text-tertiary)">{surtitre}</p>
      {/*
        `t-display-2`, et surtout PAS `t-display-3` : cette classe n'existe pas
        dans l'échelle. Tailwind v4 l'aurait ignorée en silence — ni erreur, ni
        avertissement, un titre au corps du texte courant. C'est le défaut que
        les invariants de rendu existent pour attraper.
      */}
      <h2 className="mt-(--space-3) t-display-2 text-(--text-primary) max-[767px]:t-heading-1">
        {titre}
      </h2>
      {appui !== undefined && (
        <p className="mt-(--space-4) t-body-lg text-(--text-secondary)">{appui}</p>
      )}
    </header>
  );
}

/** Une carte, au même idiome que celles du catalogue. */
function Carte({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) p-(--space-6) shadow-(--elevation-1) ${className}`}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Ce que nous comparons                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Les champs de PROVENANCE ne sont pas des critères de comparaison.
 *
 * Le site officiel, la source et la date de vérification décrivent notre
 * collecte, pas la formation. Les afficher parmi les critères mettait sur le
 * même plan « Prix » et « Date de vérification », ce qui brouille les deux.
 * Ils restent au modèle, où ils comptent ; ils sortent de cette liste.
 */
const PROVENANCE: readonly ChampInformation[] = [
  "site_officiel",
  "source_information",
  "date_verification",
];

const CRITERES = CHAMPS_INFORMATION.filter((c) => !PROVENANCE.includes(c));

export function CeQueNousComparons({ chiffres }: { chiffres: ChiffresGuides }) {
  return (
    <Section creusee>
      <Entete
        surtitre="La méthode"
        titre={`${formaterNombre(CRITERES.length)} informations, relevées une par une`}
        appui="Chaque parcours est lu sur le site de l'organisme, champ par champ. Quand un prix est publié, nous conservons la phrase exacte qui le porte et son unité."
      />

      <div className="mt-(--space-10) grid gap-(--space-6) min-[900px]:grid-cols-[1fr_auto] min-[900px]:gap-(--space-12)">
        <ul className="grid grid-cols-2 gap-x-(--space-8) gap-y-(--space-3) min-[640px]:grid-cols-3">
          {CRITERES.map((champ) => (
            <li
              key={champ}
              className="border-b border-(--border-subtle) pb-(--space-2) t-body text-(--text-secondary)"
            >
              {LIBELLES_CHAMPS_INFORMATION[champ]}
            </li>
          ))}
        </ul>

        {/*
          LES TROIS REFUS, DANS UNE CARTE À PART. Noyés dans une colonne de
          texte, ils se lisaient comme une note de bas de page. Ils sont ce qui
          nous sépare d'un comparatif rémunéré à l'affiliation : la seule chose
          de cette page qu'un visiteur ne peut pas vérifier lui-même.
        */}
        <Carte className="min-[900px]:w-80">
          <p className="t-label text-(--text-tertiary)">Ce que nous ne faisons pas</p>
          <ul className="mt-(--space-4) flex flex-col gap-(--space-4) t-body text-(--text-primary)">
            <li>Aucune note, aucune étoile, aucun score de qualité.</li>
            <li>Aucun classement par mérite. L&apos;ordre suit une règle publiée.</li>
            <li>Aucune position achetable, aucun lien affilié.</li>
          </ul>
          <p className="mt-(--space-6) border-t border-(--border-subtle) pt-(--space-4) t-body-sm text-(--text-tertiary)">
            <span className="chiffre">{formaterNombre(chiffres.parcours)}</span> parcours de{" "}
            <span className="chiffre">{formaterNombre(chiffres.organismes)}</span> organismes.{" "}
            <Link to="/methode" className="underline underline-offset-2 hover:text-(--text-secondary)">
              La méthode
            </Link>
          </p>
        </Carte>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Les questions qu'on se pose avant de choisir                            */
/* -------------------------------------------------------------------------- */

/**
 * Quatre questions, quatre réponses chiffrées.
 *
 * CHAQUE RÉPONSE TIENT EN UNE PHRASE ET PORTE UN NOMBRE LU DU CATALOGUE. La
 * version précédente ajoutait à chacune une réserve de collecte — « leur prix
 * n'est pas encore vérifié », « sans la vérifier auprès du financeur ». Quatre
 * réponses suivies de quatre réserves ne se lisent plus comme des réponses.
 * L'état de chaque information reste affiché là où il porte : sur la fiche.
 */
export function QuestionsFrequentes({ chiffres }: { chiffres: ChiffresGuides }) {
  const euros = (v: number | null) => (v === null ? "" : `${formaterNombre(v)} €`);

  const questions: { question: string; reponse: React.ReactNode }[] = [
    {
      question: "Combien coûte une formation e-commerce ?",
      reponse:
        chiffres.medianePayant === null ? (
          <>Les tarifs relevés sont publiés sur chaque fiche, avec leur source.</>
        ) : (
          <>
            La médiane des parcours payants est de{" "}
            <span className="chiffre font-medium text-(--text-primary)">
              {euros(chiffres.medianePayant)}
            </span>
            , de <span className="chiffre">{euros(chiffres.prixMinPayant)}</span> à{" "}
            <span className="chiffre">{euros(chiffres.prixMaxPayant)}</span>.
          </>
        ),
    },
    {
      question: "Peut-on la financer avec le CPF ?",
      reponse: (
        <>
          <span className="chiffre font-medium text-(--text-primary)">
            {formaterNombre(chiffres.eligiblesCpf)}
          </span>{" "}
          parcours déclarent l&apos;éligibilité au CPF, et{" "}
          <span className="chiffre font-medium text-(--text-primary)">
            {formaterNombre(chiffres.alternance)}
          </span>{" "}
          existent en alternance, régime dans lequel l&apos;alternant ne paie pas sa formation.
        </>
      ),
    },
    {
      question: "Que valent les sigles RNCP et RS ?",
      reponse: (
        <>
          <span className="chiffre font-medium text-(--text-primary)">
            {formaterNombre(chiffres.certifiants)}
          </span>{" "}
          parcours portent un code enregistré au Répertoire national ou au Répertoire spécifique,
          condition nécessaire à la plupart des financements.
        </>
      ),
    },
    {
      question: "Existe-t-il des formations sans frais ?",
      reponse: (
        <>
          <span className="chiffre font-medium text-(--text-primary)">
            {formaterNombre(chiffres.sansFrais)}
          </span>{" "}
          parcours ne coûtent rien à l&apos;apprenant, et{" "}
          <span className="chiffre font-medium text-(--text-primary)">
            {formaterNombre(chiffres.accesPartiel)}
          </span>{" "}
          sont gratuits en partie.
        </>
      ),
    },
  ];

  return (
    <Section>
      <Entete surtitre="Avant de choisir" titre="Les questions qu'on se pose" />
      <dl className="mt-(--space-10) grid gap-(--space-5) min-[900px]:grid-cols-2">
        {questions.map((q) => (
          <Carte key={q.question}>
            <dt className="t-heading-3 text-(--text-primary)">{q.question}</dt>
            <dd className="mt-(--space-3) t-body text-(--text-secondary)">{q.reponse}</dd>
          </Carte>
        ))}
      </dl>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Explorer — par format, par type d'organisme                             */
/* -------------------------------------------------------------------------- */

/**
 * Une tuile de croisement.
 *
 * LE NOMBRE EST L'ÉLÉMENT PRINCIPAL, le libellé le qualifie. Ces répartitions
 * étaient des lignes avec un nombre aligné à droite : la forme d'un export de
 * tableur, qui donne à lire une colonne quand on voulait donner à choisir.
 *
 * LA TUILE N'EST UN LIEN QUE SI LA PAGE EST AU PLAN, vérifié par
 * `pagePlanifiee` — comparaison normalisée, indépendante de l'ordre des clés.
 * Sans cette garde, une page servie en `noindex` recevrait des liens depuis
 * l'accueil : vivante à l'écran, muette pour un moteur.
 */
function Tuile({
  parametres,
  libelle,
  nombre,
}: {
  parametres: ParametresFiltres;
  libelle: string;
  nombre: number;
}) {
  const contenu = (
    <>
      <span className="t-data-lg text-(--text-primary)">{formaterNombre(nombre)}</span>
      <span className="mt-(--space-1) block t-body-sm text-(--text-secondary)">{libelle}</span>
    </>
  );
  const base =
    "block rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) p-(--space-5) shadow-(--elevation-1)";
  if (pagePlanifiee(parametres) === undefined) {
    return <li className={base}>{contenu}</li>;
  }
  return (
    <li>
      <Link
        to="/catalogue"
        search={parametres}
        className={`${base} transition-[border-color,box-shadow,transform] duration-(--motion-fast) hover:border-(--border-default) hover:shadow-(--elevation-2) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) motion-safe:hover:-translate-y-px`}
      >
        {contenu}
      </Link>
    </li>
  );
}

export function ExplorerLeCatalogue({ chiffres }: { chiffres: ChiffresGuides }) {
  const formats = [
    { cle: "distanciel", libelle: "À distance", nombre: chiffres.distanciel },
    { cle: "alternance", libelle: "En alternance", nombre: chiffres.alternance },
    { cle: "presentiel", libelle: "En présentiel", nombre: chiffres.presentiel },
  ].filter((f) => f.nombre > 0);

  return (
    <Section creusee>
      <Entete
        surtitre="Entrer par où l'on veut"
        titre="Explorer le catalogue"
        appui="Un mastère d'école et un cours d'indépendant ne se comparent pas de la même façon. Le format et le type d'organisme répondent à la question qu'on se pose d'abord."
      />

      <h3 className="mt-(--space-10) t-label text-(--text-tertiary)">Par format</h3>
      <ul className="mt-(--space-4) grid grid-cols-2 gap-(--space-4) min-[900px]:grid-cols-3">
        {formats.map((f) => (
          <Tuile key={f.cle} parametres={{ format: f.cle }} libelle={f.libelle} nombre={f.nombre} />
        ))}
      </ul>

      <h3 className="mt-(--space-10) t-label text-(--text-tertiary)">Par type d&apos;organisme</h3>
      <ul className="mt-(--space-4) grid grid-cols-2 gap-(--space-4) min-[640px]:grid-cols-3 min-[1100px]:grid-cols-4">
        {chiffres.parCategorie.map((ligne) => (
          <Tuile
            key={ligne.cle}
            parametres={{ categorie: ligne.cle }}
            libelle={
              LIBELLES_CATEGORIES[ligne.cle as keyof typeof LIBELLES_CATEGORIES] ?? ligne.libelle
            }
            nombre={ligne.nombre}
          />
        ))}
      </ul>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Les guides                                                              */
/* -------------------------------------------------------------------------- */

export function LesGuides() {
  return (
    <Section>
      <Entete surtitre="Comprendre" titre="Ce qu'il faut savoir avant de payer" />
      <ul className="mt-(--space-10) grid gap-(--space-5) min-[900px]:grid-cols-2">
        {GUIDES.map((guide) => (
          <li key={guide.slug}>
            <Link
              to="/guides/$slug"
              params={{ slug: guide.slug }}
              className="block h-full rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) p-(--space-6) shadow-(--elevation-1) transition-[border-color,box-shadow,transform] duration-(--motion-fast) hover:border-(--border-default) hover:shadow-(--elevation-2) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) motion-safe:hover:-translate-y-px"
            >
              <h3 className="t-heading-3 text-(--text-primary)">{guide.titre}</h3>
              <p className="mt-(--space-3) t-body-sm text-(--text-secondary)">{guide.chapo}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Les ressources gratuites                                                */
/* -------------------------------------------------------------------------- */

export function LesRessources() {
  // Une section qui annonce des ressources sans en lister aucune est pire
  // qu'une section absente.
  if (RESSOURCES.length === 0) return null;
  const sujets = new Set(RESSOURCES.flatMap((r) => r.sujets)).size;

  return (
    <Section creusee>
      <div className="flex flex-wrap items-end justify-between gap-(--space-6)">
        <div className="max-w-(--lecture-largeur-max)">
          <p className="t-label text-(--text-tertiary)">Gratuit</p>
          <h2 className="mt-(--space-3) t-heading-1 text-(--text-primary)">
            <span className="chiffre">{formaterNombre(RESSOURCES.length)}</span> ressources, sur{" "}
            <span className="chiffre">{formaterNombre(sujets)}</span> sujets
          </h2>
          <p className="mt-(--space-3) t-body text-(--text-secondary)">
            Des plateformes d&apos;éditeur, des documentations et des certifications gratuites. Ce
            ne sont pas des formations : elles n&apos;entrent pas dans le catalogue et nous ne les
            évaluons pas.
          </p>
        </div>
        <Link
          to="/ressources"
          className="inline-flex items-center rounded-(--radius-md) border border-(--border-default) bg-(--surface-raised) px-(--space-5) py-(--space-3) t-body-sm text-(--text-primary) transition-colors duration-(--motion-fast) hover:border-(--border-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
        >
          Voir les ressources
        </Link>
      </div>
    </Section>
  );
}
