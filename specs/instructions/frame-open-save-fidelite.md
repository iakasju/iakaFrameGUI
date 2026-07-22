# Instruction : Open→Save fidèle au frame — préserver corps + wrapping (défauts 2+3)

> Cadré par Gandalf (P1). Consommé par Gimli (P2) comme instruction de travail.
> Dépôt : **iakaFrameGUI**. Lot : « charger le frame dans le GUI » — étapes 2+3 **couplées**
> (mêmes fichiers). Doctrine non négociable : **GUI ← frame**. Aucun correctif ne déforme le
> frame pour arranger le GUI ; c'est le GUI qui se plie au frame.

---

## Contexte

Ouvrir un artefact réel du frame (une méthode, une team, un kit) dans un onglet de la forge puis
faire **Save** **détruit** le fichier : le narratif markdown est remplacé par deux lignes de
boilerplate, et le frontmatter multi-lignes est reflowé sur une seule ligne. Le GUI **déforme**
donc le frame à chaque aller-retour — violation directe de la doctrine `GUI ← frame`.

Deux défauts, **même cause racine** et **mêmes fichiers** (`ForgeShell.tsx` +
`useForgeDocument.ts`), d'où leur traitement couplé :

- **Défaut 2 — Save écrase le corps.** À l'ouverture, seul le résultat du parse (les ids) est
  conservé ; le **corps markdown réel est jeté**. Au Save, un **corps boilerplate généré** est
  réinjecté à la place.
- **Défaut 3 — wrapping non préservé.** Le cœur **sait** préserver la découpe en lignes des
  listes flow (`readListLayout` + 3ᵉ argument `layout` de `serializeMethodMd`), mais l'appelant
  **ne capture pas** le layout à l'Open et **ne le passe pas** au Save. Le frontmatter est donc
  reflowé mono-ligne à chaque écriture.

Ce chantier fait de **Open→Save un round-trip idempotent** (diff vide) sur les artefacts réels du
frame, preuve mécanique que le GUI ne déforme plus le frame.

## Ce qui existe (établi sur pièces)

### Le flux Open→parse→edit→serialize→Save

| Étape | Emplacement (symbole) | Ce qui se passe |
|---|---|---|
| Open (I/O) | `useForgeDocument.ts` → `performOpen` | `api.libraryRead(collection, id)` renvoie le **texte brut** du `.md`. |
| Open (parse) | `useForgeDocument.ts` → `performOpen`, `setArtifact(cfg.parse(text))` | **`cfg.parse(text)` ne retient que les ids** ; le texte brut (corps + wrapping) **n'est ni stocké ni référencé** → **perdu ici**. |
| Edit | `ForgeShell.tsx` (ateliers → `doc.edit`) | L'utilisateur modifie l'artefact riche (`Team`/`Method`/`Kit`/`Workflow`). |
| Save (serialize) | `useForgeDocument.ts` → `writeArtifact`, `cfg.serialize(target)` | Appelle la closure `serialize` de l'onglet. |
| Save closures | `ForgeShell.tsx` → `teamDoc`/`methodDoc`/`kitDoc`/`workflowDoc` `serialize:` | Ex. `serializeMethodMd(methodToMd(m), methodBody(m))` : **corps = boilerplate** (`methodBody`/`teamBody`/`kitBody`/`workflowBody`), **layout = absent** (3ᵉ arg omis). |
| Save (I/O) | `useForgeDocument.ts` → `writeArtifact`, `api.libraryWrite` | Écrit le `.md` reconstruit (corps perdu + frontmatter reflowé). |

**Où le corps réel est disponible et où il est perdu** : disponible dans `text` (argument de
`performOpen`, retour de `libraryRead`) ; perdu à la ligne `setArtifact(cfg.parse(text))`, qui ne
propage **que** l'artefact parsé. Le corps et le layout ne survivent nulle part dans l'état du
document.

### Les primitives du cœur existent déjà (rien à réécrire côté sérialisation)

