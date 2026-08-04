# Formlist Facts

Je construis Formlist, un comparateur de formations e-commerce français.

Principe non négociable : ce produit ne note rien, ne classe rien par qualité, ne

touche aucune commission. Il compare des faits vérifiables. Aucun score, aucune

moyenne, aucune note, nulle part.

Pour ce premier prompt, ne construis AUCUNE interface. Je veux uniquement le socle

technique et le schéma de base de données. Active Lovable Cloud.

SCHÉMA

Table `organismes`

- id (uuid), nom (text), site (text)

- categorie : enum parmi universite, ecole, bootcamp, formation_professionnelle,

  certification_editeur, mooc_plateforme, formation_independante

- certifications_qualite (text[])

Table `parcours` (l'unité de comparaison, c'est la fiche)

- id (uuid), organisme_id (fk), nom (text), slug (text unique)

- domaine : enum parmi ecommerce, marketplaces, publicite_payante, referencement,

  email_crm, data_conversion, creation_site, marketing_digital, commerce_vente

- sujet_principal (text, obligatoire), competences_couvertes (text[])

- Les 18 champs d'information, chacun sa colonne typée :

  1 prix_min (numeric), prix_max (numeric)

  2 modalites_paiement (text)

  3 duree (text)

  4 volume_horaire (integer)

  5 format : enum distanciel, presentiel, alternance, hybride

  6 lieu (text)

  7 niveau_entree : enum aucun_prerequis, bac2, bac3, experience

  8 prerequis (text)

  9 eligible_cpf (boolean)

  10 financements_acceptes (text[])

  11 certification (text)

  12 code_rncp_rs (text)

  13 outils_enseignes (text[])

  14 programme (jsonb, liste de modules)

  15 non_couvert (text[])

  16 site_officiel (text)

  17 source_information (text)

  18 date_verification (date)

- etats (jsonb) : mappe chacun des 18 champs à son état, parmi renseigne,

  non_communique, non_applicable, a_confirmer

- infos_renseignees (integer), infos_applicables (integer)

- statut_regroupement : enum autonome, fusionne, replie_arbitrage

- parcours_parent_id (fk nullable, vers parcours), motif_regroupement (text)

- ecart_classification (text nullable) : trace un domaine déclaré manuellement

- created_at, updated_at

Table `variantes`

- id, parcours_id (fk), label (text), prix (numeric), duree (text),

  volume_horaire (integer), accompagnement (text)

Table `sessions` — hors périmètre fonctionnel, mais crée-la maintenant pour ne pas

restructurer plus tard

- id, variante_id (fk), date_debut (date), ville (text), places (integer),

  tarif_promotionnel (numeric)

Table `arbitrages` — file de décisions manuelles, publique

- id, parcours_ids (uuid[]), regle_muette (text), preuve_retenue (text),

  decision (text), auteur (text), date_decision (timestamptz), created_at

RÈGLES DE DONNÉES

- Aucune information n'est jamais déduite. Un champ non publié vaut

  « non_communique », jamais une estimation ou une valeur par analogie.

- Une fiche incomplète reste au catalogue. L'absence d'information ne retire

  jamais une fiche.

- Ne crée aucune colonne de score, de note, de moyenne ou de pourcentage de

  complétude. Le compteur est un rapport de deux entiers, jamais un pourcentage.

RLS : lecture publique sur organismes, parcours, variantes, sessions, arbitrages.

Écriture réservée au service role pour l'instant.

Stack : Vite + React + TypeScript + Tailwind + shadcn/ui. Génère aussi les types

TypeScript correspondant au schéma.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8b38a3e4-b91e-4362-b24d-95bd509d4400).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
