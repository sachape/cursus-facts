/**
 * Invariants du catalogue — l'état de santé réel.
 *
 * Les tests par l'exemple passaient au vert pendant qu'INSEEC affichait
 * « aucun frais » sur un master à 8 175 €. Un test couvre un cas ; un invariant
 * couvre le catalogue. C'est cette classe de défauts qu'il attrape — la règle
 * juste, la donnée juste, et une couche en aval qui contourne.
 *
 * UN INVARIANT QUI ÉCHOUE AU PREMIER LANCEMENT EST UN SUCCÈS : il vient de
 * trouver une dette existante. On ne l'assouplit jamais pour le faire passer.
 */
import { chargerCatalogue, type OffreNormalisee } from "../src/donnees/catalogue";
import { determinerEtats } from "../src/modele/completude";
import { deriver, DECLARATIONS_GENERALES, REGLE_ALTERNANCE } from "../src/modele/derivation";
import { conditionDuCout } from "../src/modele/condition-cout";
import { CHAMPS_INFORMATION, compterInformations } from "../src/types/cursus";

const catalogue = chargerCatalogue();
const nom = (o: OffreNormalisee) => `${o.organisme} — ${o.nom.slice(0, 44)}`;

type Resultat = { titre: string; infractions: string[] };
const resultats: Resultat[] = [];
const verifier = (titre: string, f: (o: OffreNormalisee) => string | null) =>
  resultats.push({
    titre,
    infractions: catalogue.map(f).filter((x): x is string => x !== null),
  });

verifier("1. Aucune fiche catalogue_seul ne porte un champ « non publié »", (o) => {
  if (o.profondeur === "detail_verifie") return null;
  const etats = determinerEtats(o);
  const fautifs = CHAMPS_INFORMATION.filter((c) => etats[c] === "non_communique");
  return fautifs.length > 0 ? `${nom(o)} → ${fautifs.join(", ")}` : null;
});

verifier("2. Aucune fiche detail_verifie ne porte un champ « non collecté »", (o) => {
  if (o.profondeur !== "detail_verifie") return null;
  const etats = determinerEtats(o);
  const fautifs = CHAMPS_INFORMATION.filter((c) => etats[c] === "non_collecte");
  return fautifs.length > 0 ? `${nom(o)} → ${fautifs.join(", ")}` : null;
});

const REGLES_PUBLIEES = new Set([REGLE_ALTERNANCE]);
verifier("3. Toute dérivation renvoie à une règle de la liste fermée", (o) => {
  const inconnues = deriver(o).filter(
    (d) =>
      !REGLES_PUBLIEES.has(d.regle) &&
      !Object.values(DECLARATIONS_GENERALES).some((x) => d.regle.includes(x.source)),
  );
  return inconnues.length > 0 ? `${nom(o)} → ${inconnues.map((d) => d.champ).join(", ")}` : null;
});

verifier("4. Aucun coût dérivé à zéro quand l'organisme publie un tarif", (o) => {
  const derivePrix = deriver(o).some((d) => d.champ === "prix");
  return derivePrix && o.prix !== null && o.prix > 0 ? nom(o) : null;
});

/*
  L'invariant qui aurait attrapé INSEEC.

  Les quatre précédents portent sur la donnée et le modèle. Le défaut INSEEC
  vivait dans la RESTITUTION : la règle était juste, la donnée était juste, et
  l'affichage concluait tout seul. Un invariant qui interroge les mêmes
  fonctions que celles qu'il vérifie ne peut pas voir ça — il faut interroger
  ce que l'utilisateur lit.
*/
verifier("4 bis. Aucune fiche n'affiche « aucun frais » avec un tarif publié", (o) => {
  const cout = conditionDuCout({
    prix: o.prix,
    modaliteAcces: o.modaliteAcces,
    formats: o.formats,
    categorie: o.categorie,
    eligibleCpf: o.cpf === 1,
    dispoInter: o.dispoInter,
    dispoIntra: o.dispoIntra,
  });
  const annonceGratuit = cout.valeur !== null && /aucun frais|gratuit/i.test(cout.valeur);
  return annonceGratuit && o.prix !== null && o.prix > 0 ? `${nom(o)} (${o.prix} €)` : null;
});

/*
  10. `non_applicable` n'est jamais déduit hors de la liste fermée.

  Version vérifiable de la règle. L'énoncé « aucun non_applicable sur une fiche
  catalogue_seul » signalerait les 165 champs produits par les deux règles
  publiées (lieu, modalités de paiement) — qui sont légitimes par la seconde
  branche de la règle. Ce que l'invariant doit attraper, c'est un
  `non_applicable` qui ne remonte à AUCUNE règle publiée : c'était le cas de la
  règle « volume horaire sur mesure », écrite et révoquée le 4 août.
*/
const CHAMPS_A_REGLE_PUBLIEE = new Set(["lieu", "modalites_paiement"]);
verifier("10. Aucun non_applicable sans lecture de page ET règle publiée", (o) => {
  const etats = determinerEtats(o);
  const fautifs = CHAMPS_INFORMATION.filter(
    (c) =>
      etats[c] === "non_applicable" &&
      (!CHAMPS_A_REGLE_PUBLIEE.has(c) || o.profondeur !== "detail_verifie"),
  );
  return fautifs.length > 0 ? `${nom(o)} → ${fautifs.join(", ")}` : null;
});