| Primitive | Fichier (symbole) | Rôle |
|---|---|---|
| `verbatimBody(text)` | `packages/core/src/frontmatter.ts` | Renvoie **exactement** ce qui suit le `---` fermant (y compris ligne blanche de tête et `\n` final) — miroir de `buildDocument`. **C'est le bon primitif de capture** (byte-parité). |
| `readListLayout(text)` | `packages/core/src/frontmatter.ts` | Relève la découpe en lignes des listes flow wrappées (`{ principleIds: [5,5,5,3] }`). |
| `serializeMethodMd(m, body, layout)` | `packages/core/src/frontmatter.ts` | Réécrit une méthode **en préservant le wrapping** si `layout` fourni. |
| `serializeTeamMd(t, body)` / `serializeKitMd(k, body)` | idem | Réécrivent avec corps ; **pas de paramètre `layout`** (voir Hors scope). |

`verbatimBody`, `readListLayout` et le type `ListLayout` sont **déjà exportés** par
`@iakaframe/core` (`export * from "./frontmatter"` dans `packages/core/src/index.ts`) : **aucun
nouvel export n'est requis**.

### ⚠️ Découvertes structurantes — la perte NE se limite PAS à corps+layout

Le round-trip GUI passe par les **mappers type-riches** (`src/forge/mappers.ts`). Établi sur
pièces, deux **pertes de champs frontmatter** échappent à la correction corps+layout :

1. **Kit `emits` perdu (dans le périmètre — à corriger ici).** `kits/iakaframe-claude.md` porte
   `emits: [".claude/agents/*", …]`. `parseKitMd` **lit** `emits`, mais le type riche `Kit`
   (`packages/core/src/kit.ts`) **n'a pas de champ `emits`**, et `mdToKit`/`kitToMd`
   (`mappers.ts`) ne le transportent pas → **`emits` disparaît au Save**. Sans correction, le
   round-trip kit **ne peut pas** être byte-identique. Cette perte est de **même nature** que le
   défaut 2 (le GUI jette un champ réel du frame) et **non liée au roster périmé** → **corrigée
   dans ce lot** (décision tranchée, cf. § Décision).

2. **Team `helm` perdu (HORS périmètre — étape 4).** `teams/iakaframe-8.md` liste **8** personas
   dont `helm`. Le roster canonique du cœur (`packages/core/src/roster.ts`, `CANONICAL_ROSTER`)
   n'en connaît que **7** (clés de rôle périmées : `architecture`/`fabrication`/`tests`/… au lieu
   de `cadrage`/`dev`/`qualite`/`deploiement`/…). `mdToTeam` **filtre `helm`** (absent du roster)
   → la ligne `personas` perd un id au Save. **Byte-parité impossible sur `teams/iakaframe-8.md`
   tant que le roster n'est pas re-vendoré (8/8)** — c'est le territoire **explicitement réservé à
   l'étape 4** (re-vendoring des personas périmés). Ne pas le traiter ici.

3. **Team `guardrails` toujours vide (note).** `teamToMd` écrit `guardrails: []` en dur (MVP). Sur
   les reals en scope (`teams/iakaframe-8.md` a `guardrails: []`) aucune perte, mais c'est une
   limite structurelle à garder en tête (additive, hors périmètre ici).

4. **Workflow — divergence de format totale (HORS périmètre, défaut distinct).** Le workflow réel
   `workflows/iakaframe-3phases.md` porte `phases:`/`gates:` **dans le frontmatter** (séquences de
   blocs YAML). Le GUI (`serializeWorkflowMd`) écrit un frontmatter **plat** (`id`/`name`/
   `methodId`) + les phases en **bloc JSON dans le corps**. `parseWorkflowMd` exige ce bloc JSON →
   le workflow réel **ne s'ouvre même pas** (parse `null`). Le workflow **n'est donc pas** un
   candidat byte-parité et **sort du périmètre** de ce lot (défaut de format à cadrer séparément —
   cf. § Hors scope, remonté à Aragorn).

## Décision

### 1. Capturer corps + layout à l'Open, dans l'état du document (générique)

Le mécanisme vit dans **`useForgeDocument.ts`** (générique, donc gratuit pour les 4 onglets) :

