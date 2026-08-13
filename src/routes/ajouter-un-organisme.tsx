/**
 * Ajouter un organisme — la porte d'entrée des organismes eux-mêmes.
 *
 * INDEXABLE, ET C'EST SA RAISON D'ÊTRE. « référencer ma formation », « ajouter
 * mon organisme de formation » sont des requêtes réelles, et la page y répond
 * mieux qu'un formulaire de contact générique. Elle porte aussi les invariants
 * là où ils se posent vraiment : c'est en demandant à être référencé qu'on se
 * demande ce qu'on obtient en échange.
 *
 * PAS DE FORMULAIRE, UN EMAIL. Une file de traitement sans volume est du code
 * à maintenir pour rien, et une boîte mail suffit à recevoir quatre lignes et
 * une adresse. Le jour où le volume existe, la file se construira sur des
 * demandes réelles plutôt que sur une hypothèse.
 *
 * LES DEUX LISTES VIENNENT DU MODÈLE, jamais recopiées : la Méthode et cette
 * page énoncent la même règle, et deux versions qui divergent ne sont plus une
 * règle.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ADRESSE_CONTACT, lienContact } from "@/modele/contact";
import {
  CRITERES_ELIGIBILITE,
  JAMAIS_REFERENCE,
  REGLE_ELIGIBILITE_COURTE,
} from "@/modele/eligibilite";

const SITE = "https://formlist.fr";

/** L'objet est pré-rempli : une demande arrive triée, pas à qualifier. */
const CONTACT = lienContact("Ajout d'un organisme au catalogue");

export const Route = createFileRoute("/ajouter-un-organisme")({
  component: AjouterUnOrganisme,
  head: () => ({
    meta: [
      { title: "Ajouter un organisme au catalogue | Formlist" },
      {
        name: "description",
        content:
          "Référencer votre organisme de formation e-commerce : critères d'éligibilité, informations à nous transmettre, et ce que le référencement n'achète pas. Gratuit, sans contrepartie.",
      },
    ],
    links: [{ rel: "canonical", href: `${SITE}/ajouter-un-organisme` }],
  }),
});

/** Un intertitre, au même rang partout sur la page. */
function Titre({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-(--space-10) font-titre text-xl font-medium text-(--text-primary)">
      {children}
    </h2>
  );
}

