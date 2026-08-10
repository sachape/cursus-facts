/**
 * Une rangée de la liste.
 *
 * Elle doit permettre d'écarter un parcours SANS ouvrir la fiche. C'est le
 * critère qui décide de ce qu'elle affiche : tout ce sur quoi on renonce
 * — coût, durée, certification, éligibilité CPF — y figure au niveau décisif,
 * et tout ce qui précise sans trancher reste au second plan.
 *
 * Toute valeur absente affiche « Non communiqué » à son emplacement, jamais un
 * blanc : l'absence est une information, et le compteur en dépend.
 *
 * Liste, pas grille de cartes : à 193 entrées, des rangées séparées par des
 * filets se parcourent beaucoup plus vite.
 */
import { Link } from "@tanstack/react-router";
import type { ParcoursListe } from "@/donnees/requetes";
import { LIBELLES_CATEGORIES, LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { CodeBarres, CompteurInformations } from "./CodeBarres";
import { useComparaison } from "./comparaison";
import { BoutonSauvegarde } from "./BoutonSauvegarde";
import { libellePrixQualifie, type ModaliteAcces } from "@/modele/modalite-acces";
import { reserveAuxEntreprises } from "@/modele/modalite-commerciale";
import { coutDuParcours } from "@/modele/condition-cout";
import {
  certificationCourte,
  ConditionCout,
  Decisif,
  GroupeDecisif,
  ListePastilles,
  NON_COMMUNIQUE,
  Pastille,
  Qualifiant,
} from "./Niveaux";
import { useOuvertureFiche } from "./ouverture-fiche";

/**
 * Prix affiché, qualifié par la modalité d'accès.
 *
 * On n'écrit jamais « Gratuit » seul : sans la modalité, la fiche affirmerait
 * une gratuité qu'elle n'a pas vérifiée sous cette forme.
 */
export function libellePrix(
  min: number | null,
  max: number | null,
  modalite: ModaliteAcces | null = null,
): string {
  return libellePrixQualifie(min, max, modalite);
}

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

export function RangeeParcours({ parcours }: { parcours: ParcoursListe }) {
  const { proprietesLien } = useOuvertureFiche();
  const { ajouter, retirer, contient } = useComparaison();
  const selectionne = contient(parcours.slug);
  const certification = certificationCourte(parcours.certification, parcours.codeRncpRs);
  // Un parcours sans tarif individuel n'a pas de prix comparable pour une
  // personne : afficher son tarif de groupe la ferait renoncer sur un chiffre
  // qui ne la concerne pas.
  // Une seule source produit la valeur, sa condition et sa mention. La rangée
  // restitue, elle ne conclut pas.
  const cout = coutDuParcours(parcours);
  const prixInconnu = cout.valeur === null && cout.montant === null;

  return (
    <li className="relative border-b border-border">
      {/*
        LE SIGNET VIT HORS DU FLUX DE LECTURE, en marge : l'œil parcourt
        l'intitulé, les compétences, les faits, le coût, puis les actions. Un
        marque-page n'appartient pas à cette suite.

        `z-(--z-collant)` le place au-dessus de l'ancre qui couvre la rangée.
        Sans ce plan, le clic dessus ouvrirait la fiche.
      */}
      <div className="absolute right-0 top-(--space-4) z-(--z-collant)">
        <BoutonSauvegarde type="parcours" cibleId={parcours.slug} libelle={parcours.nom} />
      </div>

      <div className="grid grid-cols-1 gap-(--space-5) px-(--space-1) py-(--space-6) min-[840px]:grid-cols-[1fr_auto] min-[840px]:gap-(--space-8)">
        {/* Bloc gauche — ce qu'est le parcours. */}
        <div className="min-w-0">
          <h3 className="pr-(--space-10) font-titre text-base font-medium leading-snug">
            <a
              {...proprietesLien(parcours)}
              /*
                L'ancre couvre TOUTE la rangée. C'est ce qui a permis de retirer
                le bouton « Fiche » : il dupliquait exactement ce comportement,
                et une action qui répète l'action principale ne fait que diluer
                la hiérarchie — trois boutons de même rang se lisent comme des
                éléments posés là.
              */
              className="transition-colors after:absolute after:inset-0 hover:underline hover:underline-offset-4"
            >
              {parcours.nom}
            </a>
          </h3>

          <Qualifiant>
            {parcours.organismeNom}
            <span aria-hidden> · </span>
            {LIBELLES_CATEGORIES[parcours.organismeCategorie]}
          </Qualifiant>

          <div className="mt-2.5">
            <ListePastilles>
              <Pastille>{LIBELLES_DOMAINES[parcours.domaine]}</Pastille>
              <Pastille appuyee>{parcours.sujetPrincipal}</Pastille>
              {parcours.competencesCouvertes.slice(0, 4).map((c) => (
                <Pastille key={c}>{c}</Pastille>
              ))}
              {parcours.competencesCouvertes.length > 4 && (
                <Pastille>+{parcours.competencesCouvertes.length - 4}</Pastille>
              )}
            </ListePastilles>
          </div>

          {/* Ligne de faits : qualifiants, jamais décisifs. */}
          <div className="mt-2.5">
            <Qualifiant>
              {parcours.duree ?? NON_COMMUNIQUE}
              <span aria-hidden> · </span>
              {parcours.volumeHoraire !== null ? `${parcours.volumeHoraire} h` : NON_COMMUNIQUE}
              <span aria-hidden> · </span>
              {parcours.formats.length > 0
                ? parcours.formats.map((f) => LIBELLES_FORMATS[f]).join(", ")
                : NON_COMMUNIQUE}
              <span aria-hidden> · </span>
              {parcours.niveauEntree !== null
                ? LIBELLES_NIVEAUX[parcours.niveauEntree]
                : NON_COMMUNIQUE}
            </Qualifiant>
          </div>

          {parcours.offresRepliees > 0 && (
            /*
             * Sans ce repli, un organisme opaque occuperait autant de lignes
             * qu'il a d'offres. L'ambiguïté n'achète pas de visibilité.
             */
            <p className="mt-2.5 rounded border border-absent/30 px-2 py-1 text-xs text-absent">
              {parcours.offresRepliees + 1} offres regroupées, arbitrage en attente.{" "}
              {parcours.motifRegroupement}
            </p>
          )}
        </div>

        {/* Bloc droit — ce sur quoi on renonce ou on poursuit. */}
        <div className="min-[840px]:w-64 min-[840px]:shrink-0">
          <GroupeDecisif>
            <Decisif etiquette="Coût pour l'apprenant" absent={prixInconnu}>
              {cout.valeur ?? libellePrix(cout.montant, parcours.prixMax, parcours.modaliteAcces)}
            </Decisif>
            <ConditionCout>{cout.condition}</ConditionCout>
          </GroupeDecisif>

          <div className="mt-3 flex flex-wrap gap-x-7 gap-y-3">
            <Decisif
              etiquette="Certification"
              absent={certification === null}
              atteste={certification !== null}
            >
              {certification ?? NON_COMMUNIQUE}
            </Decisif>
            {parcours.eligibleCpf === true && (
              <Decisif etiquette="Financement" atteste>
                Éligible CPF
              </Decisif>
            )}
            {/*
              L'accessibilité n'est pas un attribut de prix, c'est un critère de
              même ordre que l'éligibilité CPF : un parcours réservé aux
              entreprises n'est pas achetable par une personne, quel que soit
              son budget. Le laisser enfoui dans la fiche ferait perdre à
              quelqu'un en reconversion le temps de l'ouvrir pour rien.
            */}
            {reserveAuxEntreprises(parcours) && (
              <Decisif etiquette="Accès" absent>
                Réservé aux entreprises
              </Decisif>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-1">
            <CodeBarres etats={parcours.etats} />
            <CompteurInformations
              renseignees={parcours.infosRenseignees}
              applicables={parcours.infosApplicables}
            />
          </div>

          {/*
            UNE SEULE ACTION ICI, sous le code-barres. La rangée entière ouvre
            la fiche ; « Comparer » est la seule chose qu'on puisse vouloir
            faire sans y entrer. Le signet est en marge, le bouton « Fiche » a
            disparu.

            Propre plan d'empilement : sans lui, l'ancre couvrante l'avalerait.
          */}
          <div className="relative z-(--z-collant) mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                selectionne
                  ? retirer(parcours.slug)
                  : ajouter({ slug: parcours.slug, nom: parcours.nom })
              }
              aria-pressed={selectionne}
              className={`rounded-(--radius-md) border px-(--space-3) py-(--space-1) t-caption transition-colors duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) ${
                selectionne
                  ? "border-(--accent-border) bg-(--accent-surface) text-(--accent-default)"
                  : "border-(--border-default) text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary)"
              }`}
            >
              {selectionne ? "Retirer de la comparaison" : "Comparer"}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
