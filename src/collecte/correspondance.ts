/**
 * Correspondance page ↔ fiche — le garde-fou qui manquait.
 *
 * Le 6 août 2026, trois prix authentiques ont failli être écrits sur les
 * mauvaises fiches : 15 500 € lus sur la page d'un MSc industries créatives et
 * proposés pour un MSc marketing digital. La citation était exacte, le nombre
 * était juste, la page existait — seul le rapprochement était faux.
 *
 * C'EST LE MODE DE DÉFAILLANCE LE PLUS DANGEREUX DU PRODUIT : une donnée juste
 * sur la mauvaise fiche. Rien ne la signale, ni au lecteur, ni à l'organisme,
 * ni à nous.
 *
 * ASYMÉTRIE DES COÛTS. Un rejet coûte une information manquante, que la file
 * reprendra. Une acceptation à tort écrit une information fausse, que personne
 * ne verra. Le seuil est donc élevé — 0,8, contre 0,6 pour l'appariement — et
 * l'incertitude fait rejeter.
 */
import { decodeHTML } from "entities";
import { scoreRapprochement } from "./sitemaps";

/** En dessous, la page lue n'est pas celle du parcours. */
export const SEUIL_CORRESPONDANCE = 0.8;

/**
 * Intitulé porté par une page.
 *
 * Le `<h1>` d'abord : il nomme le contenu. Le `<title>` ensuite, qui porte
 * souvent le nom de l'organisme en suffixe — utile en repli, moins précis.
 */
export function intitulePage(html: string): string | null {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const titre = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const brut = h1 ?? titre;
  if (brut === undefined) return null;
  /*
    Décodage AVANT tout : « WordPress &amp; WooCommerce » ne se rapproche pas
    de « WordPress & WooCommerce », et `&nbsp;` colle deux mots en un. C'est le
    même défaut que celui qui avait fait chuter le taux de citation à 71 % —
    une entité non décodée ne se voit pas, elle se compte.
  */
  const texte = decodeHTML(brut)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return texte === "" ? null : texte;
}

export type Verdict = {
  correspond: boolean;
  score: number;
  intitule: string | null;
};

/**
 * La page lue est-elle bien celle du parcours ?
 *
 * Une page sans intitulé lisible est rejetée : on ne peut pas vérifier, donc on
 * n'écrit pas. C'est la même règle que partout ailleurs — l'absence de preuve
 * n'autorise rien.
 */
/**
 * PLUSIEURS INTITULÉS POUR UNE MÊME FICHE, et c'est ce qui débloque le reste.
 *
 * Le catalogue porte un intitulé NORMALISÉ — c'est lui qui fabrique le slug de
 * la page, donc il ne peut pas suivre chaque reformulation de l'organisme sans
 * casser une adresse indexée. Mais l'organisme, lui, écrit ce qu'il veut :
 * « Prépa Mastère Digitale » chez nous, « Prépa Mastère Digital » chez lui.
 *
 * Le second intitulé est donc enregistré à part, comme un fait sur l'organisme,
 * et sert UNIQUEMENT à reconnaître sa page. On garde le meilleur des scores :
 * une fiche est reconnue si l'un OU l'autre de ses intitulés correspond.
 *
 * Ce n'est pas un assouplissement : chaque alias est une affirmation vérifiée à
 * la main — « cette page est bien ce parcours » — et elle est journalisée comme
 * toute décision manuelle.
 */
export function verifierCorrespondance(
  nomParcours: string | readonly string[],
  html: string,
  seuil = SEUIL_CORRESPONDANCE,
): Verdict {
  const intitule = intitulePage(html);
  if (intitule === null) return { correspond: false, score: 0, intitule: null };

  const noms = (typeof nomParcours === "string" ? [nomParcours] : nomParcours).filter(
    (n) => n.trim() !== "",
  );
  if (noms.length === 0) return { correspond: false, score: 0, intitule };

  /*
    Comparaison dans les deux sens, on garde la meilleure. L'intitulé de page
    porte souvent des suffixes — nom d'école, mention « formation » — que le nom
    fiché n'a pas, et l'inverse arrive aussi. Une comparaison unidirectionnelle
    rejetterait des correspondances légitimes sur un simple écart de longueur.
  */
  const score = Math.max(
    ...noms.flatMap((nom) => [
      scoreRapprochement(nom, intitule),
      scoreRapprochement(intitule, nom),
    ]),
  );
  return { correspond: score >= seuil, score, intitule };
}
