# Formlist — socle technique et base de données

Aucune interface dans cette étape. Uniquement le backend (Lovable Cloud) et les types TypeScript.

## Principes appliqués au schéma

- Aucune colonne de score, note, moyenne ou pourcentage nulle part.
- Le compteur de complétude est un couple d'entiers : `infos_renseignees` / `infos_applicables`.
- Aucune valeur déduite : un champ non publié reste vide et son état vaut `non_communique`.
- Une fiche incomplète reste au catalogue : aucun filtre ni contrainte ne supprime une fiche pour cause d'information manquante.

## Étapes

1. Activer Lovable Cloud (base de données, auth, storage, fonctions serveur).
2. Créer les types enum : `categorie_organisme`, `domaine_parcours`, `format_parcours`, `niveau_entree`, `etat_information`, `statut_regroupement`.
3. Créer les tables `organismes`, `parcours`, `variantes`, `sessions`, `arbitrages` exactement comme spécifié, avec les 18 champs d'information typés un par colonne.
4. Ajouter les GRANT nécessaires, activer RLS, et créer les politiques : lecture publique (anon + authenticated) sur les cinq tables, écriture réservée au service role.
5. Ajouter les index utiles (slug unique, `organisme_id`, `domaine`, `parcours_parent_id`, `variante_id`) et un trigger `updated_at` sur `parcours`.
6. Générer les types TypeScript du schéma et un module de types métier lisible (`src/types/cursus.ts`) : enums, clés des 18 champs d'information, type `EtatsInformation`, et types `Organisme`, `Parcours`, `Variante`, `Session`, `Arbitrage`.

## Détails techniques

- `parcours.etats` est un `jsonb` non nul, par défaut un objet mappant les 18 clés de champs vers `non_communique`. Le type TS `EtatsInformation` sera un `Record<ChampInformation, EtatInformation>` pour garantir l'exhaustivité côté code.
- `parcours.programme` est un `jsonb` (tableau de modules `{ titre, contenu? , duree? }`).
- `parcours.parcours_parent_id` référence `parcours(id)` avec `ON DELETE SET NULL`.
- `arbitrages.parcours_ids` est un `uuid[]` (pas de FK possible sur un tableau) ; la table est en lecture publique.
- `sessions` est créée maintenant mais reste hors périmètre fonctionnel : aucune logique applicative ne s'y appuie.
- Le compteur `infos_renseignees` / `infos_applicables` est stocké en deux `integer` ; aucune colonne calculée en pourcentage n'est créée.
- Stack conservée : Vite + React + TypeScript + Tailwind + shadcn/ui (TanStack Start est le routeur du template et reste en place). Aucune page n'est modifiée à cette étape.
