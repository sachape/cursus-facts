/**
 * Les pièces d'une page guide.
 *
 * UN GUIDE EST LONG PAR NATURE — c'est ce qui le distingue d'un article. Il se
 * parcourt en diagonale, s'abandonne, et se reprend : d'où un sommaire ancré
 * qui reste à l'écran au-delà de 1 024 px, et un accordéon en dessous plutôt
 * qu'une liste dépliée qui repousserait le texte d'un écran entier sur mobile.
 *
 * LE CHIFFRE EST ENCADRÉ, DATÉ ET LIÉ. Fondu dans une phrase, un nombre se lit
 * comme une affirmation d'auteur ; encadré avec sa date de calcul et le lien
 * vers les fiches qui le composent, il se lit comme une mesure. C'est la seule
 * chose que les contenus d'affiliés ne peuvent pas copier.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { BlocGuide, SectionGuide, Sortie } from "@/contenu/guides/format";
import { lire } from "@/contenu/guides/format";
import type { ChiffresGuides } from "@/modele/chiffres-guides";
import { formaterDateLongue } from "@/modele/dates";

/* -------------------------------------------------------------------------- */
/* Sortie — un lien vers le catalogue                                         */
/* -------------------------------------------------------------------------- */

/**
 * Le lien de sortie d'une section.
 *
 * UN GUIDE SANS SORTIE NE SERT À RIEN. Il capte une question posée en amont de
 * la décision ; s'il n'offre pas le geste suivant, il a coûté une lecture et
 * n'a rien qualifié.
 */
