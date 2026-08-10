/**
 * L'adresse de contact — écrite une fois.
 *
 * Elle vivait en clair dans quatre fichiers, et trois portaient
 * `corrections@formlist.fr`, une boîte qui n'existe pas. Personne ne pouvait
 * s'en apercevoir : un `mailto` ne renvoie aucune erreur, il ouvre le client
 * mail et le message part dans le vide. Le défaut le plus coûteux qu'un lien
 * puisse avoir — il fonctionne à l'écran et perd ce qu'on lui confie.
 *
 * Une seule constante, et les objets construits à partir d'elle : le jour où
 * l'adresse change, elle change partout ou nulle part.
 */
export const ADRESSE_CONTACT = "contact@formlist.fr";

/**
 * Un lien `mailto` avec objet pré-rempli.
 *
 * L'objet n'est pas un ornement : il fait arriver la demande déjà triée, ce qui
 * est tout ce qu'on peut se permettre tant qu'aucune file de traitement
 * n'existe.
 */
export function lienContact(objet: string): string {
  return `mailto:${ADRESSE_CONTACT}?subject=${encodeURIComponent(objet)}`;
}

/**
 * Le lien de signalement d'une correction, avec le corps pré-rempli.
 *
 * `slug` identifie la fiche concernée : sans lui, un signalement arrive sans
 * dire de quoi il parle, et il faut le renvoyer pour le savoir.
 */
export function lienCorrection(nom?: string, slug?: string): string {
  const objet = nom === undefined ? "Correction — Formlist" : `Correction — ${nom}`;
  const base = `mailto:${ADRESSE_CONTACT}?subject=${encodeURIComponent(objet)}`;
  if (slug === undefined) return base;
  return `${base}&body=${encodeURIComponent(`Fiche concernée : ${slug}\n\nInformation à corriger :\n`)}`;
}
