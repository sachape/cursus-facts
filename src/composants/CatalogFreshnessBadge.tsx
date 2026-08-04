/**
 * Badge de fraîcheur du catalogue.
 *
 * Il remplace « Comparateur indépendant · France », qui n'était qu'une
 * étiquette : ce badge dit un fait daté, vérifiable, et il tombe de lui-même si
 * l'entretien cesse.
 *
 * IL N'EST JAMAIS STATIQUE. Sa formulation dépend de la date réelle de dernière
 * vérification :
 *   - vérifiée depuis moins de six mois → « Catalogue à jour »
 *   - vérifiée il y a plus longtemps    → « Catalogue vérifié »
 *   - aucune date fiable                → « Catalogue vérifié »
 *
 * Le troisième cas est celui que la consigne prévoit. Le deuxième est un ajout :
 * « à jour » sur une vérification vieille de deux ans serait faux, et le seuil
 * de six mois est déjà celui qui décide de la métrique publiée dans Méthode.
 */
import { useId, useState } from "react";
import { FRAICHEUR_MOIS } from "@/donnees/file-collecte";

/** Vrai si la vérification est encore fraîche au sens du produit. */
function estRecente(date: Date, aujourdhui: Date): boolean {
  const limite = new Date(aujourdhui);
  limite.setMonth(limite.getMonth() - FRAICHEUR_MOIS);
  return date >= limite;
}

export function CatalogFreshnessBadge({
  derniereVerification,
}: {
  /** La même source que le catalogue : jamais une valeur écrite en dur. */
  derniereVerification: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const infoId = useId();

  const date = derniereVerification !== null ? new Date(derniereVerification) : null;
  const valide = date !== null && !Number.isNaN(date.getTime());
  const aJour = valide && estRecente(date, new Date());

  const libelle = aJour ? "Catalogue à jour" : "Catalogue vérifié";
  const infobulle = valide
    ? `Dernière vérification : ${date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`
    : "Date de dernière vérification non disponible";

  return (
    <span className="relative inline-flex">
      <span
        tabIndex={0}
        aria-describedby={infoId}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="inline-flex h-(--badge-hauteur) cursor-default items-center gap-(--space-2) rounded-(--radius-full) border border-(--pine-60)/16 bg-(--pine-10) px-(--badge-padding) text-(--pine-70) [font-size:var(--caption-size)] [font-weight:600] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
      >
        {/*
          Le point reste immobile ; seul un halo derrière lui respire. Animer le
          point lui-même le ferait vibrer, et un indicateur qui bouge attire
          l'œil en permanence sur une information qui ne change pas.
        */}
        <span className="relative flex size-(--badge-point) shrink-0">
          <span
            aria-hidden
            className="absolute inset-0 rounded-(--radius-full) bg-(--pine-60) motion-safe:animate-[halo_2400ms_ease-out_infinite]"
          />
          <span className="relative size-full rounded-(--radius-full) bg-(--pine-60)" />
        </span>
        {libelle}
      </span>

      <span
        id={infoId}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-full z-(--z-suggestions) mt-(--space-2) -translate-x-1/2 whitespace-nowrap rounded-(--radius-sm) bg-(--neutral-100) px-(--space-3) py-(--space-1) t-caption text-(--text-on-inverse) shadow-(--elevation-2) transition-opacity duration-(--motion-fast) ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {infobulle}
      </span>
    </span>
  );
}
