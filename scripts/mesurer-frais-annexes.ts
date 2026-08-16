/**
 * Combien de fiches publient un FRAIS ANNEXE, et de quelle nature ?
 *
 * `bun run collecte:frais-annexes`
 *
 * UN FRAIS ANNEXE N'EST PAS UN RESTE À CHARGE SUR LA FORMATION.
 *
 * Le 16 août 2026, la page INSEEC a failli faire reformuler la règle
 * d'alternance : elle affiche 700 € de cotisation obligatoire sous une grille de
 * frais de scolarité. Or « aucun frais pour l'alternant » reste juste POUR LA
 * FORMATION — le code du travail interdit d'en faire porter le coût à l'apprenti
 * ou au salarié en contrat de professionnalisation. Les 700 € sont une cotisation
 * pour étudiants non européens : un frais annexe, distinct. La règle n'avait donc
 * pas à changer ; ce qui doit changer, c'est que ces frais soient VISIBLES et à
 * part, parce que les absorber dans « aucun frais » les efface.
 *
 * DEUX INSTRUMENTS ONT ÉCHOUÉ AVANT CELUI-CI, ET POUR DEUX RAISONS DIFFÉRENTES.
 *
 * 1. LE PREMIER N'AVAIT AUCUN POUVOIR. Il cherchait les motifs dans les traces
 *    d'extraits déjà collectées et rendait zéro. Les motifs étaient pourtant
 *    justes — testés, ils reconnaissent les phrases INSEEC. Mais les extraits du
 *    journal font 63 caractères de médiane : une citation de PRIX ne peut pas
 *    contenir une phrase de FRAIS ANNEXE située ailleurs sur la page. Zéro ne
 *    voulait pas dire « aucun frais annexe », mais « je ne peux pas en voir ».
 *    Un motif juste appliqué à un corpus qui ne peut pas le contenir.
 *
 * 2. LE SECOND LISAIT LES PAGES, MAIS IGNORAIT LA POLARITÉ. Il a rendu six
 *    fiches Studi portant « Frais de dossier et d'inscription ». Cette phrase
 *    figure sous le titre « Inclus » : c'est la liste de ce que le tarif COUVRE.
 *    Le mot « frais de dossier » ne dit pas si on les paie EN PLUS ou s'ils sont
 *    COMPRIS — et sans cette distinction, l'instrument comptait des inclusions
 *    comme des suppléments, c'est-à-dire l'exact contraire.
 *
 * CE QUE CELUI-CI COMPTE. Il lit la page, cherche le motif, PUIS établit sa
 * polarité dans la fenêtre qui l'entoure. Seul un supplément est un frais
 * annexe. Une inclusion est une information de sens opposé, et une polarité
 * indéterminée n'est ni l'un ni l'autre : elle est déclarée telle quelle.
 *
 * LE DÉNOMINATEUR EST LES FICHES À `urlDetail`, ET IL EST BORNÉ PAR L'APPARIEMENT.
 * Une fiche dont la page est introuvable n'est pas « sans frais annexe » : elle
 * n'est pas mesurée. INSEEC — le seul cas attesté — n'a PAS d'`urlDetail` : le
 * témoin positif de cette mesure est hors de sa propre population.
 */
import { writeFileSync } from "node:fs";
import {
  enParallele,
  exigeRepliNavigateur,
  recuperer,
  texteprincipal,
} from "../src/collecte/recuperation";
import { fermerNavigateur, rendre } from "../src/collecte/navigateur";
import { verifierCorrespondance } from "../src/collecte/correspondance";

const SOURCE = "src/donnees/offres-sources.json";
const SORTIE = "src/donnees/frais-annexes.json";

/**
 * Natures de frais, écrites sur des formulations attestées et non imaginées.
 *
 * Elles n'ont pas le même statut : une cotisation obligatoire s'impose à tous,
 * une VAP ne concerne que qui la demande, des frais d'examen dépendent du
 * passage. La mesure les distingue plutôt que de les additionner.
 */
