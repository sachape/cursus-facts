# État des lieux — 4 août 2026

Ce document existe pour qu'on ne refasse pas ce qui a déjà été mesuré. Il porte
les décisions et leur motif, les dettes avec leur chiffre, et **les pistes
fermées avec la mesure qui les a fermées**. Une piste fermée sans son chiffre se
rouvre toujours.

---

## 1. Ce qui est en cours

| Chantier | État |
|---|---|
| Pipeline d'extraction | Fonctionnel. Mesuré sur lot stratifié : 83 % de citation valide. |
| Repli navigateur (Playwright) | Câblé. Remesure de la strate MOOC **en cours**. |
| Conflits internes | Non commencé. Périmètre défini (§6). |
| Design system | Fondations + carte + panneau + toolbar faits. `SaveButton` bloqué (§5). |
| Collecte en profondeur | 9 fiches sur 232 vérifiées. Bloqué par l'appariement (§3). |

---

## 2. Règles du modèle, et pourquoi

### Le veto à 80 % est un veto, pas une précondition

Le tronc pédagogique commun à 80 % **autorise un refus de fusion**, il ne
conditionne pas la fusion. On regroupe par défaut ; on ne refuse qu'avec la
preuve d'une divergence réelle.

Toute formulation inverse — « fusionner si le tronc dépasse 80 % » — rend le
**manque d'information rentable** : un organisme qui ne publie pas son programme
obtiendrait autant de lignes qu'il a de formules. C'est le biais que tout le
modèle cherche à supprimer.

### Hiérarchie de preuves du regroupement

1. Programme publié des deux côtés → comparaison réelle du tronc
2. Suffixe de formule reconnu (« — Premium », « — Coaching »)
3. Rien de tout ça → **ambigu**, replié derrière une ancre, jamais fusionné en
   silence

### On n'efface pas une valeur, on la déclasse

