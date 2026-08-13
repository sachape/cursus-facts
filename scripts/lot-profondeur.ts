/**
 * Sélection du lot de test du crawl profond — stratifiée, déterministe, figée.
 *
 * `bun run scripts/lot-profondeur.ts`            affiche la sélection
 * `bun run scripts/lot-profondeur.ts --figer`    l'écrit dans le lot de référence
 *
 * POURQUOI STRATIFIÉ. Le taux de réussite varie fortement d'une strate à
 * l'autre — 94–97 % sur les écoles contre 59 % ailleurs à la passe du 6 août.
 * Un tirage au hasard rendrait une moyenne qui ne se généralise à aucune
 * strate, et l'extrapolation aux 134 fiches en dépend entièrement.
 *
 * POURQUOI FIGÉ. Même motif que `lot-reference.json` : sans lot figé, une part
 * de chaque écart entre deux mesures vient du corpus et non des corrections, et
 * on ne peut jamais savoir laquelle.
 *
 * POURQUOI UN ORGANISME AU PLUS PAR LOT. Deux fiches du même organisme
 * partagent leur sitemap, leur gabarit de page et leur politique de publication
 * de prix. Les compter comme deux mesures indépendantes gonflerait le taux de
 * réussite d'un facteur qu'on ne saurait pas retrancher.
 */
import { writeFileSync } from "node:fs";
import { chargerCatalogue, type OffreNormalisee } from "../src/donnees/catalogue";
import { determinerEtats } from "../src/modele/completude";

const LOT = "src/donnees/lot-profondeur.json";

/** Les cinq strates mesurées, dans l'ordre de restitution. */
const STRATES = [
  "ecole",
  "universite",
  "formation_professionnelle",
  "formation_independante",
  "certification_editeur",
] as const;

const PAR_STRATE = 2;

/**
 * « Coût apprenant non établi » — les trois états qui le composent.
 *
 * `a_confirmer` en fait partie : la valeur est là mais non reconfirmée, donc
 * elle n'est pas établie. La distinction est conservée jusqu'à la restitution,
 * parce que trouver un prix sur une fiche vide et reconfirmer un prix existant
 * ne sont pas la même réussite.
 */
const NON_ETABLI = new Set(["non_collecte", "non_communique", "a_confirmer"]);

type Candidat = {
  id: number;
  nom: string;
  organisme: string;
  strate: string;
  etatPrix: string;
  prixActuel: number | null;
  url: string;
  domaine: string;
  urlDetail: string | null;
  profondeur: string;
};

/**
 * Le champ `url` n'est JAMAIS `null` sur les 232 fiches.
 *
 * Dix-sept d'entre elles portent un texte à la place d'un domaine : « — »
 * quatorze fois, « Recherche web » deux fois, et « Site officiel + fiche Mon
 * Compte Formation » une fois. Filtrer sur `url !== null` laisse donc passer
 * des fiches sans point de départ, et le crawl y dépenserait des pages pour
 * rien. `scripts/invariants.ts` n'en compte que quatorze : il teste « — »
 * littéralement, pas les deux autres formulations.
 */
export function urlExploitable(url: string | null): boolean {
  if (url === null) return false;
  const hote = url.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(hote);
}

/** Les URL du catalogue sont des domaines nus, sans schéma : 232 sur 232. */
function domaineDe(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/^www\./, "").trim();
}

function candidats(catalogue: readonly OffreNormalisee[]): Candidat[] {
  return catalogue
    .map((o) => {
      const etatPrix = (determinerEtats(o) as unknown as Record<string, string>)["prix"]!;
      return { offre: o, etatPrix };
    })
    .filter(({ offre, etatPrix }) => NON_ETABLI.has(etatPrix) && urlExploitable(offre.url))
    .map(({ offre, etatPrix }) => ({
      id: offre.id,
      nom: offre.nom,
      organisme: offre.organisme,
      strate: offre.categorie as string,
      etatPrix,
      prixActuel: offre.prix,
      url: offre.url!,
      domaine: domaineDe(offre.url!),
      urlDetail: (offre as { urlDetail?: string | null }).urlDetail ?? null,
      profondeur: (offre as { profondeur?: string }).profondeur ?? "catalogue_seul",
    }));
}