const NATURES: { nom: string; obligation: "obligatoire" | "conditionnel"; motif: RegExp }[] = [
  { nom: "cotisation", obligation: "obligatoire", motif: /cotisation\s+(?:obligatoire|annuelle|de\s+\d)/i },
  {
    nom: "frais de dossier ou d'inscription",
    obligation: "obligatoire",
    motif: /frais\s+de\s+dossier|frais\s+d['’]inscription|frais\s+de\s+candidature/i,
  },
  { nom: "VAP ou VAE", obligation: "conditionnel", motif: /\b(?:VAP|VAE)\b[^.]{0,60}?(?:tarif|au\s+prix|\d[\d\s ]{2,7}\s?€)/i },
  {
    nom: "frais d'examen ou de certification",
    obligation: "conditionnel",
    motif: /frais\s+(?:d['’]examen|de\s+certification|de\s+passage)/i,
  },
];

/** Ce qui dit que le frais s'AJOUTE au tarif. */
const SUPPLEMENT = /en\s+sus|non\s+inclus|à\s+rajouter|s['’]ajoutent?|en\s+supplément|hors\s+frais|à\s+régler\s+en\s+plus|non\s+compris/i;

/** Ce qui dit que le frais est COMPRIS dans le tarif. */
const INCLUS = /\binclus\b|\bcompris\b|\bincluses?\b|sans\s+frais\s+supplémentaires?|offerts?/i;

/** La fenêtre où se lit la polarité, autour du motif. */
const AVANT = 320;
const APRES = 220;

type Trouvaille = {
  nature: string;
  obligation: "obligatoire" | "conditionnel";
  polarite: "supplement" | "inclus" | "indeterminee";
  montantPublie: number | null;
  extrait: string;
};

type Verdict = {
  id: number;
  organisme: string;
  nom: string;
  issue: "frais_annexe" | "inclusion_seule" | "aucun" | "autre_parcours" | "page_vide" | "injoignable";
  trouvailles: Trouvaille[];
};

function montantDans(fenetre: string): number | null {
  const m = fenetre.match(/(\d[\d  ]{1,7})\s?€/);
  if (!m) return null;
  const v = Number(m[1]!.replace(/[\s ]/g, ""));
  return Number.isFinite(v) ? v : null;
}

/**
 * La polarité, lue dans la fenêtre qui entoure le motif.
 *
 * L'INCLUSION L'EMPORTE SUR LE SUPPLÉMENT en cas de coexistence, et c'est
 * délibéré : compter un frais que la page annonce compris serait affirmer un
 * coût que l'organisme ne demande pas. Se tromper dans ce sens invente une
 * dépense ; se tromper dans l'autre en manque une. Les deux sont des erreurs,
 * la première est celle qui nuit à la personne ET à l'organisme.
 */
function polariteDe(fenetre: string): Trouvaille["polarite"] {
  if (INCLUS.test(fenetre)) return "inclus";
  if (SUPPLEMENT.test(fenetre)) return "supplement";
  return "indeterminee";
}

async function mesurer(o: {
  id: number;
  organisme: string;
  nom: string;
  urlDetail: string;
}): Promise<Verdict> {
  const base: Verdict = { id: o.id, organisme: o.organisme, nom: o.nom, issue: "aucun", trouvailles: [] };

  const rep = await recuperer(o.urlDetail);
  if (!rep.ok) return { ...base, issue: "injoignable" };
  let texte = texteprincipal(rep.texte);
  let html = rep.texte;
  if (exigeRepliNavigateur(texte) || texte.length / Math.max(1, rep.texte.length) < 0.03) {
    const rendu = await rendre(o.urlDetail);
    if (rendu.ok && texteprincipal(rendu.html).length > texte.length) {
      texte = texteprincipal(rendu.html);
      html = rendu.html;
    }
  }
  if (exigeRepliNavigateur(texte)) return { ...base, issue: "page_vide" };
  // Le même garde-fou que partout : un frais lu sur la page d'un autre parcours
  // serait un fait juste attribué à la mauvaise fiche.
  if (!verifierCorrespondance(o.nom, html).correspond) return { ...base, issue: "autre_parcours" };

  const trouvailles: Trouvaille[] = [];
  for (const n of NATURES) {
    const m = texte.match(n.motif);
    if (!m) continue;
    const i = m.index ?? 0;
    const fenetre = texte.slice(Math.max(0, i - AVANT), i + APRES);
    trouvailles.push({
      nature: n.nom,
      obligation: n.obligation,
      polarite: polariteDe(fenetre),
      montantPublie: montantDans(texte.slice(i, i + APRES)),
      extrait: fenetre.replace(/\s+/g, " ").trim(),
    });
  }

  if (trouvailles.length === 0) return base;
  const supplements = trouvailles.filter((t) => t.polarite !== "inclus");
  return { ...base, issue: supplements.length > 0 ? "frais_annexe" : "inclusion_seule", trouvailles };
}

async function main() {
  const src = JSON.parse(await Bun.file(SOURCE).text()) as {
    id: number;
    organisme: string;
    nom: string;
    urlDetail: string | null;
  }[];
  const cibles = src.filter((o): o is typeof o & { urlDetail: string } => o.urlDetail !== null);

  console.log(`\nFrais annexes — ${src.length} fiches au catalogue`);
  console.log(`  dont mesurables (page de détail connue) : ${cibles.length}\n`);

  const verdicts = await enParallele(cibles, 4, async (o, i) => {
    const v = await mesurer(o);
    const marque = v.issue === "frais_annexe" ? "€" : v.issue === "inclusion_seule" ? "=" : "·";
    console.log(
      `  ${String(i + 1).padStart(2)}/${cibles.length} ${marque} #${String(v.id).padStart(3)} ${v.organisme.slice(0, 20).padEnd(20)} ${v.issue}`,
    );
    return v;
  });
  await fermerNavigateur();
  writeFileSync(SORTIE, JSON.stringify(verdicts, null, 1));

  const par = new Map<string, number>();
  for (const v of verdicts) par.set(v.issue, (par.get(v.issue) ?? 0) + 1);
  console.log("\n  SUR LES FICHES MESURÉES");
  for (const [k, n] of [...par].sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(3)}  ${k}`);

  const avecFrais = verdicts.filter((v) => v.issue === "frais_annexe");
  if (avecFrais.length > 0) {
    console.log("\n  LES CAS, PAR NATURE");
    for (const v of avecFrais) {
      for (const t of v.trouvailles.filter((x) => x.polarite !== "inclus")) {
        console.log(
          `      #${String(v.id).padStart(3)} ${v.organisme.slice(0, 18).padEnd(18)} ${t.nature} (${t.obligation}, ${t.polarite})` +
            ` ${t.montantPublie !== null ? `${t.montantPublie} €` : "montant non publié"}`,
        );
        console.log(`           « ${t.extrait.slice(0, 150)} »`);
      }
    }
  }

  const inclusions = verdicts.filter((v) => v.issue === "inclusion_seule");
  if (inclusions.length > 0) {
    console.log(
      `\n  ${inclusions.length} fiche(s) nomment un frais que la page annonce COMPRIS dans le tarif.` +
        `\n  Ce n'est pas un frais annexe : c'est l'information inverse, et l'instrument` +
        `\n  précédent les comptait à l'envers.`,
    );
    for (const v of inclusions) console.log(`      #${v.id} ${v.organisme} — ${v.trouvailles.map((t) => t.nature).join(", ")}`);
  }

  console.log(
    `\n  ${String(src.length - cibles.length).padStart(3)}  NON MESURÉES — aucune page de détail connue.` +
      `\n       Elles ne sont pas « sans frais annexe » : elles ne sont pas mesurées.` +
      `\n       INSEEC, seul cas attesté, en fait partie — le témoin positif de cette` +
      `\n       mesure est hors de sa propre population.\n  → ${SORTIE}\n`,
  );
}

main();
