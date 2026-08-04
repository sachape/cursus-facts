/**
 * Rails de critères — ce que Formlist permet de comparer.
 *
 * Quatre badges, deux par rail latéral. Ils vivent dans des colonnes de grille,
 * jamais en position absolue : c'est la structure qui garantit qu'ils ne
 * croisent pas le contenu central, pas un jeu de coordonnées à surveiller à
 * chaque changement de taille de titre.
 *
 * DÉCORATIFS, DONC EFFAÇABLES. Sous 1 440 px les rails disparaissent avec leur
 * contenu : les critères qu'ils illustrent sont déjà nommés dans les filtres et
 * sur chaque carte, et `aria-hidden` les retire de l'arbre d'accessibilité —
 * les répéter ajouterait quatre annonces avant d'atteindre le titre.
 */
import {
  BadgeCheck,
  ListChecks,
  MonitorSmartphone,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

type Critere = { libelle: string; Icone: LucideIcon; duree: string; retard: string };

const GAUCHE: Critere[] = [
  { libelle: "Prix & financement", Icone: WalletCards, duree: "10s", retard: "0s" },
  { libelle: "Programme détaillé", Icone: ListChecks, duree: "12s", retard: "1.6s" },
];

const DROITE: Critere[] = [
  { libelle: "Certification RNCP", Icone: BadgeCheck, duree: "11s", retard: "0.8s" },
  { libelle: "Formats & rythmes", Icone: MonitorSmartphone, duree: "9s", retard: "2.4s" },
];

function CriteriaBadge({ critere }: { critere: Critere }) {
  return (
    <span
      style={{ animationDuration: critere.duree, animationDelay: critere.retard }}
      className="inline-flex h-(--critere-hauteur) select-none items-center gap-(--critere-ecart) whitespace-nowrap rounded-(--critere-rayon) border border-(--critere-bordure) bg-(--surface-raised) px-(--critere-padding) text-(--critere-encre) [font-size:var(--critere-texte)] font-semibold shadow-(--critere-ombre) motion-safe:animate-[derive_ease-in-out_infinite]"
    >
      <critere.Icone size={15} strokeWidth={1.75} />
      {critere.libelle}
    </span>
  );
}

export function RailCriteres({ cote }: { cote: "gauche" | "droite" }) {
  const criteres = cote === "gauche" ? GAUCHE : DROITE;
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none relative z-0 hidden flex-col justify-around pb-(--rail-bas) pt-(--rail-haut) min-[1440px]:flex ${
        cote === "gauche" ? "items-start" : "items-end"
      }`}
    >
      {criteres.map((critere) => (
        <CriteriaBadge key={critere.libelle} critere={critere} />
      ))}
    </div>
  );
}
