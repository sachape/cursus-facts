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

/** Un prix nul est une information ; un prix inconnu n'en est pas une. */
export function libellePrix(min: number | null, max: number | null): string {
  if (min === null) return "Non communiqué";
  if (min === 0 && (max === null || max === 0)) return "Gratuit";
  const format = (n: number) => `${n.toLocaleString("fr-FR")} €`;
  if (max !== null && max !== min) return `${format(min)} – ${format(max)}`;
  return format(min);
}

export function RangeeParcours({ parcours }: { parcours: ParcoursListe }) {
  const prixInconnu = parcours.prixMin === null;

  return (
    <li className="border-b border-border">
      <Link
        to="/parcours/$slug"
        params={{ slug: parcours.slug }}
        className="grid grid-cols-1 gap-3 px-1 py-5 transition-colors hover:bg-muted/40 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-6"
      >
        <div className="min-w-0">
          <h3 className="font-titre text-base font-medium leading-snug">{parcours.nom}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{parcours.organismeNom}</p>

          <p className="mt-2 text-xs text-muted-foreground">
            {LIBELLES_DOMAINES[parcours.domaine]}
            <span aria-hidden> · </span>
            {parcours.sujetPrincipal}
            {parcours.formats.length > 0 && (
              <>
                <span aria-hidden> · </span>
                {parcours.formats
                  .map((f) => ({ distanciel: "Distanciel", presentiel: "Présentiel", alternance: "Alternance" })[f])
                  .join(", ")}
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
        </div>

        <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end sm:gap-2">
          <p
            className={`chiffre text-sm ${prixInconnu ? "text-muted-foreground italic" : ""}`}
          >
            {libellePrix(parcours.prixMin, parcours.prixMax)}
          </p>
          <div className="flex flex-col items-end gap-1">
            <CodeBarres etats={parcours.etats} />
            <CompteurInformations
              renseignees={parcours.infosRenseignees}
              applicables={parcours.infosApplicables}
            />
          </div>
        </div>
      </Link>
    </li>
  );
}
