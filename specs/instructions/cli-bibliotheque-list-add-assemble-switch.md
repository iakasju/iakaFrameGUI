# Couche CLI/terminal sur la bibliothèque iakaframe — `list` / `add` / `assemble` / `switch`

> **Nature** : cadrage d'une **couche de commandes CLI** sur la bibliothèque pool `iakaframe`,
> **côté GUI (dépôt `iakaFrameGUI`)** comme **contrat partagé** CLI ↔ GUI (racine, format `.md`,
> schémas, sémantique de « livraison »). · **Cadreur** : l'architecte-cadreur (Gandalf). ·
> **Statut : CADRÉ — À VALIDER par le décideur** (jalon humain de cadrage). · **Date** : 2026-07-15.
> Français ; code et identifiants en anglais.
>
> ⚠️ **Fait structurant découvert au cadrage (à lire en premier)** : **le code des cinq verbes
> existe déjà** dans le CLI `@naonedge/iakaframe` (dépôt `~/work/iakaframe/cli/`), avec tests, sur
> la branche `feat/cli-bibliotheque`, et une **instruction antérieure** le cadre déjà :
> `~/work/iakaframe/specs/instructions/cli-bibliotheque-verbes.md`. **Ce lot n'est donc PAS un
> greenfield.** Il **ratifie** l'existant comme contrat canonique côté GUI **et ferme les écarts
> inter-dépôts réels** (racine partagée, schéma de binding, parité de format core↔CLI,
> matérialisation du pool). Voir § 1 et § 9.

---

## 0. Références lues (chemin:ligne) — grounding

