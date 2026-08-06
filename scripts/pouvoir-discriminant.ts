/**
 * Pouvoir discriminant des cinq questions de l'aide au choix.
 *
 * LA QUESTION POSÉE. Une question qui ne réduit presque rien fait perdre un
 * écran à l'utilisateur sans rien apporter à la sortie. Trois questions qui
 * trient réellement valent mieux que cinq dont deux ne servent à rien — encore
 * faut-il le mesurer plutôt que le supposer.
 *
 * CE QUI EST COMPTÉ. `evaluer` ne filtre pas : il constate des correspondances
 * et des écarts, et le classement trie par nombre d'écarts. « Parcours
 * restants » désigne donc les parcours que cette réponse laisse SANS écart sur
 * son propre critère — ceux qui restent des candidats acceptables. Une question
 * dont toutes les réponses laissent 100 % du catalogue ne départage personne.
 *
 * ATTRIBUTION DES ÉCARTS. Les cinq critères sont indépendants dans `evaluer` :
 * chacun produit ses propres phrases. On les rattache par leur amorce, et
 * l'attribution est VÉRIFIÉE — un écart non reconnu fait échouer le script au
 * lieu d'être compté à zéro. Sans ce contrôle, reformuler un message ferait
 * silencieusement chuter le pouvoir discriminant mesuré d'une question.
 */
import { preparerIngestion } from "../src/ingestion/preparer";
import { evaluer, QUESTIONS, type Situation } from "../src/modele/adequation";
import type { ParcoursListe } from "../src/donnees/requetes";

/* -------------------------------------------------------------------------- */
/* Le catalogue, réduit à ce que `evaluer` lit réellement                      */
/* -------------------------------------------------------------------------- */

const fiches = preparerIngestion().fiches.map((f) => {
  const c = f.colonnes;
  return {
    slug: f.slug,
    nom: c["nom"],
    domaine: c["domaine"],
    sujetPrincipal: c["sujet_principal"] ?? "",
    competencesCouvertes: (c["competences_couvertes"] as string[] | null) ?? [],
    prixMin: (c["prix_min"] as number | null) ?? null,
    volumeHoraire: (c["volume_horaire"] as number | null) ?? null,
    formats: (c["formats"] as string[] | null) ?? [],
    niveauEntree: (c["niveau_entree"] as string | null) ?? null,
    eligibleCpf: (c["eligible_cpf"] as boolean | null) ?? null,
    financements: (c["financements_acceptes"] as string[] | null) ?? null,
    codeRncpRs: (c["code_rncp_rs"] as string | null) ?? null,
    infosRenseignees: (c["infos_renseignees"] as number | null) ?? 0,
  } as unknown as ParcoursListe;
});

const TOTAL = fiches.length;

/* -------------------------------------------------------------------------- */
/* Rattachement d'un écart à la question qui l'a produit                       */
/* -------------------------------------------------------------------------- */

const AMORCES: Record<keyof Situation, readonly string[]> = {
  budget: ["Le prix n'est pas publié", "Budget dépassé", "Aucun financement CPF"],
  temps: ["Charge horaire incompatible"],
  depart: ["Prérequis non détenu"],
  canal: ["Canal non couvert"],
  objectif: [
    "Aucun code RNCP ou RS publié",
    "Ni certification enregistrée ni alternance",
    "Domaine éloigné du lancement",
  ],
};

function questionDe(ecart: string): keyof Situation {
  for (const [cle, amorces] of Object.entries(AMORCES)) {
    if (amorces.some((a) => ecart.startsWith(a))) return cle as keyof Situation;
  }
  throw new Error(
    `Écart non rattaché à une question : « ${ecart} ».\n` +
      `Un message a changé sans que AMORCES suive. Corrige la table plutôt que ` +
      `de laisser le pouvoir discriminant tomber à zéro en silence.`,
  );
}

/*
  Situation de référence pour les quatre autres réponses. Elle n'influence pas
  le résultat — les critères sont indépendants — mais `evaluer` exige une
  situation complète. Les valeurs les plus permissives sont choisies pour que
  le script échoue bruyamment si cette indépendance cessait d'être vraie.
*/
const REFERENCE: Situation = {
  objectif: "developper_activite",
  budget: "plus_2500",
  temps: "temps_plein",
  depart: "en_poste",
  canal: "pas_decide",
};

