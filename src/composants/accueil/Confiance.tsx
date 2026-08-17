/**
 * 06 — Pourquoi ces informations sont fiables, et 07 — les questions qu'on se
 * pose avant de choisir.
 *
 * LA MÉTHODE N'EST PAS UN ARGUMENT MARKETING, C'EST LA CONTREPARTIE. Ce produit
 * demande qu'on lui fasse confiance sur des faits qu'on ne va pas revérifier :
 * la seule chose qu'il peut offrir en échange, c'est de dire comment il
 * travaille, y compris ce qu'il ne sait pas. D'où le troisième bloc, qui
 * énonce les limites — le retirer rendrait les deux premiers moins crédibles,
 * pas plus.
 *
 * LES CHIFFRES DES QUESTIONS SORTENT DE `chiffresGuides`, la même fonction qui
 * alimente les guides. Deux calculs séparés finiraient par diverger, et c'est
 * la page la moins lue qui mentirait sans qu'on le voie.
 */
import { Link } from "@tanstack/react-router";
import type { ChiffresGuides } from "@/modele/chiffres-guides";
import { formaterNombre } from "@/modele/nombres";
import {
  CHAMPS_INFORMATION,
  LIBELLES_CHAMPS_INFORMATION,
  type ChampInformation,
} from "@/types/cursus";
import { Entete, LienAction, Reveal, Section, Titre } from "./pieces";

/* -------------------------------------------------------------------------- */
/* 06 — La méthode                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Les champs de PROVENANCE ne sont pas des critères de comparaison : ils
 * décrivent notre collecte, pas la formation.
 */
const PROVENANCE: readonly ChampInformation[] = [
  "site_officiel",
  "source_information",
  "date_verification",
];

const CRITERES = CHAMPS_INFORMATION.filter((c) => !PROVENANCE.includes(c));

