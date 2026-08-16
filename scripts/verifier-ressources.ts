/**
 * Vérification des adresses et des langues des 19 ressources gratuites.
 *
 * `bun run ressources:verifier`
 *
 * POURQUOI CE PASSAGE EXISTE. La fiche de catalogue d'origine ne portait qu'un
 * DOMAINE (`klaviyo.com`) et aucune langue. Or une ressource se consulte : son
 * adresse doit mener à la ressource, pas à la page d'accueil commerciale de
 * l'éditeur, et sa langue décide si elle est utilisable par la personne.
 *
 * ON NE DEVINE NI L'UNE NI L'AUTRE.
 *   - L'adresse : on essaie une petite liste de chemins plausibles, et on ne
 *     retient que celui dont le TITRE de page contient le nom de la ressource.
 *     Un 200 ne suffit pas — beaucoup de sites répondent 200 sur tout et
 *     redirigent vers l'accueil. Sans correspondance, on garde le domaine nu :
 *     c'est moins précis, ce n'est pas faux.
 *   - La langue : lue dans l'attribut `lang` de <html>, et seulement là. Un
 *     éditeur qui sert une page française déclare `lang="fr"` ; le déduire du
 *     texte reviendrait à qualifier la langue de la vitrine, pas des contenus.
 *     Non déclarée ⇒ `null`, qui est un état de collecte, pas un défaut.
 */
import { writeFileSync } from "node:fs";
import { enParallele, recuperer } from "../src/collecte/recuperation";

const SOURCE = "src/donnees/ressources-ecartees.json";
const SORTIE = "src/donnees/ressources-verification.json";

/**
 * Adresses tentées, de la plus spécifique à la plus générale.
 *
 * Les sous-domaines viennent en premier : `academy.klaviyo.com` existe quand
 * `klaviyo.com/academy` répond 404, et l'inverse se rencontre aussi. Le sondage
 * du 16 août 2026 a établi lesquelles répondent — cette liste est le résidu de
 * ce sondage, pas une liste imaginée.
 */
const CANDIDATES = (domaine: string): string[] => [
  `https://academy.${domaine}`,
  `https://learn.${domaine}`,
  `https://training.${domaine}`,
  `https://${domaine}/academy`,
  `https://${domaine}/business/learn`,
  `https://${domaine}/business/academy`,
  `https://${domaine}/partners/academy`,
  `https://${domaine}/resources/academy`,
  `https://${domaine}/seller-handbook`,
  `https://${domaine}/learn`,
  `https://${domaine}/training`,
  `https://${domaine}`,
];

type Verif = {
  id: number;
  nom: string;
  organisme: string;
  domaine: string;
  urlRetenue: string;
  titreConstate: string | null;
  correspond: boolean;
  langue: string | null;
  /** Le titre constaté ne porte pas tous les mots du nom que nous lui donnons. */
  nomADivergence: boolean;
};

/** Normalise pour comparer un titre de page à un nom de ressource. */
function pliage(v: string): string {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titreDe(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i);
  return m ? m[1]!.replace(/\s+/g, " ").trim() : null;
}

