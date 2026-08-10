/**
 * Formatage de nombre déterministe.
 *
 * Même motif que les dates : `toLocaleString` dépend des données ICU du moteur,
 * qui diffèrent entre Node et le navigateur. Un séparateur de milliers rendu
 * côté serveur et réhydraté différemment suffit à faire jeter tout l'arbre à
 * React — c'est ce qui a fait tomber six invariants le 10 août 2026.
 *
 * L'espace employé est une ESPACE FINE INSÉCABLE (U+202F), conforme à l'usage
 * typographique français et insécable par construction : un séparateur qui
 * casse en fin de ligne coupe le nombre en deux.
 */
export function formaterNombre(valeur: number): string {
  const signe = valeur < 0 ? "-" : "";
  const chiffres = Math.abs(Math.trunc(valeur)).toString();
  let sortie = "";
  for (let i = 0; i < chiffres.length; i++) {
    if (i > 0 && (chiffres.length - i) % 3 === 0) sortie += " ";
    sortie += chiffres[i];
  }
  return signe + sortie;
}
