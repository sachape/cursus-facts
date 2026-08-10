/**
 * Passe d'extraction sur la file d'URL découvertes.
 *
 * `bun run collecte:extraire -- --lot 20`  échantillon
 * `bun run collecte:extraire -- --tout`    passe complète
 *
 * Une requête réseau et une requête modèle par page. Rien n'entre au catalogue
 * sans citation vérifiée ; rien n'est effacé sans absence constatée.
 *
 * Le script écrit deux fichiers et ne touche jamais le catalogue directement :
 *   - `src/donnees/journal-extraction.json` — toutes les écritures, annulables
 *   - `src/donnees/rejets-extraction.json`  — ce qui n'a pas su être cité
 *
 * L'application au catalogue est une étape distincte et explicite. Un pipeline
 * qui écrit dans le même geste qu'il extrait ne laisse pas le temps de regarder
 * ce qu'il a produit.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { chargerCatalogue, type OffreNormalisee } from "../src/donnees/catalogue";
import {
  enParallele,
  exigeRepliNavigateur,
  recuperer,
  texteprincipal,
} from "../src/collecte/recuperation";
import { clientAnthropic, extrairePage, MODELE } from "../src/collecte/extraction";
import { fermerNavigateur, rendre } from "../src/collecte/navigateur";
import { journaliser, type EcritureJournalisee } from "../src/collecte/journal";
import { verifierCorrespondance } from "../src/collecte/correspondance";
import { convertirJournalier, derivationTotal, trancherUnite } from "../src/collecte/unite-prix";
import { QUALIFIANTS } from "../src/collecte/extraction";
import type { Rejet } from "../src/collecte/citation";

const DECOUVERTES =
  process.argv.includes("--source")
    ? process.argv[process.argv.indexOf("--source") + 1]!
    : "src/donnees/urls-decouvertes.json";
const JOURNAL = "src/donnees/journal-extraction.json";
const REJETS = "src/donnees/rejets-extraction.json";
const LE = new Date().toISOString().slice(0, 10);

type Decouverte = {
  organisme: string;
  urls: { id: number | null; url: string; lastmod: string | null; score: number }[];
};

const argv = process.argv.slice(2);
const tout = argv.includes("--tout");
const taille = Number(argv[argv.indexOf("--lot") + 1] ?? 20);

function fileDeTravail(catalogue: readonly OffreNormalisee[]) {
  if (!existsSync(DECOUVERTES)) {
    throw new Error(`${DECOUVERTES} absent — lancer d'abord « bun run collecte:sitemaps ».`);
  }
  const decouvertes = JSON.parse(readFileSync(DECOUVERTES, "utf8")) as Decouverte[];
  const parId = new Map(catalogue.map((o) => [o.id, o]));

  // Priorité aux fiches rapprochées et sans prix : c'est le champ dont
  // l'absence fait réellement partir un utilisateur.
  return decouvertes
    .flatMap((d) => d.urls.map((u) => ({ ...u, organisme: d.organisme })))
    .filter((u) => u.id !== null)
    .map((u) => ({ ...u, offre: parId.get(u.id!)! }))
    .filter((u) => u.offre !== undefined)
    .sort((a, b) => Number(a.offre.prix !== null) - Number(b.offre.prix !== null));
}

/**
 * Lot stratifié — un taux de citation mesuré sur une seule strate n'est pas un
 * taux de catalogue. Une page d'université est longue et verbeuse, une page
 * d'éditeur courte et dense en chiffres : la moyenne des deux écrase deux
 * régimes distincts.
 */
function stratifier<T extends { offre: { categorie: string } }>(file: T[], taille: number): T[] {
  const parStrate = new Map<string, T[]>();
  for (const e of file) {
    const liste = parStrate.get(e.offre.categorie) ?? [];
    liste.push(e);
    parStrate.set(e.offre.categorie, liste);
  }
  const lot: T[] = [];
  let tour = 0;
  while (lot.length < taille) {
    let ajoute = false;
    for (const liste of parStrate.values()) {
      const e = liste[tour];
      if (e && lot.length < taille) {
        lot.push(e);
        ajoute = true;
      }
    }
    if (!ajoute) break;
    tour++;
  }
  return lot;
}