/** L'attribut `lang` de <html>, réduit au code de langue. */
function langueDe(html: string): string | null {
  const m = html.match(/<html[^>]*\slang\s*=\s*["']([a-zA-Z-]{2,10})["']/i);
  return m ? m[1]!.slice(0, 2).toLowerCase() : null;
}

/**
 * Le titre correspond-il à la ressource ?
 *
 * IL FAUT LE MOT DISTINCTIF, PAS LE NOM DE L'ÉDITEUR. Une première version
 * acceptait la correspondance dès que la moitié des mots se retrouvait — et le
 * nom de l'éditeur figure dans le titre de TOUTES ses pages. « Brevo » dans
 * « Brevo: Email & SMS Marketing » validait ainsi `/academy`, qui redirige en
 * fait vers l'accueil commercial. Même défaut que le motif cherché dans un
 * contenant plus large que son sens : le signal était là, mais il ne signalait
 * rien.
 *
 * On retire donc du nom les mots de l'éditeur, et on exige ce qui reste :
 * « academy », « handbook », « trailhead » portent l'information ; « Klaviyo »
 * n'en porte aucune sur klaviyo.com.
 */
function motsDistinctifs(nom: string, organisme: string): string[] {
  const editeur = new Set(pliage(organisme).split(" "));
  return [
    ...new Set(
      pliage(nom)
        .split(" ")
        .filter((m) => m.length >= 4 && !editeur.has(m)),
    ),
  ];
}

/**
 * Les mots qui NOMMENT UNE OFFRE D'APPRENTISSAGE.
 *
 * Retirer le nom de l'éditeur ne suffisait pas : « Microsoft Advertising
 * Learning Lab » garde « advertising », qui figure dans le titre de l'accueil
 * publicitaire de Microsoft — on aurait attribué le Learning Lab à la vitrine.
 * Ce n'est ni le nom de l'éditeur ni celui du produit qui prouve qu'on est sur
 * la ressource, c'est le mot qui désigne l'apprentissage lui-même.
 */
const MOTS_APPRENTISSAGE = new Set([
  "academy",
  "academie",
  "ateliers",
  "handbook",
  "trailhead",
  "learn",
  "learning",
  "training",
  "apprentissage",
  "certifications",
  "formations",
]);

function titreCorrespond(nom: string, organisme: string, titre: string): boolean {
  const t = pliage(titre);
  const distinctifs = motsDistinctifs(nom, organisme);
  // Sans mot distinctif, aucun titre ne peut prouver quoi que ce soit.
  if (distinctifs.length === 0) return false;
  const apprentissage = distinctifs.filter((m) => MOTS_APPRENTISSAGE.has(m));
  const exiges = apprentissage.length > 0 ? apprentissage : distinctifs;
  return exiges.some((m) => t.includes(m));
}

async function verifier(r: { id: number; nom: string; organisme: string; url: string }): Promise<Verif> {
  const domaine = r.url.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  const base: Verif = {
    id: r.id,
    nom: r.nom,
    organisme: r.organisme,
    domaine,
    urlRetenue: `https://${domaine}`,
    titreConstate: null,
    correspond: false,
    langue: null,
    nomADivergence: false,
  };

  const candidates = CANDIDATES(domaine);
  for (const url of candidates) {
    const rep = await recuperer(url);
    if (!rep.ok) continue;
    const titre = titreDe(rep.texte);
    const langue = langueDe(rep.texte);
    /*
      LE DOMAINE NU EST UNE CANDIDATE COMME LES AUTRES, ET AUSSI LE REPLI.
      Une première version le traitait en repli pur, jamais évalué : elle a
      manqué `trailhead.salesforce.com`, dont le domaine EST la ressource. On
      l'évalue donc d'abord ; s'il ne prouve rien, il sert de repli.

      LA LANGUE NE SURVIT PAS AU REPLI. `klaviyo.com` est servi en français
      depuis la France quand Klaviyo Academy est en anglais : lire l'attribut
      sur l'accueil commercial d'un éditeur ne dit rien de la langue de sa
      ressource. Sans adresse précise, la langue reste non établie.
    */
    if (titre && titreCorrespond(r.nom, r.organisme, titre)) {
      /*
        Le titre prouve qu'on est sur la ressource, pas qu'on l'a bien nommée.
        `academy.shopify.com` s'annonce « Shopify Academy » quand notre fiche dit
        « Shopify Partner Academy » : l'adresse est bonne, le nom est peut-être
        trop précis. On le signale, on ne le corrige pas — renommer une ressource
        d'après un titre de page serait une décision qui n'a pas été prise.
      */
      const manquants = motsDistinctifs(r.nom, r.organisme).filter((m) => !pliage(titre).includes(m));
      return {
        ...base,
        urlRetenue: url,
        titreConstate: titre,
        correspond: true,
        langue,
        nomADivergence: manquants.length > 0,
      };
    }
    if (url === candidates[candidates.length - 1]) return { ...base, titreConstate: titre };
  }
  return base;
}

async function main() {
  const ressources = JSON.parse(await Bun.file(SOURCE).text()) as {
    id: number;
    nom: string;
    organisme: string;
    url: string;
  }[];

  console.log(`\nVérification des adresses et des langues — ${ressources.length} ressources\n`);

  const verifs = await enParallele(ressources, 4, async (r, i) => {
    const v = await verifier(r);
    console.log(
      `  ${String(i + 1).padStart(2)}/${ressources.length} ${v.correspond ? "✓" : "·"} ` +
        `#${String(v.id).padStart(3)} ${v.organisme.padEnd(12)} ${(v.langue ?? "—").padEnd(3)} ${v.urlRetenue}`,
    );
    if (v.titreConstate) console.log(`         « ${v.titreConstate.slice(0, 90)} »`);
    return v;
  });

  writeFileSync(SORTIE, JSON.stringify(verifs, null, 1));

  const precises = verifs.filter((v) => v.correspond).length;
  const langues = new Map<string, number>();
  for (const v of verifs) langues.set(v.langue ?? "non déclarée", (langues.get(v.langue ?? "non déclarée") ?? 0) + 1);

  console.log(`\n  ${String(precises).padStart(2)}  adresses précises retenues (mot distinctif dans le titre)`);
  console.log(`  ${String(verifs.length - precises).padStart(2)}  restées au domaine nu — moins précis, pas faux\n`);
  console.log("  LANGUES DÉCLARÉES  (attribut lang de <html>, page servie depuis la France)");
  for (const [k, n] of [...langues].sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(2)}  ${k}`);

  const div = verifs.filter((v) => v.nomADivergence);
  if (div.length > 0) {
    console.log("\n  NOMS À CONFIRMER — le titre constaté ne porte pas tout notre libellé");
    for (const v of div) console.log(`      #${v.id} « ${v.nom} »  vs  « ${v.titreConstate} »`);
  }
  console.log(`\n  → ${SORTIE}\n`);
}

main();
