# Instruction : Parité frame ↔ GUI — re-vendoring, roster 8/8, tools 8/8, garde cross-repo (étape 4/4)

> Cadré par 🔵 Gandalf (P1), 2026-07-22. Consommé par ⚒️ Gimli (P2). **Lecture seule** faite sur
> les deux dépôts ; le seul artefact produit par ce cadrage est ce fichier.
> Dépôt d'exécution : **iakaFrameGUI** (l'essentiel du travail y vit). Sources lues : **iakaframe**
> (canon) *et* **iakaFrameGUI** (miroir).
> Objectif parent : « charger le frame dans le GUI » — **étape 4/4 FINALE**, faisant suite aux
> étapes 2+3 (`frame-open-save-fidelite.md`) et 3bis (`frame-workflow-format-reconciliation.md`).
> **Doctrine non négociable : GUI ← frame.** Le canon iakaframe est autoritaire ; les copies
> vendorées reflètent la source, jamais l'inverse. Aucune déformation du canon pour arranger le GUI.

---

## 0. Avertissement de cadrage — le brief d'Aragorn est daté ; l'état réel a été RE-MESURÉ sur pièces

Le brief décrit les personas vendorés comme « ~203 lignes, datés 20/07, avec `description:` » et le
canon comme « ~110 lignes, sans `description:` ». **Cette description est périmée.** Mesure directe du
2026-07-22 :

| Fait mesuré | Constat |
|---|---|
| `packages/core/__tests__/fixtures/personas/gandalf.md` (127 l., avec `description:`) | **byte-identique** à `iakaframe/library/personas/gandalf.md` (127 l., avec `description:`) |
| `.../fixtures/binding/iakaframe-claude-default.md` (32 l.) | **byte-identique** à `iakaframe/bindings/iakaframe-claude-default.md` (`odin` porte `Task`, `helm` porte `Write`) |
| `.../fixtures/agents-golden/gandalf.md` (`sha256 94db7954…`) | **byte-identique** au golden canon `iakaframe/cli/test/fixtures/agents-golden/gandalf.md` |
| `.../fixtures/method.iakaframe.md` (`roleKeys`, 18 `principleIds`) | frontmatter **aligné** sur `iakaframe/methods/iakaframe.md:5-11` |

**Conséquence structurante — deux des quatre volets sont DÉJÀ LIVRÉS :**

- **VOLET A (re-vendoring des personas)** a été exécuté (lots GUI v0.3.10 « contrat fantôme » +
  re-vendoring complet type D-9). Sur pièces, personas + goldens + binding + dérivées de méthode
  sont **en sync**. Le volet devient une **vérification conditionnelle**, pas une réécriture.