/**
 * Les quatre familles de critères.
 *
 * RIEN NE PEUT DISPARAÎTRE EN SILENCE : ce qui n'est rattaché à aucune famille
 * tombe dans « Le reste », de sorte qu'un champ ajouté au modèle apparaisse
 * quelque part au lieu d'être oublié par une liste écrite à la main.
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

const RATTACHES = new Set(FAMILLES.flatMap((f) => f.champs));
const RESTE = CRITERES.filter((c) => !RATTACHES.has(c));
const GROUPES = RESTE.length === 0 ? FAMILLES : [...FAMILLES, { titre: "Le reste", champs: RESTE }];

const REFUS = [
  "Aucune note, aucune étoile, aucun score de qualité.",
  "Aucun classement par mérite. L'ordre suit une règle publiée.",
  "Aucune position achetable, aucun lien affilié.",
];

const LIMITES = [
  "Certaines fiches sont incomplètes. Elles restent au catalogue, avec leurs manques visibles.",
  "Une information non publiée par l'organisme s'affiche « Non communiqué », jamais une estimation.",
  "Une valeur qu'on ne peut pas reconfirmer est signalée, elle n'est pas effacée.",
];

export function PourquoiFiable({ chiffres }: { chiffres: ChiffresGuides }) {
  return (
    <Section fond="creuse" id="methode">
      <Reveal>
        <Entete
          index={{ numero: "06", libelle: "La méthode" }}
          titre={
            <>
              <span className="chiffre">{formaterNombre(CRITERES.length)}</span> informations,
              relevées une par une.
            </>
          }
          appui="Chaque parcours est lu sur le site de l'organisme, champ par champ. Quand un prix est publié, nous gardons la phrase exacte qui le porte et son unité."
        />
      </Reveal>

      <div className="mt-(--space-10) grid gap-(--space-8) min-[1000px]:grid-cols-[1fr_20rem] min-[1000px]:gap-(--space-16)">
        <Reveal>
          <div className="grid gap-x-(--space-10) gap-y-(--space-8) min-[640px]:grid-cols-2">
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

          {/*
            LES LIMITES SONT DANS LA MÊME SECTION QUE LA MÉTHODE, pas reléguées
            en bas de page : une méthode sans ses limites est une promesse.
          */}
          <div className="mt-(--space-10) border-t border-(--border-default) pt-(--space-6)">
            <h3 className="t-body font-medium text-(--text-primary)">Ce que nous ne savons pas</h3>
            <ul className="mt-(--space-3) flex flex-col gap-(--space-2)">
              {LIMITES.map((limite) => (
                <li key={limite} className="t-body-sm text-(--text-secondary)">
                  {limite}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delai={80}>
          <aside className="self-start rounded-(--carte-rayon) border border-(--accent-border) bg-(--surface-raised) p-(--space-6) shadow-(--elevation-2)">
            <p className="t-body font-medium text-(--text-primary)">Ce que nous ne faisons pas</p>
            <ul className="mt-(--space-4) flex flex-col gap-(--space-4) t-body-sm text-(--text-secondary)">
              {REFUS.map((refus) => (
                <li key={refus}>{refus}</li>
              ))}
            </ul>
            <p className="mt-(--space-6) border-t border-(--accent-border) pt-(--space-4) t-caption text-(--text-tertiary)">
              <span className="chiffre">{formaterNombre(chiffres.parcours)}</span> parcours de{" "}
              <span className="chiffre">{formaterNombre(chiffres.organismes)}</span> organismes.
            </p>
            <div className="mt-(--space-4)">
              <LienAction to="/methode">Lire la méthode</LienAction>
            </div>
          </aside>
        </Reveal>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 07 — Les questions qu'on se pose                                           */
/* -------------------------------------------------------------------------- */

/**
 * Quatre questions, quatre réponses chiffrées.
 *
 * LE CHIFFRE PORTE LA RÉPONSE, ET IL EST DANS LA MARGE : on lit le chiffre,
 * puis la question, puis la phrase. C'est l'ordre dans lequel la question se
 * pose. Chaque réponse mène au guide qui la développe — un chiffre sans son
 * explication laisse la personne exactement où elle était.
 */
export function LesQuestions({ chiffres }: { chiffres: ChiffresGuides }) {
  const euros = (v: number | null) => (v === null ? "" : `${formaterNombre(v)} €`);

  const lignes: {
    chiffre: string;
    question: string;
    reponse: React.ReactNode;
    guide?: string;
  }[] = [
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
      guide: "combien-coute-formation-ecommerce",
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
      guide: "financer-formation-ecommerce",
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
      guide: "rncp-rs-qualiopi-comprendre",
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
      <Reveal>
        <Titre>Les questions qu&apos;on se pose avant de choisir</Titre>
      </Reveal>

      <dl className="mt-(--space-10) flex flex-col">
        {lignes.map((l, i) => (
          <Reveal key={l.question} delai={i * 40}>
            <div className="grid gap-(--space-2) border-t border-(--border-default) py-(--space-7) min-[768px]:grid-cols-[10.5rem_1.1fr_1.4fr] min-[768px]:gap-(--space-10)">
              <p className="whitespace-nowrap t-display-1 tabular-nums text-(--accent-default) max-[767px]:t-display-2">
                {l.chiffre}
              </p>
              <dt className="t-heading-3 text-(--text-primary)">{l.question}</dt>
              <dd className="t-body text-(--text-secondary) max-[767px]:mt-(--space-2)">
                {l.reponse}
                {l.guide !== undefined && (
                  <>
                    {" "}
                    <Link
                      to="/guides/$slug"
                      params={{ slug: l.guide }}
                      className="rounded-(--radius-sm) text-(--accent-default) underline underline-offset-2 hover:text-(--accent-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
                    >
                      Le guide
                    </Link>
                  </>
                )}
              </dd>
            </div>
          </Reveal>
        ))}
      </dl>
    </Section>
  );
}
