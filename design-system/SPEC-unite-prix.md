# Affichage de l'unité de prix — spécification

**Pour le chantier interface. Le modèle et l'ingestion sont posés ; l'affichage
reste à faire, et il n'a pas été touché.**

Le champ `unite_prix` existe désormais sur `parcours` : `total`, `annuel`,
`mensuel`, `journalier`, `horaire`. Il est `null` tant qu'il n'a pas été établi.

## Pourquoi

Deux prix ENACO annuels ont été enregistrés comme des totaux, et le catalogue
porte un abonnement Speed Ecom à **49 €/mois** à côté d'un diplôme à **4 990 €**.
Le filtre budget les traite aujourd'hui comme comparables : c'est une comparaison
fausse, et c'est le point le plus grave à l'usage.

`4 990 €` et `4 990 € par année` ne disent pas la même chose. Sur un parcours de
trois ans, le second vaut trois fois le premier.

## Règle générale

**On affiche l'unité publiée. On ne la convertit jamais.**

Convertir supposerait une durée fiable, et la durée est précisément le champ le
moins bien couvert du catalogue. Une conversion silencieuse est la faute Dawan —
un tarif journalier lu comme un total, faux d'un facteur égal à la durée.

`unite_prix = null` n'est pas `total`. C'est « non établi », et un prix dont
l'unité n'est pas établie **n'est pas affichable comme un montant comparable**.

## 1. La fiche

L'unité s'affiche **à côté du montant**, jamais en note de bas de page.

| `unite_prix` | Affichage |
|---|---|
| `total` | `4 190 €` |
| `annuel` | `4 990 € par année` |
| `mensuel` | `49 € par mois` |
| `journalier` | `975 € par jour` |
| `horaire` | `120 € par heure` |
| `null` | `4 190 €` suivi de la mention « unité non établie », au même traitement visuel qu'un champ à confirmer |

Le cas `null` ne se masque pas : c'est un état de collecte, et le produit affiche
ses états de collecte. Il relève du même vocabulaire visuel que `a_confirmer` —
`clay`, jamais `crimson` : une information non établie n'est pas une erreur.

## 2. La comparaison

**Deux prix d'unités différentes ne peuvent pas être mis côte à côte sans
mention.** Le tableau comparatif place aujourd'hui les montants dans une même
colonne, ce qui suggère qu'ils se comparent.

Trois exigences :

- Chaque cellule porte son unité, à l'identique de la fiche.
- Quand la colonne mélange au moins deux unités, une mention le dit —
  « unités différentes, non comparables directement ». Pas un avertissement, un
  fait.
- **Aucun calcul d'écart entre deux prix d'unités différentes.** Ni différence,
  ni ratio, ni « le moins cher ». C'est un jugement produit sur une base fausse,
  et l'invariant 1 l'interdit déjà pour d'autres raisons.

## 3. Le filtre budget — le plus grave

Aujourd'hui, une fourchette « moins de 1 000 € » retient l'abonnement Speed Ecom
à 49 €/mois **et** rien d'autre de comparable. Un utilisateur qui cherche une
formation à moins de 1 000 € reçoit un abonnement mensuel sans savoir que le coût
annuel dépasse sa fourchette.

**TRANCHÉ le 16 août 2026 : le filtre garde tout et affiche l'unité.**

Sortir les prix non totaux cacherait des parcours réels pour une raison qui nous
arrange — et c'est exactement l'inversion que le produit passe son temps à
corriger. Un abonnement à 49 € par mois est une information légitime pour
quelqu'un qui cherche à moins de 500 €.

Trois conséquences d'implémentation :

- Le résultat affiche **« 49 € par mois »**, jamais « 49 € ». L'unité voyage avec
  le montant partout où il apparaît, y compris dans une carte de liste.
- Une mention sous les résultats dit que **les prix ne sont pas convertis**, avec
  un renvoi vers la section correspondante de Méthode.
- **Jamais de conversion pour filtrer.** Multiplier 49 € par une durée
  « Abonnement mensuel » produirait un nombre que l'organisme n'a jamais publié —
  et la durée est le champ le moins bien couvert du catalogue.

## Ce qui est déjà fait, côté modèle

- `unite_prix` dans le contrat de schéma (`src/donnees/schema-attendu.ts`), avec
  la contrainte `check` sur les cinq valeurs et **sans valeur par défaut** — un
  défaut silencieux à `total` est précisément ce qui a produit la faute.
- `unitePrix` traverse `catalogue.ts` et part en base par `preparer.ts`.
- `uniteDansExtrait` corrigé et testé sur les formulations réelles.
- Invariant 12 : tout prix strictement positif porte son unité. **43 fiches en
  dette déclarée**, nommée et datée.

## Ce qui reste, hors interface

- La migration Lovable pour la colonne (le prompt est généré par
  `schema-attendu.ts`).
- Deux prix à requalifier : IPAG #53 en `annuel`, Conversion Boosters #150 en
  `journalier`. Sans conversion.
- Trente prix sans trace à rouvrir, pour établir leur unité — moins d'un euro.