/* -------------------------------------------------------------------------- */

type Ligne = { question: string; reponse: string; restants: number; reduction: number };
const lignes: Ligne[] = [];

for (const question of QUESTIONS) {
  for (const [valeur, libelle] of Object.entries(question.options)) {
    const situation = { ...REFERENCE, [question.cle]: valeur } as Situation;
    const restants = fiches.filter(
      (p) => !evaluer(p, situation).ecarts.some((e) => questionDe(e) === question.cle),
    ).length;
    lignes.push({
      question: question.intitule,
      reponse: libelle,
      restants,
      reduction: (1 - restants / TOTAL) * 100,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Restitution                                                                 */
/* -------------------------------------------------------------------------- */

console.log(`\nPOUVOIR DISCRIMINANT DES CINQ QUESTIONS`);
console.log(`Catalogue : ${TOTAL} parcours\n`);

/*
  LES RÉPONSES NEUTRES SONT EXCLUES DES AGRÉGATS.

  « Pas encore décidé », « à temps plein », « je suis en poste » n'écartent
  personne PAR CONSTRUCTION : `evaluer` ne pose aucun critère quand la réponse
  n'en exprime aucun. Les compter tirait chaque moyenne vers le bas et gonflait
  chaque étendue d'autant — les 92,6 points du canal se comparaient alors aux
  17,0 du temps sans que ces deux nombres mesurent la même chose.

  Une neutre se reconnaît à son effet, jamais à son libellé : c'est une réponse
  qui laisse le catalogue entier. Repérée ainsi, une neutre ajoutée demain sort
  des agrégats sans qu'on ait à tenir une liste à jour.
*/
const estNeutre = (l: Ligne) => l.restants === TOTAL;

let questionCourante = "";
for (const l of lignes) {
  if (l.question !== questionCourante) {
    questionCourante = l.question;
    const utiles = lignes.filter((x) => x.question === l.question && !estNeutre(x));
    const moyenne = utiles.reduce((s, x) => s + x.reduction, 0) / utiles.length;
    const etendue =
      Math.max(...utiles.map((x) => x.reduction)) - Math.min(...utiles.map((x) => x.reduction));
    const neutres = lignes.filter((x) => x.question === l.question && estNeutre(x)).length;
    console.log(
      `\n${l.question}\n  réduction moyenne ${moyenne.toFixed(1)} %` +
        `  ·  écart entre réponses ${etendue.toFixed(1)} pts` +
        (neutres > 0 ? `  ·  ${neutres} neutre(s) exclue(s)` : `  ·  aucune neutre`),
    );
  }
  console.log(
    `    ${l.reponse.padEnd(38)} ${String(l.restants).padStart(4)} restants` +
      `  ${l.reduction.toFixed(1).padStart(6)} % écartés` +
      (estNeutre(l) ? "   ← neutre, hors agrégats" : ""),
  );
}

/*
  L'écart ENTRE RÉPONSES compte autant que la moyenne. Une question dont toutes
  les réponses écartent la même proportion du catalogue ne trie pas : elle
  applique la même coupe quoi qu'on réponde, donc elle ne dépend pas de la
  personne. C'est une question posée pour rien, même si sa réduction est forte.
*/
console.log(`\n\nSYNTHÈSE — neutres exclues, chiffres comparables entre questions\n`);
const parQuestion = QUESTIONS.map((q) => {
  const d = lignes.filter((l) => l.question === q.intitule && !estNeutre(l));
  return {
    intitule: q.intitule,
    moyenne: d.reduce((s, x) => s + x.reduction, 0) / d.length,
    etendue: Math.max(...d.map((x) => x.reduction)) - Math.min(...d.map((x) => x.reduction)),
  };
}).sort((a, b) => b.etendue - a.etendue);

for (const q of parQuestion) {
  console.log(
    `  ${q.etendue.toFixed(1).padStart(6)} pts d'écart  ·  ${q.moyenne.toFixed(1).padStart(5)} % moyen  ·  ${q.intitule}`,
  );
}
console.log();
