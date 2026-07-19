# Instruction : fix DocBar — garde backend en écriture + reset Save As au Close

> Rédigé par Gandalf (cadrage P1). Consommé par Gimli comme instruction de travail.
> Corrige 2 anomalies mineures relevées par Legolas sur les gestes fichier de la DocBar.
> Périmètre STRICTEMENT borné aux 2 correctifs ci-dessous — MVP, pas de refonte.

---

## Contexte

Legolas a relevé 2 anomalies mineures sur la barre de gestes fichier (New · Open · Save ·
Save As · Close), toutes deux liées à un **fonctionnement hors runtime Tauri** (navigateur
de dév, tests) ou à un **état résiduel** mal nettoyé :

1. **Erreur JS brute exposée à l'utilisateur en écriture.** Hors Tauri, une tentative de Save /
   Save As remonte une stack technique (`"Cannot read properties of undefined (reading 'invoke')"`)
   verbatim dans la barre d'état, au lieu d'un message compréhensible.
2. **Panneau Save As orphelin après échec, persistant à travers Close.** Un Save As en échec
   laisse l'invite affichée ; un Close ensuite ne la referme pas → l'invite reste visible alors
   que plus aucun document n'est ouvert (`artifact === null`).

Constats re-vérifiés sur le code au moment du cadrage (fichier:ligne ci-dessous).

## Ce qui existe

