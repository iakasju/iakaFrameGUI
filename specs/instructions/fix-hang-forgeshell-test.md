# Instruction : fix hang `ForgeShell.test.tsx` — boucle de rendu infinie (onglet Méthode)

> Rédigé par Gandalf (cadrage P1). Consommé par Gimli comme instruction de travail.
> Bug **pré-existant** (indépendant du correctif DocBar), confirmé par Legolas (`git stash` sur
> arbre propre). Périmètre STRICTEMENT borné au correctif de la boucle — MVP, pas de refonte.

---

## Contexte

`npx vitest run src/forge/ForgeShell.test.tsx` démarre (`RUN v4.1.9`) puis **ne se termine
jamais** : worker à ~100 % CPU, > 12 min observés sans qu'aucun `it()` ne rende la main.
Conséquence directe : **`npm test` global ne peut pas se terminer** (le worker de ce fichier
pend), d'où le contournement actuel « tests fichier par fichier ».

Ce hang était jusqu'ici **mal attribué** : l'état des lieux (P6b, `CLAUDE.md:140-142` et
`:159-160`) le notait comme « 2 tests `ForgeShell.test.tsx` à reconfirmer sur CI / machine
reposée (machine saturée VM Docker) ». **Ce n'est PAS une saturation machine** : c'est une
**boucle de rendu infinie** dans le composant, introduite en même temps que l'effet de
rafraîchissement des workflows (P6b, `be9dcd4`). Le diagnostic ci-dessous est établi **par
lecture du code** (fichier:ligne), pas par supposition.

## Diagnostic — cause racine (boucle de rendu infinie)

**C'est un bug de COMPOSANT, pas de TEST.** Le test est correct : il exerce un parcours
utilisateur réel (basculer sur l'onglet « Méthode »). La boucle se déclenche dans le composant
et se reproduirait **à l'exécution réelle de l'app** dès que l'utilisateur ouvre l'onglet
Méthode (voir « Test vs composant » plus bas).

### La chaîne causale (3 maillons)

**Maillon 1 — l'effet fautif re-dépend d'une valeur instable.**
`src/forge/ForgeShell.tsx:174-183` — l'effet de rafraîchissement de la liste des workflows :

```
useEffect(() => {
  if (tab !== "methode") return;
  let alive = true;
  void workflowDoc.listEntries().then((entries) => {
    if (alive) setWorkflowOptions(entries);   // ← setState
  });
  return () => { alive = false; };
}, [tab, workflowDoc, workflowArtifact]);       // ← dépend de `workflowDoc` (objet entier)
```

Cet effet **appelle `setWorkflowOptions`** et **dépend de `workflowDoc`**. Il ne re-tourne
donc que si `workflowDoc` change d'identité entre deux rendus.

**Maillon 2 — `workflowDoc` change d'identité à CHAQUE rendu.**
`workflowDoc = useForgeDocument({...})` (`ForgeShell.tsx:139-147`). Le **`config`** passé au
hook est un **littéral d'objet recréé à chaque rendu** (les arrow-functions `blank`,
`serialize`, `parse`, `idOf`, `nameOf`, `withName` ont une **nouvelle identité** à chaque
rendu). Dans le hook, `listEntries` est un `useCallback(..., [api, config])`
(`useForgeDocument.ts:358-370`) : `config` changeant à chaque rendu, `listEntries` change à
chaque rendu ; l'objet retourné par le `useMemo` final (`useForgeDocument.ts:375-428`, qui a
`listEntries` dans ses deps) **change donc d'identité à chaque rendu**. → `workflowDoc` a une
**nouvelle référence à chaque rendu**.

**Maillon 3 — `setWorkflowOptions` ne bail jamais.**
`setWorkflowOptions(entries)` reçoit **toujours un nouveau tableau** (`listEntries` renvoie
`raw.map(...)…` = un nouveau `[]` à chaque appel, `useForgeDocument.ts:365-369`). React ne
bail que sur égalité `Object.is` ; un nouveau `[]` ≠ l'ancien `[]` → **re-rendu programmé à
chaque fois**.

### Le cycle qui ne converge pas (quand `tab === "methode"`)

