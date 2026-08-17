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
| Invariants de rendu | **49 sur 49 au vert** depuis le 18 août, après six jours d'extinction silencieuse (§8). |

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
| `non_collecte` | Page jamais lue. **Fait sur nous.** | **inclus** |
| `non_communique` | Page lue, l'organisme ne publie pas. **Fait sur lui.** | inclus |
| `non_applicable` | Le champ n'a pas d'objet ici. | exclu |
| `communique_sur_demande` | Sur devis, jamais publié. Pratique normale. | exclu |
| `a_confirmer` | Valeur conservée, non reconfirmée. | inclus, hors numérateur |
| `derive` | Produite par une règle publiée. | inclus, dans le numérateur |

`non_collecte` **reste au dénominateur** : l'argument « on ne reproche pas une
absence non vérifiée » porte sur le NUMÉRATEUR. L'en sortir ne laissait que deux
états possibles sur une fiche non lue, et le compteur devenait plein par
construction. Cette ligne disait « exclu » et contredisait le §8 — corrigée le
10 août 2026, voir le motif ci-dessous.

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

### Appariement par libellé de lien — épuisé

Passe du 6 août 2026, 120 organismes visités : **1 fiche appariée**. Quatrième
et dernière route d'appariement heuristique close.

Taux après la passe : **23 % (54/232)**, contre 25 % avant — la baisse est le
retrait des cinq appariements faux dénoncés par le garde-fou de correspondance,
et aucune des cinq n'a été retrouvée par le libellé.

**Ne pas relancer.** Les quatre routes (score d'URL, sitemaps, comparatifs
tiers, libellé de lien) sont mesurées et closes. Ce qui reste bloqué ne l'est
pas par l'appariement : voir ci-dessous.

### Ce n'est plus l'appariement, c'est la découverte d'URL

Inventaire du 6 août 2026 sur les 59 fiches dont le prix attend reconfirmation
(`src/donnees/file-reconfirmation.json`) :

| | Fiches |
|---|---|
| URL de détail déjà appariée | 4 |
| Domaine exploré, pages connues, aucune rapprochée de la fiche | 19 |
| **Domaine jamais exploré** | **36** |
| Sans domaine | 0 |

Les 59 ont toutes un domaine d'organisme. Le goulot n'est donc pas le
rapprochement page↔fiche mais le fait que **61 % de ces domaines n'ont jamais
été passés au crible**. Insister sur l'appariement ne peut rien y faire ; seule
une passe de découverte sur ces 36 domaines le peut.

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

### Une question chiffrée n'est utile que si c'est la bonne question

**Crawl profond, 13 août 2026.** Trois jours de chiffrage ont porté sur le coût
d'un crawl à l'échelle. Le test borné sur dix fiches a rendu **0,17 €** — soit
**2 € pour les 119 fiches** exploitables au rythme constaté, **15 € au plafond**
si toutes atteignaient le modèle à trois pages chacune.

Le coût n'a jamais été la contrainte, et il était mesurable dès le premier jour
pour le prix d'un appel.

La vraie contrainte était dans le même lot, en évidence : **7 fiches sur 10
n'ont jamais atteint le modèle**, toutes pour des raisons qui nous
appartiennent — deux domaines faux, un `urlDetail` pointant sur une racine de
domaine, un index de sitemaps lu sur son seul premier enfant. Quatre des sept se
réparent sans modèle et sans arbitrage.

**La règle : avant de chiffrer une hypothèse, vérifier qu'elle est la
contrainte.** Un chiffre juste sur une question secondaire coûte plus qu'une
estimation grossière sur la bonne — il donne l'impression d'avoir décidé. Le
symptôme à guetter est un chiffrage qui dure plus longtemps que la mesure qui le
trancherait : ici, dix fiches et vingt minutes.

C'est la famille du §8 déplacée encore d'un cran. Là, une couche en aval passait
à côté d'une règle juste ; ensuite, l'instrument regardait à côté ; ici,
**l'instrument était juste, la mesure exacte, et la question mal choisie**.

### L'instrument était aveugle pour la raison même qui causait le défaut

