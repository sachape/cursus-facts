/**
 * Provenance d'un organisme — repliée, comme sur la fiche.
 *
 * Même arbitrage que pour la fiche : dépliée en permanence, l'information pèse
 * autant que la liste des parcours alors qu'elle est de second plan ; masquée,
 * elle n'existe plus et notre promesse cesse d'être vérifiable. Repliée, elle
 * reste à un clic.
 */
import { useState } from "react";
import { lienCorrection } from "@/modele/contact";
import { formaterDateLongue } from "@/modele/dates";

export function ProvenanceOrganisme({
  sources,
  derniereVerification,
  nom,
  slug,
}: {
  sources: string[];
  derniereVerification: string | null;
  nom: string;
  slug: string;
}) {
  const [deplie, setDeplie] = useState(false);

  const date = formaterDateLongue(derniereVerification);

  const lien = lienCorrection(nom, slug);

  return (
    <section className="mt-(--space-12) border-t border-(--border-subtle) pt-(--space-5)">
      <div className="flex flex-wrap items-center gap-x-(--space-2) gap-y-(--space-1) t-caption text-(--text-tertiary)">
        <span>
          <span className="chiffre">{sources.length}</span>{" "}
          {sources.length > 1 ? "sources utilisées" : "source utilisée"}
        </span>
        <span aria-hidden="true">·</span>
        <span>Vérifié le {date}</span>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={() => setDeplie((ouvert) => !ouvert)}
          aria-expanded={deplie}
          className="inline-flex items-center gap-(--space-1) rounded-(--radius-sm) text-(--text-secondary) underline-offset-2 transition-colors duration-(--motion-fast) hover:text-(--text-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
        >
          {deplie ? "Masquer le détail" : "Voir le détail"}
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            aria-hidden="true"
            className={`transition-transform duration-(--motion-base) ${deplie ? "rotate-180" : ""}`}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
          </svg>
        </button>
      </div>

      {/* Même dépliage que la fiche : par lignes de grille, jamais par une
          hauteur maximale devinée. */}
      <div
        className={`grid transition-[grid-template-rows] duration-(--motion-base) ${
          deplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pt-(--space-4) t-body-sm">
            {sources.length === 0 ? (
              <p className="text-(--text-secondary)">
                Aucune source n&apos;est enregistrée pour les fiches de cet organisme.
              </p>
            ) : (
              <ul className="space-y-(--space-1) text-(--text-secondary)">
                {sources.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
            <p className="mt-(--space-4) t-caption text-(--text-tertiary)">
              <a
                href={lien}
                className="rounded-(--radius-sm) underline-offset-2 transition-colors duration-(--motion-fast) hover:text-(--text-secondary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
              >
                Signaler une correction
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