rendu → effet re-tourne (car `workflowDoc` a une nouvelle identité) → `listEntries()`
**résout** → `setWorkflowOptions(nouveau [])` → re-rendu → nouveau `workflowDoc` → effet
re-tourne → … **à l'infini**, en continu (100 % CPU). La mise à jour venant d'un `.then`
(microtâche) et **non** d'un rendu synchrone, le garde-fou React « Maximum update depth
exceeded » (qui ne compte que les updates synchrones imbriqués) **ne se déclenche pas** : la
boucle tourne indéfiniment sans jamais lever d'erreur.

**Pourquoi `listEntries()` résout (et n'attend pas) en test** : en jsdom, `isTauri()` est faux
→ `backend.call()` **rejette** `BACKEND_UNAVAILABLE_MSG` (`backend.ts:29-38`) → `libraryList`
rejette → mais `listEntries` **avale** l'erreur (`try { … } catch { raw = [] }`,
`useForgeDocument.ts:358-364`) et **résout à `[]`**. La promesse se résout donc immédiatement :
la boucle est **vivante et continue**, elle ne pend pas sur un `await`. (Un `findBy` qui ne
converge pas donnerait un échec après ~1 s, PAS un hang > 12 min — ce n'est donc pas la piste.)

### Pourquoi ce fichier précisément, et pourquoi tout `npm test` pend

- **Test 1** (`ForgeShell.test.tsx:6-17`) **clique sur l'onglet Méthode** → `tab = "methode"`
  → la boucle démarre → le worker ne redevient jamais quiescent (l'arbre de rendu ne se
  stabilise plus, la file de microtâches ne se vide jamais) → **hang**.
- **Test 2** (`:19-22`) reste sur l'onglet Team → **seul, il ne bouclerait pas** (l'effet
  `tab !== "methode"` sort tôt, `:175`). Mais vitest exécute les 2 tests dans le même worker :
  le hang du test 1 empêche le fichier de finir.
- `npm test` global exécute les fichiers en workers ; **ce worker ne se termine jamais** → la
  run entière ne peut pas conclure.

### Pistes explicitement ÉCARTÉES (vérifiées par le code)

| Piste | Verdict | Preuve |
|---|---|---|
| `useEffect` de semis (`:151-158`) en boucle | **écartée** | corps gardé par `seeded.current` (`:152-153`) : ne re-tourne jamais même si ses deps changent |
| Effet `resolveMethodWorkflow` (`:186-195`) en boucle | **écartée** | dépend de `[method]`, référence **stable** (posée une fois au semis) ; `setResolvedMethodWorkflow` ne remute pas `method` |
| Timer / interval / polling non mocké | **écartée** | aucun `setInterval`/`setTimeout` récursif dans `ForgeShell.tsx` ni les hooks impliqués |
| Promesse jamais résolue / `await` sur backend absent | **écartée** | `listEntries` **résout** (`catch → []`), ne pend pas ; un hang par attente non résolue serait un échec `findBy` à ~1 s, pas 100 % CPU |
| `waitFor`/`findBy` qui ne converge jamais | **écartée** (symptôme, pas cause) | le texte cible **est** rendu ; c'est la boucle de rendu qui empêche la quiescence, pas l'attente |
| Config vitest propre au fichier (jsdom/fake timers) | **écartée** | même environnement que les autres `*.test.tsx` verts ; rien de spécifique à ce fichier |

## Test vs composant (distinction cruciale)

**Bug de COMPOSANT — user-facing.** La boucle ne dépend **pas** du harnais de test :

- En prod (app Tauri), `libraryList("workflows")` **résout** aussi (liste réelle, éventuellement
  vide), et `listEntries` renvoie **un nouveau tableau à chaque appel** → `setWorkflowOptions`
  ne bail jamais → **même boucle** dès que l'utilisateur ouvre l'onglet Méthode.
- Donc : **ouvrir l'onglet Méthode dans l'app réelle fait tourner le CPU à fond et inonde les
  re-rendus indéfiniment.** C'est un vrai défaut utilisateur, pas de la dette de test.

⇒ **Le correctif est dans le COMPOSANT / le hook — PAS dans le fichier de test.** Le test
`ForgeShell.test.tsx` reste **inchangé** (il documente le parcours qui doit fonctionner).

