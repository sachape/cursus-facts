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
