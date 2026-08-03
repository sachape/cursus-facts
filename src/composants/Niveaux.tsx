/**
 * Trois niveaux d'information, appliqués partout.
 *
 * Toutes les informations d'un parcours n'ont pas la même valeur de décision.
 * L'éligibilité CPF conditionne la faisabilité d'un projet ; « Présentiel » est
 * un attribut de filtrage. Les afficher au même poids laisse à l'utilisateur un
 * tri que le produit doit faire pour lui.
 *
 * La hiérarchie se construit uniquement par l'échelle typographique, la
 * graisse, le contraste et le groupement spatial. Aucun emoji, aucun
 * pictogramme, aucune couleur d'accentuation nouvelle : la palette reste
 * achromatique, avec les deux seules couleurs sémantiques existantes. Un
 * pictogramme devant un prix ferait basculer le produit dans le registre des
 * comparatifs affiliés, qui est exactement ce dont il tire sa différence.
 */

/** La valeur affichée quand l'organisme ne publie pas l'information. */
export const NON_COMMUNIQUE = "Non communiqué";

/**
 * Niveau 1 — décisif. Coût, durée, certification reconnue, éligibilité CPF.
 * Ce sont les informations sur lesquelles on renonce ou on poursuit.
 */
export function Decisif({
  etiquette,
  children,
  absent = false,
  atteste = false,
}: {
  etiquette: string;
  children: React.ReactNode;
  /** Vrai quand l'information manque : le terracotta le dit sans le crier. */
  absent?: boolean;
  /** Vrai pour ce qui est certifié ou finançable. */
  atteste?: boolean;
}) {
  return (
    <div>
      <p className="chiffre text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground">
        {etiquette}
      </p>
      <p
        className={`chiffre text-[17px] font-medium leading-tight ${
          absent ? "text-absent" : atteste ? "text-atteste" : "text-foreground"
        }`}
      >
        {children}
      </p>
    </div>
  );
}

/** Groupe les blocs décisifs et les sépare nettement du reste. */
export function GroupeDecisif({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-x-7 gap-y-3">{children}</div>;
}

/**
 * Niveau 2 — qualifiant. Sujet principal, domaine, format, niveau d'entrée.
 * Ce qui précise la nature du parcours sans décider à sa place.
 */
export function Qualifiant({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-muted-foreground">{children}</p>;
}

/**
 * Niveau 3 — secondaire. Compétences abordées, catégorie, outils.
 * Contour discret : présent pour qui le cherche, silencieux pour les autres.
 */
export function Pastille({
  children,
  appuyee = false,
}: {
  children: React.ReactNode;
  /** Le sujet principal, seul de son rang parmi les pastilles. */
  appuyee?: boolean;
}) {
  return (
    <li
      className={
        appuyee
          ? "rounded-full border border-foreground bg-foreground px-2.5 py-0.5 text-[11.5px] font-medium text-background"
          : "rounded-full border border-border px-2.5 py-0.5 text-[11.5px] text-muted-foreground"
      }
    >
      {children}
    </li>
  );
}

export function ListePastilles({ children }: { children: React.ReactNode }) {
  return <ul className="flex flex-wrap gap-1.5">{children}</ul>;
}

/**
 * Libellé court d'une certification, pour la rangée de résultats.
 *
 * Formatage d'affichage uniquement : on abrège ce que l'organisme publie, on
 * n'en déduit rien. Une certification non reconnue par l'État renvoie `null` —
 * la rangée n'affiche alors pas de ligne, plutôt qu'une mention vide.
 */
export function certificationCourte(
  certification: string | null,
  codeRncpRs: string | null,
): string | null {
  if (codeRncpRs === null) return null;

  if (codeRncpRs.startsWith("RS")) return "Certification RS";

  // Le niveau européen, quand l'organisme le publie dans son libellé.
  const niveau = certification?.match(/niveau\s*(\d)/i)?.[1];
  if (niveau) return `RNCP niveau ${niveau}`;

  if (certification !== null && /diplôme national/i.test(certification)) return "Diplôme national";
  return "Certification RNCP";
}
