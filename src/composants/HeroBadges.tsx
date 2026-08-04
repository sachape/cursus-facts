/**
 * Couche ambiante du hero — ce que Formlist permet de comparer.
 *
 * Six badges disposés autour du contenu central, qui matérialisent les critères
 * de comparaison sans rien réclamer : ils n'ont ni rôle, ni focus, ni curseur de
 * clic. `aria-hidden` les retire entièrement de l'arbre d'accessibilité — les
 * critères qu'ils illustrent sont déjà nommés dans les filtres, et les répéter
 * à un lecteur d'écran ajouterait six annonces sans valeur.
 *
 * DÉCORATIVE, DONC EFFAÇABLE. Sous 1 280 px la couche disparaît complètement :
 * elle enrichit un espace latéral disponible, elle ne porte aucune information
 * dont l'absence manquerait.
 */
import {
  BadgeCheck,
  Clock3,
  GraduationCap,
  ListChecks,
  MonitorSmartphone,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

type Badge = {
  libelle: string;
  Icone: LucideIcon;
  /** Position dans la zone latérale, en pourcentage du hero. */
  cote: "gauche" | "droite";
  haut: string;
  decalage: string;
  /** Durée du flottement, différente par badge pour désynchroniser. */
  duree: string;
  retard: string;
  /** Vrai pour les quatre badges conservés entre 1 280 et 1 599 px. */
  reduit: boolean;
};

/*
  Positions asymétriques et durées distinctes. Des valeurs régulières
  produiraient une grille et un mouvement synchronisé — l'inverse de l'effet
  recherché, qui doit se remarquer sans se voir.
*/
const BADGES: Badge[] = [
  { libelle: "Prix et financement", Icone: WalletCards, cote: "gauche", haut: "18%", decalage: "6%", duree: "9s", retard: "0s", reduit: true },
  { libelle: "Programmes détaillés", Icone: ListChecks, cote: "gauche", haut: "46%", decalage: "1%", duree: "11s", retard: "1.4s", reduit: true },
  { libelle: "Durée et rythme", Icone: Clock3, cote: "gauche", haut: "74%", decalage: "9%", duree: "8s", retard: "2.6s", reduit: false },
  { libelle: "Certification RNCP", Icone: BadgeCheck, cote: "droite", haut: "24%", decalage: "3%", duree: "12s", retard: "0.7s", reduit: true },
  { libelle: "Formats d'apprentissage", Icone: MonitorSmartphone, cote: "droite", haut: "52%", decalage: "8%", duree: "10s", retard: "2s", reduit: true },
  { libelle: "Niveau d'entrée", Icone: GraduationCap, cote: "droite", haut: "78%", decalage: "2%", duree: "9.5s", retard: "3.2s", reduit: false },
];

export function HeroBadges() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden min-[1280px]:block"
    >
      {BADGES.map((badge) => (
        <span
          key={badge.libelle}
          style={{
            top: badge.haut,
            [badge.cote === "gauche" ? "left" : "right"]: badge.decalage,
            /*
              Deux animations : l'apparition joue une fois, le flottement
              boucle. Les cumuler sur une seule ferait rejouer l'entrée à chaque
              cycle.
            */
            animationDuration: `500ms, ${badge.duree}`,
            animationDelay: `0ms, ${badge.retard}`,
          }}
          className={`absolute inline-flex h-(--hero-badge-hauteur) select-none items-center gap-(--hero-badge-ecart) whitespace-nowrap rounded-(--radius-xl) border border-(--hero-badge-bordure) bg-(--hero-badge-fond) px-(--hero-badge-padding) text-(--hero-badge-texte) [font-size:var(--body-sm-size)] font-semibold shadow-(--hero-badge-ombre) opacity-0 motion-safe:[animation-name:apparition-badge,flottement] motion-safe:[animation-timing-function:ease-out,ease-in-out] motion-safe:[animation-iteration-count:1,infinite] motion-safe:[animation-fill-mode:forwards,none] motion-reduce:opacity-100 ${
            badge.reduit ? "" : "hidden min-[1600px]:inline-flex"
          }`}
        >
          <badge.Icone size={16} strokeWidth={1.75} className="text-(--hero-badge-icone)" />
          {badge.libelle}
        </span>
      ))}
    </div>
  );
}