**16 août 2026, et c'est le constat le plus coûteux de la série.**

Le champ `unitePrix` était écrit dans `offres-sources.json` **depuis juin**, sur
huit fiches, par une passe d'extraction qui avait bien fait son travail. Speed
Ecom y portait « mensuel », correctement, depuis deux mois.

`catalogue.ts` ne connaissait pas le champ. Sa fonction de normalisation recopie
les propriétés une à une : ce qu'elle ignore, elle l'efface. Toute couche en aval
— affichage, comparaison, filtre budget — travaillait donc sur un catalogue où
l'unité n'existait pas, alors que la donnée la portait.

**Puis le balayage écrit pour trouver ce défaut est tombé dans le même trou.**
Il cherchait l'unité dans les traces d'extraits parce qu'il lisait le catalogue
normalisé, où le champ n'existait pas. Il a donc déclaré Speed Ecom suspect —
un prix déjà correctement qualifié — et compté 51 prix à vérifier là où il y en
avait 43.

L'instrument de mesure était aveugle **pour la raison exacte qui causait le
défaut qu'il cherchait**. Ce n'est pas une coïncidence : il partageait la couche
fautive avec le code mesuré.

**LA RÈGLE.** Un instrument qui mesure un défaut de couche ne doit pas traverser
cette couche. Ici, il fallait lire `offres-sources.json` directement plutôt que
le catalogue normalisé — la source, jamais la vue.

C'est la famille du §8 poussée d'un cran de plus. Là, une couche en aval passait
à côté d'une règle juste ; ensuite l'instrument regardait ailleurs ; ensuite la
question était mal choisie ; ici **l'instrument et le défaut avaient la même
cause**, et le premier ne pouvait donc pas voir le second.

Corollaire pratique : quand une mesure et le code mesuré partagent un module,
écrire d'abord le cas dont on connaît la réponse. Speed Ecom portait « mensuel »
depuis juin ; un balayage qui ne le retrouve pas se dénonce lui-même.

### Une règle citée de mémoire vaut une mesure non faite

**13 août 2026, deux fois dans la même conversation.**

- Les **sept critères d'éligibilité** ont été invoqués comme s'ils étaient
  cumulatifs, pour écarter les plateformes d'éditeur. `eligibilite.ts` dit
  « au moins TROIS », et une Academy en vérifie quatre : la règle les
  **admettait**. Ce qui était présenté comme un rappel était une modification.
- Un **invariant 14** a été invoqué. Il n'existe pas : le script en déclare
  treize (1 à 11, plus 4 bis et 7 bis), `CLAUDE.md` en publie huit au niveau
  produit. La référence visée était l'invariant produit 8.

Aucune des deux n'a produit de dégât, parce qu'elles ont été relues avant
d'agir. Mais la première aurait fait appliquer une règle qui n'existait pas sans
la publier — invariant 7 contourné sans que personne ne le voie, puisque tout le
monde croyait appliquer l'existant.

Le même relevé a montré ce que ça coûte quand personne ne relit : la règle
formulée de mémoire — « écarter les ressources gratuites » — aurait emporté
**54 fiches de plus que les 19 visées, dont 34 licences et BTS en établissement
public**. Il a fallu compter les fiches à prix nul pour le voir.

**La règle : une règle qu'on cite se relit à sa source avant d'être appliquée**,
au même titre qu'un chiffre se mesure avant d'être publié. Le coût est de
quelques secondes ; celui de l'erreur symétrique — le 3 août — a été de 61 prix
effacés.

Corollaire de rédaction : **une règle à seuil énonce son seuil dans sa
formulation courte.** « Au moins trois des sept critères » ne se cite pas
« les sept critères » ; c'est cette abréviation qui rend l'erreur possible.

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
| Garde-fou d'attribution (pages tarifs) | **6 tests, 0 exercice réel** | Couvert par des cas construits, jamais par le terrain — voir ci-dessous. |
| `SaveButton` | — | **Décision produit en attente** : le produit n'a ni comptes ni favoris. Un bouton sans mécanisme serait une promesse non tenue. |
| Règles `lieu` et `paiement` | 165 champs suspendus | Elles déduisent depuis un autre champ. Après le crawl, l'entrée sera constatée — la déduction reste, son entrée s'améliore. Même logique que le garde-fou de citation. |

