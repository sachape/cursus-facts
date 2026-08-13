/**
 * Sitemap — les ~400 adresses du catalogue.
 *
 * AUCUNE EXCLUSION PAR SEUIL DE COLLECTE. Une fiche portant peu d'informations
 * n'est pas une page pauvre : c'est souvent une fiche COMPLÈTE dont peu de
 * champs s'appliquent — les quatre plus « pauvres » du catalogue sont à 6/6 et
 * 7/7, donc renseignées à 100 %. Un seuil en valeur absolue mesurerait
 * l'étendue de notre collecte et non la richesse de la page, et cacherait un
 * tiers du catalogue pour une raison qui ne concerne que nous.
 *
 * C'est la distinction `non_collecte` / `non_communique`, transposée à
 * l'indexation : on ne retire pas une page du sitemap parce qu'on l'a peu lue.
 *
 * GÉNÉRÉ À LA DEMANDE, jamais au build. Le catalogue bouge tous les jours ; un
 * fichier figé annoncerait des fiches disparues et tairait les nouvelles.
 *
 * `lastmod` porte la date de vérification réelle, pas la date du jour. Prétendre
 * qu'une page a changé aujourd'hui parce qu'on régénère le sitemap aujourd'hui
 * apprend aux robots à ne plus croire le champ.
 */
import { createFileRoute } from "@tanstack/react-router";
import { chargerListe } from "@/donnees/requetes";
import { regrouperParOrganisme } from "@/modele/organismes";
import { GUIDES, indexIndexable } from "@/contenu/guides";

const SITE = "https://formlist.fr";

/** Vues fixes, avec leur priorité relative. */
const VUES = [
  { chemin: "/", priorite: "1.0" },
  { chemin: "/organismes", priorite: "0.8" },
  { chemin: "/aide-au-choix", priorite: "0.7" },
  { chemin: "/methode", priorite: "0.5" },
  /* Indexable à dessein : « référencer ma formation » est une requête réelle,
     et cette page y répond mieux qu'un formulaire de contact générique. */
  { chemin: "/ajouter-un-organisme", priorite: "0.5" },
] as const;

function echapper(valeur: string): string {
  return valeur
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function entree(chemin: string, priorite: string, lastmod: string | null): string {
  return (
    `  <url>\n` +
    `    <loc>${echapper(`${SITE}${chemin}`)}</loc>\n` +
    (lastmod !== null ? `    <lastmod>${lastmod}</lastmod>\n` : "") +
    `    <priority>${priorite}</priority>\n` +
    `  </url>`
  );
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const parcours = await chargerListe();
        const organismes = regrouperParOrganisme(parcours);

        /*
          LES GUIDES FORMENT UNE SECTION À PART, et pas seulement pour la
          lisibilité du fichier : leur `lastmod` est une date ÉDITORIALE — celle
          de la dernière mise à jour du texte — là où celui d'une fiche est une
          date de vérification. Deux natures de date qu'il ne faut pas mélanger.

          L'index suit le seuil d'indexation : une page mise en `noindex` n'a
          rien à faire dans un sitemap, qui est une invitation à indexer.
        */
        const guides = [
          ...(indexIndexable() ? [entree("/guides", "0.6", null)] : []),
          ...GUIDES.map((g) => entree(`/guides/${g.slug}`, "0.7", g.misAJourLe)),
        ];

        const lignes = [
          ...VUES.map((v) => entree(v.chemin, v.priorite, null)),
          ...guides,
          ...organismes.map((o) =>
            entree(`/organismes/${o.slug}`, "0.7", o.derniereVerification),
          ),
          ...parcours.map((p) => entree(`/parcours/${p.slug}`, "0.6", p.dateVerification)),
        ];

        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          lignes.join("\n") +
          `\n</urlset>\n`;

        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            // Une heure : le catalogue bouge, mais pas à la minute.
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