async function main() {
  const catalogue = chargerCatalogue();
  const file = fileDeTravail(catalogue);
  /*
    LOT DE RÉFÉRENCE FIGÉ.

    Sans lui, une partie de chaque écart vient du corpus et non des
    corrections — et on ne peut jamais savoir laquelle. Le lot est choisi une
    fois, écrit sur disque, et rejoué à l'identique à chaque mesure.

    Il ne compte pas six pages par strate : la file n'en contient pas assez.
    Universités 4, bootcamps 3, éditeurs 2, MOOC 2 — c'est le plafond réel, et
    il vient du taux d'appariement de 25 %, pas d'un choix de mesure.
  */
  const REFERENCE = "src/donnees/lot-reference.json";
  let lot: typeof file;
  if (process.argv.includes("--reference")) {
    if (existsSync(REFERENCE)) {
      const ids = JSON.parse(readFileSync(REFERENCE, "utf8")) as { id: number; url: string }[];
      const parCle = new Map(file.map((e) => [`${e.id}|${e.url}`, e]));
      lot = ids.map((r) => parCle.get(`${r.id}|${r.url}`)).filter((e): e is (typeof file)[number] => e !== undefined);
      console.log(`Lot de référence rejoué : ${lot.length} pages`);
    } else {
      lot = stratifier(file, taille);
      writeFileSync(REFERENCE, JSON.stringify(lot.map((e) => ({ id: e.id, url: e.url })), null, 1));
      console.log(`Lot de référence figé : ${lot.length} pages → ${REFERENCE}`);
    }
  } else {
    lot = tout ? file : stratifier(file, taille);
  }
  const client = clientAnthropic();

  // Le modèle est journalisé : une mesure dont on ignore le modèle ne se
  // compare à rien.
  console.log(`\nExtraction — ${lot.length} page(s) sur ${file.length} en file`);
  console.log(`Modèle : ${MODELE}\n`);

  /*
    APPEL DE CONTRÔLE, avant le lot.

    Quarante appels ont été perdus sur une compilation de grammaire, puis trente
    sur un paramètre refusé. Chacune de ces erreurs se voyait sur le PREMIER
    appel. Une page suffit donc à valider la configuration ; le reste ne part
    qu'ensuite.
  */
  const sonde = lot[0];
  if (sonde !== undefined) {
    const reponse = await recuperer(sonde.url);
    if (reponse.ok) {
      const texte = texteprincipal(reponse.texte);
      if (!exigeRepliNavigateur(texte)) {
        try {
          const essai = await extrairePage(client, texte, sonde.url);
          console.log(
            `Appel de contrôle : ${Object.keys(essai.filtrage.retenus).length}/${essai.proposes} champs cités — configuration valide.\n`,
          );
        } catch (erreur) {
          console.error(
            `\nAppel de contrôle EN ÉCHEC — le lot n'est pas lancé.\n` +
              `${erreur instanceof Error ? erreur.message : String(erreur)}\n`,
          );
          process.exit(1);
        }
      }
    }
  }

  const journal: EcritureJournalisee[] = [];
  const rejets: (Rejet & { id: number; url: string })[] = [];
  const echecs: { id: number; url: string; motif: string }[] = [];
  /*
    Les appariements erronés ne sont pas seulement ignorés à l'écriture : ils
    désignent des rapprochements faux à défaire dans le catalogue. Les ignorer
    en silence les laisserait rejouer à chaque passe.
  */
  const mauvaisAppariements: {
    id: number;
    fiche: string;
    url: string;
    intitulePage: string | null;
    score: number;
  }[] = [];
  let proposes = 0;
  let retenus = 0;
  let pagesLues = 0;
  let repliNecessaire = 0;
  const fichesTouchees = new Set<number>();
  const parStrate = new Map<string, { proposes: number; retenus: number; pages: number }>();

  /*
    AVANCEMENT PERSISTÉ À CHAQUE PAGE.

    Les deux tentatives précédentes ont été interrompues avant terme et ont tout
    perdu : le journal n'était écrit qu'à la fin. Une passe longue qui ne
    survit pas à son interruption ne finit jamais — elle recommence.
  */
  const sauvegarder = () => {
    writeFileSync(JOURNAL, JSON.stringify(journal, null, 1));
    writeFileSync(REJETS, JSON.stringify({ rejets, echecs, mauvaisAppariements }, null, 1));
  };

  await enParallele(lot, 6, async (entree, index) => {
    const etiquette = `${String(index + 1).padStart(3)}/${lot.length}  ${entree.offre.nom.slice(0, 40).padEnd(40)}`;

    const reponse = await recuperer(entree.url);
    if (!reponse.ok) {
      // Un échec réseau n'est jamais une absence d'information.
      echecs.push({ id: entree.id!, url: entree.url, motif: reponse.motif });
      console.log(`${etiquette} ✗ ${reponse.motif}`);
      return;
    }

    let texte = texteprincipal(reponse.texte);
    // Conservé pour la vérification de correspondance : une page rendue côté
    // client ne porte son intitulé que dans le HTML produit par le navigateur.
    let html = reponse.texte;

    /*
      REPLI NAVIGATEUR. Le seuil de page vide ne suffit pas : Coursera sert
      12 360 caractères pour 890 Ko de HTML — au-dessus du seuil, et pourtant
      amputé de l'essentiel. On compare donc le texte obtenu au volume de HTML
      servi : sous 3 %, la page est presque sûrement rendue côté client.
    */
    const ratio = texte.length / Math.max(1, reponse.texte.length);
    if (exigeRepliNavigateur(texte) || ratio < 0.03) {
      repliNecessaire++;
      const rendu = await rendre(entree.url);
      if (rendu.ok) {
        const apres = texteprincipal(rendu.html);
        // On ne retient le rendu que s'il apporte réellement du texte : un
        // navigateur qui rend moins que la récupération simple n'a rien appris.
        if (apres.length > texte.length) {
          console.log(
            `${etiquette} ⟳ repli navigateur ${texte.length} → ${apres.length} car.`,
          );
          texte = apres;
          html = rendu.html;
        }
      }
      // Un échec de rendu n'est jamais une absence d'information : si le texte
      // reste vide, la fiche sort de ce lot sans qu'aucun champ soit conclu.
      if (exigeRepliNavigateur(texte)) {
        echecs.push({
          id: entree.id!,
          url: entree.url,
          motif: rendu.ok ? "page_vide_apres_rendu" : `navigateur_${rendu.motif}`,
        });
        console.log(`${etiquette} ✗ page vide même après rendu`);
        return;
      }
    }

    /*
      La page lue est-elle bien celle du parcours ? Trois prix authentiques ont
      failli être écrits sur les mauvaises fiches faute de cette question.
    */
    const correspondance = verifierCorrespondance(entree.offre.nom, html);
    if (!correspondance.correspond) {
      mauvaisAppariements.push({
        id: entree.id!,
        fiche: entree.offre.nom,
        url: entree.url,
        intitulePage: correspondance.intitule,
        score: Number(correspondance.score.toFixed(2)),
      });
      console.log(
        `${etiquette} ✗ page d'un autre parcours (${correspondance.score.toFixed(2)}) — « ${correspondance.intitule?.slice(0, 46)} »`,
      );
      return;
    }

    pagesLues++;
    let extraction;
    try {
      extraction = await extrairePage(client, texte, entree.url);
    } catch (erreur) {
      echecs.push({
        id: entree.id!,
        url: entree.url,
        motif: erreur instanceof Error ? erreur.message.slice(0, 120) : "erreur_extraction",
      });
      console.log(`${etiquette} ✗ extraction`);
      return;
    }

    proposes += extraction.proposes;
    retenus += Object.keys(extraction.filtrage.retenus).length;
    const strate = parStrate.get(entree.offre.categorie) ?? { proposes: 0, retenus: 0, pages: 0 };
    strate.proposes += extraction.proposes;
    strate.retenus += Object.keys(extraction.filtrage.retenus).length;
    strate.pages += 1;
    parStrate.set(entree.offre.categorie, strate);
    rejets.push(...extraction.filtrage.rejets.map((r) => ({ ...r, id: entree.id!, url: entree.url })));

    const cites = extraction.filtrage.retenus;
    for (const [champ, cite] of Object.entries(cites)) {
      // Un qualifiant n'est pas une donnée : il rend le prix interprétable.
      if (champ in QUALIFIANTS) continue;

      let valeur = cite.valeur;
      let extrait = cite.extrait;
      let derive = false;

      /*
        Un prix sans unité identifiée est REJETÉ, jamais écrit par défaut en
        total. C'est le garde-fou qui manquait aux quatre tarifs journaliers de
        Dawan et Conversion Boosters, exacts au chiffre près et faux d'un
        facteur égal à la durée.
      */
      if ((champ === "prix" || champ === "prixIntra") && typeof valeur === "number" && valeur > 0) {
        const qualifiant = champ === "prix" ? "unitePrix" : "uniteIntra";
        const verdict = trancherUnite(
          cites[qualifiant]?.valeur as string | undefined,
          `${extrait} ${cites[qualifiant]?.extrait ?? ""}`,
        );
        let unite = verdict.unite;
        if (unite === null) {
          /*
            DÉRIVATION PUBLIÉE — sans mention d'unité et sans tarification
            journalière ailleurs sur la page, le tarif se lit comme un total.
            C'est la convention du secteur : « 11 390 € » sur une page de MSc ne
            se lit pas comme un tarif journalier.

            Deux conditions, pas une : l'absence de mention ne suffit pas. C'est
            ce qui sépare la dérivation du défaut silencieux qu'elle remplace —
            le défaut supposait, la dérivation constate avant de conclure.
          */
          const dérivation = verdict.motif === "unite_absente" ? derivationTotal(texte) : { derive: false, motif: verdict.motif };
          if (!dérivation.derive) {
            rejets.push({ champ, motif: dérivation.motif, valeur, extrait, id: entree.id!, url: entree.url });
            console.log(`${etiquette}   ✗ ${champ} ${valeur} € sans unité (${dérivation.motif})`);
            continue;
          }
          unite = "total";
          derive = true;
          console.log(`${etiquette}   ~ ${champ} ${valeur} € dérivé en total`);
        }
        /*
          Journalier converti quand la durée en jours est connue — et les deux
          conservés : le total pour comparer, l'unitaire parce que c'est ce que
          l'organisme publie.
        */
        const converti = convertirJournalier(valeur, unite, entree.offre.duree);
        if (unite === "journalier") {
          if (converti === null) {
            rejets.push({ champ, motif: "journalier_sans_duree", valeur, extrait, id: entree.id!, url: entree.url });
            console.log(`${etiquette}   ✗ ${champ} ${valeur} €/jour, durée inconnue`);
            continue;
          }
          valeur = converti.total;
          extrait = `${extrait} — ${converti.unitaire} €/jour × ${converti.jours} j`;
          console.log(`${etiquette}   ↻ ${champ} ${converti.unitaire} €/j × ${converti.jours} j = ${valeur} €`);
        }
        if (unite !== "total" && unite !== "journalier") {
          rejets.push({ champ, motif: `unite_${unite}`, valeur, extrait, id: entree.id!, url: entree.url });
          console.log(`${etiquette}   ✗ ${champ} ${valeur} € ${unite} — non comparable`);
          continue;
        }
      }

      journal.push(
        journaliser(
          {
            id: entree.id!,
            champ,
            ancienne: (entree.offre as unknown as Record<string, unknown>)[champ] ?? null,
            nouvelle: valeur,
            extrait,
            urlSource: entree.url,
          },
          {
            le: LE,
            origine: "extraction_automatique",
            motif: "Passe d'extraction automatisée",
            // L'état suit la valeur : une lecture qui est la nôtre doit être
            // contestable par le lecteur, donc visible sur la fiche.
            ...(derive ? { etat: "derive" as const, regleDerivation: "prix_sans_unite_lu_comme_total" } : {}),
          },
        ),
      );
    }
    fichesTouchees.add(entree.id!);
    sauvegarder();
    console.log(
      `${etiquette} ✓ ${String(Object.keys(extraction.filtrage.retenus).length).padStart(2)}/${String(extraction.proposes).padStart(2)} champs cités`,
    );
  });

  await fermerNavigateur();
  sauvegarder();

  const tauxCitation = proposes === 0 ? 0 : Math.round((retenus / proposes) * 100);
  const parMotif = rejets.reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r.motif]: (acc[r.motif] ?? 0) + 1 }),
    {},
  );

  const depense = client.depense();
  console.log(`\n  Appels au modèle             : ${depense.appels}`);
  console.log(
    `  Caractères envoyés          : ${depense.caracteresEnvoyes.toLocaleString("fr-FR")}` +
      ` (~${Math.round(depense.caracteresEnvoyes / 4).toLocaleString("fr-FR")} jetons)`,
  );
  console.log(`\n  Pages lues                    : ${pagesLues}/${lot.length}`);
  console.log(`  Repli navigateur nécessaire   : ${repliNecessaire}`);
  console.log(`  Champs proposés par le modèle : ${proposes}`);
  console.log(`  Champs retenus (cités)        : ${retenus}`);
  console.log(`  TAUX DE CITATION VALIDE       : ${tauxCitation} %`);
  console.log(`  Champs rejetés                : ${rejets.length}`);
  for (const [motif, n] of Object.entries(parMotif)) console.log(`      ${String(n).padStart(3)}  ${motif}`);
  console.log(`  Fiches passant à detail_verifie: ${fichesTouchees.size}`);
  console.log(`  APPARIEMENTS ERRONÉS À DÉFAIRE : ${mauvaisAppariements.length}`);
  for (const m of mauvaisAppariements) {
    console.log(`      ${m.fiche.slice(0, 40)}\n         ⟵ « ${m.intitulePage?.slice(0, 50)} » (${m.score})`);
  }
  console.log("\n  TAUX DE CITATION PAR STRATE");
  for (const [strate, v] of parStrate) {
    const taux = v.proposes === 0 ? 0 : Math.round((v.retenus / v.proposes) * 100);
    console.log(
      // Le nombre absolu d'abord : « 2 rejets sur 11 » se discute, « 69 % »
      // fabrique une fausse précision en cachant la taille de l'échantillon.
      `      ${strate.padEnd(26)} ${String(v.proposes - v.retenus).padStart(2)} rejet(s) sur ${String(v.proposes).padStart(2)} champs, ${v.pages} page(s)  — ${taux} %`,
    );
  }
  console.log(
    `  Gain moyen par fiche          : ${fichesTouchees.size === 0 ? 0 : (retenus / fichesTouchees.size).toFixed(1)} champs`,
  );
  console.log(`\n  → ${JOURNAL}\n  → ${REJETS}\n`);
}

main();
