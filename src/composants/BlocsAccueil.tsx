/**
 * Les blocs de contenu de l'accueil.
 *
 * POURQUOI ILS EXISTENT. En sortant la liste vers `/catalogue`, l'accueil a
 * perdu l'essentiel de son texte : un titre, une phrase, trois chiffres et un
 * bouton. C'est trop mince pour une page qui doit se classer sur « comparateur
 * formations e-commerce », et surtout trop mince pour quelqu'un qui arrive sans
 * savoir ce que nous faisons.
 *
 * TOUS LES CHIFFRES VIENNENT DE `chiffresGuides`, jamais d'une saisie. C'est la
 * même fonction qui alimente les guides : deux calculs séparés finiraient par
 * diverger, et le jour où ils divergent, c'est la page la moins lue qui ment
 * sans que personne le voie.
 *
 * LE MAILLAGE VISE LES PAGES INDEXABLES. Douze adresses filtrées figurent au
 * plan de pages ; toutes les autres sont servies en `noindex`. Un bloc qui
 * pointerait ailleurs serait utile au visiteur et sans valeur pour un moteur —
 * on choisit donc les liens parmi celles qui existent vraiment.
 *
 * AUCUN JUGEMENT, NULLE PART. Pas de « meilleure », pas de « top », pas de
 * classement par popularité. Un bloc « les plus consultées » serait un
 * classement par le trafic, c'est-à-dire un jugement que nous ne portons pas.
 */
import { Link } from "@tanstack/react-router";
import type { ChiffresGuides } from "@/modele/chiffres-guides";
import { GUIDES } from "@/contenu/guides";
import { LIBELLES_CATEGORIES } from "@/modele/vocabulaires";
import { CHAMPS_INFORMATION, LIBELLES_CHAMPS_INFORMATION } from "@/types/cursus";
import { formaterNombre } from "@/modele/nombres";
import { RESSOURCES } from "@/modele/ressources";
import { pagePlanifiee } from "@/modele/plan-pages";
import type { ParametresFiltres } from "@/modele/filtres-url";

/** Un titre de section, au même traitement partout. */
function Titre({ children }: { children: React.ReactNode }) {
  return <h2 className="t-heading-1 text-(--text-primary) max-[767px]:t-heading-2">{children}</h2>;
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-(--space-16) border-t border-(--border-subtle) pt-(--space-8)">
      {children}
    </section>
  );
}

/**
 * Un lien vers une vue filtrée du catalogue.
 *
 * IL N'EXISTE QUE SI LA PAGE EST AU PLAN. Sans cette garde, renommer un
 * paramètre laisserait un lien pointant vers une page `noindex` — vivante à
 * l'écran, muette pour un moteur, et personne ne s'en apercevrait.
 */
