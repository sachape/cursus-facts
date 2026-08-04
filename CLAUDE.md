# Cursus — comparateur de formations e-commerce

Faits durables du projet. La référence produit est le brief de passation et
`modele-de-donnees.md` : **ce document fait foi, le code l'implémente.**

## Ce que le produit est

Aider quelqu'un à trouver la formation e-commerce adaptée à sa situation en
comparant des faits vérifiables. Pas en lui disant laquelle est la meilleure.

Le marché est dominé par des comparatifs rémunérés à l'affiliation. Le pari de
Cursus est l'inverse : ne rien noter, ne rien classer par qualité, ne toucher
aucune commission, et tirer sa valeur de l'exhaustivité du catalogue et de la
vérifiabilité de chaque information.

## Les huit invariants — à ne jamais casser

1. Aucune note, aucun score de qualité, aucune moyenne. Nulle part.
2. Aucune information déduite. Un champ inconnu s'affiche « Non communiqué ».
3. Une fiche incomplète n'est jamais retirée du catalogue.
4. Le tri décrit l'état des fiches, jamais la qualité. Son libellé est affiché.
5. Aucun placement achetable, aucun lien affilié.
6. L'assistant produit une adéquation, jamais un jugement. « Meilleure », « top »
   et « recommandée » sont interdits dans ses sorties.
7. Toute règle appliquée au catalogue est publiée dans la page Méthode.
8. Toute décision manuelle est journalisée et publique.

Corollaire structurant : **le tronc pédagogique à 80 % est un veto, pas une
précondition.** On regroupe par défaut, on ne refuse qu'avec la preuve d'une
divergence réelle. Toute formulation inverse rend le manque d'information
rentable — c'est le biais que tout le modèle cherche à supprimer.

## Stack

TanStack Start + React 19 + TypeScript, shadcn/ui (Radix) + Tailwind v4,
Lovable Cloud pour le backend. Gestionnaire : **bun** (`bun.lock` fait foi).
Alias `@` → `./src`.

`vite.config.ts` est verrouillé par Lovable : ne pas y ajouter de plugins. La
config de test vit dans `vitest.config.ts`, séparée.

## Architecture

```
src/modele/        les règles, sans aucune dépendance à l'interface
  vocabulaires     9 domaines · 22 compétences · 31 sujets · 7 catégories
  classification   domaine (4 niveaux) · sujet principal (4 niveaux, seuil 40 %)
  regroupement     fusion / refus / ambigu · veto du tronc à 80 %
  completude       état des 18 champs · troisième état d'applicabilité
  classement       5 tris déclarés, libellé publié, jamais un ratio
  filtres          filtre principal = sujet, jamais compétence couverte
  adequation       5 critères → correspondances + écarts, déterministe
src/donnees/       catalogue source + référence de parité avec le prototype
src/ingestion/     preparer (pur, testable) → ecrire.server (service_role)
src/composants/    code-barres 18 traits, rangée, filtres, comparaison, nav
src/routes/        / · /comparer · /aide-au-choix · /organismes · /methode
                   /parcours/$slug · /admin/seed
```

## Assistant d'adéquation

`src/modele/adequation.ts` calcule **tout** : le choix des trois parcours, les
correspondances et les écarts. Claude n'intervient que pour rédiger une phrase
factuelle à partir de ces listes — il ne sélectionne rien et n'invente aucun
écart, qui serait une information déduite.

Sa sortie est vérifiée contre `MOTS_INTERDITS` avant affichage ; une phrase
contenant du vocabulaire de jugement est **remplacée** par la version
déterministe, pas corrigée. Sans `ANTHROPIC_API_KEY` côté serveur, le repli
déterministe s'applique et les faits restent exacts.

Attention aux limites de mot : `\b` en JavaScript est ASCII et ne délimite pas
un mot finissant par « é ». Le garde-fou utilise `(?<![\p{L}\p{N}])…` avec le
drapeau `u`, sans quoi « recommandé » passe inaperçu.

## Ingestion

La clé `service_role` n'est **pas récupérable** sur Lovable Cloud : elle est
injectée dans l'environnement serveur et ne peut être ni affichée ni copiée.
L'ingestion tourne donc côté serveur, jamais depuis un script local.

- `bun run ingestion:verifier` — à blanc, sans réseau : affiche ce qui partirait
  en base. Si un chiffre bouge sans qu'une règle ait changé, c'est le catalogue
  qui a bougé.
