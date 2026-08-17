/**
 * Les pièces communes de la page d'accueil.
 *
 * UNE SEULE GRAMMAIRE POUR TOUTE LA PAGE : une section, un titre, un lien
 * d'action, un révélateur au défilement. Chaque section a sa propre
 * composition, mais toutes partagent ces quatre briques — c'est ce qui évite
 * qu'une refonte produise dix rythmes différents.
 *
 * AUCUNE VALEUR LITTÉRALE. Couleurs, espaces, rayons et durées viennent des
 * jetons : `scripts/invariants-design.ts` le vérifie mécaniquement.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Révélation au défilement                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Un bloc qui apparaît quand il entre dans la vue.
 *
 * LE TEXTE N'EST JAMAIS SUSPENDU À L'ANIMATION. Le rendu serveur sort le
 * contenu visible : l'opacité nulle n'est appliquée qu'APRÈS montage côté
 * client. Sans JavaScript, ou avec un observateur indisponible, la page reste
 * entièrement lisible — et aucun décalage de mise en page ne se produit,
 * puisque seul l'opacité et deux pixels de translation bougent.
 */
export function Reveal({
  children,
  delai = 0,
  className = "",
}: {
  children: React.ReactNode;
  /** Décalage du départ, pour un léger effet d'échelonnement. */
  delai?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [monte, setMonte] = useState(false);
  const [vu, setVu] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setVu(true);
      return;
    }
    setMonte(true);
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          setVu(true);
          observateur.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);

  const cache = monte && !vu;

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delai}ms` }}
      className={`transition-[opacity,transform] duration-(--motion-panel) ease-(--ease-panel) ${
        cache ? "opacity-0 motion-safe:translate-y-2 motion-reduce:opacity-100" : "translate-y-0 opacity-100"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section, titres, liens                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Une section de la page.
 *
 * `fond` : `page` par défaut, `creuse` pour la bande gris clair, `accent` pour
 * le bandeau de marque. Les deux dernières débordent le conteneur par des
 * marges négatives qui compensent exactement son retrait, jamais davantage —
 * au-delà, elles créeraient un défilement horizontal.
 */
export function Section({
  fond = "page",
  id,
  children,
}: {
  fond?: "page" | "creuse" | "accent";
  id?: string;
  children: React.ReactNode;
}) {
  /*
    « creuse » ne teinte plus rien : les bandes grises hachaient la page en
    blocs alors que le rythme est déjà porté par les surtitres indexés.
  */
  if (fond === "page" || fond === "creuse")
    return (
      <section id={id} className="py-(--space-16)">
        {children}
      </section>
    );
  const couleur = "bg-(--accent-default)";

  return (
    <section id={id} className={`-mx-(--space-6) ${couleur} px-(--space-6) py-(--space-16)`}>
      <div className="mx-auto max-w-(--contenu-largeur-max)">{children}</div>
    </section>
  );
}

/** Le titre d'une section. */
export function Titre({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-balance t-display-2 text-(--text-primary) max-[767px]:t-heading-1">
      {children}
    </h2>
  );
}

/**
 * Un surtitre indexé — « 02 · Le produit ».
 *
 * Il numérote le parcours de lecture au lieu d'étiqueter un thème : ce n'est
 * pas une catégorie, c'est une position. Employé avec parcimonie, il donne à la
 * page une colonne vertébrale sans ajouter de badge.
 */
export function Index({ numero, libelle }: { numero: string; libelle: string }) {
  return (
    <p className="flex items-center gap-(--space-3) t-label text-(--text-tertiary)">
      <span className="chiffre">{numero}</span>
      <span aria-hidden className="h-px w-(--space-8) bg-(--border-default)" />
      {libelle}
    </p>
  );
}

/** En-tête à deux colonnes : titre à gauche, phrase d'appui à droite. */
export function Entete({
  index,
  titre,
  appui,
}: {
  index?: { numero: string; libelle: string };
  titre: React.ReactNode;
  appui?: string;
}) {
  return (
    <div className="flex flex-col gap-(--space-4)">
      {index !== undefined && <Index numero={index.numero} libelle={index.libelle} />}
      {appui === undefined ? (
        <Titre>{titre}</Titre>
      ) : (
        <div className="grid items-start gap-(--space-5) min-[900px]:grid-cols-[1.35fr_1fr] min-[900px]:gap-(--space-12)">
          <Titre>{titre}</Titre>
          <p className="t-body-lg text-(--text-secondary) min-[900px]:pt-(--space-2)">{appui}</p>
        </div>
      )}
    </div>
  );
}

const LIEN_BASE =
  "group/lien inline-flex items-center gap-(--space-2) rounded-(--radius-sm) t-body-sm font-medium underline-offset-4 transition-colors duration-(--motion-fast) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)";

/** La flèche qui avance d'un cheveu au survol — le seul mouvement des liens. */
function Fleche() {
  return (
    <ArrowRight
      size={16}
      strokeWidth={1.75}
      aria-hidden
      className="transition-transform duration-(--motion-fast) motion-safe:group-hover/lien:translate-x-px"
    />
  );
}

/** Un lien d'action interne, avec sa flèche. */
export function LienAction({
  to,
  search,
  params,
  ton = "primaire",
  children,
}: {
  to: string;
  search?: Record<string, string>;
  params?: Record<string, string>;
  ton?: "primaire" | "inverse";
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      {...(search === undefined ? {} : { search })}
      {...(params === undefined ? {} : { params })}
      className={`${LIEN_BASE} ${
        ton === "inverse"
          ? "text-(--text-on-inverse)"
          : "text-(--text-primary) hover:text-(--accent-default)"
      }`}
    >
      {children}
      <Fleche />
    </Link>
  );
}


/** Le même lien, en bouton plein — réservé aux fins de section. */
export function BoutonLien({
  to,
  search,
  variante = "plein",
  className = "",
  children,
}: {
  to: string;
  search?: Record<string, string>;
  variante?: "plein" | "contour" | "clair";
  className?: string;
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    plein:
      "bg-(--interactive-default) text-(--text-on-inverse) hover:bg-(--interactive-hover)",
    contour:
      "border border-(--border-default) bg-(--surface-raised) text-(--text-primary) hover:border-(--border-strong) hover:bg-(--surface-hover)",
    clair: "bg-(--surface-page) text-(--text-primary) hover:opacity-90",
  };
  return (
    <Link
      to={to}
      {...(search === undefined ? {} : { search })}
      className={`inline-flex h-(--bouton-hauteur-tactile) items-center justify-center gap-(--space-2) rounded-(--radius-md) px-(--space-6) t-body-sm font-medium transition-colors duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) ${styles[variante]} ${className}`}
    >
      {children}
    </Link>
  );
}