function LienCroisement({
  parametres,
  libelle,
  nombre,
}: {
  parametres: ParametresFiltres;
  libelle: string;
  nombre: number;
}) {
  /*
    COMPARAISON EXACTE ET INDÉPENDANTE DE L'ORDRE DES CLÉS. Une première version
    comparait deux `JSON.stringify` : elle aurait cessé de reconnaître une page
    au premier paramètre réordonné, sans rien casser — le lien serait simplement
    devenu du texte, et personne ne l'aurait vu. `pagePlanifiee` fait déjà cette
    comparaison, normalisée, pour la balise d'indexation.
  */
  const planifiee = pagePlanifiee(parametres) !== undefined;
  const contenu = (
    <>
      <span className="t-body text-(--text-primary)">{libelle}</span>
      <span className="chiffre t-body-sm text-(--text-tertiary)">{formaterNombre(nombre)}</span>
    </>
  );
  const classe =
    "flex items-baseline justify-between gap-(--space-3) border-b border-(--border-subtle) py-(--space-3)";
  if (!planifiee) return <li className={classe}>{contenu}</li>;
  return (
    <li>
      <Link
        to="/catalogue"
        search={parametres}
        className={`${classe} underline-offset-4 transition-colors duration-(--motion-fast) hover:text-(--text-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)`}
      >
        {contenu}
      </Link>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Ce que nous comparons, et ce que nous ne faisons pas                    */
/* -------------------------------------------------------------------------- */

export function CeQueNousComparons({ chiffres }: { chiffres: ChiffresGuides }) {
  return (
    <Section>
      <Titre>Ce que nous comparons</Titre>
      <div className="mt-(--space-4) grid gap-(--space-8) min-[900px]:grid-cols-2">
        <div>
          <p className="t-body text-(--text-secondary)">
            Chaque parcours est relevé sur le site de l&apos;organisme, champ par champ, avec la
            date à laquelle nous l&apos;avons lu. Quand un prix est publié, nous conservons la
            phrase exacte qui le porte, et son unité — un tarif journalier n&apos;est pas un tarif
            total.
          </p>
          <ul className="mt-(--space-4) flex flex-wrap gap-x-(--space-3) gap-y-(--space-2)">
            {CHAMPS_INFORMATION.map((champ) => (
              <li
                key={champ}
                className="rounded-(--radius-full) border border-(--border-subtle) px-(--space-3) py-(--space-1) t-caption text-(--text-secondary)"
              >
                {LIBELLES_CHAMPS_INFORMATION[champ]}
              </li>
            ))}
          </ul>
        </div>
        <div>
          {/*
            LES TROIS REFUS. Ils ne sont pas décoratifs : ils sont ce qui nous
            sépare d'un comparatif rémunéré à l'affiliation, et c'est la seule
            chose qu'un visiteur ne peut pas vérifier lui-même en trois clics.
          */}
          <p className="t-body text-(--text-secondary)">Ce que nous ne faisons pas :</p>
          <ul className="mt-(--space-3) flex flex-col gap-(--space-2) t-body text-(--text-secondary)">
            <li>Aucune note, aucune étoile, aucun score de qualité.</li>
            <li>Aucun classement par mérite — l&apos;ordre suit une règle publiée.</li>
            <li>Aucune position achetable, aucun lien affilié.</li>
          </ul>
          <p className="mt-(--space-4) t-body-sm text-(--text-tertiary)">
            <span className="chiffre">{formaterNombre(chiffres.parcours)}</span> parcours de{" "}
            <span className="chiffre">{formaterNombre(chiffres.organismes)}</span> organismes.{" "}
            <Link to="/methode" className="underline underline-offset-2 hover:text-(--text-secondary)">
              Comment ce catalogue est construit
            </Link>
          </p>
        </div>
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
 * CHAQUE RÉPONSE PORTE UN NOMBRE LU DU CATALOGUE, et renvoie vers l'endroit qui
 * le détaille. Une question dont la réponse serait un paragraphe d'opinion
 * n'aurait rien à faire ici : ce bloc existe parce que nous savons compter,
 * pas parce que nous savons conseiller.
 *
 * PAS DE BALISAGE FAQ. Les résultats enrichis correspondants ont été restreints
 * en 2023 ; le balisage ne rapporterait plus rien et ajouterait une dette.
 */
export function QuestionsFrequentes({ chiffres }: { chiffres: ChiffresGuides }) {
  const euros = (v: number | null) => (v === null ? null : `${formaterNombre(v)} €`);

  const questions: { question: string; reponse: React.ReactNode }[] = [
    {
      question: "Combien coûte une formation e-commerce ?",
      reponse:
        chiffres.medianePayant === null ? (
          <>
            Aucun tarif n&apos;est encore établi dans le catalogue. Nous n&apos;affichons pas de
            fourchette tant qu&apos;elle ne repose sur rien.
          </>
        ) : (
          <>
            Sur les <span className="chiffre">{formaterNombre(chiffres.prixEtabli)}</span> parcours
            dont le tarif est relevé, la médiane des parcours payants est de{" "}
            <span className="chiffre">{euros(chiffres.medianePayant)}</span>, de{" "}
            <span className="chiffre">{euros(chiffres.prixMinPayant)}</span> à{" "}
            <span className="chiffre">{euros(chiffres.prixMaxPayant)}</span>. Les{" "}
            <span className="chiffre">{formaterNombre(chiffres.prixNonEtabli)}</span> autres ne sont
            pas gratuits : leur prix n&apos;est pas encore vérifié.
          </>
        ),
    },
    {
      question: "Peut-on la financer avec le CPF ?",
      reponse: (
        <>
          <span className="chiffre">{formaterNombre(chiffres.eligiblesCpf)}</span> parcours
          déclarent l&apos;éligibilité au CPF, et{" "}
          <span className="chiffre">{formaterNombre(chiffres.alternance)}</span> existent en
          alternance, régime dans lequel l&apos;alternant ne paie pas sa formation. C&apos;est une
          déclaration de l&apos;organisme, que nous rapportons sans la vérifier auprès du
          financeur.
        </>
      ),
    },
    {
      question: "Que valent les sigles RNCP et RS ?",
      reponse: (
        <>
          <span className="chiffre">{formaterNombre(chiffres.certifiants)}</span> parcours portent
          un code enregistré au Répertoire national ou au Répertoire spécifique — condition
          nécessaire à la plupart des financements.{" "}
          <span className="chiffre">{formaterNombre(chiffres.aucuneCertification)}</span> ne
          délivrent aucune certification, ce qui n&apos;en fait pas de mauvaises formations.
        </>
      ),
    },
    {
      question: "Existe-t-il des formations sans frais ?",
      reponse: (
        <>
          <span className="chiffre">{formaterNombre(chiffres.sansFrais)}</span> parcours ne coûtent
          rien à l&apos;apprenant, et{" "}
          <span className="chiffre">{formaterNombre(chiffres.accesPartiel)}</span> ne sont gratuits
          qu&apos;en partie. Un montant nul ne se suffit jamais à lui-même : nous affichons toujours
          la modalité qui le qualifie.
        </>
      ),
    },
  ];

  return (
    <Section>
      <Titre>Les questions qu&apos;on se pose avant de choisir</Titre>
      <dl className="mt-(--space-6) flex max-w-(--lecture-largeur-max) flex-col gap-(--space-6)">
        {questions.map((q) => (
          <div key={q.question}>
            <dt className="t-heading-3 text-(--text-primary)">{q.question}</dt>
            <dd className="mt-(--space-2) t-body text-(--text-secondary)">{q.reponse}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 3 et 4. Par format, par type d'organisme                                   */
/* -------------------------------------------------------------------------- */

export function ParFormat({ chiffres }: { chiffres: ChiffresGuides }) {
  /*
    Les trois formats, et seulement ceux que le plan de pages porte. `presentiel`
    n'y figure pas : la page n'existe pas, l'entrée reste donc un fait affiché
    sans lien plutôt qu'un lien vers une page muette.
  */
  const formats: { cle: string; libelle: string; nombre: number }[] = [
    { cle: "distanciel", libelle: "À distance", nombre: chiffres.distanciel },
    { cle: "alternance", libelle: "En alternance", nombre: chiffres.alternance },
    { cle: "presentiel", libelle: "En présentiel", nombre: chiffres.presentiel },
  ];

  return (
    <Section>
      <Titre>Par format</Titre>
      <ul className="mt-(--space-4) max-w-(--lecture-largeur-max)">
        {formats
          .filter((f) => f.nombre > 0)
          .map((f) => (
            <LienCroisement
              key={f.cle}
              parametres={{ format: f.cle }}
              libelle={f.libelle}
              nombre={f.nombre}
            />
          ))}
      </ul>
    </Section>
  );
}

export function ParTypeDOrganisme({ chiffres }: { chiffres: ChiffresGuides }) {
  return (
    <Section>
      <Titre>Par type d&apos;organisme</Titre>
      <p className="mt-(--space-3) max-w-(--lecture-largeur-max) t-body text-(--text-secondary)">
        Un mastère d&apos;école et un cours d&apos;indépendant ne se comparent pas de la même façon.
        La catégorie répond à la seule question qu&apos;on se pose d&apos;abord : à qui ai-je
        affaire.
      </p>
      <ul className="mt-(--space-4) max-w-(--lecture-largeur-max)">
        {chiffres.parCategorie.map((ligne) => (
          <LienCroisement
            key={ligne.cle}
            parametres={{ categorie: ligne.cle }}
            libelle={LIBELLES_CATEGORIES[ligne.cle as keyof typeof LIBELLES_CATEGORIES] ?? ligne.libelle}
            nombre={ligne.nombre}
          />
        ))}
      </ul>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 5 et 6. Les guides, les ressources gratuites                               */
/* -------------------------------------------------------------------------- */

export function LesGuides() {
  return (
    <Section>
      <Titre>Comprendre avant de choisir</Titre>
      <ul className="mt-(--space-4) grid gap-(--space-6) min-[900px]:grid-cols-2">
        {GUIDES.map((guide) => (
          <li key={guide.slug} className="border-t border-(--border-subtle) pt-(--space-4)">
            <h3 className="t-heading-3 text-(--text-primary)">
              <Link
                to="/guides/$slug"
                params={{ slug: guide.slug }}
                className="rounded-(--radius-sm) underline-offset-4 transition-colors duration-(--motion-fast) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
              >
                {guide.titre}
              </Link>
            </h3>
            <p className="mt-(--space-2) t-body-sm text-(--text-secondary)">{guide.chapo}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function LesRessources() {
  /*
    LE BLOC DISPARAÎT S'IL N'Y A RIEN À MONTRER. Une section qui annonce des
    ressources et n'en liste aucune est pire qu'une section absente.
  */
  if (RESSOURCES.length === 0) return null;
  const sujets = new Set(RESSOURCES.flatMap((r) => r.sujets)).size;
  return (
    <Section>
      <Titre>Ressources gratuites</Titre>
      <p className="mt-(--space-3) max-w-(--lecture-largeur-max) t-body text-(--text-secondary)">
        <span className="chiffre">{formaterNombre(RESSOURCES.length)}</span> plateformes
        d&apos;éditeur, documentations et certifications gratuites, rangées sur{" "}
        <span className="chiffre">{formaterNombre(sujets)}</span> sujets. Ce ne sont pas des
        formations : elles n&apos;entrent pas dans le catalogue et nous ne les évaluons pas.{" "}
        <Link
          to="/ressources"
          className="underline underline-offset-2 hover:text-(--text-primary)"
        >
          Voir les ressources
        </Link>
      </p>
    </Section>
  );
}