**CLI existant (dépôt `iakaframe`, tout est déjà écrit)**
- Dispatch + aide : `~/work/iakaframe/cli/src/index.js:15-19` (imports des 5 verbes),
  `:58-66` (lignes d'aide), `:81-104` (`switch`/`case`, alias `use → runSwitch`).
- `list` : `~/work/iakaframe/cli/src/commands/list.js:7-46` (résumé 12 collections ; `list <type>` ;
  `--json`, `--ascii`, `--root`).
- `show` : `~/work/iakaframe/cli/src/commands/show.js:7-61` (résolution d'id par scan, `--type` si
  collision, `--json`).
- `add` : `~/work/iakaframe/cli/src/commands/add.js:12-77` (schéma + `id==basename` + intégrité
  référentielle I1 **avant** écriture ; non-destructif `--force`).
- `assemble` : `~/work/iakaframe/cli/src/commands/assemble.js:10-85` (compat casting ⊇ rôles ;
  **dry-run** par défaut ; `--write` matérialise `kits/<id>.md`).
- `switch`/`use` : `~/work/iakaframe/cli/src/commands/switch.js:22-111` (assemble interne, sauvegarde
  `.claude.bak-<ts>`, déploiement personas+skills, marqueur `.claude/iakaframe-kit.json`, `--rollback`).
- Couche bibliothèque : `~/work/iakaframe/cli/src/lib/library.js` — `COLLECTIONS:14-27`,
  `libraryRoot():41-49`, `isLibraryRootDir():51-53`, `checkRefs():136-171`, `checkSchema():174-185`,
  `ADD_DIR:187`, `assemble():191-241`.
- Résolution chapeau (distincte) : `~/work/iakaframe/cli/src/lib/root.js:6-11` (`IAKAFRAME_ROOT`).
- Repli assets : `~/work/iakaframe/cli/src/lib/kit.js:19-38` (`hasFrameworkMarker`, `frameworkRoot`).
- Vocabulaire runner/nœud : `~/work/iakaframe/cli/src/lib/vocab.js:12-14` (`RUNNER_KINDS`,
  `NODE_KINDS`, `KIT_FORMATS`) — **miroir** de `packages/core/src/vocab.json` (parité, cf. § 6).
- Parseur frontmatter maison : `~/work/iakaframe/cli/src/lib/frontmatter.js` (mini-parseur zéro-dep).
- Tests : `~/work/iakaframe/cli/test/library.test.js:100-107` (**« vraie bibliothèque »** :
  `personas=8`, `assemble('iakaframe','iakaframe-8')` 8/8), `test/verbs-args.test.js:45-80`,
  `test/vocab-parity.test.js:31-44`, fixtures `test/fixtures/library/`.

**Cœur partagé (dépôt `iakaFrameGUI`)**
- Exports : `~/work/iakaFrameGUI/packages/core/src/index.ts:17-34` (`./adapters`, `./kit`,
  `./frontmatter`, `./team`, `./method`…).
- Format `.md` par type (source de vérité GUI) : `~/work/iakaFrameGUI/packages/core/src/frontmatter.ts`
  — `parseFrontmatter():269`, `TeamMd:363-370`, `MethodMd:373-382`, `KitMd:385-392`,
  `serializeTeamMd():397`, `serializeMethodMd():429`, `serializeKitMd():471` ; le fichier se
  **déclare miroir ligne-à-ligne** du CLI (`:14-22`).
- Team **riche** (JSON, format GUI, ≠ `.md` pool) : `~/work/iakaFrameGUI/packages/core/src/team.ts:23-37`
  (interface, `Persona[]`), `serializeTeam():124` ; exemple réel `~/work/iakaframegui-workspace/teams/teamtest.json`.

**Contrat de racine PARTAGÉ (dépôt `iakaFrameGUI`, Rust)**
- `~/work/iakaFrameGUI/src-tauri/src/paths.rs:30` (`IAKAFRAME_HOME_ENV`), `:101-138`
  (`resolve_iakaframe_home` : override settings.json > env > auto `<chapeau>/iakaframe`),
  `:142-144` (`is_library_home` = double marqueur `library/`+`methods/`, « calque de la détection
  CLI `isLibraryRootDir` »).
- `~/work/iakaFrameGUI/src-tauri/src/library_store.rs:1-16,173-217` (I/O `.md` sous pathguard
  `IAKAFRAME_HOME`).

**Modèle de Binding (cadré au portefeuille)**
- `~/work/iakaFrameGUI/specs/instructions/E1-evolution-binding-ar1.md:62-90` (schéma `Binding`
  `{id,node,teamId,bindings[],origin}` + **AR-1 révisé**), `:106-131` (forge défaut / cockpit override).
- Binding implémenté (pool) : schéma `{id,methodId,teamId,assignments[{personaId,runner,model}]}` —
  fixture `~/work/iakaframe/cli/test/fixtures/library/bindings/b_test.md`.

**Lots voisins**
- Instruction antérieure CLI : `~/work/iakaframe/specs/instructions/cli-bibliotheque-verbes.md`.
- Rangement du pool : `~/work/iakaframe/specs/instructions/rangement-bibliotheque-pluriel.md`
  (branche `feat/rangement-bibliotheque`).

---

## 1. Problème (avant la solution)

Le besoin exprimé : exposer une **couche CLI/terminal** sur la bibliothèque pool `iakaframe`
(`library/` + `teams/`/`methods/`/`bindings/`/`kits/`) — `list`, `add` (**geste de livraison**),
`assemble`, `switch`/`use` — **partagée** avec la GUI (même racine, même format `.md`, même
sémantique de livraison).

**Ce que le cadrage a constaté (état réel, pas supposé)** :

1. **Les cinq verbes sont déjà codés et testés** dans le CLI (branche `feat/cli-bibliotheque`),
   pilotés par une instruction antérieure (`cli-bibliotheque-verbes.md`). Il **n'y a pas à
   réécrire** ce code vert.
2. **Le pool n'est pas matérialisé** sur l'arbre de travail courant de `~/work/iakaframe/` : aucun
   `library/`, `teams/`, `methods/`, `bindings/`, `kits/` réel (le rangement vit sur la branche
   `feat/rangement-bibliotheque`, non fusionnée). **Conséquence** : les tests « vraie bibliothèque »
   (`library.test.js:100-107`, `verbs-args.test.js:45-80`) **ne peuvent pas passer ici** — ils
   attendent 8 personas, la méthode `iakaframe` et la team `iakaframe-8`.
3. **Trois écarts inter-dépôts** menacent la cohérence CLI ↔ GUI et doivent être fermés (c'est le
   vrai travail de ce lot) :
   - **a. Racine partagée divergente** : la GUI découvre `<chapeau>/iakaframe` (ancre fixe,
     `paths.rs:133`) tandis que le CLI **remonte depuis `cwd`** (`library.js:46`, `findUp`) ; de
     plus la racine fixée dans les **Réglages GUI** (`settings.json`) est **invisible** au CLI.
   - **b. Schéma de binding divergent** : le pool implémente `{methodId, assignments[]}`
     (`b_test.md`) alors que **E1** grave `{node, bindings[], origin}` (`E1:62-80`). Deux formes
     du même concept.
   - **c. Réutilisation du cœur** : `assemble`/`switch` **réimplémentent** la composition en JS pur
     (`library.js:191-241`, `switch.js:74-97`) et **n'appellent pas** `generateClaudeCodeKit`/
     `RunnerAdapter` de `@iakaframe/core`. C'est **volontaire** (zéro-dep, comme `vocab.js`) mais
     la **parité de format** (descripteur `emits[]` ↔ `KitMd`) doit être **verrouillée par test**,
     pas seulement affirmée.

**Donc ce lot = RATIFIER l'existant comme contrat canonique côté GUI + FERMER a/b/c + matérialiser
le prérequis pool.** Il n'invente pas un moteur multi-runner (→ § 5 différé).

---

## 2. Frontière à graver : fabrication vs exécution (inchangée, ratifiée)

| Geste | Verbe | Côté | Écrit dans |
|---|---|---|---|
| Inventorier le pool | `list` (+ `show`) | lecture | — (stdout) |
| **Livrer un artefact** (enrichir la définition partagée) | `add` | **fabrication** | `teams/` `methods/` `bindings/` du **pool `iakaframe`** |
| Composer un déployable | `assemble` | exécution/run | `kits/` (ou dry-run) |
| Basculer un projet | `switch`/`use` | exécution/run | **`<projet>/.claude/` uniquement** |

> **Invariant de frontière (à graver)** : `add` **enrichit le pool `iakaframe`** (fabrication d'une
> définition). `switch` **écrit dans un projet, JAMAIS dans la bibliothèque**. C'est la même ligne
> que forge (crée+livre) / cockpit (réceptionne+run).

---

## 3. Contrat de chaque verbe (AS-BUILT ratifié ; les GAPS sont balisés)

> Convention : module `cli/src/commands/<verbe>.js` exportant `run<Verbe>(rest)`, `parseArgs`
> (`node:util`), option globale `--root <dir>` et `--json`. Sortie humaine par défaut.

### 3.1 `list [type]` — inventaire par scan **[MVP — AS-BUILT, ratifier]**
- **Usage** : `iakaframe list` (résumé des 12 collections) | `iakaframe list <type>`
  (`type ∈ {personas, skills, principles, rituals, guardrails, roles, workflows, scaffolds, teams,
  methods, bindings, kits}`). Options : `--json`, `--ascii`, `--root <dir>`.
- **Entrée → sortie** : scanne le dossier de la collection (table `COLLECTIONS`, `library.js:14-27`),
  lit le frontmatter, extrait `id` + libellé. Sans type → tableau `Collection | Nb | Aperçu d'ids`.
  Avec type → tableau `id | libellé` trié + total. `--json` → donnée brute.
- **Codes de sortie** : `0` OK ; `1` type inconnu (+ liste des types valides). Collection absente →
  ligne à 0 (**pas** une erreur : structure partielle tolérée, `library.js:72`).
- **Effets fichiers** : aucun (lecture seule).

### 3.2 `show <id>` — contrat d'un atome/assemblage **[MVP — AS-BUILT, ratifier]**
- **Usage** : `iakaframe show <id> [--type <collection>] [--json]`.
- **Entrée → sortie** : résout `<id>` par scan multi-collections (`id = basename`, invariant I2) ;
  collision → exige `--type` (`show.js:33-38`). Rend frontmatter mis en forme + corps `.md`.
- **Codes de sortie** : `0` ; `1` introuvable ou ambigu.
- **Effets fichiers** : aucun.

### 3.3 `add team|method|binding <fichier.md>` — **LE GESTE DE LIVRAISON** **[MVP — AS-BUILT, ratifier + GAP schéma binding]**
- **Usage** : `iakaframe add <kind> <fichier.md>` (`kind ∈ {team, method, binding}`). Options :
  `--root`, `--force`, `--json`.
- **Entrée → traitement** (`add.js:12-77`, ordre **strict, validation AVANT écriture**) :
  1. parse frontmatter du fichier source ;
  2. schéma requis (`checkSchema`, `library.js:174-185`) : `team→{id,personas,coordinator}`,
     `method→{id,workflowId,roleKeys}`, `binding→{id,methodId,teamId,assignments}` ;
  3. `id == basename(fichier)` (I2) ;
  4. **intégrité référentielle I1** (`checkRefs`, `library.js:136-171`) : toute réf pointe un atome
     présent ; `assignments[].runner ∈ RUNNER_KINDS`.
- **Effets fichiers** : dépose `<root>/{teams|methods|bindings}/<id>.md` (`ADD_DIR`, `library.js:187`).
  **Garde non-destructive** : refus si la cible existe sans `--force` (`add.js:60-66`).
- **Codes de sortie** : `0` livré ; `1` schéma KO / réf cassée / id≠basename / cible existante sans
  `--force` (**aucune écriture** dans tous les cas de refus).
- **GAP à trancher (Q-5)** : le schéma `binding` accepté ici (`{methodId,teamId,assignments[]}`)
  **diverge** du schéma E1 (`{node,teamId,bindings[],origin}`). À converger (voir § 4.3).

### 3.4 `assemble <method> <team> [binding]` — composer un kit **[MVP — AS-BUILT, ratifier + GAP parité]**
- **Usage** : `iakaframe assemble <methodId> <teamId> [bindingId] [--binding <id>] [--node <n>]
  [--write] [--force] [--json]`.
- **Entrée → traitement** (`assemble()`, `library.js:191-241`) : contrôle **casting ⊇ rôles**
  (`method.roleKeys ⊆ ∪ roleKey des personas de la team`) ; binding explicite vérifié cohérent
  (`methodId`/`teamId`) ou auto-sélection de l'unique binding compatible ; produit un **descripteur**
  `{id, methodId, teamId, bindingId?, node, emits[]}`.
- **Effets fichiers** : **dry-run par défaut** (n'écrit rien) ; `--write` → `kits/<id>.md`
  (non-destructif, `--force`).
- **Codes de sortie** : `0` compatible ; `1` rôle(s) orphelin(s), binding incohérent, ou cible
  existante sans `--force`.
- **GAP à trancher (Q-6)** : le descripteur/`emits[]` produit ici doit être **byte-identique** à ce
  que `serializeKitMd` (`core/frontmatter.ts:471`) et l'adaptateur `generateClaudeCodeKit`
  produiraient — **parité verrouillée par golden fixture partagée**, pas par affirmation.

### 3.5 `switch` / `use <method> <team>` — basculer un projet **[MVP-2 — AS-BUILT, ratifier ; multi-runner DIFFÉRÉ]**
- **Usage** : `iakaframe use <methodId> <teamId> [--binding <id>] [--path <projet>] [--node <n>]
  [--rollback] [--json]` (`switch` = alias exact). `--path` défaut = `cwd`.
- **Entrée → traitement** (`switch.js:22-111`) : assemble interne (refus si incompatible) ;
  **sauvegarde** `<projet>/.claude/` → `.claude.bak-<ts>/` si présent ; déploie personas de la team
  + leurs skills depuis le pool ; écrit le marqueur `<projet>/.claude/iakaframe-kit.json`
  (`{methodId,teamId,bindingId,node,assembledAt}`). `--rollback` restaure la dernière sauvegarde.
- **Effets fichiers** : **`<projet>/.claude/` uniquement** (+ `.claude.bak-*`). Jamais le pool.
- **Codes de sortie** : `0` ; `1` incompatible (aucune écriture) / projet introuvable / rollback sans
  sauvegarde.
- **DIFFÉRÉ** : le rendu **multi-runner complet** (arbre `emits[]` d'un kit non-Claude via
  adaptateurs `codex`/`ollama`/`openwebui`) reste hors lot (§ 5).

---

## 4. Contrats transverses à GRAVER (le cœur du travail de ce lot)

### 4.1 Contrat de résolution de racine PARTAGÉ CLI + GUI — **[GAP a — à fermer]**

**Trois racines distinctes, à ne jamais confondre** (déjà nommées côté GUI, `paths.rs:12-32`) :

| Racine | Env | Rôle | Résolveur |
|---|---|---|---|
| Chapeau | `IAKAFRAME_ROOT` | dossier des projets (`~/work`) | CLI `root.js:6-11` · GUI `paths.rs:37` |
| **Bibliothèque** | **`IAKAFRAME_HOME`** | **le pool `iakaframe`** (cible de `add`) | CLI `library.js:41-49` · GUI `paths.rs:105-138` |
| Workspace forge | `IAKAFRAMEGUI_WORKSPACE` | teams JSON de la GUI | GUI `paths.rs:58` |

**Marqueur commun (déjà aligné)** : une racine bibliothèque valide = **double marqueur
`library/` + `methods/`** — CLI `isLibraryRootDir` (`library.js:51-53`), GUI `is_library_home`
(`paths.rs:142-144`). **Ne pas modifier ce marqueur** ; il est le point d'ancrage partagé.

**Divergence à trancher (Q-3)** — ordre de priorité :

| Rang | CLI (actuel) | GUI (actuel) |
|---|---|---|
| 1 | `--root` | override `settings.json` |
| 2 | `IAKAFRAME_HOME` | `IAKAFRAME_HOME` |
| 3 | **findUp depuis `cwd`** (double marqueur) | **`<chapeau>/iakaframe`** (double marqueur) |
| 4 | `frameworkRoot()` (assets `_bundled`) | `None` (l'UI invite à définir) |

> **Reco cadreur** : conserver `IAKAFRAME_HOME` comme **source unique partagée** (rang 2 identique
> des deux côtés — c'est le contrat d'interop). Ajouter au CLI, **entre findUp et `frameworkRoot()`**,
> une sonde `<resolveRoot()>/iakaframe` (calque de l'ancre GUI `<chapeau>/iakaframe`), de sorte
> qu'un terminal ouvert **hors** de l'arbre bibliothèque converge quand même vers la même racine
> que la GUI. `--root`/`findUp` restent pour l'ergonomie terminal. → *Trancher l'ordre exact.*

**Interop `settings.json` (Q-4)** : la racine fixée dans les **Réglages GUI** (`settings.json`,
`paths.rs:106`) n'est **pas lue** par le CLI (couplage GUI→CLI indésirable). **Reco** : documenter
que **`IAKAFRAME_HOME` (env) est le canal partagé** ; le CLI ne lit **pas** `settings.json`. Si le
décideur veut un partage automatique, alternative = la GUI **exporte** `IAKAFRAME_HOME` dans
l'environnement au lancement d'un terminal. → *Confirmer : env partagé, CLI ignore `settings.json`.*

### 4.2 Sémantique de « livraison » (`add`) — **[à graver, ratifiée]**

**Livrer = enrichir le pool `iakaframe`.** `add team|method|binding` **dépose** l'artefact dans le
dépôt bibliothèque (`<IAKAFRAME_HOME>/{teams|methods|bindings}/`), qui devient la **cible/pool
partagé** consommé **et** par le CLI (`list`/`assemble`/`switch`) **et** par la GUI
(`library_store.rs`). Un artefact n'est « livré » que s'il **passe l'intégrité référentielle I1**
(aucune référence cassée) et qu'il **ne remplace rien** sans `--force`. Le format déposé = **`.md`
frontmatter** au schéma pool (§ 4.3), lisible à l'identique par `iakaframe show` et par
`parse*Md` du cœur (`core/frontmatter.ts`).

### 4.3 Désambiguïsation du mot « binding » — **[à graver — critique]**

Il n'existe **qu'UN seul concept** (E1, 1re classe) : `persona → runner + modèle`. Ce que le task
craignait comme « collision » se résout en **une provenance, deux instances** :

| Instance | Où | Champ `origin` | Porté par | Ce que fait `add binding` |
|---|---|---|---|---|
| **Binding par défaut (forge)** | **pool `iakaframe/bindings/<id>.md`** | `forge-default` | la **définition livrée** | ✅ **c'est ce que `add binding` livre** |
| **Override cockpit** | run-time, environnement du projet | `cockpit-override` | le **Cockpit** | ❌ jamais dans le pool partagé |

- **AR-1 est respecté** : la **Team** et la **Méthode** restent **pures** (zéro runner/modèle) ;
  le binding est **précisément** la couche séparée où vivent runner+modèle (E1 AR-1 révisé,
  `E1:84-90`). Donc `add binding` **porte légitimement** `assignments[].runner`/`model` — cela **ne
  viole pas** la pureté (contrairement à la crainte formulée dans la demande, à rectifier).
- **Ce que le pool binding n'est PAS** : l'**affectation runner/modèle run-time du Cockpit**
  (`origin: cockpit-override`), qui reste hors du pool partagé.
- **GAP de schéma (Q-5)** : l'implémenté (`b_test.md` : `{id, methodId, teamId,
  assignments[{personaId,runner,model}]}`) **diverge** d'E1 (`{id, node, teamId,
  bindings[{personaId,runner,model}], origin}`). Points de friction : `methodId` (pool) vs absence
  (E1) ; `node` (E1) vs absence (pool) ; `assignments` vs `bindings` ; pas d'`origin` dans le pool.
  → **Trancher la convergence** (voir Q-5).

### 4.4 Réutilisation du cœur `@iakaframe/core` — stratégie MIROIR (à ratifier) — **[GAP c]**

Le CLI **ne doit pas importer** `@iakaframe/core` (contrainte **zéro-dep runtime**, cross-OS,
publiable Forgejo). Il en tient un **miroir** : `vocab.js` (miroir de `vocab.json`, parité testée,
`vocab-parity.test.js`) et `frontmatter.js` (miroir de `core/frontmatter.ts`, qui se **déclare
lui-même miroir**, `frontmatter.ts:14-22`). **Reco** : étendre cette discipline à la **composition** —
le descripteur `assemble` et son `emits[]` doivent produire un `.md` **byte-identique** à
`serializeKitMd` (`core/frontmatter.ts:471`) et cohérent avec `generateClaudeCodeKit`
(`core/adapters`), **verrouillé par golden fixture partagée** (§ 7). On **réutilise le
vocabulaire/format**, on ne **diverge pas** — sans importer le cœur.

---

## 5. Périmètre FERMÉ — MVP inclus / différé

**[MVP — ratifier l'existant + fermer les écarts]**
- **Ratification** : contrats `list`/`show`/`assemble` (lecture + composition, dry-run) et
  `add`/`switch` (écriture, non-destructif) **tels que codés** — aucune réécriture du code vert.
- **Fermeture GAP a** : contrat de racine partagé (Q-3, Q-4) — convergence de l'auto-découverte +
  clarification `settings.json`.
- **Fermeture GAP b** : convergence du schéma de binding pool ↔ E1 (Q-5).
- **Fermeture GAP c** : test de **parité de composition** CLI ↔ `core/frontmatter.ts` (Q-6).
- **Prérequis pool (Q-2)** : matérialiser le pool réel (8 personas, méthode `iakaframe`, team
  `iakaframe-8`, bindings) pour **verdir** les tests « vraie bibliothèque ».

**[Explicitement DIFFÉRÉ — hors lot]**
- **Rendu multi-runner complet** de `switch` (arbre `emits[]` non-Claude via adaptateurs
  codex/ollama/openwebui depuis un binding). Au MVP, `switch` = dépôt personas+skills Claude.
- **`assemble --write` industrialisé** (versionnement systématique des kits) au-delà du descripteur.
- **`add` pour les atomes du pool** (`persona`, `principle`, `role`…) : hors MVP (les 3 assemblages
  seulement — Q-8) ; les atomes s'éditent via la forge / à la main.
- **Édition de schéma runtime dans `@iakaframe/core`** partagée forge↔cockpit.
- **Lot rangement** (`rangement-bibliotheque-pluriel.md`) : ce lot en **dépend** (§ Q-2) mais ne le
  refait pas.

---

## 6. Impacts fichiers attendus, par dépôt

**`~/work/iakaframe/` (CLI) — l'essentiel du travail**
- `cli/src/lib/library.js` : `libraryRoot()` — insérer la sonde `<resolveRoot()>/iakaframe` (Q-3).
- `cli/src/lib/library.js` + `cli/src/commands/add.js` : convergence du schéma binding (Q-5) si
  tranché (champs `node`/`origin`).
- `cli/test/` : ajout du test de **parité de composition** (Q-6) + tests de la nouvelle sonde de
  racine ; **matérialisation/fusion du pool** pour verdir `library.test.js:100-107` (Q-2).
- `package.json` : `dependencies` **inchangé** (zéro-dep) ; éventuel bump de version + republication
  registre Forgejo (Q-9, hors box offline).

**`~/work/iakaFrameGUI/` (core)**
- `packages/core/src/frontmatter.ts` : *a priori* **aucun changement** (le schéma `KitMd`/`TeamMd`/
  `MethodMd` est déjà en place) ; **sauf** si Q-5 fait évoluer le binding → alors ajouter un
  `BindingMd` aligné et son test de parité.
- Golden fixture partagée de composition (Q-6) : soit dans `packages/core/__tests__`, soit référencée
  via `IAKAFRAME_CORE_VOCAB`-like.

**`~/work/iakaFrameGUI/src-tauri/` (Rust/GUI)**
- **ZÉRO changement attendu.** `paths.rs` (`resolve_iakaframe_home`, `is_library_home`) et
  `library_store.rs` implémentent déjà le contrat de racine partagé côté GUI. **À confirmer au
  jalon** : aucune régression Rust n'est requise par ce lot.

---

## 7. Critères d'acceptation (vérifiables)

1. **Non-régression** : `node --test` vert dans `cli/` ; `iakaframe --help` liste `list`, `show`,
   `add`, `assemble`, `switch|use` ; commandes existantes (`onboard init snapshot update services
   config agents go banner brief recap jalon root`) dispatchent comme avant.
2. **`list`** : `iakaframe list` → 12 collections avec comptes réels ; `list personas` → **8** ids
   (hors `_TEMPLATE`) ; type inconnu → `exitCode 1` + liste des types.
3. **`show`** : `show gandalf` rend `roleKey: cadrage`, `skills: [iakaframe-cadrage]` + corps ;
   `show <inconnu>` → `1` ; collision d'id → exige `--type`.
4. **`add`** : binding fixture à réf cassée → **refus sans écriture** (`1`, ids manquants listés) ;
   team valide → **déposée** dans `teams/` et visible par `list teams` ; `id ≠ basename` → refus ;
   cible existante sans `--force` → refus.
5. **`assemble`** : `assemble iakaframe iakaframe-8` → compatible (8/8) + descripteur ; team amputée
   → échec avec rôles orphelins ; binding incohérent → échec ; **dry-run n'écrit rien**, `--write`
   écrit `kits/<id>.md` non-destructif.
6. **`switch`/`use`** : sur projet temporaire → `.claude/agents/*` (personas) + marqueur
   `iakaframe-kit.json` ; `.claude/` préexistant → `.claude.bak-*` créé ; `--rollback` restaure ;
   incompatible → aucune écriture ; **rien écrit hors `<projet>/.claude/`**.
7. **Racine partagée (GAP a)** : `IAKAFRAME_HOME` prioritaire des deux côtés (test CLI +
   `paths.rs` tests) ; un terminal hors arbre bibliothèque, `IAKAFRAME_HOME` non défini, résout la
   **même racine** que la GUia via la sonde `<chapeau>/iakaframe` (test de convergence, Q-3).
8. **Binding désambiguïsé (GAP b)** : le schéma tranché (Q-5) est accepté par `add` et cohérent avec
   E1 ; un binding `origin: cockpit-override` (s'il existe) n'est **jamais** requis/produit par `add`.
9. **Parité de composition (GAP c)** : un `kits/<id>.md` produit par `assemble --write` est
   **byte-identique** à `serializeKitMd(...)` du cœur sur la même entrée (golden fixture partagée).
10. **Parité vocab/frontmatter** : `vocab-parity.test.js` vert (miroir = `vocab.json`) ; le parseur
    frontmatter CLI lit les fichiers réels du pool à l'identique du cœur.
11. **Pool matérialisé (Q-2)** : les tests « vraie bibliothèque » (`library.test.js:100-107`,
    `verbs-args.test.js:45-80`) passent (8 personas, `iakaframe`/`iakaframe-8` présents).
12. **Zéro-dep** : `cli/package.json` `dependencies` inchangé ; aucun import de `@iakaframe/core`
    dans le CLI.

**Tests attendus** : unités CLI (`frontmatter.test.js`, `library.test.js`, `verbs-args.test.js`,
`root.test.js`) ; parité (`vocab-parity.test.js` + nouveau test parité composition) ; smoke
end-to-end (`list`/`assemble`/`switch` sur pool tmp) ; tests Rust `paths.rs` (déjà présents) pour le
contrat de racine.

---

## 8. Plan de tests (delta de ce lot)
- **CLI** : test de la **sonde de racine `<chapeau>/iakaframe`** (Q-3) ; test de **parité de
  composition** `assemble --write` ↔ `serializeKitMd` (golden partagée, Q-6) ; si Q-5 tranché,
  tests du schéma binding convergé (`checkRefs`/`checkSchema`).
- **Pool** : fixtures ↔ pool réel matérialisé pour les tests « vraie bibliothèque ».
- **Core** : si `BindingMd` ajouté (Q-5), (dé)sérialiseur + parité CLI↔core.

---

## 9. Arbitrages ouverts (à trancher par le décideur)

- **Q-1 — Nature du lot.** Ce lot **ratifie** le code CLI déjà écrit (branche `feat/cli-bibliotheque`)
  + ferme les écarts a/b/c + matérialise le pool — il **ne réécrit pas** le code vert. *Reco : oui.*
  → *Confirmer, et confirmer que l'instruction canonique vit désormais **côté GUI** (ce fichier),
  l'instruction `iakaframe/.../cli-bibliotheque-verbes.md` devenant l'antécédent historique.*
- **Q-2 — Prérequis pool.** Le pool réel (8 personas, méthode `iakaframe`, team `iakaframe-8`,
  bindings) est-il **matérialisé/fusionné par CE lot** (pour verdir les tests « vraie
  bibliothèque »), ou est-ce **la fusion préalable** du lot `rangement-bibliotheque-pluriel.md`
  (branche `feat/rangement-bibliotheque`) ? *Reco : **prérequis** — fusionner le rangement d'abord ;
  ce lot n'invente pas le pool.* → *Trancher l'ordre de fusion.*
- **Q-3 — Ordre de résolution de racine (GAP a).** Ajouter au CLI la sonde `<chapeau>/iakaframe`
  (calque GUI) entre `findUp(cwd)` et `frameworkRoot()` ? *Reco : oui, avec `IAKAFRAME_HOME`
  prioritaire et partagé.* → *Confirmer l'ordre exact.*
- **Q-4 — Interop `settings.json` (GAP a).** Le CLI **ignore** `settings.json` de la GUI ;
  `IAKAFRAME_HOME` (env) est le **canal partagé** ; option = la GUI exporte `IAKAFRAME_HOME` au
  lancement d'un terminal. *Reco : env partagé, CLI n'introduit pas de couplage GUI.* → *Confirmer.*
- **Q-5 — Convergence du schéma de binding (GAP b).** Aligner le pool binding
  (`{methodId, assignments[]}`) sur E1 (`{node, bindings[], origin}`) ? Options : (i) **garder
  l'implémenté** (rétro-compat tests) + ajouter `node` et `origin` **optionnels** ; (ii) **migrer
  vers E1** (renommer `assignments→bindings`, retirer `methodId`, ajouter `node`+`origin`) ;
  (iii) statu quo (documenter la divergence). *Reco : (i) — additif, non cassant, converge vers E1
  sans casser le vert.* → *Trancher.*
- **Q-6 — Parité de composition (GAP c).** Verrouiller `assemble --write` ↔ `serializeKitMd`/
  `generateClaudeCodeKit` par **golden fixture partagée** (stratégie miroir, pas d'import core) ?
  *Reco : oui.* → *Confirmer l'emplacement de la golden.*
- **Q-7 — `switch` multi-runner.** Le rendu multi-runner (codex/ollama/openwebui via adaptateurs)
  reste **différé** ; MVP = dépôt personas+skills Claude. *Reco : oui.* → *Confirmer.*
- **Q-8 — Portée de `add`.** `add` reste limité aux **3 assemblages** (`team|method|binding`), pas
  aux atomes du pool. *Reco : oui (hérité de `cli-bibliotheque-verbes.md` Q-5).* → *Reconfirmer.*
- **Q-9 — Publication CLI.** Après le lot, bump de version `@naonedge/iakaframe` + republication sur
  le registre npm Forgejo ? *Reco : oui, hors box offline.* → *Confirmer le moment (box en ligne).*

> Arbitrages **hérités** de `cli-bibliotheque-verbes.md` (déjà tranchés, à reconfirmer si besoin) :
> marqueur `frameworkRoot()` basculé sur `library/` ; `IAKAFRAME_HOME` distincte d'`IAKAFRAME_ROOT` ;
> `assemble` dry-run par défaut ; marqueur projet `.claude/iakaframe-kit.json`.

---

## 10. Faits vérifiés (web) + sources

- **Node.js n'embarque aucun parseur YAML natif** (jusqu'à la LTS courante) : tout support YAML
  passe par une dépendance tierce → intégrer `js-yaml`/`yaml`/`gray-matter` **violerait** le
  zéro-dep du CLI (et du cœur). **Conséquence tranchée** : mini-parseur maison + **stratégie
  miroir** CLI ↔ `core/frontmatter.ts` (déjà en place, à étendre à la composition). *(Vérifié
  2026-07-15, cohérent avec l'instruction antérieure `cli-bibliotheque-verbes.md` § 10.)*

Sources :
- [js-yaml — parser YAML JavaScript](https://github.com/nodeca/js-yaml)
- [yaml (eemeli) — parser/sérialiseur YAML](https://github.com/eemeli/yaml)
- [yaml — page npm](https://www.npmjs.com/package/yaml)

---

## 11. Journal de décision
- **2026-07-15** — Cadrage de la couche CLI/terminal sur la bibliothèque `iakaframe`. **Constat
  structurant** : les 5 verbes sont **déjà codés et testés** (branche `feat/cli-bibliotheque`), avec
  une instruction antérieure (`iakaframe/.../cli-bibliotheque-verbes.md`). Ce lot **ratifie**
  l'existant comme **contrat canonique côté GUI** et **ferme trois écarts inter-dépôts** : (a) racine
  partagée (auto-découverte + `settings.json`), (b) schéma de binding pool ↔ E1, (c) parité de
  composition CLI ↔ `@iakaframe/core` (stratégie miroir, zéro-dep). **Désambiguïsation** gravée :
  un seul concept Binding (E1), deux provenances — `add binding` livre le **défaut forge**
  (`origin: forge-default`, porte runner+modèle **sans** violer AR-1), jamais l'override cockpit.
  **Prérequis** : matérialiser/fusionner le pool. Impacts : surtout CLI ; core éventuel (binding) ;
  **zéro Rust/GUI**. Arbitrages Q-1→Q-9. **Cadrage seul, aucun code de production.**

> Tant que ce jalon n'est pas validé, **aucun code n'est écrit**. L'implémentation (Gimli) suit la
> validation du décideur.