---

### Le garde-fou d'attribution est théorique tant qu'il ne s'est pas exercé

`src/collecte/attribution.ts` répond à la question qui se pose sur une page
tarifs — *ce PRIX est-il celui du parcours ?* — là où `verifierCorrespondance`
répond à *cette PAGE est-elle celle du parcours ?*. Il existe parce que le
second rejetterait toute page tarifs, dont le `<h1>` dit « Tarifs », et que
baisser son seuil aurait supprimé le garde-fou exactement là où il protège le
plus : une page tarifs porte le prix de dix formations.

**Il n'a jamais servi.** Au crawl du 13 août, le seul prix trouvé l'a été sur
une page de détail, où c'est la correspondance de page qui tranche. Le garde-fou
est couvert par six cas construits — dont celui qui compte, un prix authentique
appartenant à une autre formation de la même page — et par **zéro lecture
réelle**.

Six tests ne sont pas une mesure. Tant qu'aucun prix n'aura été retenu hors page
de détail, son seuil de 0,8 et sa fenêtre de 600 caractères sont des paramètres
choisis, pas des paramètres mesurés. **Le premier prix attribué depuis une page
tarifs est à signaler et à relire à la main**, avec son extrait et son
voisinage : c'est la seule occasion de savoir si la fenêtre est trop large — le
titre d'une autre formation y entrerait — ou trop étroite.

C'est la règle apprise sur la clé de rôle de service, appliquée à l'envers : un
test qui ne peut pas tourner ne protège rien, et un test qui tourne sur des cas
construits ne protège que ce qu'on a su construire.

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
autre champ, syntaxe de variable Tailwind, migration de carte non appliquée,
**et le hook de pré-poussée qui testait une autre application**.

**À chaque fois : la règle est juste, la donnée est juste, une couche en aval
passe à côté. Rien ne plante, aucun test ne rougit, le résultat est faux.**

### Récurrence : le motif cherché dans un contenant plus large que son sens

Deux fois maintenant, un motif juste a été cherché dans une chaîne qui portait
autre chose que ce qu'il décrivait — et il a emprunté son sens au contenant.

| Motif | Cherché dans | Ce qu'il a attrapé | Effet |
|---|---|---|---|
| `ux` | le texte entier | Linux, flux, Bordeaux, luxe | Une prépa classée en CRO parce que sa page disait « Linux et bash » |
| `financ` | le chemin d'URL entier | `/formation/commerce-marketing-finance/...` | Une page de discipline prise pour une page de financement, un appel modèle dépensé pour rien |

Le premier est corrigé dans `vocabulaires.ts` par `(?<![\p{L}\p{N}])…` : la
frontière de mot rend au motif son unité de sens. Le second est corrigé dans
`crawl-profond.ts` en cherchant le motif dans le **libellé du lien et le dernier
segment d'URL**, jamais dans le chemin entier — un segment de taxonomie décrit
la rubrique où vit la page, pas la page.

**La règle : l'unité de recherche doit être l'unité qui porte le sens.** Un mot
pour un motif de vocabulaire, un segment pour un motif de rôle de page. Chercher
dans un contenant plus large ne produit jamais d'erreur, seulement des faux
positifs silencieux — et ils coûtent d'autant plus cher qu'ils **déplacent** le
vrai candidat au lieu de simplement s'ajouter à lui.

C'est une famille distincte du motif ci-dessus : là, une couche en aval passait
à côté d'une règle juste ; ici, la règle est appliquée au mauvais périmètre.

### Le cas du 6 août : un garde-fou qui mesurait autre chose

`playwright.config.ts` pointe sur `http://localhost:3000` avec
`reuseExistingServer: true`. Un serveur de développement d'un **autre projet**
occupait ce port. Playwright ne l'a pas démarré : il s'y est rattaché.

Les invariants de rendu de Formlist ont donc inspecté une application étrangère,
et `.githooks/pre-push` faisait la même chose à chaque poussée. Il tournait, il
ne plantait pas, il rendait des verdicts — sur autre chose. Même forme que le
plafond de découverte à 400.