- `/admin/seed` — écriture réelle, protégée par le secret `SEED_TOKEN` et
  refusant d'écraser une base peuplée sans demande explicite. Ce second
  garde-fou compte pour la V2 : une base peuplée contiendra des corrections
  d'organismes qu'un seed rejoué effacerait.

`preparer.ts` est pur et testé sans accès à la base : c'est là que se vérifie ce
qui part en base, pas dans un log d'insertion.

**L'ordre de déclaration des vocabulaires est significatif** : la détermination
du domaine et du sujet retient le premier motif qui correspond. Réordonner une
liste change la classification du catalogue — c'est un changement de règle, à
publier et à vérifier par les tests de parité.

`SUJETS_OUTILS` et `MOTIFS_COMPETENCES` contiennent les mêmes 22 compétences
dans un ordre volontairement différent. Ne pas aligner les deux listes.

## Commandes de validation

`bun run typecheck` · `bun run test` (vitest, règles uniquement) ·
`bun run build` · `bun run seed` (nécessite `.env.local`).

Les tests portent sur les règles, jamais sur l'interface. `parite.test.ts`
verrouille le portage contre le prototype : toute divergence sur les 195
parcours est une régression de règle.

## Backend

Le backend est **Lovable Cloud**. Ne jamais modifier le schéma, l'auth, les
secrets ni les jobs depuis le code : passer par un prompt Lovable. Les
migrations dans `supabase/migrations/` sont écrites par Lovable.

Le seed a besoin de `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local`, que
`.gitignore` exclut via `*.local`.

## Git

Commits Conventional Commits, courts et atomiques. `main` est synchronisée avec
Lovable dans les deux sens : ne jamais réécrire l'historique publié (pas de
force push, pas de rebase de commits poussés), et toujours récupérer les commits
du bot Lovable avant de pousser.

## Corrections de données appliquées

**Prix nuls non attestés — 3 août 2026.** 33 parcours affichaient un prix de 0 €
tout en déclarant par ailleurs des frais universitaires, ou un financement par
France Travail, POEI ou OPCO. Un prix pris en charge par un tiers n'est pas un
prix nul, et 27 de ces fiches se contredisaient explicitement. Le `0` y était
déduit, pas publié — invariant 2.