| Élément | Où | État |
|---|---|---|
| Façade unique `call()` autour de `invoke` | `src/api/backend.ts:20-26` | **appelle `invoke` SANS garde** — cause racine #1 |
| Détecteur de contexte Tauri `isTauri()` | `src/api/backend.ts:32-34` | **existe déjà** (`"__TAURI_INTERNALS__" in window`) — à réutiliser, ne PAS réinventer |
| `isTauri` exposé sur la façade `backend` | `src/api/backend.ts:498` | déjà dans l'objet injectable + mocké dans les tests (`isTauri: () => false`) |
| Écriture bas niveau (relaie l'erreur) | `src/forge/useForgeDocument.ts:206-212` | `catch → setLastError(e.message)` : relaie **verbatim** ce que rejette `libraryWrite` |
| Contrat auto-documenté du hook | `src/forge/useForgeDocument.ts:10-11` | « les appels échouent silencieusement » — **vrai en lecture, faux en écriture** (incohérence à lever) |
| Lecture listing (avale l'erreur) | `src/forge/useForgeDocument.ts:354-360` | `catch → raw = []` : dégradation silencieuse (référence de cohérence) |
| Lecture ciblée (surface l'erreur) | `src/forge/useForgeDocument.ts:271-298` | `performOpen` : `catch → setLastError` (surface volontaire d'un geste explicite) |
| `saveAsOpen` remis à false **au seul succès** | `src/forge/useForgeDocument.ts:260` | `if (outcome.ok) setSaveAsOpen(false)` — cause racine #2 |
| `performClose` (reset d'état document) | `src/forge/useForgeDocument.ts:300-308` | reset artifact/id/source/dirty/savedPath/lastError/lastWarning **mais PAS `saveAsOpen`** |
| `loadBlank` (New, reset d'état document) | `src/forge/useForgeDocument.ts:157-165` | même classe de bug : ne remet pas `saveAsOpen` à false |
| Harnais de test hook | `src/forge/useForgeDocument.test.ts:11-33` | `fakeBackend` : `isTauri: () => false` **+** `libraryWrite` fonctionnel |
| Tests DocBar (UI) | `src/forge/DocBar.test.tsx` | présents ; ne couvrent pas les 2 chemins ci-dessous |

**Trou de couverture confirmé (Legolas)** : aucun test n'exerce (a) le chemin **écriture-hors-backend**
(#1) ni (b) le **reset de `saveAsOpen` au Close** (#2).

## Décision

### #1 — Garde au point unique `call()` (dans `backend.ts`), PAS dans le hook

**Retenu :** poser la garde dans `src/api/backend.ts` `call()` — juste avant l'appel à `invoke` —
en réutilisant `isTauri()` déjà présent :

```ts
export async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error(BACKEND_UNAVAILABLE_MSG); // message utilisateur clair, cf. §Message
  }
  return invoke<T>(command, args);
}
```

**Pourquoi ce point et pas le hook :**

- `call()` est déclaré comme **« SEUL endroit autorisé à appeler `invoke` »** (garde D7 du Cockpit,
  en-tête `backend.ts:1-7`). La garde d'absence de `invoke` appartient donc **exactement** là où
  `invoke` est appelé : **un seul** choke point couvre toutes les commandes (`teamWrite`,
  `libraryWrite`, `kitDeploy`, `handoffDeliver`…), pas seulement Save/Save As.
- **Zéro changement dans le hook pour #1** : `writeArtifact` relaie déjà `e.message`
  (`useForgeDocument.ts:209`). Si `call()` rejette avec un message propre, la barre d'état affiche
  ce message propre — plus aucune stack. Le correctif est donc **local à `backend.ts`**.
- **Cohérence lecture/écriture préservée** : le listing (`listEntries`) continue d'avaler l'erreur
  → liste vide (contrat inchangé) ; l'écriture et l'ouverture ciblée surfacent désormais un message
  **propre** au lieu d'une stack. Cela **lève l'incohérence** signalée en `useForgeDocument.ts:10-11`.

**Écarté — garde dans le hook (`writeArtifact`) via `api.isTauri()` :** casserait tous les tests
d'écriture existants, car `fakeBackend` renvoie `isTauri: () => false` **avec** un `libraryWrite`
fonctionnel (`useForgeDocument.test.ts:20,26`) → un `if (!api.isTauri()) return …` dans le hook
ferait échouer Save As / Save déjà verts. La garde en `call()` (backend réel) laisse le fake
intact : le fake **remplace** `call()`, il ne le traverse pas. Point unique + non régressif.

### #2 — Refermer l'invite Save As à tout reset d'état document

**Retenu :** ajouter `setSaveAsOpen(false)` dans **`performClose`** (`:300-308`) **et** dans
**`loadBlank`** (New, `:157-165`). Les deux vident le document ; l'invite Save As, résiduelle,
n'a plus de sens quand `artifact === null` ou qu'on repart d'un vierge.

**Pourquoi les deux et pas seulement Close :** `loadBlank` (New) souffre du **même** défaut
(Save As en échec → New → invite orpheline sur un nouveau vierge). Corriger les deux points de
reset d'état = **cohérence de l'état vide** (demande explicite d'Odin), coût quasi nul (une ligne
chacun). Aucun autre état résiduel à nettoyer : `pending` est déjà remis à null par `proceedPending`
avant `performClose`, et `saId`/`saName`/`wasSaveAsOpen` sont **locaux à `DocBar`** et se
réinitialisent via l'effet de préremplissage (`DocBar.tsx:19-26`) à la réouverture — pas de
changement hook requis pour eux.

**On NE change PAS** le fait que `saveAs` ne referme l'invite **qu'au succès**
(`:260`) : un Save As en échec (id déjà pris, id invalide) doit **laisser l'invite ouverte** pour
que l'utilisateur corrige et réessaie. Le bug n'est pas là — il est que Close/New ne la referment pas.

## Message utilisateur proposé (on-brand, FR)

Constante unique dans `src/api/backend.ts` (pas de chaîne en dur dupliquée) :

```ts
export const BACKEND_UNAVAILABLE_MSG =
  "Backend indisponible — l'enregistrement n'est possible que dans l'app iakaframe packagée (pas dans le navigateur de dév).";
```

- Court, tient dans la barre d'état (`docstatus err`, `DocBar.tsx:88-92`).
- Explique **la cause** (hors app packagée) et **la conséquence** (pas d'enregistrement), sans jargon
  ni stack. FR, ton sobre iakaframe.
- Exporté → réutilisable par le test (assertion sur la **constante**, pas sur un littéral recopié).

*(Formulation à valider par Stéphane — cf. Points à trancher.)*

## Étapes d'implémentation

1. `src/api/backend.ts` : ajouter la constante exportée `BACKEND_UNAVAILABLE_MSG`.
2. `src/api/backend.ts` `call()` (`:20-26`) : `if (!isTauri()) throw new Error(BACKEND_UNAVAILABLE_MSG);`
   avant `return invoke(...)`.
3. `src/forge/useForgeDocument.ts` `performClose` (`:300-308`) : ajouter `setSaveAsOpen(false);`.
4. `src/forge/useForgeDocument.ts` `loadBlank` (`:157-165`) : ajouter `setSaveAsOpen(false);`.
5. `src/forge/useForgeDocument.ts` : ajuster le commentaire de contrat (`:10-11`) pour qu'il soit
   **exact** — p. ex. « le **listing** échoue silencieusement (liste vide) ; **écriture et ouverture
   ciblée** surfacent un message utilisateur propre si le backend est indisponible ».
6. Tests (vitest) — cf. Comportement attendu : ajouter les 2 tests de non-régression.

## Fichiers concernés

- `src/api/backend.ts` — constante `BACKEND_UNAVAILABLE_MSG` + garde `isTauri` dans `call()`.
- `src/forge/useForgeDocument.ts` — `setSaveAsOpen(false)` dans `performClose` **et** `loadBlank` ;
  correction du commentaire de contrat `:10-11`.
- `src/api/backend.test.ts` — **nouveau** (ou test ajouté à un fichier `src/api/` existant) :
  couvre `call()` hors Tauri (#1).
- `src/forge/useForgeDocument.test.ts` — **nouveaux tests** : write-hors-backend surfacé proprement
  (#1) + reset `saveAsOpen` au Close et au New (#2).

**Aucun autre fichier.** Ne pas toucher au reste de l'app (autres onglets, Rust, capabilities…).

## Comportement attendu (critères d'acceptation TESTABLES)

**#1 — garde backend :**

- [ ] En jsdom (aucun `__TAURI_INTERNALS__` sur `window`), `backend.call("team_write", {...})`
      **rejette** avec `message === BACKEND_UNAVAILABLE_MSG` (test dédié `backend.test.ts`).
- [ ] Le message rejeté **ne contient pas** `"invoke"` ni `"Cannot read properties"` (assertion
      anti-stack).
- [ ] Test hook (`useForgeDocument.test.ts`) : avec un `fakeBackend` dont `libraryWrite` **rejette**
      `new Error(BACKEND_UNAVAILABLE_MSG)`, après New + edit + Save As, l'`outcome.ok === false`,
      `outcome.error === BACKEND_UNAVAILABLE_MSG` et `result.current.lastError === BACKEND_UNAVAILABLE_MSG`
      (le hook relaie le message propre, pas une stack).

**#2 — reset Save As :**

- [ ] Test hook : après `requestNew()` puis `openSaveAs()` (⇒ `saveAsOpen === true`), un
      `requestClose()` (document non dirty) donne `saveAsOpen === false` **et** `artifact === null`.
- [ ] Test hook : après `openSaveAs()` (`saveAsOpen === true`), un `requestNew()` donne
      `saveAsOpen === false` (invite non orpheline sur le nouveau vierge).
- [ ] Variante échec (recommandée) : New + edit, `openSaveAs()`, `saveAs("pris", …)` sur un id
      existant ⇒ `saveAsOpen` reste `true` (invite laissée pour correction) ; puis Close ⇒
      `saveAsOpen === false` et `artifact === null`.

**Non-régression :**

- [ ] Tous les tests d'écriture existants de `useForgeDocument.test.ts` restent verts (le fake
      remplace `call()` ⇒ la garde ne les traverse pas).
- [ ] `DocBar.test.tsx` reste vert.

## Vérification

- [ ] Typecheck OK (`tsc`).
- [ ] Lint OK.
- [ ] Tests ajoutés/à jour et verts (vitest) — dont les 2 nouveaux chemins ci-dessus.
- [ ] Testé dans l'app réelle : lancer le front hors Tauri (navigateur de dév), tenter un Save →
      message propre dans la barre d'état (pas de stack) ; ouvrir Save As, provoquer un échec, Close →
      invite refermée.

## Hors scope

- Toute autre garde/erreur que le chemin `call()` → `invoke` (pas de refonte de la gestion d'erreurs
  des pilotes `execReview`/`execIaka`/`pickDirectory`, qui passent par `plugin-shell`/`dialog`, pas
  `invoke`).
- Fermeture de l'invite Save As **sur échec** de Save As (comportement voulu : l'invite reste pour
  correction).
- Modification du comportement du listing silencieux (`listEntries`) ou de `performOpen`.
- Toute modification Rust / `capabilities` / autres onglets / thème.
- Internationalisation du message (FR unique au MVP).

## Points à trancher (pour Stéphane)

1. **Emplacement de la garde** — recommandation ferme : `call()` (point unique, aligne
   « SEUL endroit autorisé à `invoke` », zéro régression du fake). Alternative hook écartée. → **valider.**
2. **Reset `saveAsOpen` aussi sur New (`loadBlank`)**, pas seulement Close — recommandé (même classe
   de bug, coût nul). → **confirmer** ou restreindre au seul Close.
3. **Formulation exacte du message** `BACKEND_UNAVAILABLE_MSG` (proposé ci-dessus). → **valider/ajuster.**
4. **Ouverture ciblée hors backend** : avec la garde, `performOpen` d'un id précis affichera le
   message propre (au lieu d'une stack) — amélioration, contrat de listing inchangé. → **OK ?**

## Jalon

Gate humain : cette instruction validée par Stéphane déclenche l'implémentation (Gimli).
Fichiers à vérifier avant dev : `src/api/backend.ts:20-34`, `src/forge/useForgeDocument.ts:10-11`,
`:157-165`, `:206-212`, `:260`, `:300-308`, `src/forge/useForgeDocument.test.ts:11-33`.