export function LienSortie({
  sortie,
  chiffres,
}: {
  sortie: Sortie;
  chiffres: ChiffresGuides;
}) {
  return (
    <Link
      to={sortie.to}
      {...(sortie.search !== undefined ? { search: sortie.search } : {})}
      {...(sortie.hash !== undefined ? { hash: sortie.hash } : {})}
      className="inline-flex items-center gap-(--space-2) rounded-(--radius-sm) t-body-sm font-medium text-(--accent-default) underline-offset-4 transition-colors duration-(--motion-fast) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
    >
      {lire(sortie.libelle, chiffres)}
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      </svg>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Bloc de données — un chiffre du catalogue, encadré et daté                 */
/* -------------------------------------------------------------------------- */

function BlocDonnees({
  titre,
  lignes,
  sortie,
  chiffres,
}: {
  titre: string;
  lignes: Array<{ libelle: string; valeur: string; precision?: string }>;
  sortie: Sortie;
  chiffres: ChiffresGuides;
}) {
  return (
    <figure className="my-(--space-6) rounded-(--carte-rayon) border border-(--border-subtle) bg-(--surface-raised) p-(--space-5)">
      <figcaption className="t-label text-(--text-tertiary)">{titre}</figcaption>

      <dl className="mt-(--space-4) flex flex-col gap-(--space-3)">
        {lignes.map((ligne) => (
          <div
            key={ligne.libelle}
            className="flex flex-wrap items-baseline justify-between gap-x-(--space-4) gap-y-(--space-1) border-b border-(--border-subtle) pb-(--space-2) last:border-b-0 last:pb-0"
          >
            <dt className="t-body-sm text-(--text-secondary)">
              {ligne.libelle}
              {ligne.precision !== undefined && (
                <span className="block t-caption text-(--text-tertiary)">{ligne.precision}</span>
              )}
            </dt>
            <dd className="chiffre t-body font-medium text-(--text-primary)">{ligne.valeur}</dd>
          </div>
        ))}
      </dl>

      {/*
        LA DATE DE CALCUL, PAS UNE DATE DE PUBLICATION. Le chiffre est recalculé
        à chaque lecture : dater la page laisserait croire qu'il a été figé ce
        jour-là, ce qui est exactement la promesse que ce produit refuse.
      */}
      <div className="mt-(--space-4) flex flex-wrap items-center justify-between gap-(--space-3) border-t border-(--border-subtle) pt-(--space-3)">
        <p className="t-caption text-(--text-tertiary)">
          Calculé sur le catalogue le{" "}
          <span className="chiffre">{formaterDateLongue(chiffres.calculeLe)}</span>
        </p>
        <LienSortie sortie={sortie} chiffres={chiffres} />
      </div>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/* Corps                                                                      */
/* -------------------------------------------------------------------------- */

function Bloc({ bloc, chiffres }: { bloc: BlocGuide; chiffres: ChiffresGuides }) {
  switch (bloc.type) {
    case "paragraphe":
      return (
        <p className="mt-(--space-4) t-body text-(--text-secondary)">
          {lire(bloc.texte, chiffres)}
        </p>
      );

    case "liste":
      return (
        <ul className="mt-(--space-4) flex flex-col gap-(--space-2)">
          {bloc.items.map((item, rang) => {
            const texte = lire(item, chiffres);
            return (
              <li
                key={`${rang}-${texte.slice(0, 24)}`}
                className="flex gap-(--space-3) t-body text-(--text-secondary)"
              >
                <span aria-hidden="true" className="text-(--text-tertiary)">
                  —
                </span>
                <span>{texte}</span>
              </li>
            );
          })}
        </ul>
      );

    case "donnees":
      return (
        <BlocDonnees
          titre={bloc.titre}
          lignes={bloc.lignes(chiffres)}
          sortie={bloc.sortie}
          chiffres={chiffres}
        />
      );

    case "sortie":
      return (
        <p className="mt-(--space-4)">
          <LienSortie sortie={bloc.sortie} chiffres={chiffres} />
        </p>
      );

    case "sources":
      return (
        /*
          AUCUNE AFFIRMATION RÉGLEMENTAIRE SANS SOURCE OFFICIELLE. La
          réglementation change par décret ; un guide qui affirme sans renvoyer
          devient faux sans prévenir, et personne ne peut le vérifier.
        */
        <aside className="mt-(--space-5) border-l-2 border-(--border-subtle) pl-(--space-4)">
          <p className="t-label text-(--text-tertiary)">Sources officielles</p>
          <ul className="mt-(--space-2) flex flex-col gap-(--space-1)">
            {bloc.items.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  rel="noreferrer nofollow"
                  target="_blank"
                  className="t-body-sm text-(--text-secondary) underline underline-offset-2 transition-colors duration-(--motion-fast) hover:text-(--text-primary)"
                >
                  {item.libelle}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      );
  }
}

export function CorpsGuide({
  sections,
  chiffres,
}: {
  sections: readonly SectionGuide[];
  chiffres: ChiffresGuides;
}) {
  return (
    <div className="max-w-(--lecture-largeur-max)">
      {sections.map((section) => (
        <section
          key={section.ancre}
          id={section.ancre}
          /* L'en-tête du site est collant : sans cette marge, l'ancre place le
             titre dessous et la section paraît commencer au paragraphe suivant. */
          className="scroll-mt-(--header-hauteur) pt-(--space-10)"
        >
          <h2 className="t-heading-2 text-(--text-primary)">{section.titre}</h2>
          {section.blocs.map((bloc, rang) => (
            <Bloc key={`${section.ancre}-${rang}`} bloc={bloc} chiffres={chiffres} />
          ))}
        </section>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sommaire                                                                   */
/* -------------------------------------------------------------------------- */

function ListeSommaire({ sections }: { sections: readonly SectionGuide[] }) {
  return (
    <ol className="flex flex-col gap-(--space-2)">
      {sections.map((section, rang) => (
        <li key={section.ancre} className="flex gap-(--space-3)">
          <span className="chiffre t-caption text-(--text-tertiary)">{rang + 1}</span>
          <a
            href={`#${section.ancre}`}
            className="t-body-sm text-(--text-secondary) underline-offset-2 transition-colors duration-(--motion-fast) hover:text-(--text-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
          >
            {section.titre}
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * Sous 1 024 px : un accordéon, replié.
 *
 * Déplié par défaut, un sommaire de six entrées repousse la première ligne du
 * guide d'un écran entier — la personne arrive sur une table des matières, pas
 * sur le texte qu'elle est venue lire.
 */
export function SommaireAccordeon({ sections }: { sections: readonly SectionGuide[] }) {
  const [deplie, setDeplie] = useState(false);

  return (
    <nav
      aria-label="Sommaire du guide"
      className="mt-(--space-6) rounded-(--carte-rayon) border border-(--border-subtle) min-[1024px]:hidden"
    >
      <button
        type="button"
        onClick={() => setDeplie((ouvert) => !ouvert)}
        aria-expanded={deplie}
        className="flex w-full items-center justify-between gap-(--space-3) p-(--space-4) text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
      >
        <span className="t-label text-(--text-tertiary)">Sommaire</span>
        <svg
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          aria-hidden="true"
          className={`text-(--text-tertiary) transition-transform duration-(--motion-base) ${
            deplie ? "rotate-180" : ""
          }`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
        </svg>
      </button>
      {deplie && (
        <div className="px-(--space-4) pb-(--space-4)">
          <ListeSommaire sections={sections} />
        </div>
      )}
    </nav>
  );
}

/**
 * Au-delà de 1 024 px : une colonne latérale qui suit la lecture.
 *
 * Les guides sont longs : on doit pouvoir y revenir sans remonter. Elle est
 * masquée en dessous plutôt que repliée — deux sommaires simultanés dans
 * l'arbre donneraient deux repères de navigation identiques à un lecteur
 * d'écran.
 */
export function SommaireLateral({ sections }: { sections: readonly SectionGuide[] }) {
  return (
    <nav
      aria-label="Sommaire du guide"
      className="sticky top-(--app-header-height) hidden max-h-[calc(100vh-var(--app-header-height))] w-64 shrink-0 self-start overflow-y-auto pt-(--space-10) min-[1024px]:block"
    >
      <p className="t-label text-(--text-tertiary)">Sommaire</p>
      <div className="mt-(--space-4)">
        <ListeSommaire sections={sections} />
      </div>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ                                                                        */
/* -------------------------------------------------------------------------- */

export function FaqGuide({
  questions,
  chiffres,
}: {
  questions: ReadonlyArray<{ question: string; reponse: import("@/contenu/guides/format").Texte }>;
  chiffres: ChiffresGuides;
}) {
  return (
    <section
      id="faq"
      className="mt-(--space-12) max-w-(--lecture-largeur-max) scroll-mt-(--header-hauteur) border-t border-(--border-subtle) pt-(--space-8)"
    >
      <h2 className="t-heading-2 text-(--text-primary)">Questions fréquentes</h2>
      <dl className="mt-(--space-6) flex flex-col gap-(--space-6)">
        {questions.map((entree) => (
          <div key={entree.question}>
            <dt className="t-heading-3 text-(--text-primary)">{entree.question}</dt>
            <dd className="mt-(--space-2) t-body text-(--text-secondary)">
              {lire(entree.reponse, chiffres)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
