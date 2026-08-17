/**
 * Les blocs de contenu de l'accueil.
 *
 * POURQUOI ILS EXISTENT. En sortant la liste vers `/catalogue`, l'accueil a
 * perdu l'essentiel de son texte. Ces sections le regarnissent, pour le
 * visiteur qui n'a pas encore cliqué comme pour le moteur qui doit comprendre
 * de quoi parle la page.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE LA DEUXIÈME VERSION RATAIT, ET CE QUI EST CORRIGÉ ICI
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 1. UN SURTITRE SUR CHAQUE SECTION. Cinq sections, cinq petits libellés en
 *    capitales espacées : c'est le rythme templaté qu'on reconnaît au premier
 *    coup d'œil sur une page générée. La règle tenable est au plus un surtitre
 *    pour trois sections. Il en reste UN, sur la section des questions, parce
 *    que c'est la seule dont le titre seul ne dit pas à quel moment on est.
 *
 * 2. QUATRE SECTIONS DE LA MÊME FAMILLE. Grille de cartes, grille de cartes,
 *    grille de tuiles, grille de cartes. Une page se lit d'abord comme une
 *    forme ; quatre formes identiques disent « document », pas « quatre
 *    choses ». Chaque section a maintenant sa propre famille : colonnes
 *    éditoriales groupées, lignes à chiffre dominant, grille de tuiles, liste
 *    indexée, bandeau pleine largeur.
 *
 * 3. QUINZE LIGNES AVEC UN FILET SOUS CHACUNE. C'est la mise en forme d'un
 *    export de tableur. Les critères sont regroupés en quatre familles nommées,
 *    ce qui les rend lisibles d'un regard au lieu d'être comptés.
 *
 * 4. AUCUNE COULEUR. La marque a un accent — un bleu profond — et la page
 *    l'ignorait entièrement : gris sur gris, du haut jusqu'en bas. L'accent
 *    porte désormais les chiffres, les états de survol et le bandeau final.
 *    Un seul accent, le même partout.
 *
 * TOUS LES CHIFFRES VIENNENT DE `chiffresGuides`, jamais d'une saisie — la même
 * fonction qui alimente les guides. Deux calculs séparés finiraient par
 * diverger, et c'est la page la moins lue qui mentirait sans qu'on le voie.
 *
 * AUCUN JUGEMENT, NULLE PART. Ni note, ni « top », ni classement par
 * popularité, qui serait un classement par le trafic.
 *
 * AUCUNE DATE, et aucune réserve de collecte : l'état d'une information reste
 * affiché sur la fiche, qui est l'endroit où il porte.
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
/* Pièces communes                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Une section.
 *
 * `fond` : `page` par défaut, `creuse` pour la bande gris clair, `accent` pour
 * le bandeau de marque. Les deux dernières débordent le conteneur par des
 * marges négatives qui compensent exactement son retrait, jamais davantage —
 * au-delà, elles créeraient un défilement horizontal.
 */
function Section({
  fond = "page",
  children,
}: {
  fond?: "page" | "creuse" | "accent";
  children: React.ReactNode;
}) {
  if (fond === "page") return <section className="py-(--space-20)">{children}</section>;
  const couleur = fond === "creuse" ? "bg-(--surface-sunken)" : "bg-(--accent-default)";
  return (
    <section className={`-mx-(--space-6) ${couleur} px-(--space-6) py-(--space-20)`}>
      <div className="mx-auto max-w-(--contenu-largeur-max)">{children}</div>
    </section>
  );
}

