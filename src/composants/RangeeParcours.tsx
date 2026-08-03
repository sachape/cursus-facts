/**
 * Une rangée de la liste.
 *
 * Liste, pas grille de cartes : à 193 entrées, des rangées séparées par des
 * filets se parcourent beaucoup plus vite, et alignent les colonnes de chiffres
 * d'une ligne à l'autre.
 */
import { Link } from "@tanstack/react-router";
import type { ParcoursListe } from "@/donnees/requetes";
import { LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { CodeBarres, CompteurInformations } from "./CodeBarres";
import { useComparaison } from "./comparaison";
import { libellePrixQualifie, type ModaliteAcces } from "@/modele/modalite-acces";

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

export function RangeeParcours({ parcours }: { parcours: ParcoursListe }) {
  const { ajouter, retirer, contient } = useComparaison();
  const prixInconnu = parcours.prixMin === null && parcours.modaliteAcces === null;
  const selectionne = contient(parcours.slug);

  return (
    <li className="border-b border-border">
      <div className="grid grid-cols-1 gap-3 px-1 py-5 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-6">
        <div className="min-w-0">
          <h3 className="font-titre text-base font-medium leading-snug">
            <Link
              to="/parcours/$slug"
              params={{ slug: parcours.slug }}
              className="transition-colors hover:underline hover:underline-offset-4"
            >
              {parcours.nom}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{parcours.organismeNom}</p>

          <p className="mt-2 text-xs text-muted-foreground">
            {LIBELLES_DOMAINES[parcours.domaine]}
            <span aria-hidden> · </span>
            {parcours.sujetPrincipal}
            {parcours.formats.length > 0 && (
              <>
                <span aria-hidden> · </span>
                {parcours.formats.map((f) => LIBELLES_FORMATS[f]).join(", ")}
              </>
            )}
          </p>

          {parcours.offresRepliees > 0 && (
            /*
             * Sans ce repli, un organisme opaque occuperait autant de lignes
             * qu'il a d'offres. L'ambiguïté n'achète pas de visibilité — et le
             * motif est affiché plutôt que subi.
             */
            <p className="mt-2 rounded border border-absent/30 px-2 py-1 text-xs text-absent">
              {parcours.offresRepliees + 1} offres regroupées, arbitrage en attente.{" "}
              {parcours.motifRegroupement}
            </p>
          )}

          <button
            type="button"
            onClick={() =>
              selectionne
                ? retirer(parcours.slug)
                : ajouter({ slug: parcours.slug, nom: parcours.nom })
            }
            aria-pressed={selectionne}
            className={`mt-3 rounded-md border px-2.5 py-1 text-xs transition-colors ${
              selectionne
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            }`}
          >
            {selectionne ? "Retirer de la comparaison" : "Ajouter à la comparaison"}
          </button>
        </div>

        <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end sm:gap-2">
          <p className={`chiffre text-sm ${prixInconnu ? "text-muted-foreground italic" : ""}`}>
            {libellePrix(parcours.prixMin, parcours.prixMax, parcours.modaliteAcces)}
          </p>
          <div className="flex flex-col items-end gap-1">
            <CodeBarres etats={parcours.etats} />
            <CompteurInformations
              renseignees={parcours.infosRenseignees}
              applicables={parcours.infosApplicables}
            />
          </div>
        </div>
      </div>
    </li>
  );
}