**Deux parades, la seconde suffit :** `strictPort`, pour qu'un port occupé
échoue bruyamment au lieu de se rattacher en silence ; ou faire tourner les
invariants contre un **build** sur son propre port, ce qui supprime la question
et, au passage, l'intermittence observée sur le test de suggestions.

### Le garde-fou n'a jamais protégé — et c'est le plus grave

Les quatre invariants rouges du 6 août échouent **aussi sur `main`** (vérifié en
remisant les modifications en cours et en rejouant sur `HEAD`). Le hook bloque
donc la poussée depuis un moment : les commits récents sont passés par
`SAUTER_RENDU` ou par `--no-verify`.

Un garde-fou qu'on contourne par habitude ne protège de rien. Il est pire qu'un
garde-fou absent, parce qu'il donne le sentiment d'une couverture — c'est le
test rouge toléré qui finira par masquer une vraie régression, exactement comme
un plafond mesuré sur le mauvais corpus.

**Les quatre dettes se soldent avant la prochaine poussée**, et dans cet ordre :
le passage sur un build d'abord — il supprime d'un coup la classe
d'intermittence et le risque de mauvais port —, puis le contraste de
`--text-tertiary`, puis les paliers du titre, le débordement des onglets à
360 px, et le faux positif d'espacement.

### Le motif du 10 août : trois faux diagnostics, tous dus à l'instrument

Trois fois dans la même journée, une conclusion fausse tirée d'une mesure juste
— parce que l'outil portait sur autre chose que ce qu'on croyait.

| L'instrument | Ce qu'il mesurait vraiment | Ce qu'on en a conclu |
|---|---|---|
| `playwright` sur le port 3000 | Le serveur de dev d'un **autre projet** | Que les invariants validaient Formlist |
| `grep -c` dans ce shell | Rien : il sort sans imprimer, même `0` | Que les routes dynamiques n'émettaient aucun `<title>` |
| `curl` sur `localhost:4317` | Le **code du jour**, non déployé | Que le `ld+json` était en ligne |
| `Playwright.click()` | Une page **qu'il venait de faire défiler** | Que l'ouverture d'un panneau sautait de 2 600 px |

Le deuxième a coûté le plus cher : une sortie vide lue comme un zéro a produit
un diagnostic d'architecture complet — streaming, coquille envoyée trop tôt,
options A/B/C/D — et une décision produit prise dessus. Il n'y avait rien à
corriger.

Le troisième est le plus insidieux, parce que la mesure était juste : le
`ld+json` sortait bien au premier octet **en local**. C'est le tableau de
restitution qui mélangeait des lignes de production et des lignes de local sans
les étiqueter. Un tableau dont chaque ligne peut venir d'un environnement
différent n'est pas vérifiable.

Le quatrième est le plus retors, parce que l'instrument ne se contente pas de
regarder à côté : **il modifie ce qu'il mesure.** `click()` fait défiler
l'élément dans la vue avant de cliquer. La sonde se plaçait à 2 600 px, le clic
ramenait la page à 721, et le gestionnaire s'exécutait à cette position — le
saut mesuré était produit par la mesure. Un clic JS, qui ne défile pas, montre
la position parfaitement conservée.

Corollaire : **quand on mesure un effet de position, l'outil qui déclenche
l'action doit être neutre vis-à-vis de la position.** Sinon on observe l'outil.

Et un TROISIÈME environnement s'ajoute aux deux autres : la prévisualisation
Lovable, distincte du local ET de la production. Trois surfaces qui peuvent
diverger simultanément — un rapport de défaut doit donc nommer laquelle.

**LA RÈGLE : toute mesure indique explicitement son environnement.** URL
complète, pas de chemin relatif ; l'origine dans la restitution, pas seulement
dans la commande ; et jamais deux environnements dans le même tableau sans
colonne qui les sépare.

Corollaire, appris au même moment : un slug ne se construit pas, il se lit. Une
URL de fiche s'écrit `<organisme>-<nom>-<id>` — le suffixe numérique en fait
partie, et `/parcours/livementor-formation-e-commerce` répond 404 quand
`/parcours/livementor-formation-e-commerce-88` répond 200. Une adresse déduite
est une information déduite.