/**
 * Ordre de préférence dans une strate.
 *
 * 1. Un prix absent avant un prix à reconfirmer — c'est le cas qui fait gagner
 *    un point de couverture, donc celui dont le taux nous intéresse.
 * 2. Une fiche jamais ouverte avant une fiche déjà en profondeur — mesurer sur
 *    une page déjà lue mesurerait notre journal, pas le crawl.
 * 3. `id` croissant, pour que deux exécutions rendent le même lot.
 */
function rang(c: Candidat): [number, number, number] {
  return [c.etatPrix === "a_confirmer" ? 1 : 0, c.profondeur === "detail_verifie" ? 1 : 0, c.id];
}

function selectionner(tous: Candidat[]): Candidat[] {
  const organismesPris = new Set<string>();
  const domainesPris = new Set<string>();
  const lot: Candidat[] = [];

  for (const strate of STRATES) {
    const dans = tous
      .filter((c) => c.strate === strate)
      .sort((a, b) => {
        const [x, y] = [rang(a), rang(b)];
        return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
      });

    let pris = 0;
    for (const c of dans) {
      if (pris === PAR_STRATE) break;
      if (organismesPris.has(c.organisme) || domainesPris.has(c.domaine)) continue;
      organismesPris.add(c.organisme);
      domainesPris.add(c.domaine);
      lot.push(c);
      pris++;
    }
    if (pris < PAR_STRATE) {
      // Une strate incomplète se déclare : la taille de l'échantillon fait
      // partie du résultat, et un lot de 9 annoncé pour 10 fausse le taux.
      console.error(`  ⚠ ${strate} : ${pris} fiche(s) seulement sur ${PAR_STRATE} demandées`);
    }
  }
  return lot;
}

function main() {
  const catalogue = chargerCatalogue();
  const tous = candidats(catalogue);

  console.log(`\nPopulation — coût apprenant non établi, URL d'organisme renseignée`);
  console.log(`  ${tous.length} fiches sur ${catalogue.length}\n`);

  const parStrate = new Map<string, { vide: number; aConfirmer: number }>();
  for (const c of tous) {
    const l = parStrate.get(c.strate) ?? { vide: 0, aConfirmer: 0 };
    if (c.etatPrix === "a_confirmer") l.aConfirmer++;
    else l.vide++;
    parStrate.set(c.strate, l);
  }
  for (const [s, l] of [...parStrate].sort()) {
    console.log(`  ${s.padEnd(26)} ${String(l.vide + l.aConfirmer).padStart(3)}  (vide ${l.vide}, à reconfirmer ${l.aConfirmer})`);
  }

  const lot = selectionner(tous);
  console.log(`\nLOT — ${lot.length} fiches\n`);
  for (const c of lot) {
    console.log(
      `  #${String(c.id).padStart(3)}  ${c.strate.padEnd(26)} ${c.etatPrix.padEnd(15)} ${c.organisme.slice(0, 28).padEnd(28)} ${c.nom.slice(0, 44)}`,
    );
    console.log(
      `        ${c.domaine.padEnd(34)} prix actuel ${c.prixActuel === null ? "—" : `${c.prixActuel} €`}   détail ${c.urlDetail ? "connu" : "à trouver"}`,
    );
  }

  if (process.argv.includes("--figer")) {
    writeFileSync(LOT, JSON.stringify(lot, null, 1));
    console.log(`\n  → ${LOT}\n`);
  } else {
    console.log(`\n  (non figé — relancer avec --figer pour écrire ${LOT})\n`);
  }
}

// Un module importé pour une seule fonction ne doit pas lancer son script :
// `audit-population.ts` importe `urlExploitable`, et sans cette garde il
// réaffichait tout le lot avant son propre travail.
if (import.meta.main) main();