verifier("5. Toute valeur écrite par le pipeline porte une citation", (o) =>
  // Le pipeline n'écrit qu'après `filtrerParCitation`, et l'application au
  // catalogue journalise l'extrait dans `historique`. Une valeur d'origine
  // « extraction_automatique » sans extrait serait un contournement.
  (o.historique ?? []).some((h) => /Extraction automatique/.test(h.motif) && !/« .* »/.test(h.motif))
    ? nom(o)
    : null,
);

verifier("6. Aucun coût à zéro sans qualification de sa gratuité", (o) => {
  if (o.prix !== 0) return null;
  const etats = determinerEtats(o);
  if (etats.prix !== "renseigne") return null; // déclassé ou dérivé : qualifié ailleurs
  const cout = conditionDuCout({
    prix: o.prix,
    modaliteAcces: o.modaliteAcces,
    formats: o.formats,
    categorie: o.categorie,
    eligibleCpf: o.cpf === 1,
    dispoInter: o.dispoInter,
    dispoIntra: o.dispoIntra,
  });
  return cout.valeur === null && cout.condition === null ? nom(o) : null;
});

verifier("7. Le dénominateur exclut non_applicable, sur_demande et non_collecte", (o) => {
  const etats = determinerEtats(o);
  const c = compterInformations(etats);
  const exclus = CHAMPS_INFORMATION.filter((x) =>
    ["non_applicable", "non_collecte", "communique_sur_demande"].includes(etats[x]),
  ).length;
  const attendu = CHAMPS_INFORMATION.length - exclus;
  const renseignes = CHAMPS_INFORMATION.filter((x) =>
    ["renseigne", "derive"].includes(etats[x]),
  ).length;
  return c.applicables !== attendu || c.renseignees !== renseignes ? nom(o) : null;
});

verifier("8. Toute fiche possède une URL de site officiel", (o) =>
  o.url === null || o.url.trim() === "" || o.url === "—" ? nom(o) : null,
);

verifier("9. Aucune valeur effacée sans passage par « à confirmer »", (o) => {
  const effacements = (o.historique ?? []).filter(
    (h) => h.valeurPrecedente !== null && !(o.aConfirmer ?? []).includes(h.champ),
  );
  // Une valeur remplacée par une autre est légitime ; une valeur devenue vide
  // sans déclassement est l'incident du 3 août.
  const perdues = effacements.filter(
    (h) => (o as unknown as Record<string, unknown>)[h.champ] == null,
  );
  return perdues.length > 0 ? `${nom(o)} → ${perdues.map((h) => h.champ).join(", ")}` : null;
});

console.log(`\nINVARIANTS DU CATALOGUE — ${catalogue.length} fiches\n`);
let totalInfractions = 0;
for (const r of resultats) {
  const n = r.infractions.length;
  totalInfractions += n;
  console.log(`${n === 0 ? "  ✓" : "  ✗"} ${r.titre}`);
  console.log(`      ${n} fiche(s) en infraction`);
  for (const i of r.infractions.slice(0, 8)) console.log(`        · ${i}`);
  if (n > 8) console.log(`        … et ${n - 8} autre(s)`);
}
/*
  DETTE DÉCLARÉE.

  Les 14 fiches sans URL sont une dette héritée, nommée et datée dans
  `preparer.test.ts` : toutes des créateurs indépendants entrés au catalogue
  avant que la règle existe. Faire échouer la CI dessus à chaque poussée noierait
  la vraie régression sous une alerte permanente — un signal qui se déclenche
  toujours cesse d'être lu.

  Ce plafond ne doit que DÉCROÎTRE. Toute infraction au-delà fait échouer, et
  l'abaisser exige de résorber la dette, jamais de relever le nombre.
*/
const DETTE_DECLAREE = 14;

console.log(`\n  TOTAL : ${totalInfractions} infraction(s) sur ${resultats.length} invariants`);
if (totalInfractions > DETTE_DECLAREE) {
  console.log(`  ÉCHEC : ${totalInfractions - DETTE_DECLAREE} au-delà de la dette déclarée (${DETTE_DECLAREE}).\n`);
  process.exit(1);
}
if (totalInfractions < DETTE_DECLAREE) {
  console.log(`  La dette a diminué : abaisser DETTE_DECLAREE à ${totalInfractions}.\n`);
} else {
  console.log(`  Toutes couvertes par la dette déclarée.\n`);
}
process.exit(0);
