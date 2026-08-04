/**
 * Disponibilité des domaines injoignables.
 *
 * `bun run collecte:disponibilite -- --source <fichier-decouvertes>`
 *
 * Un domaine qui ne répond pas ne relève d'aucune stratégie de découverte :
 * aucun plan du site, aucune exploration, aucune recherche ne fera parler un
 * serveur muet. C'est un problème de disponibilité, et le mélanger aux
 * organismes sans sitemap produirait un taux de couverture qui additionne deux
 * situations sans rapport.
 *
 * CE QUE CE SCRIPT NE FAIT PAS : conclure. Il distingue les cas et les nomme.
 * Un domaine mort sort du catalogue par la règle de la page abandonnée ; un
 * domaine qui refuse notre agent reste au catalogue et relève de notre
 * outillage. Confondre les deux ferait porter à un organisme vivant une
 * disparition qui n'est pas la sienne.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { recuperer, texteprincipal } from "../src/collecte/recuperation";

const SORTIE = "src/donnees/disponibilite-domaines.json";
const source = process.argv.includes("--source")
  ? process.argv[process.argv.indexOf("--source") + 1]!
  : "src/donnees/urls-decouvertes.json";

type Decouverte = { organisme: string; domaine: string; statut: string; pagesFormation: number };

/**
 * Signatures de domaine garé, c'est-à-dire expiré et repris par un revendeur.
 *
 * C'est le cas coachingfba.com : le site n'existe plus, GoDaddy sert une page
 * d'achat. Sans cette détection, on classerait un organisme disparu en
 * « injoignable » et on l'attendrait indéfiniment.
 */
const SIGNATURES_DOMAINE_GARE = [
  "this domain is for sale",
  "ce domaine est à vendre",
  "domain for sale",
  "buy this domain",
  "domaine expiré",
  "parked domain",
  "godaddy.com",
  "sedo.com",
  "hugedomains",
];

export type Verdict =
  | "vivant"
  | "domaine_gare"
  | "dns_introuvable"
  | "refuse_notre_agent"
  | "erreur_serveur"
  | "injoignable";

/** Ce qu'on peut conclure d'une tentative sur la racine d'un domaine. */
function classer(reponse: Awaited<ReturnType<typeof recuperer>>): Verdict {
  if (reponse.ok) {
    const texte = texteprincipal(reponse.texte).toLowerCase();
    return SIGNATURES_DOMAINE_GARE.some((s) => texte.includes(s)) ? "domaine_gare" : "vivant";
  }
  // 403 : le serveur répond, il refuse notre agent. L'organisme est vivant, et
  // l'écarter du catalogue lui ferait porter notre propre blocage.
  if (reponse.motif === "http_403") return "refuse_notre_agent";
  if (/^http_5/.test(reponse.motif)) return "erreur_serveur";
  if (/getaddrinfo|ENOTFOUND|dns/i.test(reponse.motif)) return "dns_introuvable";
  return "injoignable";
}

async function main() {
  if (!existsSync(source)) throw new Error(`${source} absent.`);
  const decouvertes = JSON.parse(readFileSync(source, "utf8")) as Decouverte[];
  // Les organismes sans domaine au catalogue ne relèvent pas de ce script :
  // on ne mesure pas la disponibilité d'un serveur qu'on n'a jamais interrogé.
  const cibles = decouvertes.filter((d) => d.statut === "domaine_muet" && d.domaine !== "—");

  console.log(`\nDisponibilité — ${cibles.length} domaines injoignables\n`);
  const resultats: { organisme: string; domaine: string; verdict: Verdict; variante: string }[] = [];

  for (const cible of cibles) {
    // Une variante www/non-www suffit souvent : le catalogue porte l'une, le
    // certificat l'autre. Ce n'est pas une disparition, c'est une redirection
    // qu'on n'a pas suivie.
    const hote = cible.domaine.replace(/^https?:\/\//, "");
    const variantes = hote.startsWith("www.")
      ? [`https://${hote}`, `https://${hote.slice(4)}`]
      : [`https://${hote}`, `https://www.${hote}`];

    let verdict: Verdict = "injoignable";
    let retenue = variantes[0]!;
    for (const variante of variantes) {
      const v = classer(await recuperer(variante));
      if (v === "vivant" || v === "domaine_gare") {
        verdict = v;
        retenue = variante;
        break;
      }
      if (verdict === "injoignable") {
        verdict = v;
        retenue = variante;
      }
    }

    resultats.push({ organisme: cible.organisme, domaine: hote, verdict, variante: retenue });
    console.log(`  ${cible.organisme.slice(0, 34).padEnd(34)} ${verdict}`);
  }

  writeFileSync(SORTIE, JSON.stringify(resultats, null, 1));

  const parVerdict = resultats.reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r.verdict]: (acc[r.verdict] ?? 0) + 1 }),
    {},
  );
  console.log("");
  for (const [v, n] of Object.entries(parVerdict).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}  ${v}`);
  }
  console.log(`\n  → ${SORTIE}\n`);
}

main();