function AjouterUnOrganisme() {
  return (
    <main className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) py-(--space-12)">
      <h1 className="t-heading-1 text-(--text-primary)">Ajouter un organisme au catalogue</h1>

      {/*
        L'introduction dit D'OÙ VIENT le catalogue avant de dire quoi envoyer.
        Un organisme qui découvre qu'il n'y figure pas suppose souvent qu'il en
        a été écarté ; la première phrase doit lever ça.
      */}
      <p className="mt-(--space-4) max-w-prose t-body-lg text-(--text-secondary)">
        Le catalogue est constitué par notre collecte, à partir de sources publiques et des sites
        officiels des organismes. Si le vôtre n&apos;y figure pas, vous pouvez nous le signaler.
      </p>

      <Titre>Ce que nous référençons</Titre>
      <p className="mt-(--space-2) max-w-prose t-body-sm text-(--text-secondary)">
        {/*
          Phrase reprise telle quelle de `eligibilite.ts` : cette page la
          composait avec ses propres mots, ce qui laissait deux énoncés de la
          même règle libres de diverger.
        */}
        {REGLE_ELIGIBILITE_COURTE} Les critères vérifiés sont affichés sur la fiche.
      </p>
      <ul className="mt-(--space-3) list-disc space-y-(--space-1) pl-(--space-5) t-body-sm text-(--text-secondary)">
        {CRITERES_ELIGIBILITE.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>

      <h3 className="mt-(--space-6) font-titre font-medium text-(--text-primary)">
        Ce que nous ne référençons pas
      </h3>
      {/*
        Des faits, jamais un refus. « Chaîne gratuite sans offre payante »
        décrit ce qu'est l'acteur ; « nous refusons les chaînes gratuites »
        dirait ce que nous pensons de lui. La première se vérifie, la seconde
        s'argumente — et rien ici ne s'argumente.
      */}
      <ul className="mt-(--space-2) list-disc space-y-(--space-1) pl-(--space-5) t-body-sm text-(--text-secondary)">
        {JAMAIS_REFERENCE.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <p className="mt-(--space-3) max-w-prose t-body-sm text-(--text-secondary)">
        <Link to="/methode" hash="eligibilite" className="underline underline-offset-2">
          Le détail de ces critères est publié dans la Méthode
        </Link>
        , avec les acteurs écartés et leur motif.
      </p>

      <Titre>Ce qu&apos;il faut nous envoyer</Titre>
      <p className="mt-(--space-2) max-w-prose t-body-sm text-(--text-secondary)">
        Nous vérifions tout sur votre site officiel : l&apos;essentiel est donc de nous indiquer
        où regarder.
      </p>
      <ul className="mt-(--space-3) list-disc space-y-(--space-1) pl-(--space-5) t-body-sm text-(--text-secondary)">
        <li>Le nom de l&apos;organisme et l&apos;adresse de son site</li>
        <li>L&apos;adresse de la page de chaque formation à référencer</li>
        <li>Le numéro de déclaration d&apos;activité et la certification Qualiopi, s&apos;ils existent</li>
        <li>Le code RNCP ou RS, le cas échéant</li>
      </ul>
      {/*
        LA MENTION QUI ÉVITE L'ENVOI D'UNE PLAQUETTE. Sans elle, la première
        réponse d'un organisme est un PDF commercial — dont rien ne peut être
        repris, puisqu'aucune valeur du catalogue n'existe sans sa source
        publique.
      */}
      <p className="mt-(--space-4) max-w-prose rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-raised) p-(--space-4) t-body-sm text-(--text-secondary)">
        Nous ne reprenons aucune information d&apos;un document commercial : chaque valeur est
        relevée sur votre site et porte sa source. Une page publique complète nous suffit.
      </p>

      <Titre>Ce que nous ne faisons pas</Titre>
      {/*
        LES INVARIANTS, ÉNONCÉS ICI PARCE QUE C'EST ICI QU'ON SE POSE LA
        QUESTION. Un organisme qui demande à être référencé cherche à savoir ce
        qu'il obtient. La réponse honnête — rien de négociable — vaut mieux
        énoncée que découverte.
      */}
      <ul className="mt-(--space-3) max-w-prose list-disc space-y-(--space-1) pl-(--space-5) t-body-sm text-(--text-secondary)">
        <li>Aucune note, aucun classement par qualité.</li>
        <li>Aucune position dans les résultats n&apos;est achetable.</li>
        <li>
          Le référencement est gratuit, et un organisme référencé n&apos;a aucune contrepartie à
          fournir.
        </li>
      </ul>

      <Titre>Nous écrire</Titre>
      <p className="mt-(--space-2) max-w-prose t-body-sm text-(--text-secondary)">
        Écrivez-nous à{" "}
        <a href={CONTACT} className="underline underline-offset-2 hover:text-(--text-primary)">
          {ADRESSE_CONTACT}
        </a>
        , avec les éléments ci-dessus.
      </p>

      <Titre>Délai</Titre>
      {/*
        UNE PHRASE HONNÊTE PLUTÔT QU'UN ENGAGEMENT. « Sous 48 h » serait tenu
        tant que le volume est nul, et faux ensuite. Et le second cas — expliquer
        pourquoi le référencement n'a pas lieu — compte autant que le premier :
        un refus expliqué vaut mieux qu'un silence.
      */}
      <p className="mt-(--space-2) max-w-prose t-body-sm text-(--text-secondary)">
        Nous traitons les demandes au fil de la collecte. Nous vous répondons pour confirmer le
        référencement ou expliquer pourquoi il n&apos;a pas lieu.
      </p>
    </main>
  );
}
