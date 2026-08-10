/**
 * Carte de résultat — l'unité de lecture du catalogue.
 *
 * Elle doit permettre d'écarter un parcours SANS ouvrir la fiche. C'est le
 * critère qui décide de ce qu'elle affiche : tout ce sur quoi on renonce
 * — coût, durée, certification, financement — y figure au niveau décisif, et
 * tout ce qui précise sans trancher reste au second plan.
 *
 * HIÉRARCHIE, DU PLUS FORT AU PLUS FAIBLE
 *   1. l'intitulé du parcours
 *   2. l'organisme et sa catégorie
 *   3. le coût et sa condition
 *   4. le sujet principal, puis les compétences secondaires
 *   5. les métadonnées qualifiantes
 *   6. l'état de la fiche
 *
 * Aucune valeur absente n'est masquée : elle s'affiche « Non communiqué » à son
 * emplacement, jamais en blanc. L'absence est une information.
 */
import { useOuvertureFiche } from "./ouverture-fiche";
import type { ParcoursListe } from "@/donnees/requetes";
import { LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { coutDuParcours } from "@/modele/condition-cout";
import { libellePrixQualifie } from "@/modele/modalite-acces";
import { CompareButton } from "./CompareButton";
import { BoutonSauvegarde } from "./BoutonSauvegarde";
import { OrganizationIdentity } from "./OrganizationIdentity";
import {
  CertificationBadge,
  CompletenessIndicator,
  MetadataItem,
  PriceSummary,
  SkillTag,
} from "./Primitives";
import { certificationCourte, NON_COMMUNIQUE } from "./Niveaux";

const LIBELLES_FORMATS = {
  distanciel: "Distanciel",
  presentiel: "Présentiel",
  alternance: "Alternance",
} as const;

const LIBELLES_NIVEAUX = {
  aucun_prerequis: "Aucun prérequis",
  bac2: "Bac+2",
  bac3: "Bac+3",
  experience: "Expérience",
} as const;

/** Trois compétences secondaires au plus : au-delà, la ligne cesse d'être lue. */
const MAX_SECONDAIRES = 3;

/**
 * Interception du clic qui ouvre la fiche en panneau sans casser le lien.
 *
 * Le lien reste un vrai `<a href>` : sans JavaScript, ou pour un robot, il mène
 * à la page complète. Clic milieu, Cmd/Ctrl et « ouvrir dans un nouvel onglet »
 * suivent la navigation normale — c'est un comportement attendu.
 */
export function TrainingResultCard({ parcours }: { parcours: ParcoursListe }) {
  const { proprietesLien } = useOuvertureFiche();
  const certification = certificationCourte(parcours.certification, parcours.codeRncpRs);
  const cout = coutDuParcours(parcours);
  const prixInconnu = cout.valeur === null && cout.montant === null;

  const secondaires = parcours.competencesCouvertes
    .filter((c) => c !== parcours.sujetPrincipal)
    .slice(0, MAX_SECONDAIRES);
  const restantes =
    parcours.competencesCouvertes.filter((c) => c !== parcours.sujetPrincipal).length -
    secondaires.length;

  return (
    <li
      /*
        Survol : renforcement de la bordure, ombre légère, translation de −1 px.
        Rien de spectaculaire — la carte doit répondre, pas se signaler.
      */
      className="group relative rounded-(--carte-rayon) border border-(--border-subtle) bg-(--surface-raised) transition-[border-color,box-shadow,transform] duration-(--motion-fast) ease-(--ease-standard) hover:border-(--border-default) hover:shadow-(--elevation-2) focus-within:border-(--border-strong) motion-safe:hover:-translate-y-px"
    >
      <div className="grid gap-(--space-6) p-(--space-6) min-[840px]:grid-cols-[1fr_auto]">
        {/* ---------------------------------------------------------------- */}
        {/* Ce que le parcours est                                           */}
        {/* ---------------------------------------------------------------- */}
        <div className="min-w-0">
          <OrganizationIdentity nom={parcours.organismeNom} categorie={parcours.organismeCategorie} />

          <h3 className="mt-(--space-4) t-heading-4 text-(--text-primary)">
            <a
              {...proprietesLien(parcours)}
              /*
                L'ancre couvre toute la carte : la cible cliquable est la
                surface entière, pas le seul intitulé. Les boutons d'action
                passent au-dessus par leur propre plan.
              */
              className="after:absolute after:inset-0 after:rounded-(--carte-rayon) focus-visible:outline-none"
            >
              {parcours.nom}
            </a>
          </h3>

          <div className="mt-(--space-3) flex flex-wrap items-center gap-(--space-2)">
            <SkillTag principale>{parcours.sujetPrincipal}</SkillTag>
            {secondaires.map((c) => (
              <SkillTag key={c}>{c}</SkillTag>
            ))}
            {restantes > 0 && <SkillTag>+{restantes}</SkillTag>}
          </div>

          {/*
            Métadonnées en paires étiquette/valeur, pas en pastilles : tout
            transformer en pastille aplatit la hiérarchie, et la pastille est
            réservée à ce qui se filtre.
          */}
          <dl className="mt-(--space-5) grid grid-cols-2 gap-(--space-4) min-[560px]:grid-cols-4">
            <MetadataItem etiquette="Durée" absent={parcours.duree === null}>
              {parcours.duree ?? NON_COMMUNIQUE}
            </MetadataItem>
            <MetadataItem etiquette="Volume" absent={parcours.volumeHoraire === null}>
              {parcours.volumeHoraire !== null ? `${parcours.volumeHoraire} h` : NON_COMMUNIQUE}
            </MetadataItem>
            <MetadataItem etiquette="Format" absent={parcours.formats.length === 0}>
              {parcours.formats.length > 0
                ? parcours.formats.map((f) => LIBELLES_FORMATS[f]).join(", ")
                : NON_COMMUNIQUE}
            </MetadataItem>
            <MetadataItem etiquette="Niveau d'entrée" absent={parcours.niveauEntree === null}>
              {parcours.niveauEntree !== null
                ? LIBELLES_NIVEAUX[parcours.niveauEntree]
                : NON_COMMUNIQUE}
            </MetadataItem>
          </dl>

          {parcours.offresRepliees > 0 && (
            /*
              Sans ce repli, un organisme opaque occuperait autant de lignes
              qu'il a d'offres. L'ambiguïté n'achète pas de visibilité.
            */
            <p className="mt-(--space-4) rounded-(--radius-sm) border border-(--status-absent)/30 bg-(--status-absent-bg) px-(--space-3) py-(--space-2) t-caption text-(--status-absent)">
              {parcours.offresRepliees + 1} offres regroupées, arbitrage en attente.{" "}
              {parcours.motifRegroupement}
            </p>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Ce sur quoi on renonce ou on poursuit                            */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col gap-(--space-4) min-[840px]:w-56 min-[840px]:shrink-0 min-[840px]:border-l min-[840px]:border-(--border-subtle) min-[840px]:pl-(--space-6)">
          <PriceSummary
            valeur={cout.valeur ?? libellePrixQualifie(cout.montant, parcours.prixMax, parcours.modaliteAcces)}
            condition={cout.condition}
            absent={prixInconnu}
          />

          <div className="flex flex-wrap items-center gap-(--space-2)">
            <CertificationBadge libelle={certification} code={parcours.codeRncpRs} />
            {parcours.eligibleCpf === true && (
              <span className="t-caption font-medium text-(--status-verified)">Éligible CPF</span>
            )}
          </div>

          <CompletenessIndicator etats={parcours.etats} />

          {/*
            Actions au-dessus de l'ancre de carte. « Comparer » reste visible
            quand la fiche est sélectionnée : la faire disparaître au survol
            priverait de l'action de retrait.
          */}
          {/*
            Actions au-dessus de l'ancre de carte, par leur propre plan : sans
            lui, l'ancre qui couvre la surface les avalerait.
          */}
          <div className="relative z-(--z-collant) mt-auto flex items-center gap-(--space-2)">
            <CompareButton slug={parcours.slug} nom={parcours.nom} discretHorsSurvol />
            <BoutonSauvegarde type="parcours" cibleId={parcours.slug} libelle={parcours.nom} />
          </div>
        </div>
      </div>
    </li>
  );
}