Une valeur existante qu'on ne peut pas reconfirmer **ne devient jamais
« non communiqué »**. Elle conserve sa valeur, passe en `a_confirmer`, s'affiche
signalée, et entre en tête de file (4 points par champ, plus qu'un prix absent).

Seule la lecture d'une page officielle **constatant l'absence** autorise
l'effacement — `arbitrerEcriture` n'a pas d'autre chemin.

**Motif :** le 3 août, une consigne d'écriture sans règle d'effacement a supprimé
**61 prix**, dont trois parcours que Google publie « gratuites ». La consigne
avait été appliquée à la lettre et le résultat était faux.

**Garde-fou :** plancher sur les *valeurs présentes* (`renseignees + aConfirmer`)
dans `preparer.test.ts`. Déclasser ne le fait pas bouger ; effacer le fait tomber.

### Les états d'absence, et leur asymétrie

| État | Signification | Dénominateur |
|---|---|---|
| `non_collecte` | Page jamais lue. **Fait sur nous.** | exclu |
| `non_communique` | Page lue, l'organisme ne publie pas. **Fait sur lui.** | inclus |
| `non_applicable` | Le champ n'a pas d'objet ici. | exclu |
| `communique_sur_demande` | Sur devis, jamais publié. Pratique normale. | exclu |
| `a_confirmer` | Valeur conservée, non reconfirmée. | inclus, hors numérateur |
| `derive` | Produite par une règle publiée. | inclus, dans le numérateur |

**`non_applicable` exige la lecture de la page ET une règle publiée — les deux.**
C'est le seul état qui **ferme** un champ : il sort du dénominateur, sort de la
file, et n'est jamais revérifié.

Une règle publiée ne suffit pas seule. Les deux règles de la liste fermée
déduisent depuis un autre champ — le lieu depuis `formats`, le paiement depuis
`prix` — et sur une fiche jamais lue, `formats` est peut-être incomplet. **La
publication rend une règle contestable, elle ne la rend pas vraie.**

Effet : 165 champs sont repassés en `non_collecte`. Le taux affiché a baissé et
il a cessé de mentir.

### Dérivations — liste fermée

Une dérivation applique une règle de droit publiée, identique pour tous. Elle
n'est pas une déduction : elle se conteste **en tant que règle**.

- **Alternance** → coût 0, modalité `pris_en_charge`. Bloquée si l'organisme
  publie un tarif > 0 (cas INSEEC : MSc à 8 175 € proposé aussi en alternance).
- **Déclaration de portée générale** → ORSYS écrit que *toutes* ses formations
  peuvent être organisées en intra. Reportée sur ses 4 fiches, marquée `derive`
  avec sa source citée.

`alternanceSansTarifPublie` est la **seule autorité** sur la question. Aucune
couche en aval ne repose la question : c'est en la reposant que l'affichage avait
contourné le garde-fou, avec 176 tests au vert.

### Trois façons de tarifer, pas deux

- **M2i, Cegos** — couple inter/intra sur la même page. Risque de confusion réel.
- **ORSYS** — inter seul affiché, intra sur devis.
- **Dawan** — ignore la distinction, tarife **par format** (distanciel 1 500,
  présentiel 1 875, tutorat 1 000).

Piège vécu : le 1 875 € de Dawan a d'abord été enregistré comme tarif intra alors
que c'est le prix présentiel. `dispo_intra` reste `null` quand rien n'est publié :
**non établi, pas inexistant.**

---

## 3. Pistes fermées, avec leur mesure

### Appariement URL ↔ parcours — trois voies épuisées

| Voie | Résultat | Pourquoi elle est fermée |
|---|---|---|
| Score de mots d'URL, seuil 0,6 | **58 / 232 (25 %)** | Un chemin d'URL est un écho appauvri du titre. À 0,4 on obtiendrait 279 rapprochements, mais l'exemple type rapproche « licence-professionnelle-metiers-commerce-international » de « Licence pro E-commerce et marketing numérique » — deux diplômes différents. **Le seuil reste à 0,6.** |
| Libellé de lien exact sur page catalogue | **+1** | Les pages rendent bien des liens (1 organisme sur 115 à zéro), mais l'égalité exacte entre titre fiché et libellé publié ne se produit presque jamais. |
| URL de site officiel déjà fichée | **plafond de 4** | Le champ `url` est un **domaine d'organisme**, pas une adresse de parcours. Seules 9 fiches portent une `urlDetail`, dont 5 déjà appariées. |
| Organisme + domaine inféré | **5, dont ≥3 faux** | Le domaine de la page est **inféré depuis des mots d'URL**, pas constaté. « Bachelor E-business » rapproché de `formation-ingenieur-commercial`. Même vice que `non_applicable` déduit : une déduction depuis un champ non vérifié, présentée comme une certitude. |

**Conclusion structurelle : c'est le crawl qui débloque l'appariement, pas
l'inverse.** La quatrième voie — le domaine **constaté** sur la page — exige
d'ouvrir la page. Ne pas y revenir avant que le crawl ait tourné.

### Les sitemaps sont un outil de profondeur, jamais de largeur

Les 342 candidats se répartissent sur **54 organismes, tous déjà au catalogue**.
C'est structurel : la découverte part des domaines connus, donc elle ne peut
ramener que des parcours d'organismes connus.

**Les nouveaux acteurs viendront de SIRENE et DREETS, ou de nulle part.** Deux
mécanismes, deux sources, aucun ne fait le travail de l'autre.

### Découverte par comparatifs tiers — épuisée

79 % de recouvrement avec ce que nous avions déjà. Et aucune donnée n'en est
reprise : invariant 5.

### DREETS par dénomination sociale — improductif

11 correspondances sur 165 726, dont la moitié de faux positifs. Les créateurs
indépendants n'incorporent pas sous un nom contenant « ecom ». Le ciblage
NAF 85.59A/B via SIRENE reste nécessaire.

---

## 4. Mesures du pipeline d'extraction

| Mesure | Valeur |
|---|---|
| Taux de citation valide, lot stratifié de 30 | **77–83 %** selon le lot |
| Écoles seules (strate la mieux structurée) | 94–97 % |
| Gain moyen par fiche | 4,6 à 8 champs |
| Extrapolation catalogue | ~1 060 informations, soit **40 % du catalogue actuel** |

**Le lot de référence est figé** dans `src/donnees/lot-reference.json` et rejoué à
l'identique. Sans lui, une partie de chaque écart vient du corpus et non des
corrections.

**Il n'est pas équilibré, et il ne peut pas l'être** : 87 champs d'écoles contre
9 de MOOC. La file ne contient pas plus de pages ailleurs — plafond hérité du
taux d'appariement de 25 %.

**Deux enseignements de méthode :**

- La **ventilation par strate est obligatoire**. Deux corrections tirant dans des
  directions opposées selon les strates s'annulent dans un chiffre global : sans
  ventilation, on conclut que le travail n'a servi à rien alors qu'il a réparé
  les deux strates les plus faibles.
- **Le nombre absolu avant le pourcentage.** « 2 rejets sur 11 » se discute,
  « 69 % » fabrique une fausse précision en cachant la taille de l'échantillon.

**Sortie structurée abandonnée.** La grammaire d'un schéma à champs cités ne
compile pas — « Schema is too complex » à 19 champs, « Grammar compilation timed
out » à 10. Ce n'est pas une perte : la forme n'était pas la garantie, la
**vérification programmatique des citations** l'est, et elle s'applique
identiquement à du JSON libre. Un JSON mal formé ne produit rien.

---

## 5. Dettes connues, chiffrées

| Dette | Chiffre | Note |
|---|---|---|
| Fiches sans URL de site officiel | **14** | Toutes des créateurs indépendants. Plafond déclaré dans `scripts/invariants.ts`, **ne peut que décroître**. |
| Prix déclassés en `a_confirmer` | **59** | Restaurés après l'incident du 3 août, en attente de reconfirmation par lecture. |
| Éligibilité CPF | 164 fiches à `cpf: 0` | Le booléen ne distingue pas « vérifié non éligible » de « non vérifié ». Corriger par déduction violerait l'invariant 2. |
| Profondeur du catalogue | 9 / 232 | Bloquée par l'appariement (§3). |
| Fusion jamais déclenchée | 0 fusion | Règle couverte par des cas construits dans `regroupement.test.ts`. |
| Intitulés désignant une famille | ~17 candidats | Non traités **par motif** : « Cursus Grande École » ressemble au patron et est un produit unique. Seule la lecture tranche. |
| `SaveButton` | — | **Décision produit en attente** : le produit n'a ni comptes ni favoris. Un bouton sans mécanisme serait une promesse non tenue. |
| Règles `lieu` et `paiement` | 165 champs suspendus | Elles déduisent depuis un autre champ. Après le crawl, l'entrée sera constatée — la déduction reste, son entrée s'améliore. Même logique que le garde-fou de citation. |

---

## 6. Conflits internes — périmètre défini, non commencé

Le crawl lira plusieurs pages par organisme et trouvera des contradictions. **Ne
jamais trancher automatiquement** : une contradiction interne est une information
sur l'organisme, et aucun comparatif affilié ne la relèvera jamais puisqu'ils
reprennent une seule source.

- **Conserver** par champ en conflit : chaque valeur, sa citation, l'URL exacte,
  la date de lecture. État `en_conflit`.
- **Compteur** : hors numérateur, **maintenu au dénominateur** — l'information
  existe, elle n'est pas fiable en l'état.
- **Affichage** : valeurs divergentes avec leur source sur la fiche ; mention de
  conflit dans la liste et le tableau comparatif, **jamais un montant arbitraire**
  (le plus bas flatterait l'organisme, le plus haut serait injuste — les deux
  seraient un jugement).
- **File publique** dans Méthode, à côté de la file d'arbitrage.
- **Conflit ≠ obsolescence** : comparer les `lastmod` de sitemap. Une page de 2024
  contre une de 2026 n'est pas un désaccord entre deux pages actives.
- **Origine de la résolution** à prévoir dès maintenant : `arbitrage_interne` ou
  `declaration_organisme`. C'est ce qui servira le jour où un organisme
  revendiquera sa fiche.

---

## 7. Design system

Fondations dans `src/design/fondations.css`, trois niveaux dans cet ordre de
dépendance : **primitifs → sémantiques → composants**.

- Espacement base 4. Au-delà de 32 px, uniquement les multiples de 8.
- Échelle typographique de 11 à 48 px. Bricolage Grotesque sur les titres
  (axe `opsz`), Geist sur le texte, DM Mono sur les valeurs chiffrées.
- Dix paliers par teinte. **La chrome est achromatique** ; la couleur est réservée
  au sens. L'accent marque l'interactif, jamais une formation.
- `crimson` **jamais** pour qualifier une formation : une information absente
  n'est pas une erreur, c'est `clay`.

**Règle de gouvernance : on étend l'échelle, on n'improvise pas.** Le code-barres
travaille sous la granularité d'espacement (trait 3 px, écart 2 px) — ce sont des
jetons nommés, pas des littéraux tolérés.

### Quatre invariants de design — `bun run invariants:design`

Couleur littérale · dimension hors échelle · durée littérale · **syntaxe de
variable invalide**.

Le quatrième existe parce que l'erreur ne produit **aucun message** : en
Tailwind v4, `mr-[--space-6]` déclare une propriété personnalisée au lieu de
poser une valeur. La classe est ignorée en silence. Un design system entièrement
mort a passé sept invariants et 207 tests — les onglets se touchaient. **La forme
correcte est `mr-(--space-6)`.**

### Invariants de rendu — `bun run invariants:rendu`

Écart réel entre éléments de texte adjacents · appartenance des tailles rendues à
l'échelle · contraste AA · pied de panneau · liste de suggestions.

Ils **ne tournent pas en CI** : la base Lovable Cloud n'y est pas disponible, et
le serveur ne démarre jamais. Ils tournent **avant chaque poussée**, via
`.githooks/pre-push` (`git config core.hooksPath .githooks`).

Ils ne tourneront **jamais automatiquement sur la production** : ils existent pour
attraper une régression avant déploiement, et la production étant en retard sur la
branche poussée, ils produiraient des échecs sans rapport avec le dernier commit.

---

## 8. Le motif qui s'est répété six fois

Plafond de découverte à 400, créneau de cadence enregistré après l'attente,
garde-fou d'alternance contourné par l'affichage, `non_applicable` déduit d'un
autre champ, syntaxe de variable Tailwind, migration de carte non appliquée.

**À chaque fois : la règle est juste, la donnée est juste, une couche en aval
passe à côté. Rien ne plante, aucun test ne rougit, le résultat est faux.**

Deux conséquences pratiques :

1. **Écrire les invariants sur ce que l'interface rend, pas sur ce que le modèle
   calcule.** Un invariant qui interroge la fonction produisant l'état vérifie sa
   cohérence interne, pas la restitution. Le 4 bis est le patron.
2. **Demander à voir des cas réels bat un compte-rendu de tests.** C'est
   l'exigence de voir cinq cas concrets qui a fait sortir le défaut INSEEC —
   pendant que 176 tests étaient au vert.

---

## 9. Frontière avec Lovable

**De notre côté :** tout `src/`, y compris le `<head>` — ce projet est en TanStack
Start, il n'a pas d'`index.html`, et le `<head>` vit dans
`src/routes/__root.tsx`.

**Hors de portée :** le schéma de base et ses migrations, les secrets serveur,
`vite.config.ts`, le déploiement.

**Partagé :** `main`. Lovable pousse en direct. `git pull` avant chaque poussée,
jamais de réécriture d'historique.

**Le schéma précède le code**, et c'est mécanique depuis
`src/donnees/schema-attendu.ts` : une colonne manquante produit un message qui la
nomme et porte le prompt à envoyer, au lieu du 500 muet du 4 août.