Règle retenue, déterministe : **un prix nul n'est retenu que s'il est attesté**,
c'est-à-dire si les financements déclarés mentionnent la gratuité, ou si le
parcours est exclusivement en alternance (l'alternant ne paie pas). Sinon le prix
vaut `non_communique`.

Effet : gratuits 73 → 40, informations vérifiées 2 401 → 2 368. Les BTS et BUT en
lycée public restent gratuits, les certifications éditeurs aussi. Vérifié par
`completude.test.ts`, qui n'autorise de baisse par rapport au prototype que sur
le champ prix, d'exactement un point.

**Qualification de la gratuité — 3 août 2026.** « Gratuit » recouvrait cinq
réalités écrasées en un prix valant zéro. Le champ `modalite_acces` les
distingue (`libre`, `compte_requis`, `compte_produit_requis`,
`certificat_payant`, `freemium`, `pris_en_charge`, ou `null`).

Règle : **la gratuité ne s'affirme jamais par défaut**. Elle n'est renseignée
que si l'organisme la publie sur son propre site, et la modalité est alors
précisée ; sinon le prix reste « Non communiqué ». On n'écrit jamais « Gratuit »
seul. `preparer.test.ts` interdit tout prix nul sans modalité.

Sur les 40 fiches auditées : 14 qualifiées sur source officielle ou fait
structurel, 26 passées à « Non communiqué » faute de vérification. Informations
vérifiées 2 368 → 2 340. Le filtre « Gratuit » est devenu « Sans frais pour
l'apprenant » + « Accès partiel gratuit », et le tri par prix ne remonte plus
les fiches freemium en tête (`rangPrix`).

**Corrections AMZ Academy — 3 août 2026.** Prix de la formule Premium
1 890 € → **1 690 €**, volume horaire → **25 h**, programme des trois formules
→ **10 modules**, d'après le site officiel de l'organisme. L'écart de 200 €
venait d'une donnée de comparatif : c'est précisément ce que la règle interdit.

**Arbitrage AMZ Academy résolu sans arbitrage.** Les trois programmes étant
désormais publiés, le tronc est commun à 100 % et la règle de fusion s'est
appliquée d'elle-même. Consigné dans `src/donnees/journal-arbitrages.json`,
publié dans la vue Méthode. La file est une salle d'attente, pas un tribunal —
et ce cas le démontre. Catalogue : 196 offres → **194 fiches**, 0 cas en file.

## Une fiche décrit un parcours achetable, pas une famille de parcours

**Retrait de deux pages catalogue — 4 août 2026.** « Formations digital et
multimédia » (M2i) et « Formations e-commerce et CMS » (Dawan) étaient des pages
catalogue d'organisme fichées comme des parcours. Le problème n'était pas
qu'elles soient vides : elles portaient des champs **remplis de valeurs vraies
d'aucun cours**. « 1 à 5 jours » n'est la durée de rien ; « Aucun prérequis »
était démenti par PrestaShop Développeurs, qui exige PHP et l'orienté objet.

Une moyenne de catalogue présentée comme un fait sur un parcours est une
information déduite — invariant 2. Ces fiches plafonnaient aussi mécaniquement
le pourcentage de profondeur publié dans Méthode, puisqu'aucune page n'existait
qui aurait pu les compléter.

Règle : **une fiche décrit un parcours qu'on peut acheter**, avec un prix, une
durée et un programme qui lui sont propres. Une famille de parcours n'est pas
une fiche. Les parcours recouverts sont fichés séparément, donc le catalogue ne
perd rien — on retire un résumé de ce qu'il contient déjà.

Les retraits sont déclarés dans `parite.test.ts` (`RETIREES`), avec leur motif,
comme les corrections. Effet : 234 → 232 offres, 232 → 230 fiches, informations
vérifiées 2 657 → 2 638. Une baisse qui vaut mieux que le chiffre qu'elle
remplace.

**À trancher au cas par cas, jamais par motif.** Une durée en fourchette ne
suffit pas à disqualifier : « 12 à 13 mois » pour un Mastère Spécialisé décrit un
seul programme. Seule la lecture de la page de l'organisme dit si l'intitulé
désigne un produit ou une famille — c'est donc le travail de la file de collecte,
pas d'une règle automatique.

## Trois façons de tarifer, pas deux

Constaté en collecte le 4 août 2026 :

- **M2i, Cegos** publient un couple inter/intra sur la même page (890 / 2 670 €,
  1 690 / 4 150 €, « groupe de 12 personnes max »). C'est là que le risque de
  confusion existe.
- **ORSYS** publie l'inter seul, l'intra étant sur devis. Son prix affiché ne
  peut structurellement pas être un tarif de groupe.
- **Dawan** ignore la distinction et tarife **par format** : distanciel 1 500 €,
  présentiel 1 875 €, tutorat 1 000 €, avec un tarif journalier étiqueté INTER.

Piège vécu : le 1 875 € de Dawan a d'abord été enregistré comme tarif intra
alors que c'est le prix présentiel — exactement la confusion que le champ existe
pour empêcher. `dispo_intra` reste `null` quand rien n'est publié : **non
établi, pas inexistant.**

Deux booléens (`dispo_inter`, `dispo_intra`) absorbent les trois cas ; une
énumération `inter | intra | les_deux` n'y arrivait pas, et `les_deux` aurait
été la valeur par défaut de fait — ORSYS écrit que *toutes* ses formations
peuvent être organisées en intra.

## On n'efface pas une valeur, on la déclasse

**Incident du 3 août 2026, corrigé le 4.** La consigne « n'affirme pas la
gratuité sans vérifier » a été appliquée à la lettre, et le résultat était faux :
**61 prix effacés**, dont les trois parcours Google que Google publie lui-même
« gratuites » / « at no cost ». Une règle d'écriture sans règle d'effacement
produit une dérive silencieuse — face à une valeur qu'on ne peut pas confirmer,
on la supprime.

Règle, dans `src/modele/provenance.ts` : **une valeur existante qu'on ne peut pas
reconfirmer ne devient jamais « non communiqué »**. Elle conserve sa valeur,
passe en `a_confirmer`, s'affiche signalée, et entre en tête de file (4 points
par champ, plus qu'un prix absent). Seule la lecture d'une page officielle
**constatant l'absence** autorise l'effacement — `arbitrerEcriture` n'a pas
d'autre chemin.

Une disparition d'information est un **événement suspect, pas une mise à jour**.
Vaut pour toute correction manuelle comme pour un futur agent de rafraîchissement,
qui reproduirait le même comportement à l'échelle.

**Le garde-fou** est dans `preparer.test.ts` : un plancher sur les *valeurs
présentes* (`renseignees + aConfirmer`), pas sur les valeurs vérifiées. Déclasser
ne le fait pas bouger ; effacer le fait tomber et le test échoue. Le baisser
exige un motif écrit dans le test, et vaut autorisation explicite.

`historique` conserve pour chaque champ la valeur précédente, la date et le
motif : toute correction de masse est annulable.

## Un état renseigné ne doit jamais s'afficher « Non communiqué »

`certificationCourte()` renvoyait `null` dès que le code RNCP manquait —
effaçant à l'écran **180 des 208 certifications** du catalogue :
« Certification Google », « Attestation », « Qualiopi », « Aucune » (un fait
publié), et jusqu'à « Titre RNCP » quand l'organisme publie le libellé sans le
numéro.

Le code-barres comptait le trait plein pendant que la rangée disait « Non
communiqué » : **l'interface contredisait son propre compteur**. Sur un produit
dont la valeur est la vérifiabilité, c'est l'incohérence la plus coûteuse. Tout
écart entre `etats[champ] === "renseigne"` et ce que la rangée affiche est un
bug, jamais un choix d'affichage.

## Découverte — deux statuts distincts

Ne jamais confondre :

- **Offre inaccessible** — sessions fermées, page en attente, modèle par
  ouvertures ponctuelles. C'est une information sur le vendeur.
- **Non atteint par la collecte** — page nécessitant un rendu JavaScript,
  domaine injoignable, site non atteint. C'est une information sur notre
  outillage.

Confondre les deux fait porter au vendeur une opacité qui est peut-être la
nôtre. Le statut par défaut d'un échec de collecte est le second.

**Source débloquée.** La liste DREETS des organismes de formation déclarés est
en open data, téléchargeable **sans clé ni inscription** (CSV ~39 Mo, mis à jour
quotidiennement, 165 726 organismes) :
`https://www.data.gouv.fr/api/1/datasets/r/ac59a0f5-fa83-4b82-bf12-3c5806d4f19f`
Elle porte le numéro de déclaration d'activité et le statut Qualiopi — donc la
bascule entre « Formations indépendantes » et « Formations professionnelles ».

Limite constatée : elle ne porte **pas le code NAF**, et le filtrage par
dénomination sociale est peu productif (11 correspondances sur 165 726, dont
la moitié de faux positifs). Les créateurs indépendants n'incorporent pas sous
un nom contenant « ecom ». Le ciblage NAF 85.59A/B via SIRENE reste nécessaire.

## Profondeur de collecte

Un champ vide ne dit pas la même chose selon la profondeur atteinte :

- **`non_collecte`** — la page de détail n'a pas été ouverte. **Fait sur nous.**
  Sort du dénominateur : on ne reproche pas une absence non vérifiée.
- **`non_communique`** — page de détail lue, l'organisme ne publie pas. Fait sur
  lui, critère de comparaison légitime.
- **`non_applicable`** — le champ n'a pas de sens pour ce parcours.

`determinerEtats` bascule entre les deux premiers selon `offre.profondeur`
(`catalogue_seul` | `detail_verifie`). Le pourcentage vérifié en profondeur est
publié dans la vue Méthode — aucun comparatif affilié ne publiera ce chiffre.

**La file de collecte est un pipeline, pas une tâche de session.** 232 pages
aujourd'hui, plusieurs milliers à terme. Son état est persisté dans
`src/donnees/file-collecte.json` ; `bun run collecte:file` la reconstruit,
`bun run collecte:lot` sort les 20 fiches dont le manque coûte le plus (prix
absent = 2 points, programme, non-couvert, volume, prérequis = 1 chacun).

Le catalogue fait foi sur la profondeur : `construireFile` réconcilie le statut
à chaque passage, sinon les mêmes pages seraient retraitées indéfiniment.

## Dette connue, tracée

- **Éligibilité CPF** : 164 fiches à `cpf: 0`. Le booléen ne distingue pas
  « vérifié non éligible » de « non vérifié ». Non corrigé faute de moyen
  déterministe de trancher — corriger par déduction violerait l'invariant 2.
- **La fusion ne se déclenche jamais** sur le catalogue actuel (192 fiches
  autonomes, 3 ambiguës, 0 fusion). La règle reste couverte par des cas
  construits dans `regroupement.test.ts`.
- **Dédoublonnage réel** : la règle ne reconnaît que les suffixes de formule.
  89 parcours sur 195 ne publient aucun programme.
- **Visibilité contre référencement** : une fiche à 7/18 atterrit en page 4.
  Non résolu.
