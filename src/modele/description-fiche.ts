/**
 * La méta-description d'une fiche, construite sur ce qui VARIE.
 *
 * LE PROBLÈME. 51 fiches portent le même sujet principal — « E-commerce
 * généraliste » — et 24 sont des licences professionnelles au libellé quasi
 * identique. Une description bâtie sur le nom et le sujet les rend
 * indiscernables, et Google traite alors les pages comme des doublons : c'est
 * le motif « page en double, Google n'a pas sélectionné la même page
 * canonique » qui apparaît en Search Console.
 *
 * CE QUI VARIE RÉELLEMENT. Pas le sujet, pas les compétences, souvent pas le
 * format — mais le prix, la durée, le lieu, la certification, l'organisme et sa
 * catégorie. C'est de là que se tire une description qui distingue.
 *
 * LE LIEU EST LE PLUS DISCRIMINANT sur les diplômes. « Licence pro e-commerce
 * Lille » est une requête réelle, et pour 24 licences dont seule l'université
 * change, la ville est la seule chose qu'un lecteur cherche. Elle passe donc
 * avant le reste.
 *
 * AUCUNE PROMESSE QUE LA PAGE NE TIENT. On n'énonce que des champs publiés :
 * un prix absent ne devient pas « à partir de 0 € », une durée absente ne
 * devient pas « courte ». Une description qui promet ce que la fiche n'affiche
 * pas est la même faute qu'un balisage qui promet une étoile.
 */
import type { ParcoursFiche } from "@/donnees/requetes";
import { LIBELLES_CATEGORIES } from "./vocabulaires";

/** Un prix lisible, ou rien. */
function prix(p: ParcoursFiche): string | null {
  if (p.prixMin === null) return null;
  if (p.prixMin === 0) return "gratuit";
  const bas = p.prixMin.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (p.prixMax !== null && p.prixMax !== p.prixMin) {
    const haut = p.prixMax.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `de ${bas} à ${haut} €`;
  }
  return `${bas} €`;
}

/**
 * Construit la description. Déterministe, sans aucun appel de langage.
 *
 * L'ordre n'est pas décoratif : ce qui distingue le plus vient en premier,
 * parce qu'une méta-description est tronquée vers 160 caractères et que la fin
 * n'est pas lue.
 */
export function descriptionFiche(p: ParcoursFiche): string {
  const faits: string[] = [];

  // Le lieu d'abord : c'est lui qui sépare deux diplômes identiques.
  if (p.lieu !== null && p.lieu.trim() !== "") faits.push(p.lieu);
  const montant = prix(p);
  if (montant !== null) faits.push(montant);
  if (p.duree !== null && p.duree.trim() !== "") faits.push(p.duree);
  if (p.volumeHoraire !== null) faits.push(`${p.volumeHoraire} h`);
  if (p.codeRncpRs !== null) faits.push(`certification ${p.codeRncpRs}`);

  const entete = `${p.nom} — ${p.organismeNom}, ${LIBELLES_CATEGORIES[p.organismeCategorie].toLowerCase()}.`;
  const corps = faits.length > 0 ? ` ${faits.join(" · ")}.` : "";
  // La promesse du produit ferme la phrase, et elle est la même partout : c'est
  // la seule partie qui n'a pas à distinguer.
  return `${entete}${corps} Informations vérifiées, sans note ni classement.`;
}

/**
 * Le titre d'une fiche.
 *
 * Le lieu y entre quand il existe et qu'il n'est pas déjà dans le nom : pour 24
 * licences pro dont seule l'université change, c'est la ville qui fait la
 * différence entre 24 titres qui se ressemblent et 24 titres qui répondent
 * chacun à une requête locale.
 */
export function titreFiche(p: ParcoursFiche): string {
  const lieu =
    p.lieu !== null && p.lieu.trim() !== "" && !p.nom.toLowerCase().includes(p.lieu.toLowerCase())
      ? ` · ${p.lieu}`
      : "";
  return `${p.nom} — ${p.organismeNom}${lieu} | Formlist`;
}
