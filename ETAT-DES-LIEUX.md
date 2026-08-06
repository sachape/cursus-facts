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

### Aide au choix — cinq questions ramenées à quatre

Mesuré le 6 août 2026 sur 230 parcours par `bun run scripts/pouvoir-discriminant.ts`.
« Restants » = parcours qu'une réponse laisse **sans écart sur son propre
critère**. Les réponses neutres — celles qui n'écartent personne par
construction, « pas encore décidé », « à temps plein » — sont **exclues des
agrégats** : les compter tirait chaque moyenne vers le bas et gonflait chaque
étendue, si bien que les questions n'étaient plus comparables entre elles.

| Question | Écart entre réponses | Réduction moyenne | Couverture du champ |
|---|---:|---:|---:|
| Budget | **60,0 pts** | 49,0 % | `prix_min` 53 % |
| Canal de vente | 35,2 pts | 78,6 % | `competences_couvertes` 50 % |
| Objectif | 30,4 pts | 69,6 % | `code_rncp_rs` 12 % |
| ~~Point de départ~~ | ~~17,8 pts~~ | ~~23,8 %~~ | `niveau_entree` **93 %** |
| Temps par semaine | 16,1 pts | 11,0 % | `volume_horaire` **30 %** |

**Le point de départ est retiré. Le temps est conservé.** Les deux mesurent
presque pareil — 17,8 contre 16,1 — et ce n'est donc pas le chiffre qui les
départage, c'est la **couverture du champ dont ils dépendent**.

À 93 %, le point de départ disposait de sa donnée et ne triait quand même pas :
sa faiblesse est un fait sur la question. À 30 %, celle du temps est un **fait
sur nous** — `evaluer` ne produit ni correspondance ni écart sur un volume
absent, conformément à la règle. Retirer les deux au même motif aurait
**verrouillé une lacune de collecte en décision produit**, et après le crawl on
aurait supprimé une question devenue utile sans jamais savoir qu'elle l'était.

C'est la distinction `non_collecte` / `non_communique` appliquée à l'interface.

**À rejouer après le crawl.** Si `volume_horaire` dépasse 70 % de couverture et
que le temps reste sous 20 points d'écart, la question tombe à son tour — mais
mesurée sur des données présentes.

Deux conséquences assumées du retrait :

- `niveau_entree` n'entre plus dans l'adéquation, alors que c'est le champ le
  mieux couvert des cinq. Le prérequis reste un fait publié sur la fiche ; il ne
  pèse plus sur le choix des trois correspondances.
- Le **canal n'était pas le maillon faible**, contrairement à l'hypothèse de
  départ : c'est la question à la plus forte réduction moyenne (78,6 %). Mais
  ses réponses coupent toutes à peu près pareil — elle sépare l'utilisateur du
  catalogue, pas les utilisateurs entre eux. Le budget fait les deux, et c'est
  ce qui le place en tête.

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

### Ni la collecte automatique ni la manuelle ne domine l'autre

Constat du 6 août 2026, à retenir avant d'arbitrer une divergence.

Le pipeline allait dégrader des prix justes : les 1 500 € de Dawan, corrects,
qu'il s'apprêtait à remplacer par 875 € — le tarif journalier lu comme un total.
**La collecte automatique n'est pas systématiquement meilleure que ce qu'elle
remplace.**

Mais la réciproque est fausse. Sur la même passe, le pipeline a corrigé une
erreur de notre propre collecte manuelle : la fiche 211 portait 975 €, qui était
*exactement* le tarif journalier de l'organisme. Ce n'était pas un prix périmé,
c'était la même confusion d'unité, commise à la main en juin et invisible depuis.
Et le garde-fou de correspondance a dénoncé cinq appariements faux, dont **deux
que la relecture humaine n'avait pas vus**.

Conséquence pratique : une divergence entre catalogue et extraction ne se
tranche pas par l'origine de la donnée. Elle se tranche sur la citation et sur
la cohérence interne — un prix inférieur au plancher journalier publié par
l'organisme est faux, quelle que soit la main qui l'a écrit.


