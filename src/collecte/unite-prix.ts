/**
 * Unité de prix — obligatoire, jamais supposée.
 *
 * Quatre écritures ont failli dégrader des prix justes : Dawan publie
 * « 875,00 € HT / jour » et le pipeline s'apprêtait à remplacer 1 500 € par
 * 875 €. La citation était authentique, le nombre exact, la page la bonne — il
 * manquait l'unité. Un tarif journalier écrit comme un total ment d'un facteur
 * égal à la durée.
 *
 * RÈGLE. Une extraction de prix sans unité identifiée est REJETÉE. Jamais
 * écrite par défaut en total : « total » est la lecture la plus fréquente, donc
 * celle dont l'erreur passerait le plus inaperçue. Le défaut silencieux est le
 * mode de défaillance, pas la solution.
 */

export const UNITES = ["total", "journalier", "mensuel", "annuel", "horaire"] as const;
export type UnitePrix = (typeof UNITES)[number];

/** Ce que le modèle rend, avant normalisation. Texte libre, comme le reste. */
export function normaliserUnite(brut: string | null | undefined): UnitePrix | null {
  if (typeof brut !== "string") return null;
  const t = brut
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (/jour|\/ *j\b|par j\b|jhomme|journee/.test(t)) return "journalier";
  if (/mois|mensuel|\/ *mois/.test(t)) return "mensuel";
  if (/an\b|annee|annuel|\/ *an\b/.test(t)) return "annuel";
  if (/heure|horaire|\/ *h\b/.test(t)) return "horaire";
  if (/total|globa|session|stagiaire|personne|participant|formation/.test(t)) return "total";
  return null;
}

/**
 * L'unité se lit aussi dans la citation, qui est le texte de l'organisme.
 *
 * Le modèle peut omettre le champ ; l'extrait, lui, porte la mention — c'est
 * même exactement ce qui rendait l'erreur détectable à l'œil. On préfère
 * toujours ce que la page écrit à ce que le modèle déclare.
 */
export function uniteDansExtrait(extrait: string): UnitePrix | null {
  const t = extrait.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/(?:\/|par |l[ae] )\s*jour|€\s*ht\s*\/\s*j\b|par jour/.test(t)) return "journalier";
  if (/(?:\/|par )\s*mois|\bmensuel/.test(t)) return "mensuel";
  if (/(?:\/|par )\s*an\b|\bannuel|par an\b/.test(t)) return "annuel";
  if (/(?:\/|par )\s*(?:heure|h\b)|\bhoraire/.test(t)) return "horaire";
  return null;
}

export type VerdictUnite =
  | { unite: UnitePrix; source: "extrait" | "declaree" }
  | { unite: null; motif: "unite_absente" | "unite_contredite_par_l_extrait" };

/**
 * Tranche l'unité d'un prix extrait.
 *
 * L'extrait ne SECOURT jamais une déclaration, il la complète ou la contredit.
 * Quand la page écrit « / jour » et que le modèle déclare « total », nous
 * savons que le modèle a mal lu — c'est très exactement la défaillance Dawan —
 * et un modèle pris en défaut sur l'unité ne mérite pas qu'on lui fasse
 * confiance sur le nombre. On rejette au lieu de convertir : le prix est perdu
 * pour cette passe, ce qui coûte une information manquante, contre une
 * information fausse dans l'autre sens.
 */
export function trancherUnite(declaree: string | null | undefined, extrait: string): VerdictUnite {
  const lue = uniteDansExtrait(extrait);
  const dite = normaliserUnite(declaree);

  if (lue !== null && dite !== null && lue !== dite) {
    return { unite: null, motif: "unite_contredite_par_l_extrait" };
  }
  if (lue !== null) return { unite: lue, source: "extrait" };
  if (dite !== null) return { unite: dite, source: "declaree" };
  return { unite: null, motif: "unite_absente" };
}

/**
 * Nombre de jours porté par une durée écrite en clair.
 *
 * Volontairement étroit : « 3 jours » et « 3,5 j » seulement. Convertir des
 * semaines ou des mois en jours de formation supposerait un rythme que la page
 * ne publie pas — ce serait une déduction, pas une lecture.
 */