C'est la même famille que le §8, déplacée d'un cran : là, une couche en aval
changeait le résultat ; ici, c'est l'instrument de mesure qui regarde à côté.
Aucun test ne rougit dans les deux cas.

### Le motif du 10 août bis : une correction consignée mais jamais portée

Le §8 décrivait la correction du dénominateur comme faite. Le §2 affirmait
l'inverse dans sa table d'états. Et le code, lui, était **juste** :
`compterInformations` gardait bien `non_collecte` au dénominateur.

Alors pourquoi « 11 sur 11 » au-dessus de sept champs non collectés ?

**Parce que l'affichage ne lisait pas le modèle.** `infos_renseignees` et
`infos_applicables` sont des colonnes DÉRIVÉES, écrites à l'ingestion. La règle
a changé dans le code le 4 août ; le catalogue n'a jamais été réingéré. Les
colonnes ont donc conservé l'ancien calcul, et **224 fiches sur 233** affichaient
un compteur périmé — dont 165 un compteur plein avec des champs vides à l'écran.

Trois choses fausses en même temps, et aucun test pour les voir :

- le document affirmait une correction jamais portée jusqu'à l'affichage ;
- deux de ses sections se contredisaient ;
- le code était cohérent **avec lui-même**, donc tous les tests passaient.

**Le correctif n'est pas de réingérer** — ce serait à refaire à chaque évolution
de la règle. Le compteur est recalculé à la LECTURE, depuis `etats` qui fait
foi. Une valeur dérivée stockée à côté de sa source finit toujours par en
diverger ; les colonnes restent en base pour le tri SQL, elles ne gouvernent
plus l'affichage.

**DEUX RÈGLES EN DÉCOULENT.**

1. **Toute correction consignée renvoie au commit qui la porte.** Sans lui, ce
   n'est pas une correction, c'est une intention — et elle se lit comme un fait
   acquis pendant des semaines.
2. **Un invariant s'écrit sur ce que l'interface REND.** Celui qui manquait ici
   tient en une phrase : une fiche affichant un champ non collecté ne peut pas
   afficher un compteur plein. Il ne sait rien de `compterInformations`, et
   c'est pour ça qu'il l'attrape.

Les taux affichés ont baissé sur 165 fiches. Un chiffre qui baisse parce qu'il
cesse de mentir est un progrès.

### Un invariant a protégé une décision passée contre une modification future

C'est la première fois, et ça change l'argument.

Jusqu'ici, les invariants de rendu ont RÉVÉLÉ des défauts déjà présents : le
compteur plein, le titre rogné, la navigation qui débordait. Le 10 août,
l'emplacement d'action de l'en-tête a été posé **vide**, à la largeur exacte du
burger, pour que le logo tombe au centre — avec un invariant qui mesure ce
centrage à ±2 px.

Quand cet emplacement a été rempli, deux chantiers plus tard, le premier essai y
mettait un libellé texte. Le logo s'est décentré. **Le test l'a dit dans la
minute**, et la correction a été immédiate : un pictogramme contraint à la
largeur réservée sous 1 024 px, le libellé complet en version bureau seulement.

Personne n'aurait relu le commentaire expliquant pourquoi l'emplacement était
vide. L'invariant, lui, n'avait pas besoin d'être relu.

**C'est l'argument pour continuer à en écrire** : le coût d'un invariant se paie
une fois, sa valeur se perçoit à chaque modification ultérieure — y compris
celles faites par quelqu'un qui ignore la décision qu'il défait. Une décision de
conception non mesurée n'a que la durée de vie de la mémoire de celui qui l'a
prise.

### La clé de rôle de service n'est pas récupérable — construire sans

Lovable Cloud garde ses secrets. Ni lecture privilégiée, ni suppression d'un
compte de test, ni création d'un utilisateur déjà confirmé par l'API
d'administration.

**Conséquence à ne pas contourner :** tout contrôle exigeant un compte confirmé
se fait à la main, et se documente. Un test de rendu ne peut pas franchir une
boîte mail.

