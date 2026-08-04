/**
 * Primitives d'affichage du catalogue.
 *
 * Chacune porte ses états — repos, survol, focus, actif, désactivé — et ne
 * décide de rien : elle restitue ce qu'on lui donne. Toute la logique reste
 * dans `src/modele/`.
 */
import type { EtatsInformation } from "@/types/cursus";
import { compterInformations } from "@/types/cursus";
import { CodeBarres } from "./CodeBarres";

/* -------------------------------------------------------------------------- */
/* SkillTag — une compétence                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Une compétence.
 *
 * `principale` marque le sujet du parcours, pas une compétence mieux couverte
 * qu'une autre : l'accent dit « c'est de cela qu'il s'agit », jamais « c'est
 * meilleur ».
 */
export function SkillTag({
  children,
  principale = false,
}: {
  children: React.ReactNode;
  principale?: boolean;
}) {
  return (
    <span
      className={
        principale
          ? "inline-flex items-center rounded-(--radius-sm) border border-(--accent-border) bg-(--accent-surface) px-(--space-2) py-(--space-1) t-caption font-medium text-(--accent-default)"
          : "inline-flex items-center rounded-(--radius-sm) border border-(--border-subtle) px-(--space-2) py-(--space-1) t-caption text-(--text-secondary)"
      }
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* MetadataItem — une métadonnée                                              */
/* -------------------------------------------------------------------------- */

/**
 * Une métadonnée : étiquette au-dessus, valeur en dessous.
 *
 * Volontairement PAS une pastille. Tout transformer en pastille aplatit la
 * hiérarchie — durée, volume et format sont des faits qualifiants, la pastille
 * est réservée à ce qui se filtre.
 */
export function MetadataItem({
  etiquette,
  children,
  absent = false,
}: {
  etiquette: string;
  children: React.ReactNode;
  absent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="t-caption text-(--text-tertiary)">{etiquette}</dt>
      <dd
        className={`truncate t-body-sm ${absent ? "text-(--status-absent)" : "text-(--text-primary)"}`}
      >
        {children}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PriceSummary — valeur et condition                                         */
/* -------------------------------------------------------------------------- */

/**
 * Le coût, sur ses deux niveaux.
 *
 * Un montant nu ne permet pas de décider : « 0 € » recouvre l'alternance, le
 * compte requis et l'accès partiel. La condition n'est jamais séparée de la
 * valeur.
 */
export function PriceSummary({
  valeur,
  condition,
  absent = false,
}: {
  valeur: string;
  condition: string | null;
  absent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="t-caption text-(--text-tertiary)">Coût pour l&apos;apprenant</p>
      <p className={`t-data-lg ${absent ? "text-(--status-absent)" : "text-(--text-primary)"}`}>
        {valeur}
      </p>
      {condition !== null && (
        <p className="mt-(--space-1) t-caption text-(--text-secondary)">{condition}</p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CertificationBadge                                                         */
/* -------------------------------------------------------------------------- */

export function CertificationBadge({
  libelle,
  code,
}: {
  libelle: string | null;
  code: string | null;
}) {
  if (libelle === null) {
    return (
      <span className="inline-flex items-center gap-(--space-2) t-body-sm text-(--status-absent)">
        Certification non communiquée
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-(--space-2) rounded-(--radius-sm) border border-(--border-subtle) bg-(--status-verified-bg) px-(--space-2) py-(--space-1)">
      <span className="t-caption font-medium text-(--status-verified)">{libelle}</span>
      {/* Le mono est réservé aux identifiants techniques : un code RNCP en est un. */}
      {code !== null && <span className="t-data-sm text-(--status-verified)">{code}</span>}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* CompletenessIndicator                                                      */
/* -------------------------------------------------------------------------- */

/**
 * L'état de la fiche — jamais sa qualité.
 *
 * NE JAMAIS LE CONVERTIR EN POURCENTAGE : un chiffre sur 100 se lit comme une
 * note, et ce produit ne note pas.
 */
export function CompletenessIndicator({ etats }: { etats: EtatsInformation }) {
  const { renseignees, applicables, nonCollectes } = compterInformations(etats);
  return (
    <div className="flex items-center gap-(--space-3)">
      <CodeBarres etats={etats} />
      <span className="t-data-sm text-(--text-tertiary)">
        {renseignees} sur {applicables}
        {nonCollectes > 0 && <span className="ml-(--space-2)">· {nonCollectes} à vérifier</span>}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ResultSkeleton                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Squelette de chargement, aux dimensions d'une carte réelle.
 *
 * Un squelette plus court que le contenu qu'il annonce produit un saut de mise
 * en page à l'arrivée des données — le défaut même qu'il est censé masquer.
 */
export function ResultSkeleton() {
  return (
    <li
      aria-hidden
      className="rounded-(--carte-rayon) border border-(--border-subtle) bg-(--surface-raised) p-(--space-6)"
    >
      <div className="motion-safe:animate-pulse">
        <div className="flex items-center gap-(--space-3)">
          <div className="size-(--monogramme-taille) rounded-(--radius-md) bg-(--surface-sunken)" />
          <div className="h-(--space-4) w-40 rounded-(--radius-sm) bg-(--surface-sunken)" />
        </div>
        <div className="mt-(--space-4) h-(--space-6) w-3/4 rounded-(--radius-sm) bg-(--surface-sunken)" />
        <div className="mt-(--space-4) flex gap-(--space-2)">
          <div className="h-(--space-6) w-24 rounded-(--radius-sm) bg-(--surface-sunken)" />
          <div className="h-(--space-6) w-20 rounded-(--radius-sm) bg-(--surface-sunken)" />
        </div>
        <div className="mt-(--space-6) h-(--space-8) w-32 rounded-(--radius-sm) bg-(--surface-sunken)" />
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* EmptyState                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * État vide.
 *
 * Il dit ce qui manque et propose l'action qui débloque — jamais un simple
 * « aucun résultat », qui laisse la personne sans issue.
 */
export function EmptyState({
  titre,
  explication,
  action,
}: {
  titre: string;
  explication: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-(--carte-rayon) border border-dashed border-(--border-default) bg-(--surface-raised) px-(--space-6) py-(--space-12) text-center">
      <p className="t-heading-4 text-(--text-primary)">{titre}</p>
      <p className="mx-auto mt-(--space-2) max-w-(--sous-titre-largeur-max) t-body-sm text-(--text-secondary)">
        {explication}
      </p>
      {action !== undefined && <div className="mt-(--space-6)">{action}</div>}
    </div>
  );
}
