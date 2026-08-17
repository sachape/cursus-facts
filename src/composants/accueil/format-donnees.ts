/**
 * Mise en forme des faits affichés sur l'accueil.
 *
 * UNE VALEUR ABSENTE S'ÉCRIT « Non communiqué », JAMAIS RIEN. Une cellule vide
 * se lit comme un oubli d'affichage ; « Non communiqué » dit que l'organisme
 * ne publie pas — c'est une information sur lui, et c'est le cœur du produit.
 *
 * Aucune de ces fonctions ne déduit : elles formatent ce que la fiche porte, ou
 * déclarent l'absence.
 */
import type { ParcoursListe } from "@/donnees/requetes";
import { formaterNombre } from "@/modele/nombres";
import { prixAffichable } from "@/modele/modalite-commerciale";
import type { FormatParcours } from "@/types/cursus";

export const NON_COMMUNIQUE = "Non communiqué";

export const LIBELLES_FORMATS: Record<FormatParcours, string> = {
  distanciel: "Distanciel",
  presentiel: "Présentiel",
  alternance: "Alternance",
};

/** Le tarif individuel, ou l'absence déclarée. Jamais un tarif de groupe. */
export function prixLisible(p: ParcoursListe): string {
  const prix = prixAffichable(p.prixMin, p, p.unitePrix);
  if (prix === null) return NON_COMMUNIQUE;
  if (prix === 0) return "Sans frais";
  return `${formaterNombre(prix)} €`;
}

export function dureeLisible(p: ParcoursListe): string {
  if (p.duree !== null && p.duree.trim() !== "") return p.duree;
  if (p.volumeHoraire !== null) return `${formaterNombre(p.volumeHoraire)} h`;
  return NON_COMMUNIQUE;
}

export function formatsLisibles(p: ParcoursListe): string {
  if (p.formats.length === 0) return NON_COMMUNIQUE;
  return p.formats.map((f) => LIBELLES_FORMATS[f]).join(" · ");
}

/**
 * Le CPF, avec ses trois états.
 *
 * `null` n'est pas « non éligible » : c'est « non vérifié ». Les confondre
 * ferait porter à l'organisme une absence qui est peut-être la nôtre.
 */
export function cpfLisible(p: ParcoursListe): string {
  if (p.eligibleCpf === true) return "Déclaré éligible";
  if (p.eligibleCpf === false) return "Non déclaré";
  return NON_COMMUNIQUE;
}

export function certificationLisible(p: ParcoursListe): string {
  if (p.codeRncpRs !== null) return p.codeRncpRs;
  if (p.certification !== null && p.certification.trim() !== "") return p.certification;
  return NON_COMMUNIQUE;
}