La règle qui en découle, apprise en voulant l'écrire quand même : **un test qui
ne peut pas tourner ne protège rien.** Deux tests réels et une vérification
manuelle consignée valent mieux qu'un test impossible à exécuter, qui donne
l'apparence d'une couverture et sera désactivé au premier échec.

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

### Septième occurrence : le garde-fou éteint pendant six jours — 18 août 2026

Le 12 août, un commit Lovable a posé `src/routes/lovable/email/auth/webhook.ts`,
qui déréférençait `process.env['LOVABLE_API_KEY']!` **au niveau module**. Le `!`
est une assertion TypeScript : il fait taire le type, il ne fournit aucune
valeur. Comme `routeTree.gen.ts` importe toutes les routes, l'exception tombait
pendant l'évaluation du graphe de modules et **`vite dev` répondait 500 sur
toutes les routes**. La clé n'est pas récupérable côté développeur : ce chemin
est l'état normal en local, pas une erreur de configuration.

Les invariants de rendu tournent uniquement au crochet de pré-poussée, contre ce
serveur. Ils n'ont donc **pas pu s'exécuter une seule fois entre le 12 et le
18 août** — pendant que trois commits continuaient d'en écrire de nouveaux
(13 août : panneau mobile, hero ; 17 août : séparation accueil/catalogue).

**La mesure.** Serveur réparé le 18 août : **22 échecs sur 49**. Vérifié contre
`ac44d49`, avant les deux commits en cours : **les mêmes 22, à l'identique** —
aucune régression du travail en cours, six jours d'assertions jamais exécutées.

**Ce que le tri a séparé** — et c'est le point : la moitié des rouges ne
décrivait rien de faux dans le produit.

| Nature | Nombre | Exemple |
|---|---|---|
| Assertions périmées par la séparation | 14 | la liste cherchée sur `/`, où elle n'est plus |
| Sélecteurs faux ou non stricts | 4 | `header a[href^='/']` attrapait aussi le `<header>` du hero : 10 liens pour 5 cibles |
| Contrat réécrit depuis | 1 | l'indexation est passée aux adresses lisibles, le test décrivait les pages du plan |
| **Défauts réels du produit** | **3** | ci-dessous |

**Les trois vrais défauts, qu'aucun test vert ne signalait :**

1. **Les appels du hero ne répondaient pas avant hydratation.** Portés par un
   `onClick`, ils étaient inertes tant que React n'avait pas pris la main, alors
   que le HTML du serveur est à l'écran et se laisse cliquer. Mesuré : clic
   immédiat, l'adresse ne bouge pas ; clic après hydratation, elle mène au
   catalogue ; le jumeau `<a>` de l'Editorial navigue dans les deux cas. Corrigé
   en liens — c'est aussi le rôle de l'élément. Le test clique désormais **sans
   attendre**, pour surveiller la course elle-même.
2. **`/catalogue` ne servait aucun `h1`.** Le titre de page était resté dans le
   hero de l'accueil quand la liste a déménagé. Zéro `h1` au serveur comme après
   hydratation, sur la page la plus indexable du site. Le titre de liste porte le
   sujet de la page : il en devient le `h1`, à apparence inchangée.
3. **La promesse chiffrée du panneau mobile avait été supprimée** par le commit
   Lovable `a61e431` (17 août) — dix lignes retirées, rien mis à la place.
   L'invariant la réclamait ; restaurée.

**Ce que ça enseigne, et qui ne se réduit pas à « réparer le hook ».** Un
garde-fou qui ne peut plus s'exécuter ne devient pas silencieux : il devient
**accumulateur**. Six jours ont produit 22 assertions dont personne ne savait si
elles décrivaient le produit ou une intention. Le coût n'est pas l'échec, c'est
le tri — et il n'a été possible que parce que chaque test portait son motif écrit
à côté.

**Le garde du hook était faux, aussi.** Il saute les invariants de rendu si
`.env.local` est absent ; le fichier existait, sans la clé. Une garde qui teste
la présence d'un fichier plutôt que celle de la variable ne garde rien.

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