| Dette | Chiffre | Note |
|---|---|---|
| Fiches sans URL de site officiel | **14** | Toutes des créateurs indépendants. Plafond déclaré dans `scripts/invariants.ts`, **ne peut que décroître**. |
| Prix déclassés en `a_confirmer` | **59** | Restaurés après l'incident du 3 août, en attente de reconfirmation par lecture. |
| Éligibilité CPF | 164 fiches à `cpf: 0` | Le booléen ne distingue pas « vérifié non éligible » de « non vérifié ». Corriger par déduction violerait l'invariant 2. |
| Profondeur du catalogue | 9 / 232 | Bloquée par l'appariement (§3). |
| Fusion jamais déclenchée | 0 fusion | Règle couverte par des cas construits dans `regroupement.test.ts`. |
| Intitulés désignant une famille | ~17 candidats | Non traités **par motif** : « Formlist Grande École » ressemble au patron et est un produit unique. Seule la lecture tranche. |
| `SaveButton` | — | **Décision produit en attente** : le produit n'a ni comptes ni favoris. Un bouton sans mécanisme serait une promesse non tenue. |
| Règles `lieu` et `paiement` | 165 champs suspendus | Elles déduisent depuis un autre champ. Après le crawl, l'entrée sera constatée — la déduction reste, son entrée s'améliore. Même logique que le garde-fou de citation. |

---

### Ingestion — automatique, et sa limite datée

Depuis le 4 août, l'intégration continue appelle `POST /api/ingestion` sur
l'application déployée quand `offres-sources.json` change, après les invariants.
Elle passe `ecraser: true`, donc elle **contourne par construction** le garde-fou
« refuse d'écraser une base peuplée ».

C'est sûr tant que la base ne contient que ce que le dépôt produit. **Ça cessera
de l'être le jour où un organisme pourra corriger sa fiche** : la base portera
alors des données que le dépôt ignore, et un seed rejoué les effacerait — la
règle de non-effacement, appliquée à la base elle-même.

À ce moment-là, il faudra un seed qui **fusionne** au lieu d'écraser, avec la
même hiérarchie qu'ailleurs : une déclaration d'organisme l'emporte sur une
valeur extraite, une valeur extraite l'emporte sur un vide.

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

## 7 bis. Le panneau qui s'effaçait après cinq secondes — diagnostic complété

Le symptôme avait été traité, pas la cause. Le voici en entier.

**`@tanstack/history` patche `window.history.pushState`.** Un appel direct n'est
donc pas une écriture d'historique : il est interprété par le routeur comme une
navigation, et le routeur rendait `/parcours/<slug>` **par-dessus** le panneau
encore monté. D'où les deux comportements simultanés, et l'impression d'un
panneau qui « s'efface » — il ne s'effaçait pas, il était recouvert.

**La parade : la fiche ouverte vit dans la RECHERCHE de la route courante**
(`?fiche=<slug>`), jamais dans un `pushState` direct. On ne change jamais de
route, et le retour arrière, le partage et l'accès direct sont gérés
nativement — sans le moindre gestionnaire `popstate` à écrire.

C'est encore le motif du §8 : la règle était juste, l'API appelée était la
bonne, et une couche en aval — le patch du routeur — en changeait le sens sans
rien signaler. Aucune erreur, aucun test rouge.

**Conséquence pour la suite :** `src/composants/ouverture-fiche.tsx` est
désormais le seul endroit qui ouvre une fiche. Toute vue qui réécrirait sa
propre ouverture retomberait dans le même piège.

## 8. Le motif qui s'est répété six fois

Plafond de découverte à 400, créneau de cadence enregistré après l'attente,
garde-fou d'alternance contourné par l'affichage, `non_applicable` déduit d'un
autre champ, syntaxe de variable Tailwind, migration de carte non appliquée.

**À chaque fois : la règle est juste, la donnée est juste, une couche en aval
passe à côté. Rien ne plante, aucun test ne rougit, le résultat est faux.**

### Et un second motif, distinct : deux règles correctes, incohérentes ensemble

Le 4 août, `non_collecte` sortait du dénominateur — « on ne reproche pas une
absence non vérifiée » — et `non_applicable` exigeait une lecture de page. Les
deux sont justes **séparément**.

Ensemble, elles ne laissaient plus que deux états possibles sur une fiche non
lue : renseigné, ou non collecté. Le dénominateur se réduisait aux champs déjà
remplis, et **167 fiches sur 232 affichaient un compteur plein** — « 13 sur 13 »
avec cinq champs vides. Le code-barres ne montrait jamais de creux.

**Aucun invariant ne pouvait le voir, puisque chacune des deux règles était
respectée.** C'est un mode de défaillance différent du précédent : là, une
couche contournait une règle ; ici, deux règles conformes produisent ensemble un
résultat faux.

La parade est la même : **interroger la sortie**. Un invariant qui demande « une
fiche aux champs vides peut-elle afficher un compteur plein ? » l'attrape sans
rien savoir de la mécanique qui l'a produit.

Corollaire : l'argument « ne pas reprocher » porte sur le **numérateur**, jamais
sur le dénominateur. « 18 informations comptent, nous en connaissons 13 » est
honnête et n'accuse personne.

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