/** Le titre d'une section. Sans surtitre : le titre suffit presque toujours. */
function Titre({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="max-w-(--lecture-largeur-max) text-balance t-display-2 text-(--text-primary) max-[767px]:t-heading-1">
      {children}
    </h2>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Ce que nous comparons — colonnes éditoriales groupées                   */
/* -------------------------------------------------------------------------- */

/**
 * Les quatre familles de critères.
 *
 * POURQUOI GROUPER. Quinze libellés à la file se comptent, ils ne se lisent
 * pas : personne ne retient une liste de quinze, et le filet sous chaque ligne
 * ajoutait le bruit d'un tableau. Quatre familles nommées se retiennent, et
 * chacune répond à une question que la personne se pose vraiment.
 *
 * RIEN NE PEUT DISPARAÎTRE EN SILENCE. Ce qui n'est rattaché à aucune famille
 * tombe dans « Le reste » plutôt que de s'évaporer : le jour où un champ est
 * ajouté au modèle, il apparaît quelque part, visiblement, au lieu d'être
 * oublié par une liste écrite à la main.
 */
const FAMILLES: { titre: string; champs: readonly ChampInformation[] }[] = [
  {
    titre: "Ce qu'on paie",
    champs: ["prix", "modalites_paiement", "eligible_cpf", "financements_acceptes"],
  },
  { titre: "Ce qu'on apprend", champs: ["programme", "outils_enseignes", "non_couvert"] },
  { titre: "Ce que ça engage", champs: ["duree", "volume_horaire", "format", "lieu"] },
  {
    titre: "Ce que ça vaut",
    champs: ["certification", "code_rncp_rs", "niveau_entree", "prerequis"],
  },
];

/**
 * Les champs de PROVENANCE ne sont pas des critères de comparaison.
 *
 * Le site officiel, la source et la date de vérification décrivent notre
 * collecte, pas la formation. Les afficher parmi les critères mettait « Prix »
 * et « Date de vérification » sur le même plan. Ils restent au modèle, où ils
 * comptent ; ils sortent de cette liste.
 */
const PROVENANCE: readonly ChampInformation[] = [
  "site_officiel",
  "source_information",
  "date_verification",
];

const CRITERES = CHAMPS_INFORMATION.filter((c) => !PROVENANCE.includes(c));
const RATTACHES = new Set(FAMILLES.flatMap((f) => f.champs));
const RESTE = CRITERES.filter((c) => !RATTACHES.has(c));
const GROUPES = RESTE.length === 0 ? FAMILLES : [...FAMILLES, { titre: "Le reste", champs: RESTE }];

export function CeQueNousComparons({ chiffres }: { chiffres: ChiffresGuides }) {
  return (
    <Section fond="creuse">
      <div className="grid gap-(--space-10) min-[1000px]:grid-cols-[1fr_20rem] min-[1000px]:gap-(--space-16)">
        <div>
          <Titre>
            <span className="chiffre">{formaterNombre(CRITERES.length)}</span> informations, relevées
            une par une
          </Titre>
          <p className="mt-(--space-5) max-w-[62ch] t-body-lg text-(--text-secondary)">
            Chaque parcours est lu sur le site de l&apos;organisme, champ par champ. Quand un prix
            est publié, nous gardons la phrase exacte qui le porte et son unité.
          </p>

          <div className="mt-(--space-10) grid gap-x-(--space-10) gap-y-(--space-8) min-[640px]:grid-cols-2">
            {GROUPES.map((groupe) => (
              <div key={groupe.titre}>
                <h3 className="t-body font-medium text-(--text-primary)">{groupe.titre}</h3>
                <ul className="mt-(--space-3) flex flex-col gap-(--space-2)">
                  {groupe.champs.map((champ) => (
                    <li key={champ} className="t-body-sm text-(--text-secondary)">
                      {LIBELLES_CHAMPS_INFORMATION[champ]}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/*
          LES TROIS REFUS, SUR FOND D'ACCENT. Noyés dans une colonne de texte,
          ils se lisaient comme une note de bas de page. Ils sont ce qui nous
          sépare d'un comparatif rémunéré à l'affiliation : la seule chose de
          cette page qu'un visiteur ne peut pas vérifier lui-même.
        */}
        <aside className="self-start rounded-(--radius-lg) border border-(--accent-border) bg-(--accent-surface) p-(--space-6)">
          <p className="t-body font-medium text-(--text-primary)">Ce que nous ne faisons pas</p>
          <ul className="mt-(--space-4) flex flex-col gap-(--space-4) t-body-sm text-(--text-secondary)">
            <li>Aucune note, aucune étoile, aucun score de qualité.</li>
            <li>Aucun classement par mérite. L&apos;ordre suit une règle publiée.</li>
            <li>Aucune position achetable, aucun lien affilié.</li>
          </ul>
          <p className="mt-(--space-6) border-t border-(--accent-border) pt-(--space-4) t-caption text-(--text-tertiary)">
            <span className="chiffre">{formaterNombre(chiffres.parcours)}</span> parcours de{" "}
            <span className="chiffre">{formaterNombre(chiffres.organismes)}</span> organismes.{" "}
            <Link
              to="/methode"
              className="text-(--accent-default) underline underline-offset-2 hover:text-(--accent-hover)"
            >
              La méthode
            </Link>
          </p>
        </aside>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Les questions — lignes à chiffre dominant                               */
/* -------------------------------------------------------------------------- */

/**
 * Quatre questions, quatre réponses.
 *
 * LE CHIFFRE PORTE LA RÉPONSE, ET IL EST DANS LA MARGE. En cartes, les quatre
 * réponses se ressemblaient toutes et le nombre se perdait au milieu du texte.
 * Sorti à gauche, en display et en accent, il devient le point d'entrée : on
 * lit le chiffre, puis la question, puis la phrase. C'est l'ordre dans lequel
 * la question se pose.
 *
 * Le seul surtitre de la page est ici : « Les questions qu'on se pose » ne dit
 * pas, seul, qu'on en est au moment de choisir.
 */
export function QuestionsFrequentes({ chiffres }: { chiffres: ChiffresGuides }) {
  const euros = (v: number | null) => (v === null ? "" : `${formaterNombre(v)} €`);

  const lignes: { chiffre: string; question: string; reponse: React.ReactNode }[] = [
    {
      chiffre: chiffres.medianePayant === null ? "" : euros(chiffres.medianePayant),
      question: "Combien coûte une formation e-commerce ?",
      reponse:
        chiffres.medianePayant === null ? (
          <>Les tarifs relevés sont publiés sur chaque fiche, avec leur source.</>
        ) : (
          <>
            C&apos;est la médiane des parcours payants, de{" "}
            <span className="chiffre">{euros(chiffres.prixMinPayant)}</span> à{" "}
            <span className="chiffre">{euros(chiffres.prixMaxPayant)}</span>.
          </>
        ),
    },
    {
      chiffre: formaterNombre(chiffres.eligiblesCpf),
      question: "Peut-on la financer avec le CPF ?",
      reponse: (
        <>
          parcours déclarent l&apos;éligibilité, et{" "}
          <span className="chiffre">{formaterNombre(chiffres.alternance)}</span> existent en
          alternance, régime dans lequel l&apos;alternant ne paie pas sa formation.
        </>
      ),
    },
    {
      chiffre: formaterNombre(chiffres.certifiants),
      question: "Que valent les sigles RNCP et RS ?",
      reponse: (
        <>
          parcours portent un code enregistré au Répertoire national ou au Répertoire spécifique,
          condition nécessaire à la plupart des financements.
        </>
      ),
    },
    {
      chiffre: formaterNombre(chiffres.sansFrais),
      question: "Existe-t-il des formations sans frais ?",
      reponse: (
        <>
          parcours ne coûtent rien à l&apos;apprenant, et{" "}
          <span className="chiffre">{formaterNombre(chiffres.accesPartiel)}</span> sont gratuits en
          partie.
        </>
      ),
    },
  ];

  return (
    <Section>
      <p className="t-label text-(--text-tertiary)">Avant de choisir</p>
      <div className="mt-(--space-3)">
        <Titre>Les questions qu&apos;on se pose</Titre>
      </div>

      <dl className="mt-(--space-12) flex flex-col">
        {lignes.map((l) => (
          <div
            key={l.question}
            className="grid gap-(--space-2) border-t border-(--border-subtle) py-(--space-8) min-[768px]:grid-cols-[10rem_1fr] min-[768px]:gap-(--space-10)"
          >
            <p className="t-data-lg text-(--accent-default)">{l.chiffre}</p>
            <div className="max-w-[62ch]">
              <dt className="t-heading-3 text-(--text-primary)">{l.question}</dt>
              <dd className="mt-(--space-2) t-body text-(--text-secondary)">{l.reponse}</dd>
            </div>
          </div>
        ))}
      </dl>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Explorer — grille de tuiles                                             */
/* -------------------------------------------------------------------------- */

/**
 * Une tuile de croisement.
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
      <span className="t-data-lg text-(--text-primary) transition-colors duration-(--motion-fast) group-hover/tuile:text-(--accent-default)">
        {formaterNombre(nombre)}
      </span>
      <span className="mt-(--space-1) block t-body-sm text-(--text-secondary)">{libelle}</span>
    </>
  );
  const base =
    "block h-full rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) p-(--space-5)";
  if (pagePlanifiee(parametres) === undefined) {
    return <li className={base}>{contenu}</li>;
  }
  return (
    <li>
      <Link
        to="/catalogue"
        search={parametres}
        className={`group/tuile ${base} transition-[border-color,box-shadow,transform] duration-(--motion-fast) hover:border-(--accent-border) hover:shadow-(--elevation-2) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) motion-safe:hover:-translate-y-px`}
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
    <Section fond="creuse">
      <Titre>Explorer le catalogue</Titre>
      <p className="mt-(--space-5) max-w-[62ch] t-body-lg text-(--text-secondary)">
        Un mastère d&apos;école et un cours d&apos;indépendant ne se comparent pas de la même façon.
        Le format et le type d&apos;organisme répondent à la question qu&apos;on se pose d&apos;abord.
      </p>

      <ul className="mt-(--space-10) grid grid-cols-2 gap-(--space-4) min-[900px]:grid-cols-3">
        {formats.map((f) => (
          <Tuile key={f.cle} parametres={{ format: f.cle }} libelle={f.libelle} nombre={f.nombre} />
        ))}
      </ul>

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
/* 4. Les guides — liste indexée                                              */
/* -------------------------------------------------------------------------- */

/**
 * Les guides, en liste indexée plutôt qu'en cartes.
 *
 * Quatre cartes de plus, après quatre cartes de questions et huit tuiles, ne
 * se distinguaient plus de ce qui précède. Un index numéroté se lit comme une
 * table des matières, ce que c'est exactement.
 */
export function LesGuides() {
  return (
    <Section>
      <Titre>Ce qu&apos;il faut savoir avant de payer</Titre>
      <ol className="mt-(--space-10) grid gap-x-(--space-12) min-[900px]:grid-cols-2">
        {GUIDES.map((guide, i) => (
          <li key={guide.slug} className="border-t border-(--border-subtle)">
            <Link
              to="/guides/$slug"
              params={{ slug: guide.slug }}
              className="group/guide flex gap-(--space-5) py-(--space-6) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
            >
              <span className="t-data text-(--text-tertiary)">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <span className="block t-heading-3 text-(--text-primary) underline-offset-4 transition-colors duration-(--motion-fast) group-hover/guide:text-(--accent-default) group-hover/guide:underline">
                  {guide.titre}
                </span>
                <span className="mt-(--space-2) block t-body-sm text-(--text-secondary)">
                  {guide.chapo}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Les ressources gratuites — bandeau de marque                            */
/* -------------------------------------------------------------------------- */

/**
 * Le seul bloc de couleur pleine de la page, et il arrive en dernier.
 *
 * Un bandeau d'accent est un changement de registre : employé deux fois, il
 * cesse d'en être un. Placé ici, il ferme la page sur la seule chose qui ne
 * s'achète pas, juste avant le pied institutionnel.
 */
export function LesRessources() {
  // Une section qui annonce des ressources sans en lister aucune est pire
  // qu'une section absente.
  if (RESSOURCES.length === 0) return null;
  const sujets = new Set(RESSOURCES.flatMap((r) => r.sujets)).size;

  return (
    <Section fond="accent">
      <div className="flex flex-wrap items-end justify-between gap-(--space-8)">
        <div className="max-w-[52ch]">
          <h2 className="t-display-2 text-(--text-on-inverse) max-[767px]:t-heading-1">
            <span className="chiffre">{formaterNombre(RESSOURCES.length)}</span> ressources
            gratuites, sur <span className="chiffre">{formaterNombre(sujets)}</span> sujets
          </h2>
          <p className="mt-(--space-4) t-body-lg text-(--text-on-inverse) opacity-80">
            Des plateformes d&apos;éditeur, des documentations et des certifications gratuites. Ce
            ne sont pas des formations : elles n&apos;entrent pas dans le catalogue et nous ne les
            évaluons pas.
          </p>
        </div>
        <Link
          to="/ressources"
          className="inline-flex items-center rounded-(--radius-md) bg-(--surface-page) px-(--space-6) py-(--space-3) t-body-sm font-medium text-(--text-primary) transition-opacity duration-(--motion-fast) hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--surface-page)"
        >
          Voir les ressources
        </Link>
      </div>
    </Section>
  );
}
