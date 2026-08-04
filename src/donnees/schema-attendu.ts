/**
 * Contrat de schéma — « le schéma précède le code », rendu mécanique.
 *
 * La règle était bonne et ne tenait que par la discipline : rien ne l'imposait.
 * Le 4 août 2026, une requête lisant `modalite_commerciale` a été déployée
 * avant la migration qui créait la colonne, et le catalogue est tombé en 500
 * muet — « The app returned 500 while handling GET / », sans nom de colonne,
 * sans piste.
 *
 * Ce module transforme ce silence en instruction. Une colonne manquante produit
 * un message qui la nomme et donne le prompt à envoyer. Un 500 muet coûte une
 * heure ; une erreur qui dit quoi faire coûte une minute.
 */

/** Colonnes qu'une migration doit avoir créées avant que ce code les lise. */
export const COLONNES_REQUISES: Record<string, { colonne: string; type: string }[]> = {
  parcours: [
    { colonne: "profondeur", type: "text not null default 'catalogue_seul'" },
    { colonne: "profondeur_verifiee_le", type: "date" },
    { colonne: "dispo_inter", type: "boolean" },
    { colonne: "dispo_intra", type: "boolean" },
    { colonne: "prix_intra", type: "integer" },
  ],
};

/** Vrai si le message d'erreur PostgREST signale une colonne absente. */
export function colonneAbsente(message: string): boolean {
  return /does not exist|column .* of relation|schema cache/i.test(message);
}

/** Le nom de la colonne manquante, extrait du message PostgREST. */
export function colonneManquante(message: string): string | null {
  return message.match(/column\s+(?:\w+\.)?["']?([a-z_]+)["']?\s+does not exist/i)?.[1] ?? null;
}

/**
 * Message d'erreur qui dit quoi faire, plutôt que d'échouer en silence.
 *
 * Il porte le prompt Lovable prêt à copier : c'est le seul geste qui débloque,
 * et le chercher est ce qui coûte l'heure.
 */
export function diagnostiquer(table: string, message: string): string {
  const nom = colonneManquante(message);
  const attendues = COLONNES_REQUISES[table] ?? [];
  const manquante = attendues.find((c) => c.colonne === nom);

  const entete =
    `Schéma en retard sur le code : la colonne « ${nom ?? "?"} » manque dans « ${table} ».\n` +
    `Le code a été déployé avant sa migration — le schéma doit toujours précéder le code.\n`;

  if (!manquante) {
    return (
      `${entete}\nCette colonne n'est pas dans le contrat de schéma ` +
      `(src/donnees/schema-attendu.ts). Soit la migration a supprimé une colonne ` +
      `encore lue, soit le contrat n'a pas été tenu à jour.\n\nMessage brut : ${message}`
    );
  }

  return (
    `${entete}\nPROMPT LOVABLE À ENVOYER :\n\n` +
    `  ALTER TABLE public.${table}\n` +
    `    ADD COLUMN ${manquante.colonne} ${manquante.type};\n\n` +
    `Ne touche à aucune autre colonne.\n`
  );
}