## Ce qui existe

| Élément | Où | État |
|---|---|---|
| Effet de rafraîchissement des workflows | `src/forge/ForgeShell.tsx:174-183` | dépend de `workflowDoc` (objet instable) **+** appelle `setWorkflowOptions` — **cause racine (maillon 1)** |
| État `workflowOptions` | `src/forge/ForgeShell.tsx:168` | `useState<LibraryEntry[]>([])` — remis à un **nouveau** tableau à chaque tour (maillon 3) |
| Création `workflowDoc` (config littéral/rendu) | `src/forge/ForgeShell.tsx:139-147` | `config` recréé à chaque rendu → identité `workflowDoc` instable (**maillon 2**) |
| `listEntries` (deps `[api, config]`) | `src/forge/useForgeDocument.ts:358-370` | change d'identité à chaque rendu (car `config` change) ; renvoie un **nouveau** tableau |
| `useMemo` de retour du hook | `src/forge/useForgeDocument.ts:375-428` | a `listEntries` (+ autres callbacks instables) dans ses deps → objet doc **instable** à chaque rendu |
| Garde backend hors Tauri | `src/api/backend.ts:29-38` | `call()` rejette `BACKEND_UNAVAILABLE_MSG` → `listEntries` résout à `[]` (boucle vivante, pas d'attente) |
| Effet de semis (référence de contraste) | `src/forge/ForgeShell.tsx:151-158` | dépend aussi de docs instables **mais** gardé par `seeded.current` → **ne boucle pas** (modèle du correctif ref) |
| Tests du composant (à préserver) | `src/forge/ForgeShell.test.tsx:6-22` | 2 tests corrects ; **ne pas modifier** ; doivent passer après fix |
| Tests du hook (à ne pas régresser) | `src/forge/useForgeDocument.test.ts` | couvrent New/Open/Save/Save As/Close/dirty ; base de non-régression |

## Décision (à trancher par Stéphane — options structurantes)

Deux niveaux de correction. **Gandalf recommande l'option B** (cause racine), avec l'option A
comme repli minimal si Stéphane veut le plus petit diff possible pour un hotfix MVP.

### Option A — corriger l'effet fautif (symptôme, minimal, 1 fichier)

Dans `ForgeShell.tsx`, ne plus dépendre de l'**objet** `workflowDoc` dans l'effet `:174-183`.
Deux formes possibles (au choix de Gimli, équivalentes) :
- garder `workflowDoc` dans un `ref` (mis à jour à chaque rendu) et lire `ref.current` dans
  l'effet, dont les deps redeviennent `[tab, workflowArtifact]` (valeurs stables) ; **ou**
- extraire `const { listEntries } = workflowDoc;` **une fois** et — seulement si `listEntries`
  est rendu stable (⇒ nécessite l'option B) — dépendre de `[tab, listEntries, workflowArtifact]`.

- **Pour** : diff minuscule, localisé, faible risque.
- **Contre** : traite le **symptôme**. L'instabilité d'identité de `workflowDoc` (et des 3 autres
  docs) **reste latente** : l'effet de semis `:151-158` ne s'en sort aujourd'hui que par son
  garde `seeded.current` ; tout futur effet/`useMemo` consommant un doc rebutera sur le même
  piège. Fragile.

### Option B — stabiliser l'identité du doc dans `useForgeDocument` (cause racine) — RECOMMANDÉ

Dans `useForgeDocument.ts`, tenir `config` dans un **ref** (`configRef.current = config` à
chaque rendu, comme `artifactRef`/`idRef` déjà présents `:150-154`) et faire lire les callbacks
internes (`loadBlank`, `writeArtifact`, `listEntries`, `save`, `saveAs`, `performOpen`, `setName`)
sur `configRef.current` **au lieu de fermer sur `config`** → retirer `config` de leurs
tableaux de deps. Résultat : les callbacks (et donc le `useMemo` de retour) redeviennent
**stables**, l'objet doc ne change d'identité **que sur un vrai changement d'état** → l'effet
`:174-183` ne re-tourne plus à chaque rendu → boucle éteinte à la source.

- **Pour** : supprime la **classe entière** de bugs (tous les consommateurs du doc deviennent
  corrects) ; idiomatique au fichier (déjà bâti autour de refs) ; les configs sont de fait
  **statiques par instance** (aucune réactivité perdue en les lisant via ref).
- **Contre** : touche un hook central (≈ 7 callbacks) ; exige de vérifier que chaque callback
  lit bien `configRef.current`. Risque contenu, couvert par `useForgeDocument.test.ts` +
  `ForgeShell.test.tsx`.

### Option C — mémoïser les 4 `config` dans `ForgeShell` (corrige aussi la racine)

Envelopper chacun des 4 objets `config` (`:92-147`) dans `useMemo(() => ({...}), [])`.
- **Pour** : stabilise aussi l'identité des docs.
- **Contre** : répétitif (4 memos aux closures nombreuses), **facile à oublier** au prochain
  onglet ajouté ; moins robuste qu'un correctif unique dans le hook. Écartée au profit de B.

### Option D — garde d'égalité sur `setWorkflowOptions` (défense, insuffisante seule)

Ne poser l'état que si `entries` diffère réellement de l'actuel (comparaison peu profonde).
- **Contre** : **n'empêche pas** l'effet de re-tourner à chaque rendu (churn asynchrone continu
  de `listEntries`), donc **insuffisant seul**. Acceptable en **ceinture+bretelles** au-dessus
  de A ou B, pas comme correctif principal.

**Recommandation Gandalf : B** (racine, robuste, idiomatique). Repli **A** si hotfix minimal
exigé. **C/D** non retenues seules.

## Étapes d'implémentation (selon l'option retenue)

**Si B (recommandé) :**
1. `useForgeDocument.ts` : ajouter `const configRef = useRef(config); configRef.current = config;`
   (à côté de `artifactRef`/`idRef`, `:150-154`).
2. Réécrire `loadBlank`, `writeArtifact`, `listEntries`, `save`, `saveAs`, `performOpen`,
   `setName` pour lire `configRef.current.<champ>` au lieu de `config.<champ>` ; **retirer
   `config`** de leurs tableaux de deps `useCallback` (garder `api` — lui aussi dérivable de
   `configRef` si voulu, mais `api` est déjà stable via `?? backend`).
3. Vérifier que le `useMemo` de retour (`:375-428`) n'a plus de dépendance instable résiduelle.
4. `ForgeShell.tsx` : **aucun changement requis** (l'effet `:174-183` se stabilise mécaniquement).
   *Option ceinture+bretelles :* si Stéphane le souhaite, appliquer aussi A (deps réduites).

**Si A (repli) :**
1. `ForgeShell.tsx:174-183` : introduire un `ref` sur `workflowDoc` et réduire les deps de
   l'effet à `[tab, workflowArtifact]` (ne plus dépendre de l'objet `workflowDoc`).
2. Ne rien changer d'autre.

**Dans les deux cas :**
- Ne toucher **ni** `ForgeShell.test.tsx` **ni** le rendu de `ForgeShell` (JSX inchangé).
- Ajouter le(s) test(s) de non-régression ci-dessous.

## Fichiers concernés

- **Option B** : `src/forge/useForgeDocument.ts` (config-ref + deps des callbacks). Éventuellement
  `src/forge/ForgeShell.tsx:174-183` en complément (ceinture+bretelles).
- **Option A** : `src/forge/ForgeShell.tsx:174-183` uniquement.
- Tests : `src/forge/ForgeShell.test.tsx` (**inchangé**, doit passer) + éventuel ajout d'un test
  ciblé de non-boucle (cf. ci-dessous).

**Aucun autre fichier.** Ne pas toucher : Rust / `capabilities`, autres ateliers, thème, le
fichier de test existant (hors ajout de non-régression), le comportement fonctionnel des docs.

## Comportement attendu (critères d'acceptation TESTABLES)

- [ ] `npx vitest run src/forge/ForgeShell.test.tsx` **se termine en < 30 s** (cible franche ;
      en pratique attendu < 5 s) — plus aucun hang, worker qui rend la main.
- [ ] Les **2 tests** du fichier passent (`bascule vers l'atelier Méthode puis Kit` **et**
      `le bouton « Livrer au Cockpit » est présent`) — aucune régression fonctionnelle.
- [ ] `npm test` (run global, ≈ 42 fichiers) **se termine** et **au vert**, sans lancement
      fichier par fichier — le worker de `ForgeShell.test.tsx` ne pend plus.
- [ ] **Non-régression du hook** : tous les tests de `src/forge/useForgeDocument.test.ts`
      restent verts (les gestes New/Open/Save/Save As/Close/dirty/rename conservent leur
      comportement — la stabilisation d'identité ne change pas la sémantique).
- [ ] **(Recommandé) test anti-boucle ciblé** : monter `<ForgeShell />`, basculer sur l'onglet
      Méthode, et vérifier que l'arbre atteint la quiescence (le test lui-même **se termine**,
      p. ex. `findByText(/Stock — atelier Méthode/)` résout puis `unmount()` sans timeout) — ce
      test **échouerait** (timeout) sur le code actuel et passe après correctif.
- [ ] **(Si option B)** vérif que l'identité de `workflowDoc` est stable entre deux rendus sans
      changement d'état — assertion possible via un test `renderHook` sur `useForgeDocument`
      (`result.current` identique après un re-render forcé sans mutation).

## Vérification

- [ ] Typecheck OK (`tsc`).
- [ ] Lint OK (dont `react-hooks/exhaustive-deps` : les deps déclarées doivent rester
      **honnêtes** — pas de suppression de dep réelle masquée ; si un `ref` est utilisé, la règle
      l'accepte).
- [ ] `npx vitest run src/forge/ForgeShell.test.tsx` < 30 s, 2/2 verts.
- [ ] `npm test` global se termine au vert.
- [ ] Testé dans l'app réelle (`npm run tauri dev`) : ouvrir l'onglet **Méthode**, laisser
      quelques secondes → **CPU au repos** (pas d'emballement), le sélecteur « Workflow référencé »
      se peuple normalement, navigation Team/Méthode/Kit fluide.

## Hors scope

- Toute **refonte** de `useForgeDocument` au-delà de la stabilisation d'identité (pas de
  changement de l'API du hook, des gestes fichier, de la sérialisation, de l'I1).
- Correction des **autres** effets de `ForgeShell` (semis `:151-158`, `resolveMethodWorkflow`
  `:186-195`) : ils **ne bouclent pas** aujourd'hui ; ne pas les toucher (sauf si l'option B les
  simplifie **sans** changer leur comportement observable).
- Modification du **fichier de test** `ForgeShell.test.tsx` (au-delà d'un éventuel **ajout** de
  test anti-boucle ; les 2 tests existants restent tels quels).
- Toute modification Rust / `capabilities` / thème / autres onglets.
- Optimisation de performance générale du rendu (mémoïsation large) : hors sujet, MVP ciblé.

## Points à trancher (pour Stéphane)

1. **Option A (symptôme, 1 fichier) vs Option B (cause racine dans le hook)** — recommandation
   Gandalf : **B** (supprime la classe de bugs, idiomatique aux refs déjà présents). A = repli
   hotfix minimal acceptable. → **trancher.**
2. **Ajouter le test anti-boucle ciblé** (recommandé, sert de garde-fou de non-régression futur)
   ou se contenter de la non-régression des 2 tests existants + run global vert ? → **confirmer.**
3. **Seuil `N` du critère de temps** : proposé **< 30 s** (marge confortable vs > 12 min
   observés ; réel attendu < 5 s). → **valider/ajuster.**
4. **Ceinture+bretelles** : si B retenu, faut-il **en plus** réduire les deps de l'effet
   `:174-183` (défense) ou laisser la seule stabilisation du hook ? → **au goût de Stéphane.**

## Jalon

Gate humain : cette instruction validée par Stéphane déclenche l'implémentation (Gimli).
Fichiers à vérifier avant dev : `src/forge/ForgeShell.tsx:168`, `:174-183`, `:139-147`,
`:151-158` ; `src/forge/useForgeDocument.ts:150-154`, `:358-370`, `:375-428` ;
`src/api/backend.ts:29-38` ; `src/forge/ForgeShell.test.tsx:6-22`.