- Ajouter deux états au hook : la **capture d'origine** = `{ body: string | null; layout: ListLayout | null }`
  (un seul objet d'état, ou deux états séparés — au choix de Gimli).
- Dans `performOpen`, **après** avoir lu `text` et **avant/pendant** `setArtifact` : stocker
  `verbatimBody(text)` et `readListLayout(text)`. **Utiliser `verbatimBody`, PAS
  `parseFrontmatter(text).body`** : ce dernier strippe la ligne blanche de tête et casserait la
  byte-parité sur tout fichier ayant une ligne blanche après le `---` fermant. (Le test
  `methodMd.test.ts` existant utilise `parseFrontmatter().body` et ne passe que parce que
  `methods/iakaframe.md` n'a pas de ligne blanche de tête — ne pas généraliser ce raccourci.)
- Dans `loadBlank`/`performNew` et `performClose` : **remettre la capture à `null`** (un document
  neuf n'a pas de corps d'origine → boilerplate).
- Optionnel (cohérence, non bloquant) : après un Save/Save As d'un document **neuf**, la capture
  peut rester `null` (le boilerplate est déterministe, donc idempotent).

### 2. Rethreader corps + layout au Save via un 2ᵉ argument de `serialize`

Étendre le contrat `DocConfig<T>.serialize` pour recevoir la capture :

```
serialize: (artifact: T, origin: { body: string | null; layout: ListLayout | null }) => string
```

`writeArtifact` passe la capture courante à `cfg.serialize(target, origin)`. Les closures de
`ForgeShell.tsx` deviennent :

- **method** : `(m, o) => serializeMethodMd(methodToMd(m), o.body ?? methodBody(m), o.layout ?? undefined)`
- **team**   : `(t, o) => serializeTeamMd(teamToMd(t), o.body ?? teamBody(t))`
- **kit**    : `(k, o) => serializeKitMd(kitToMd(k), o.body ?? kitBody(k))`
- **workflow** : `(w, o) => serializeWorkflowMd(w, workflowProse(o.body) ?? workflowBody(w))`
  où `workflowProse` extrait la **prose seule** de la capture (tronque au marqueur du bloc de
  données pour ne pas dupliquer le bloc JSON régénéré par `serializeWorkflowMd`).

**Règle d'or** : `body = capturedBody ?? boilerplate`. Un document **ouvert** (capture non nulle)
rethreade son corps réel ; un document **neuf** (capture nulle) retombe sur le boilerplate — le
comportement actuel est **préservé pour les créations**.

### 3. Fermer la perte du champ `emits` du kit (folded-in, nécessaire à AC-2)

Pour que le round-trip kit soit byte-identique :

- Ajouter `emits?: string[]` au type riche **`Kit`** (`packages/core/src/kit.ts`) et le lire dans
  `parseKit` (défensif, comme `runnerBindingId`).
- `mdToKit` : transporter `md.emits` → `kit.emits`. `kitToMd` : reprojeter `kit.emits` → `md.emits`
  (`mappers.ts`). Absent → omis (byte-parité des kits sans `emits`).

**Pourquoi trancher au lieu de remonter** : cette perte est de la même famille que le défaut 2 (le
GUI jette un champ réel du frame au Save), elle est **indépendante du roster périmé**, et le
critère central AC-2 est **vide de sens** sans elle (aucun kit ne round-trippe). Correction ~3
lignes, aucun risque de déformation du frame.

### Alternatives écartées

- **Stocker le corps/layout DANS l'artefact riche** (ex. champ `_rawBody` sur `Method`) : rejeté —
  pollue les types métier, fuit dans les mappers/ateliers, casse l'égalité structurelle des tests.
  La capture appartient au **document** (`useForgeDocument`), pas à l'artefact.
- **Reconstruire le corps depuis les ids** : impossible — le narratif humain n'est pas dérivable
  des ids (c'est toute la raison du défaut 2).
- **Régénérer un layout canonique par heuristique de largeur** : rejeté — non déterministe, ne
  reproduit pas le fichier d'origine ; `readListLayout` capture la découpe **réelle**, seule voie
  vers le diff vide.

## Étapes d'implémentation

1. **`useForgeDocument.ts`** — ajouter l'état de capture d'origine (`body`/`layout`), l'alimenter
   dans `performOpen` via `verbatimBody(text)` + `readListLayout(text)`, le remettre à `null` dans
   `loadBlank` et `performClose`.
2. **`useForgeDocument.ts`** — élargir la signature `DocConfig<T>.serialize` au 2ᵉ argument
   `origin` ; propager la capture dans `writeArtifact` (`cfg.serialize(target, origin)`).
3. **`ForgeShell.tsx`** — réécrire les 4 closures `serialize` (method/team/kit/workflow) selon
   § Décision 2 (`capturedBody ?? boilerplate`, `layout` pour method, prose seule pour workflow).
   Conserver les fonctions boilerplate `teamBody`/`methodBody`/`kitBody`/`workflowBody` comme
   **repli des documents neufs**.
4. **`packages/core/src/kit.ts`** — ajouter `emits?: string[]` au type `Kit` + lecture dans
   `parseKit`. **`src/forge/mappers.ts`** — transporter `emits` dans `mdToKit`/`kitToMd`.
5. **Workflow** — implémenter `workflowProse(capturedBody)` (troncature au marqueur du bloc de
   données) pour préserver la prose sans dupliquer le bloc JSON. Si Gimli juge le coût
   disproportionné au regard du fait que le workflow réel ne s'ouvre pas (point 4 des découvertes),
   se **limiter** à `o.body ?? workflowBody(w)` avec une note — mais alors **ne pas** revendiquer la
   non-duplication (documenter). Décision laissée à Gimli, tracée.
6. Tests (cf. § Vérification) — round-trip idempotent en tête.

## Fichiers concernés

- `src/forge/useForgeDocument.ts` — capture d'origine (corps+layout), signature `serialize` élargie.
- `src/forge/ForgeShell.tsx` — 4 closures `serialize` rethreadent corps+layout.
- `src/forge/mappers.ts` — `mdToKit`/`kitToMd` transportent `emits`.
- `packages/core/src/kit.ts` — champ `emits?` sur `Kit` + `parseKit`.
- `src/forge/useForgeDocument.test.ts` — round-trip idempotent (corps non vide) + capture/reset.
- `packages/core/__tests__/kitMd.test.ts` (ou mappers) — préservation `emits` round-trip.
- `packages/core/__tests__/fixtures/` — fixtures corps **non vide** (voir § Vérification).

## Comportement attendu (critères d'acceptation testables)

### AC-1 — Round-trip idempotent MÉTHODE (critère central, preuve-reine)

Ouvrir `methods/iakaframe.md` **réel** (frontmatter avec `principleIds` de 18 ids **wrappé sur 4
lignes** + corps narratif) puis Save **sans édition** produit un fichier **byte-identique** à
l'original (diff vide). Prouve : corps préservé (défaut 2) **et** wrapping préservé (défaut 3).

### AC-2 — Round-trip idempotent KIT

Ouvrir `kits/iakaframe-claude.md` **réel** (avec `emits` + corps narratif) puis Save sans édition
→ **byte-identique**. Prouve : corps préservé **et** `emits` préservé.

### AC-3 — TEAM : corps préservé + parité sur team résoluble

- **AC-3a** : ouvrir une team réelle puis Save sans édition **préserve le corps narratif
  verbatim** (aucun boilerplate). Testable sur `teams/iakaframe-8.md` en **vérifiant le corps**
  (la ligne `personas` peut différer — voir AC-3c).
- **AC-3b** : round-trip **byte-identique** sur une team dont **toutes les personas résolvent** au
  roster courant (ex. fixture team 7-personas construite depuis `CANONICAL_ROSTER`, ou New team →
  Save → reopen → Save → identique).
- **AC-3c (limitation documentée, PAS un test qui doit passer ici)** : la byte-parité de
  `teams/iakaframe-8.md` (8 personas dont `helm`) est **bloquée par le roster périmé** et
  **reportée à l'étape 4** (re-vendoring 8/8). À documenter dans le test (ex. `it.todo` ou
  commentaire pointant l'étape 4), **jamais** « corrigée » en déformant la team.

### AC-4 — Documents neufs inchangés (non-régression)

New (aucune capture) → Save écrit le **boilerplate** comme aujourd'hui. Le comportement des
créations n'est pas modifié.

### AC-5 — Layout périmé ignoré (robustesse)

Si l'utilisateur **édite** une liste flow (change le nombre d'ids) depuis l'ouverture, le layout
capturé (qui ne recouvre plus la liste) est **ignoré** par `serializeMethodMd` (garde existante :
`total !== rendered.length` → forme canonique) — pas de rendu faux. À couvrir par un test.

### AC-6 — Workflow : prose préservée (byte-parité NON revendiquée)

Pour un workflow **créé dans le GUI** : New → éditer la prose → Save → reopen conserve la prose (le
boilerplate ne l'écrase plus). **Aucune** revendication de byte-parité sur le workflow réel du
frame (format divergent, hors périmètre).

## Vérification

- [ ] **AC-1** : test round-trip byte-identique sur fixture = copie **conforme** de
      `methods/iakaframe.md` (corps non vide + `principleIds` wrappé). La fixture existante
      `packages/core/__tests__/fixtures/method.iakaframe-wrapped.md` est **tronquée (corps
      absent)** : l'**étendre au corps réel** OU ajouter une fixture dédiée. Le round-trip
      idempotent **doit** être testé sur un **corps NON vide**. Fixtures ajoutées ici (pas à
      l'étape 4).
- [ ] **AC-2** : fixture kit = copie conforme de `kits/iakaframe-claude.md` (avec `emits` + corps),
      test round-trip byte-identique ; test dédié « `emits` préservé » au niveau mappers.
- [ ] **AC-3a/3b** : test corps team préservé + test parité team résoluble.
- [ ] **AC-3c** : limitation `helm`/roster documentée dans le test (renvoi étape 4).
- [ ] **AC-4/AC-5/AC-6** : non-régression neufs, layout périmé ignoré, prose workflow préservée.
- [ ] Le test round-trip s'exécute **au niveau document** (via les closures `serialize`/`parse` de
      `ForgeShell`, mappers inclus) — pas seulement au niveau `serializeMethodMd` isolé — pour
      couvrir la fidélité **des mappers** (c'est là que `emits`/`helm` se perdent).
- [ ] Typecheck OK · Lint OK · `vitest` vert.
- [ ] Testé dans l'app réelle : ouvrir méthode + kit réels, Save, `git diff` vide.

## Hors scope (réservé à l'étape 4 ou à un lot distinct)

- **Re-vendoring du roster périmé** (7→8 personas, `helm`, clés de rôle à jour) → débloque AC-3c
  (byte-parité `teams/iakaframe-8.md`). **Étape 4.**
- **Garde vendor-check cross-repo**, re-vendoring complet des personas périmés, test tools 3/8→8/8.
  **Étape 4.**
- **Divergence de format du workflow** (`phases`/`gates` en frontmatter côté frame vs bloc JSON
  dans le corps côté GUI ; le workflow réel ne s'ouvre pas). **Défaut distinct — remonté à
  Aragorn**, à cadrer séparément.
- **Gardes team-wide** (`teamToMd` écrit `guardrails: []`) — additif, non traité ici.
- **Paramètre `layout` sur `serializeTeamMd`/`serializeKitMd`** : inutile pour les reals en scope
  (`personas`/`emits` mono-ligne). À n'ajouter que si un frame présente une team/kit à liste
  wrappée (additif).

## Estimation dev (Gimli) — étapes 2+3

- **Équivalent jour-homme** : **~1,0 à 1,5 j** (spec fermée). Détail : capture+signature dans
  `useForgeDocument` (~0,3 j), 4 closures `ForgeShell` + `workflowProse` (~0,3 j), fix `emits`
  kit/mappers (~0,15 j), fixtures corps non vide + tests round-trip/AC (~0,4 j).
- **Complexité / risque** : **modérée**. La logique de sérialisation existe déjà (rien à
  réinventer) ; le risque est concentré sur la **byte-parité exacte** (choix `verbatimBody`,
  fidélité des mappers) — d'où les tests round-trip comme filet.
- **Inconnues susceptibles de faire glisser** :
  1. `workflowProse` (troncature au marqueur) — si le calage prose/bloc s'avère plus subtil que
     prévu (peut être réduit au repli boilerplate, cf. étape 5).
  2. Fidélité des mappers au-delà de `emits` — un autre champ frontmatter pourrait se perdre en
     silence (les tests round-trip au niveau document le révéleront ; si oui, micro-glissement).
  3. Étendue exacte des fixtures à re-vendorer sans empiéter sur l'étape 4.
