/**
 * Balayage des unités de prix du catalogue.
 *
 * `bun run collecte:balayer-unites`
 *
 * POURQUOI CE BALAYAGE. Le 16 août 2026, deux prix ENACO annuels ont été
 * enregistrés comme des totaux : `uniteDansExtrait` exigeait « par an » et
 * ratait « par année ». Dawan avait subi la même faute en juin, corrigée à la
 * main. Rien ne disait que d'autres prix n'en portaient pas la trace.
 *
 * Un prix dans la mauvaise unité ment d'un facteur égal à la durée, il ne
 * plante rien, et il passe tous les tests. C'est la faute la plus coûteuse du
 * produit et la moins visible.
 *
 * CE QUE LE BALAYAGE PEUT DIRE, ET CE QU'IL NE PEUT PAS.
 *
 * Il relit toutes les traces d'extrait dont nous disposons — journal
 * d'extraction, passes de crawl, historique des fiches — et rejoue le motif
 * CORRIGÉ dessus. Il rend donc trois populations :
 *
 *   suspect      — une trace existe ET porte une unité non totale.
 *   confirme     — une trace existe et ne porte aucune unité.
 *   sans_trace   — aucune trace d'extrait : le prix vient d'une collecte
 *                  manuelle. Il n'est ni sain ni suspect, il est INVÉRIFIABLE
 *                  sans rouvrir la page. Le compter comme sain serait la même
 *                  faute que d'imputer une absence à un organisme.
 */
import { chargerCatalogue } from "../src/donnees/catalogue";
import { uniteDansExtrait, type UnitePrix } from "../src/collecte/unite-prix";

type Trace = { source: string; extrait: string };

/** Toutes les traces d'extrait connues, par identifiant de fiche. */
async function traces(): Promise<Map<number, Trace[]>> {
  const par = new Map<number, Trace[]>();
  const ajouter = (id: number, source: string, extrait: unknown) => {
    if (typeof extrait !== "string" || extrait.trim() === "") return;
    par.set(id, [...(par.get(id) ?? []), { source, extrait: extrait.replace(/\s+/g, " ").trim() }]);
  };

  const lire = async (chemin: string) => {
    try {
      return JSON.parse(await Bun.file(chemin).text());
    } catch {
      return null;
    }
  };

  const journal = await lire("src/donnees/journal-extraction.json");
  for (const e of journal ?? []) {
    if (String(e.champ).toLowerCase().includes("prix")) ajouter(e.id, "journal", e.extrait);
  }

  for (const f of ["crawl-neufs", "crawl-reste", "crawl-rejeu", "crawl-profond-resultats"]) {
    for (const r of (await lire(`src/donnees/${f}.json`)) ?? []) {
      if (r.proposition) ajouter(r.id, f, r.proposition.extrait);
    }
  }

  for (const o of (await lire("src/donnees/offres-sources.json")) ?? []) {
    for (const h of o.historique ?? []) {
      if (h.champ === "prix") ajouter(o.id, "historique", h.motif);
    }
  }
  return par;
}

async function main() {
  const catalogue = chargerCatalogue();
  const parTrace = await traces();
  const avecPrix = catalogue.filter((o) => o.prix !== null && o.prix > 0);

  const suspects: { id: number; nom: string; organisme: string; prix: number; unite: UnitePrix; extrait: string; source: string }[] = [];
  let confirmes = 0;
  const sansTrace: typeof catalogue[number][] = [];

  let dejaQualifies = 0;
  for (const o of avecPrix) {
    /*
      L'UNITÉ DÉJÀ ÉCRITE FAIT FOI, et il fallait commencer par la lire.

      Première version : elle ignorait `unitePrix` — le champ n'existait pas
      encore dans le modèle — et déclarait Speed Ecom #192 suspect alors que la
      donnée portait déjà « mensuel ». Le balayage cherchait dans les traces ce
      qui était écrit dans la fiche.
    */
    if (o.unitePrix !== null) {
      dejaQualifies++;
      continue;
    }
    const t = parTrace.get(o.id) ?? [];
    if (t.length === 0) {
      sansTrace.push(o);
      continue;
    }
    /*
      TOUTES LES TRACES SONT LUES AVANT DE CONCLURE, jamais la première.

      Première version de ce balayage : elle s'arrêtait au premier extrait
      portant une unité et déclarait Dawan #211 suspect. Or sa DEUXIÈME trace
      dit « converti sur la durée annoncée — 975 €/jour × 3 j » : la conversion
      avait été faite en juin, et 2 925 € est juste. Un balayage qui s'arrête à
      la première trace mesure l'ordre du journal, pas l'état du prix.
    */
    const converti = t.some((tr) => /× *\d+ *j\b|converti/i.test(tr.extrait));
    let trouve: { unite: UnitePrix; extrait: string; source: string } | null = null;
    if (!converti) {
      for (const tr of t) {
        const u = uniteDansExtrait(tr.extrait);
        if (u !== null && u !== "total") {
          trouve = { unite: u, extrait: tr.extrait, source: tr.source };
          break;
        }
      }
    }
    if (trouve) {
      suspects.push({ id: o.id, nom: o.nom, organisme: o.organisme, prix: o.prix!, ...trouve });
    } else {
      confirmes++;
    }
  }

  console.log(`\nBalayage des unités — ${avecPrix.length} prix strictement positifs au catalogue\n`);
  console.log(`  ${String(dejaQualifies).padStart(3)}  déjà qualifiés — l'unité est écrite sur la fiche`);
  console.log(`  ${String(suspects.length).padStart(3)}  SUSPECTS — une trace porte une unité non totale`);
  console.log(`  ${String(confirmes).padStart(3)}  confirmés — une trace existe, aucune unité dedans`);
  console.log(`  ${String(sansTrace.length).padStart(3)}  sans trace — invérifiables sans rouvrir la page`);

  if (suspects.length > 0) {
    console.log(`\n  LES SUSPECTS`);
    for (const s of suspects) {
      console.log(`      #${String(s.id).padStart(3)} ${s.organisme.slice(0, 22).padEnd(22)} ${String(s.prix).padStart(6)} € marqué total, lu ${s.unite}`);
      console.log(`           « ${s.extrait.slice(0, 96)} »  [${s.source}]`);
    }
  }

  console.log(`\n  Les « sans trace » ne sont ni sains ni suspects. Les compter comme sains`);
  console.log(`  serait la faute qu'on vient de corriger, dans l'autre sens.\n`);
}

main();