- **VOLET D (garde vendor-check cross-repo)** est **construit et mergé côté iakaframe** :
  `iakaframe/cli/src/lib/vendor.js` (résolution du frère, table des 21 fixtures, niveau 1 byte +
  niveau 1b frontmatter sémantique, **niveau 2 régénération vivante depuis le canon** — c'est lui
  qui défait le drift cohérent), la commande `iakaframe/cli/src/commands/vendor-check.js` (remède
  dérivé de l'état), et sa **recette de morsure** `iakaframe/cli/test/vendor-check.test.js`. Le
  volet devient une **vérification que la garde mord toujours sur le canon courant**, plus une
  option additive côté GUI.

Le **travail réellement ouvert** est donc **VOLET B (roster 7→8, helm)** et **VOLET C (tools
3/8→8/8)**. Cette instruction couvre les quatre pour fermer proprement l'étape, mais dimensionne
chacun sur son état **réel**, pas sur le brief.

> **Je n'ai pas de shell sur cette session de cadrage** : les byte-parités ci-dessus sont
> reconstituées par lecture (`Read`) fichier par fichier, à la manière de D-9. La **mesure
> autoritaire reste `iakaframe vendor-check`** (§ Volet A), à rejouer **en ouverture d'exécution**.
> Un cadrage d'attendus ne vaut que contre la mesure qui le fonde.

---

## VOLET A — Re-vendoring : VÉRIFIER d'abord, ne re-vendorer que si `vendor-check` mord

### A.1 Constat mesuré

Le re-vendoring que le brief demande **paraît déjà fait**. La chaîne source → générateur → golden
vendoré est :

```
library/personas/<id>.md  ─┐
bindings/…-default.md      ─┼─► cli/src/lib/generate-agents.js (renderAgentContract)
                            │        └─► cli/test/fixtures/agents-golden/<id>.md   (golden CLI)
                            │                 └─► cp → GUI/…/fixtures/agents-golden/<id>.md (vendoré)
                            └─────────────────► cp → GUI/…/fixtures/personas|binding/… (copies)
methods|teams/…            ─────► serializeMethodMd/serializeTeamMd (cœur GUI)
                                     └─► gen-fixtures.mjs → GUI/…/fixtures/method|team.*.md (dérivées)
```

**Cause racine du piège de re-vendoring (rappel, pour ne pas la rejouer)** : re-vendorer une
**dérivée** par `cp` détruit sa forme canonique sérialisée (le corps-stub `# La compagnie iakaframe
(casting des 8)` n'est **pas** le corps du canon). Les 4 dérivées se régénèrent **par le
sérialiseur** (`packages/core/scripts/gen-fixtures.mjs`), **jamais** par copie. Les 17 copies se
re-vendorent par `cp` nommé (jamais `*.md` : `library/personas/` contient `_TEMPLATE.md`, qui
fabriquerait un `fixture-surnumeraire`).

### A.2 Procédure d'exécution (conditionnelle)

1. **Mesurer** (pré-condition, autoritaire). Depuis `iakaframe/` :
   `node cli/src/index.js vendor-check --gui <chemin absolu iakaFrameGUI> --json`
   (ou `IAKAFRAME_GUI_ROOT=<…> node cli/src/index.js vendor-check --json`).
2. **Si `ok: true` / `status: "clean"` (17 copies + 4 dérivées, drift 0)** → **VOLET A est un
   no-op** : consigner la sortie dans le rapport de gate, passer au volet suivant.
3. **Si `status: "drift"`** → appliquer **exactement** le bloc `remediation` rendu par la commande
   (il est **dérivé de la mesure**, un geste par dérive, dans l'ordre `investigate → run → copy →
   delete`) : `cp` nommés pour les copies, `node packages/core/scripts/gen-fixtures.mjs` pour les
   dérivées sérialisées, `cp … DÉPOUILLÉ de son en-tête` pour le kit. **Ne jamais** improviser
   au-delà du remède imprimé.

### A.3 Critères d'acceptation

- **A-AC1** — `vendor-check --gui <GUI>` rend `ok: true`, `checked: 17`, `derived: 4`, `drift: 0`
  **à la fin du lot**. Sortie citée dans le verdict (jamais reformulée).
- **A-AC2** — L'arbre de fixtures GUI contient **exactement 21 `.md`** (pas de surnuméraire, pas de
  `personas/_TEMPLATE.md`).
- **A-AC3** — Si un re-vendoring a eu lieu : aucune **dérivée** (`method.*`, `team.*`) n'a été
  touchée par `cp` (vérif au diff : leur corps-stub est intact).

### A.4 Estimation

**0,1 j-h** si clean (vérif seule, cas attendu) · **jusqu'à 0,3 j-h** si un drift résiduel doit être
réparé.

---

## VOLET B — Roster 7 → 8 (helm manquant) + byte-parité de la team `iakaframe-8`

### B.1 Constat mesuré — pourquoi helm disparaît

- Le roster GUI est défini dans **`packages/core/src/roster.ts`** : `CANONICAL_ROSTER`
  (`roster.ts:41-52`) est **dérivé** de `CANONICAL_ROLES` (**`packages/core/src/roles.ts:26-34`**),
  qui ne déclare que **7 rôles**.
- La réhydratation d'une team passe par **`src/forge/mappers.ts` → `mdToTeam`** (`mappers.ts:41-58`) :
  elle construit un index `byId` **depuis `CANONICAL_ROSTER`** (`mappers.ts:42`) puis **filtre tout
  id absent** (`mappers.ts:45`, `.filter(p => p !== undefined)`).
- La team du frame `iakaframe/teams/iakaframe-8.md:4` liste **8** personas :
  `[odin, aragorn, gandalf, gimli, legolas, helm, loki, nathalie]`. `helm` a pour rôle canonique
  **`deploiement`** (`iakaframe/library/personas/helm.md:5`). Ce rôle **n'existe pas** dans
  `CANONICAL_ROLES` ⇒ `helm` **absent du roster** ⇒ `byId.get("helm")` = `undefined` ⇒ **filtré**.

**Round-trip cassé** : Open `team.iakaframe-8.md` → `mdToTeam` (7 personas, helm perdu) → `teamToMd`
(`mappers.ts:29-38`, `personas.map(p => p.id)`) → 7 ids sérialisés ≠ 8 d'origine. **Byte-parité
impossible** — c'est la limitation `AC-3c` explicitement reportée par l'étape 2+3
(`frame-open-save-fidelite.md`).

> **Note — la dérivée `team.iakaframe-8.md` n'est PAS le blocage.** La fixture dérivée
> (`.../fixtures/team.iakaframe-8.md:4`) porte **déjà** les 8 personas : elle est produite par
> `serializeTeamMd(parseTeamMd(canon))`, qui préserve la liste d'ids **sans passer par le roster**.
> Le blocage est **au niveau applicatif** (`mdToTeam`), pas au niveau fixture.

### B.2 Second constat — le vocabulaire de rôles du GUI est PÉRIMÉ vs canon (décision structurante)

Au-delà du rôle manquant, les **5 autres clés du GUI divergent du canon** — dérive latente
contraire à la doctrine `GUI ← frame` :

| Canon (`methods/iakaframe.md:11`, `library/personas/*.md`) | GUI actuel (`roles.ts:26-34`) |
|---|---|
| `portefeuille` (odin) | `portefeuille` ✅ |
| `coordination` (aragorn) | `coordination` ✅ |
| **`cadrage`** (gandalf) | `architecture` ❌ |
| **`dev`** (gimli) | `fabrication` ❌ |
| **`qualite`** (legolas) | `tests` ❌ |
| **`deploiement`** (helm) | *(absent)* ❌ |
| **`design`** (loki) | `graphisme` ❌ |
| **`documentation`** (nathalie) | `doc` ❌ |

> **Fait vérifié** : `gandalf.roleKey = cadrage` et `helm.roleKey = deploiement` (lus). Les autres
> mappings (`gimli=dev`, `legolas=qualite`, `loki=design`, `nathalie=documentation`,
> `odin=portefeuille`, `aragorn=coordination`) sont déduits de l'ordre de `methods/iakaframe.md:11` ;
> **l'exécution DOIT confirmer chaque `roleKey` par lecture directe de `library/personas/<id>.md`**
> avant de câbler.

**Direction tranchée (pas d'escalade — c'est une dérive, pas un choix produit).** Le vocabulaire de
rôles du GUI **doit s'aligner sur le canon**. C'est la doctrine même de l'étape. Ce qui reste au
**décideur**, c'est le **découpage/timing** (tout de suite vs lot distinct), parce que le blast
radius de l'alignement dépasse l'objectif « charger le frame ». D'où le découpage en **B1** (requis
pour l'objectif) et **B2** (alignement doctrinal, recommandé, séquençable).

### B.3 — Sous-lot B1 (REQUIS) : ajouter le 8ᵉ rôle `deploiement` + helm au roster

Fix minimal qui débloque la byte-parité team (résolution `mdToTeam` par **id**) :

1. **`roles.ts`** — ajouter le rôle `deploiement` à `CANONICAL_ROLES`. **Recommandé** : reconstruire
   la liste dans l'**ordre canonique exact** de `methods/iakaframe.md:11` pour que `roleIndex` colle
   au casting canon — mais si B2 est différé, un ajout en 8ᵉ position (`{ key: "deploiement",
   label: "Déploiement", roleIndex: 7 }`) suffit à B1.
2. **`roster.ts`** — `DEFAULT_NAMES` (`roster.ts:16-24`) : `deploiement: "Helm"` ; `DEFAULT_SKILLS`
   (`roster.ts:27-35`) : `deploiement: ["iakaframe-deploiement"]`.
3. **`src/forge/casting.ts:8-16`** — la palette n'a que **7** dégradés (index 0-6) ; ajouter une 8ᵉ
   entrée pour l'index 7 (repli modulo actuel non bloquant, mais additif propre).
4. **Tests de comptage** à ajuster de 7 → 8 : `packages/core/__tests__/roster.test.ts:11-12` et `:31`
   (`toHaveLength(7)` → `8`, `roleKey`/coordinateur inchangés) ; **relire** les consommateurs de
   `buildTeamFromRoster` qui asserteraient un compte de personas : `src/hooks/useForgeTeams.test.ts`,
   `src/hooks/useForgeDeploy.test.ts`, `src/views/DeployView.test.tsx`, `src/forge/refs.test.ts`,
   `src/forge/ateliers/TeamAtelier.test.tsx`, `src/hooks/useForgeHandoff.test.ts` — mettre à jour
   **seulement** ceux qui figent un compte (pas de modification cosmétique ailleurs).

**B1-AC** :
- **B1-AC1** — `CANONICAL_ROSTER` compte **8** personas, dont une d'id `helm`.
- **B1-AC2 (preuve-reine)** — round-trip **byte-identique** de `team.iakaframe-8.md` **au niveau
  document** (closures `serialize`/`parse` de `ForgeShell`, mappers inclus) : Open → Save sans
  édition ⇒ diff **vide**, les **8** personas préservées. C'est l'`AC-3c` de l'étape 2+3, **levée**.
  Le test `it.todo`/commentaire qui la reportait à l'étape 4 est **converti en test qui passe**.
- **B1-AC3** — `npm run lint:all` et `npm run test:all` verts ; total de tests cohérent (les
  ajustements 7→8 sont des modifications de valeur, pas des suppressions de test).

**B1 estimation** : **0,4 à 0,6 j-h**.

### B.4 — Sous-lot B2 (RECOMMANDÉ, séquençable/reportable) : aligner les 5 clés périmées sur le canon

Remplacer `architecture→cadrage`, `fabrication→dev`, `tests→qualite`, `graphisme→design`,
`doc→documentation` **partout** où la clé est câblée en dur. Blast radius mesuré :

| Fichier (symbole) | Nature de la retouche |
|---|---|
| `packages/core/src/roles.ts:26-34` | clés + `label` (source de vérité) |
| `packages/core/src/roster.ts:16-35` | `DEFAULT_NAMES` / `DEFAULT_SKILLS` re-clavés |
| `packages/core/src/skill.ts:28-31` | `SKILL_OF` : `roleKey` de `iakaframe-cadrage`/`-qualite`/`-naonedge`/`-nathalie` |
| `packages/core/src/workflow.ts:205,221,235` | workflow calibré de repli (`roleKeys`, `roleDisplay`, `from`) |
| `packages/core/src/adapters/openwebui.ts:87-93,149` | **descriptions par rôle re-clavées** + `vision: roleKey === "design"` |
| tests + goldens consommateurs (§ ci-dessous) | attendus alignés |

> ⚠️ **Point de vigilance adapters/goldens (l'inconnue principale de B2).** `openwebui.ts:87-93`
> indexe ses descriptions par **clé de rôle** ; alimenté par des personas **canon** (`roleKey =
> cadrage`), la map actuelle (clé `architecture`) **ne matche déjà pas** → repli silencieux. Re-claver
> vers le canon **corrige** ce repli et **change la sortie** de l'adaptateur openwebui (et tout
> golden qui en dépend : `packages/core/__tests__/adaptersOpenwebui.test.ts`, `adapters.test.ts`).
> **Les contrats d'agent claudeCode ne portent PAS de `roleKey`** (cf. golden gandalf : `name`,
> `description`, `tools`, `guardrails`) → la **parité VOLET C et le vendorage NE sont PAS affectés**
> par B2. C'est ce qui rend B2 **détachable** de l'objectif.

**B2-AC** :
- **B2-AC1** — Aucune occurrence des 5 clés périmées (`architecture`/`fabrication`/`tests` (comme
  clé de rôle)/`graphisme`/`doc` (comme clé de rôle)) ne subsiste comme **clé de rôle** dans
  `packages/core/src/**` et `src/**` (les mots en prose de commentaire sont hors sujet).
- **B2-AC2** — `CANONICAL_ROLES` est **identique** (clés + ordre) à `methods/iakaframe.md:11`.
- **B2-AC3** — Chaque golden d'adaptateur impacté (openwebui/codex/agentsMd) est **régénéré** et son
  attendu mis à jour ; `test:all` vert. **Aucun** golden claudeCode ne bouge (vérif au diff).
- **B2-AC4** — Recette visuelle (Legolas ne valide pas le pixel) : les menus de rôle
  (`PersonaEditor.tsx:108`, `MethodeAtelier.tsx:275-276`, `WorkflowAtelier.tsx:179,254,272`)
  affichent les 8 rôles canon.

**B2 estimation** : **0,75 à 1,25 j-h** (le coût est dans les goldens d'adaptateurs, pas dans le
renommage).

---

## VOLET C — Test de parité : couverture des tools 3/8 → 8/8

### C.1 Constat mesuré

`packages/core/__tests__/parite-generateurs.test.ts:146-157` code **en dur** les tools de **3**
personas seulement (`gandalf`, `gimli`, `odin`). Les 5 autres (`aragorn`, `helm`, `legolas`, `loki`,
`nathalie`) ne sont couvertes qu'**indirectement** via le golden global (`:122-128`). Le binding
vendoré (`.../fixtures/binding/iakaframe-claude-default.md:8-15`) porte pourtant les **8** lignes.

### C.2 Correction spécifiée — data-driven, tirée du binding vendoré (jamais de valeur arbitraire)

Remplacer le test `:146-157` par une couverture **8/8** dont l'attendu est **dérivé du binding
fixture lui-même** :

- Parser les `assignments` du binding vendoré (déjà fait par `loadBinding()`, `:68-86`) pour obtenir,
  par id, le tableau `tools` **de référence**.
- Pour **chacun des 8 ids** (`IDS`, `:65`) : `expect(toolsForPersona(binding, id)).toEqual(tools de
  l'assignment correspondant)`. Ainsi l'attendu **n'est pas** ré-écrit à la main : il est **la valeur
  vendorée**, ce qui préserve la propriété « source unique = le binding ».
- **Conserver au moins un attendu littéral explicite** (ex. `gimli`) comme ancre lisible + l'existant
  `renderAgentContract(...).toMatch(/^tools: Read, Edit, Write, Bash, Grep, Glob$/m)` (`:154-156`) :
  il documente la forme scalaire-virgule et attrape une régression de `loadBinding` (un test
  100 % dérivé du binding ne verrait pas un binding lui-même altéré — le golden `:122-135` couvre ce
  flanc, l'ancre littérale le double).

### C.3 Critères d'acceptation

- **C-AC1** — Le test asserte `toolsForPersona(binding, id)` pour **les 8 ids**, valeurs **égales aux
  `tools` du binding vendoré** correspondant.
- **C-AC2** — Au moins une assertion **littérale** subsiste (ancre anti-tautologie sur `loadBinding`).
- **C-AC3** — `test:all` vert ; les 3 tests auto-cohérents existants (`:122`, `:130`, `:137`) restent
  **inchangés** et verts (vérif au diff : blocs non touchés).

### C.4 Estimation

**0,2 à 0,3 j-h.**

---

## VOLET D — Garde vendor-check cross-repo : DÉJÀ LIVRÉE — vérifier qu'elle mord ; option additive GUI

### D.1 Constat mesuré — le mécanisme demandé existe déjà

Le brief demande « un test/garde qui lit les VRAIES sources iakaframe et échoue si la copie GUI
diverge », qui « MORD sur une dérive cohérente simulée ». **C'est exactement `iakaframe`
`cli/src/lib/vendor.js`** (cadré dans `iakaframe/specs/instructions/garde-vendor-check-cross-repo.md`,
mergé) :

- **Résolution du frère** (`vendor.js:53-71`) : `IAKAFRAME_GUI_ROOT` autoritaire, sinon
  `../iakaFrameGUI` / `../iakaframegui` ; **skip gracieux** (exit 0, `ok:false`) si absent — patron
  `vocab-parity.test.js`. Aucune dépendance dure entre les deux dépôts.
- **Niveau 1 (17 copies)** byte-à-byte + **niveau 1b (4 dérivées)** frontmatter **sémantique**
  (corps exempté), kit ancré sur le golden CLI dépouillé (`vendor.js:175-226`).
- **Niveau 2 (`vendor.js:239-263`)** : régénère chaque contrat **depuis les sources vivantes du
  canon** (`generateAgent(id, {root, binding})`) et compare le sha au golden vendoré. **C'est ce
  niveau qui défait la dérive mutuellement cohérente** : un golden GUI re-signé passe le niveau 1
  contre un golden CLI lui aussi drifté, **mais échoue au niveau 2** (ancré sur `library/personas/`
  + `bindings/`, jamais sur un dérivé).
- **Morsure prouvée** : `iakaframe/cli/test/vendor-check.test.js` construit un miroir synthétique
  conforme puis y **injecte un drift cohérent** (binding + golden + sha recalculés ensemble) et
  vérifie `exit 1` + fichiers nommés, **sans jamais muter le dépôt GUI réel**.

### D.2 Travail réel de ce volet

1. **Vérifier la morsure sur le canon COURANT** : rejouer `iakaframe/cli/test/vendor-check.test.js`
   (`node --test`) et un `vendor-check --gui <GUI>` réel. Attendu : la suite est verte (la garde
   fonctionne) **et** le `vendor-check` réel rend `clean` (cohérent avec VOLET A). Consigner les deux
   sorties.
2. **Option additive (arbitrage décideur — recommandation : OUI, minimal)** : ajouter au GUI un
   script `package.json` **`test:vendor`** qui **invoque le `vendor-check` du frère** via `node
   ../iakaframe/cli/src/index.js vendor-check --gui .` (skip propre si le frère est absent). But :
   qu'un `npm run` côté GUI **puisse** surfacer un drift de vendorage, aujourd'hui invisible du gate
   GUI. **Contrainte** : ce script **shell-out** vers la garde du canon — il **ne réimplémente
   rien** (l'instruction `garde-vendor-check-cross-repo.md` § 3.1 a écarté l'Option B « test dans le
   GUI qui remonte » pour ne pas inverser l'autorité ; un simple appel respecte ce choix). **Ne pas**
   l'ajouter à `test:all` (dépendance au frère = mesure faillible sur clone isolé) — le laisser
   **hors** de la mesure de gate, exactement comme `cargo test`.

### D.3 Critères d'acceptation

- **D-AC1** — `iakaframe/cli/test/vendor-check.test.js` **vert** sur le canon courant (sortie citée).
- **D-AC2** — Recette de morsure rejouée : un drift cohérent injecté dans un **miroir scratchpad**
  ⇒ `vendor-check` **exit 1** + fichier nommé ; dépôt GUI réel **non muté** (`git status` propre).
- **D-AC3** — *(si l'option additive est retenue)* `npm run test:vendor` existe côté GUI, **hors**
  `test:all`, skip propre si frère absent, et sort **1** sur un drift réel.

### D.4 Estimation

**0,1 j-h** (vérif seule) · **+0,15 j-h** si l'option additive `test:vendor` est retenue.

---

## Ordre d'exécution et dépendances

> Le brief posait « garde D **après** re-vendoring A/B pour ne pas partir rouge ». Ce garde-fou
> d'ordre supposait D **neuf** et A **à faire**. La réalité mesurée inverse la logique : **D est
> l'outil de mesure de A**, et **B/C ne touchent aucune fixture vendorée** (roster.ts, roles.ts,
> parite-generateurs.test.ts sont du code/test, pas des copies) — ils **ne peuvent pas** faire partir
> `vendor-check` en rouge. L'ordre est donc :

| # | Étape | Dépend de | Note |
|---|---|---|---|
| 0 | **Mesure d'ouverture** : `vendor-check --gui <GUI>` (VOLET A.2.1) + `node --test` de la garde (VOLET D.2.1) | — | pré-condition ; capte le **total de tests GUI avant** |
| 1 | **VOLET A** : re-vendoring **si** drift (sinon no-op) | 0 | rétablit `clean` avant de bouger le code |
| 2 | **VOLET C** : tools 8/8 | — (indépendant) | sûr, ne touche pas les fixtures |
| 3 | **VOLET B1** : roster 8 + helm → byte-parité team | — | débloque `AC-3c` de l'étape 2+3 |
| 4 | **VOLET B2** : alignement des 5 clés (recommandé) | B1 (mêmes fichiers) | **reportable** en lot distinct si le décideur veut borner le risque goldens |
| 5 | **VOLET D** : vérif morsure + option `test:vendor` | 1-4 | re-`vendor-check` de clôture : doit rester `clean` (B/C/B2 ne modifient aucune fixture) |

**Découpage en lots Gimli conseillé** : **Lot 1** = {0, A, C, B1, D-vérif} (ferme l'objectif « charger
le frame » : team 8/8 round-trip + tools 8/8 + garde vérifiée) ; **Lot 2** = {B2 + option
`test:vendor`} (alignement doctrinal du vocabulaire de rôles, blast radius goldens d'adaptateurs).
Ce découpage isole le risque « goldens d'adaptateurs » du chemin critique de l'objectif.

---

## Décision structurante remontée à Aragorn / au décideur

1. **Timing de B2 (alignement des 5 clés de rôle)** — la **direction est tranchée** (canon
   autoritaire, `GUI ← frame` : le vocabulaire GUI *doit* s'aligner). Reste un **choix de découpage** :
   folder B2 dans le lot maintenant, ou en faire un **Lot 2** distinct pour borner le risque des
   goldens d'adaptateurs openwebui/codex. **Recommandation : Lot 2 distinct** — B1 suffit à
   l'objectif « charger le frame », et B2 est indépendant du chargement du frame (les contrats
   claudeCode ne portent pas de `roleKey`).
2. **Option `test:vendor` côté GUI (VOLET D.2.2)** — additive, recommandée, **hors** `test:all`.
   Décideur : la retenir ou la laisser au backlog.
3. **Aucun sous-chantier côté `iakaframe` n'est requis.** Le CLI générateur (`generate-agents.js`),
   la garde (`vendor.js`) et `gen-fixtures.mjs` sont **en place et corrects** : la source n'a pas à
   être modifiée pour ce lot. *(Contrairement à l'hypothèse du brief « si le re-vendoring révèle que
   le CLI doit être modifié » : sur pièces, il ne le révèle pas.)*

---

## Estimation globale (jalon P1→P2)

| Volet | Charge | Complexité / risque |
|---|---|---|
| A — vérif + re-vendoring conditionnel | 0,1 (→0,3 si drift) | faible |
| B1 — roster 8 + helm | 0,4 – 0,6 | faible |
| C — tools 8/8 | 0,2 – 0,3 | faible |
| D — vérif morsure (+ option `test:vendor`) | 0,1 (+0,15) | faible |
| **Sous-total objectif (Lot 1)** | **~0,8 – 1,4 j-h** | **faible** |
| B2 — alignement des 5 clés + goldens (Lot 2) | 0,75 – 1,25 | **moyenne** (goldens adapters) |
| **Total si B2 inclus** | **~1,6 – 2,7 j-h** | moyenne |

**Inconnues susceptibles de faire glisser** :

1. **Mesure d'ouverture rouge** — si le canon a bougé depuis ce cadrage (2026-07-22), `vendor-check`
   peut sortir un drift : VOLET A cesse d'être un no-op (+ jusqu'à 0,2 j-h). Pré-condition à lever
   avant de coder (cf. Q-5 de D-9).
2. **`roleKey` des personas non re-lus** — l'exécution **doit** confirmer les 6 mappings déduits
   (`gimli=dev`, etc.) par lecture directe avant B2 ; un mapping faux fausse tout l'alignement.
3. **Goldens d'adaptateurs (B2)** — l'ampleur exacte du diff openwebui/codex après re-clavage n'a pas
   été mesurée ici (pas de shell) ; c'est le poste le plus incertain, et la raison de le mettre en
   Lot 2.
4. **Tests de comptage `buildTeamFromRoster`** — le nombre exact de tests figeant « 7 personas » à
   passer à « 8 » reste à relever à l'exécution (liste des fichiers candidats fournie en B.3.4).

**Ce n'est pas un engagement ferme** : ordre de grandeur assumé et révisable, rappelé et confronté au
temps réel à la clôture du lot.

---

## Délégable / geste humain

| Geste | Qui |
|---|---|
| Volets A, B1, C, D-vérif (+ B2 si retenu), mesures et re-vendoring | **⚒️ Gimli** |
| Vérification indépendante des AC, verdict **sourcé** (re-mesure, ne reprend aucune mesure de Gimli) | **🏹 Legolas** |
| Recette visuelle des menus de rôle (B2-AC4) | **le décideur** (Legolas ne valide pas le pixel) |
| Validation de cette instruction + arbitrages (timing B2, option `test:vendor`) | **le décideur** |
| Merge + versionnement (des deux dépôts si B2/`test:vendor` touchent iakaframe — ici **GUI seul**) | **🛡️ Aragorn**, sur feu vert |

## Hors scope

- Toute modification du **canon iakaframe** : ce lot est **mono-dépôt GUI** (le générateur, la garde
  et `gen-fixtures.mjs` sont déjà corrects côté source).
- Édition fine dans les ateliers des champs de rôle au-delà de l'alignement des clés (additif).
- La limite assumée de la garde (drift cohérent **dans les deux dépôts** simultanément) reste
  **documentée, non corrigée** — inchangée par ce lot (`garde-vendor-check-cross-repo.md` § 8).
