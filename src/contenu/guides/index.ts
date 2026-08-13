/**
 * Le registre des guides.
 *
 * L'ORDRE EST CELUI DE LA PAGE D'INDEX, et il suit l'ordre des questions dans
 * une décision : combien ça coûte, comment le financer, ce que valent les
 * sigles rencontrés, quoi demander avant de payer. Il n'est pas alphabétique et
 * ne classe rien par importance supposée.
 *
 * SEUIL D'INDEXATION. Sous trois guides publiés, la page d'index passe en
 * `noindex` : une liste de deux entrées n'a pas de valeur propre pour un moteur,
 * et la faire indexer trop tôt installe une page pauvre à une adresse qu'on
 * voudra ensuite faire remonter. Le seuil est déclaré ici plutôt que dans la
 * route, pour qu'il se lise à côté de ce qu'il compte.
 */
import type { Guide } from "./format";
import { guide as combienCoute } from "./combien-coute-formation-ecommerce";
import { guide as financer } from "./financer-formation-ecommerce";
import { guide as sigles } from "./rncp-rs-qualiopi-comprendre";
import { guide as questions } from "./questions-avant-de-payer-formation";

export const GUIDES: readonly Guide[] = [combienCoute, financer, sigles, questions];

/** En deçà, la page d'index n'est pas indexable. */
export const SEUIL_INDEXATION = 3;

export function indexIndexable(): boolean {
  return GUIDES.length >= SEUIL_INDEXATION;
}

export function guideParSlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

/**
 * Les trois autres guides, pour le pied de page d'un guide.
 *
 * Pris dans l'ordre du registre en repartant du suivant, jamais au hasard : un
 * ordre stable rend le maillage interne prévisible, et deux rendus successifs
 * de la même page ne doivent pas proposer des liens différents.
 */
export function autresGuides(slug: string, combien = 3): Guide[] {
  const rang = GUIDES.findIndex((g) => g.slug === slug);
  if (rang < 0) return [...GUIDES].slice(0, combien);
  return [...GUIDES.slice(rang + 1), ...GUIDES.slice(0, rang)].slice(0, combien);
}

/*
  À ÉCRIRE UNE FOIS LE CRAWL PASSÉ — publication de données, pas guide.

  « Une part des organismes de formation e-commerce ne publie pas son prix ».
  C'est une mesure que personne d'autre n'a faite, et le type de contenu qui
  obtient des liens et des reprises plutôt que du trafic direct. Sa place n'est
  donc pas dans ce registre : ce n'est pas un guide qui explique, c'est un
  chiffre qui se cite.

  Condition d'écriture : que la part soit consolidée sur un catalogue crawlé en
  entier. Publier une mesure sur un échantillon partiel, puis la corriger, coûte
  plus cher que de ne rien publier — une donnée reprise ne se rétracte pas.

  Le chiffre lui-même existe déjà et se lit dans `chiffresGuides`
  (`partPrixNonEtabli`) : il n'y aura rien à écrire en dur le jour venu.
*/
