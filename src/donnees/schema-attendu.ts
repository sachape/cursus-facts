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
  /*
    LES SIX TABLES DE COMPTE, lues depuis les migrations 20260810123706 et
    20260810123756 — jamais devinées. Mes six suppositions de noms étaient
    fausses avant de les lire : le rattachement s'appelle `utilisateur_id` et
    non `user_id`, l'horodatage `cree_le` et non `created_at`.

    Ce n'est pas un détail de vocabulaire. Un code écrit sur des noms supposés
    ne tombe pas en erreur claire : PostgREST renvoie « column X does not
    exist » à l'exécution, en production, sur la première action d'un
    utilisateur connecté.
  */
  profils: [
    { colonne: "id", type: "uuid primary key references auth.users(id) on delete cascade" },
    { colonne: "email", type: "text not null" },
    { colonne: "cree_le", type: "timestamptz not null default now()" },
    { colonne: "derniere_connexion", type: "timestamptz" },
  ],
  sauvegardes: [
    { colonne: "utilisateur_id", type: "uuid not null references profils(id) on delete cascade" },
    { colonne: "type", type: "text not null check (type in ('parcours','organisme'))" },
    { colonne: "cible_id", type: "text not null" },
    { colonne: "cree_le", type: "timestamptz not null default now()" },
  ],
  comparaisons: [
    { colonne: "utilisateur_id", type: "uuid not null references profils(id) on delete cascade" },
    { colonne: "nom", type: "text" },
    { colonne: "parcours_ids", type: "text[] not null, 2 à 4 éléments" },
    { colonne: "cree_le", type: "timestamptz not null default now()" },
    { colonne: "consulte_le", type: "timestamptz" },
  ],
  alertes: [
    { colonne: "utilisateur_id", type: "uuid not null references profils(id) on delete cascade" },
    { colonne: "parcours_id", type: "text not null" },
    { colonne: "champs_surveilles", type: "text[] not null default '{cout_apprenant}'" },
    { colonne: "active", type: "boolean not null default true" },
    { colonne: "derniere_notification", type: "timestamptz" },
  ],
  historique_champs: [
    { colonne: "parcours_id", type: "text not null" },
    { colonne: "champ", type: "text not null" },
    { colonne: "valeur_precedente", type: "text" },
    { colonne: "valeur_nouvelle", type: "text" },
    /*
      Les états sont conservés À CÔTÉ des valeurs, et c'est ce qui permet de
      NE PAS notifier un changement d'état seul. Un champ qui passe de « pas
      encore collecté » à « non publié par l'organisme » est un changement pour
      nous, pas pour l'utilisateur. Seule une valeur qui change de valeur
      déclenche un email.
    */
    { colonne: "etat_precedent", type: "text" },
    { colonne: "etat_nouveau", type: "text" },
    { colonne: "origine", type: "text not null check (extraction_automatique | correction_manuelle | declaration_organisme | signalement_utilisateur)" },
    { colonne: "source_url", type: "text" },
    { colonne: "citation", type: "text" },
    { colonne: "modifie_le", type: "timestamptz not null default now()" },
  ],
  notifications_envoyees: [
    { colonne: "alerte_id", type: "uuid not null references alertes(id) on delete cascade" },
    { colonne: "historique_id", type: "uuid not null references historique_champs(id)" },
    { colonne: "envoye_le", type: "timestamptz not null default now()" },
  ],
  parcours: [
    { colonne: "profondeur", type: "text not null default 'catalogue_seul'" },
    { colonne: "profondeur_verifiee_le", type: "date" },
    { colonne: "dispo_inter", type: "boolean" },
    { colonne: "dispo_intra", type: "boolean" },
    { colonne: "prix_intra", type: "integer" },
    /*
      UNITE_PRIX — posée le 16 août 2026, après deux prix annuels enregistrés
      comme des totaux. Le modèle la prévoyait « obligatoire dès qu'un prix
      existe » ; elle n'avait jamais été implémentée, et le garde-fou d'unité
      ne pouvait donc rien garantir en aval de l'extraction.

      Un prix sans unité n'est pas affichable : « 4 990 € » et « 4 990 € par
      année » ne disent pas la même chose, et le filtre budget les traite
      aujourd'hui à l'identique — comme il traite 49 €/mois et un diplôme.

      Pas de valeur par défaut « total ». Un défaut silencieux est exactement
      ce qui a produit la faute : il faut que l'absence se voie.
    */
    { colonne: "unite_prix", type: "text check (unite_prix in ('total','annuel','mensuel','journalier','horaire'))" },
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
