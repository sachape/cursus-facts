/**
 * Marque d'organisme — logo officiel, ou icône de catégorie.
 *
 * Les initiales ont été retirées. « RU » ou « NU » n'apprennent rien : elles
 * répètent en abrégé un nom qui figure déjà en toutes lettres à côté, et deux
 * organismes aux mêmes initiales deviennent indiscernables.
 *
 * L'icône de catégorie, elle, porte une information que le nom ne donne pas :
 * une université et un bootcamp ne s'évaluent pas selon les mêmes critères, et
 * le savoir d'un coup d'œil aide à trier.
 *
 * LA COULEUR NE HIÉRARCHISE PAS. Les sept teintes distinguent des catégories,
 * jamais des niveaux de qualité — elles restent très pâles et de même intensité
 * entre elles. Une catégorie plus saturée qu'une autre se lirait comme un
 * classement, ce que ce produit refuse.
 */
import {
  BadgeCheck,
  Building2,
  BriefcaseBusiness,
  CircleUserRound,
  Landmark,
  MonitorPlay,
  School,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { CategorieOrganisme } from "@/types/cursus";
import { LIBELLES_CATEGORIES } from "@/modele/vocabulaires";

const ICONES: Record<CategorieOrganisme, LucideIcon> = {
  universite: Landmark,
  ecole: School,
  bootcamp: Zap,
  formation_professionnelle: BriefcaseBusiness,
  certification_editeur: BadgeCheck,
  mooc_plateforme: MonitorPlay,
  formation_independante: CircleUserRound,
};

/**
 * Teintes de catégorie, prises dans les paliers 10 et 20 des primitives.
 *
 * Aucune n'est plus appuyée qu'une autre. Elles ne consomment pas les jetons
 * sémantiques — `status-verified` sur les certifications éditeurs ferait lire
 * « vérifié » là où il n'y a qu'un type d'organisme.
 */
const TEINTES: Record<CategorieOrganisme, string> = {
  universite: "bg-(--accent-10) border-(--accent-20) text-(--accent-70)",
  ecole: "bg-(--pine-10) border-(--pine-20) text-(--pine-70)",
  bootcamp: "bg-(--amber-10) border-(--amber-20) text-(--amber-70)",
  formation_professionnelle: "bg-(--neutral-10) border-(--neutral-20) text-(--neutral-70)",
  certification_editeur: "bg-(--clay-10) border-(--clay-20) text-(--clay-70)",
  mooc_plateforme: "bg-(--accent-10) border-(--accent-20) text-(--accent-60)",
  formation_independante: "bg-(--neutral-5) border-(--neutral-20) text-(--neutral-60)",
};

const NEUTRE = "bg-(--surface-sunken) border-(--border-subtle) text-(--text-secondary)";

/** L'icône d'une catégorie, réutilisable hors de la marque. */
export function IconeCategorie({
  categorie,
  taille = 16,
}: {
  categorie: CategorieOrganisme | null;
  taille?: number;
}) {
  const Icone = categorie !== null ? ICONES[categorie] : Building2;
  return <Icone size={taille} strokeWidth={1.75} aria-hidden />;
}

export function OrganizationMark({
  categorie,
  logoUrl = null,
  nom,
}: {
  /** `null` quand la catégorie est inconnue : repli sur Building2. */
  categorie: CategorieOrganisme | null;
  /** Logo officiel, quand l'organisme en fournit un. */
  logoUrl?: string | null;
  nom: string;
}) {
  const teinte = categorie !== null ? TEINTES[categorie] : NEUTRE;

  return (
    <span
      className={`flex size-(--marque-taille) shrink-0 items-center justify-center overflow-hidden rounded-(--marque-rayon) border ${teinte}`}
    >
      {logoUrl !== null ? (
        /*
          `contain` et non `cover` : un logo rogné devient méconnaissable, et
          c'est précisément ce qu'on cherchait à rendre reconnaissable.
        */
        <img
          src={logoUrl}
          alt={`Logo ${nom}`}
          loading="lazy"
          className="size-full object-contain p-(--marque-retrait)"
        />
      ) : (
        <>
          <IconeCategorie categorie={categorie} taille={20} />
          {/*
            L'icône seule ne dit rien à un lecteur d'écran : la catégorie y est
            énoncée, et le nom de l'organisme figure déjà à côté.
          */}
          <span className="sr-only">
            {categorie !== null ? LIBELLES_CATEGORIES[categorie] : "Organisme"}
          </span>
        </>
      )}
    </span>
  );
}