export function joursDeDuree(duree: string | null | undefined): number | null {
  if (typeof duree !== "string") return null;
  const m = duree.match(/(\d+(?:[.,]\d+)?)\s*(?:jours?|j\b)/i);
  if (m?.[1] === undefined) return null;
  const jours = Number(m[1].replace(",", "."));
  return Number.isFinite(jours) && jours > 0 ? jours : null;
}

export type Converti = {
  /** Total sur la session, en euros. */
  total: number;
  /** Le tarif unitaire publié, conservé : il reste ce que la page affiche. */
  unitaire: number;
  unite: UnitePrix;
  /** Le multiplicateur employé, pour que le calcul soit rejouable. */
  jours: number;
};

/**
 * Total d'un tarif journalier, quand la durée en jours est connue.
 *
 * On garde les DEUX — le total pour comparer, l'unitaire parce que c'est ce que
 * l'organisme publie et que masquer sa formulation le trahirait. Sans durée, le
 * prix journalier n'est pas converti : il reste journalier, affiché comme tel.
 */
export function convertirJournalier(
  prix: number,
  unite: UnitePrix,
  duree: string | null | undefined,
): Converti | null {
  if (unite !== "journalier") return null;
  const jours = joursDeDuree(duree);
  if (jours === null) return null;
  return { total: Math.round(prix * jours), unitaire: prix, unite, jours };
}

/**
 * Marqueur de TARIFICATION journalière sur l'ensemble de la page.
 *
 * Volontairement distinct de `uniteDansExtrait` : ici on ne cherche pas
 * l'unité d'un prix, on cherche s'il existe QUELQUE PART sur la page un indice
 * que cet organisme facture au jour.
 *
 * Le motif est borné aux formes tarifaires. Chercher « jour » tout court serait
 * inutilisable : « 3 jours », « mis à jour », « tous les jours » figurent sur
 * presque toutes les pages de formation, et la dérivation ne se déclencherait
 * jamais — ce qui aurait l'apparence de la prudence sans en avoir l'effet.
 */
export function marqueurJournalierSurLaPage(page: string): boolean {
  const t = page.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return (
    /\d\s*(?:€|eur|euros)[^.\n]{0,20}(?:\/|par )\s*(?:jour|j\b)/.test(t) ||
    /(?:tarif|prix|cout|montant)[^.\n]{0,40}(?:journalier|par jour|\/ *jour)/.test(t) ||
    /(?:€|eur)\s*(?:ht|ttc)?\s*\/\s*j\b/.test(t) ||
    /par (?:personne et par|jour et par) (?:jour|apprenant|stagiaire|participant)/.test(t)
  );
}

/**
 * DÉRIVATION — prix sans mention d'unité = total.
 *
 * Règle publiée, à inscrire dans la Méthode au même titre que les autres :
 * « Quand une page affiche un tarif sans mention d'unité, et qu'aucun marqueur
 * de tarification journalière ne figure ailleurs sur la page, nous lisons ce
 * tarif comme un total. C'est la convention du secteur. »
 *
 * L'état de la valeur devient `derive`, jamais `renseigne` : la lecture est la
 * nôtre, pas celle de l'organisme, et le lecteur doit pouvoir en juger.
 *
 * DEUX CONDITIONS, pas une. L'absence de mention ne suffit pas ; il faut aussi
 * que la page ne facture manifestement pas au jour. C'est ce qui distingue
 * cette dérivation d'un défaut silencieux — le défaut supposait, la dérivation
 * constate une absence sur toute la page avant de conclure.
 */
export function derivationTotal(page: string): { derive: boolean; motif: string } {
  return marqueurJournalierSurLaPage(page)
    ? {
        derive: false,
        motif: "marqueur_journalier_ailleurs_sur_la_page",
      }
    : {
        derive: true,
        motif: "Aucune mention d'unité et aucun marqueur de tarification journalière sur la page",
      };
}
