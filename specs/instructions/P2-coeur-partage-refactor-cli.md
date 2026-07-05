# Instruction P2 — Cœur de concepts partagé + refactor de vocabulaire du CLI (MVP)

> **Phase** : P2 — Réalisation · **Cadreur** : l'architecte-cadreur · **Exécutant** : le développeur-devops ·
> **Gate** : le responsable qualité.
> **Statut : CADRÉ — À VALIDER par le décideur** (jalon humain) avant tout code.
> **Date** : 2026-07-06. Français ; identifiants en anglais ; **rôles jamais désignés par un nom de code**.
>
> **⚠️ PORTÉE INTER-DÉPÔTS.** Cette instruction **vit** dans `iakaFrameGUI/specs/` mais son **exécution modifie
> DEUX dépôts** : `~/work/iakaFrameGUI/packages/core/**` (cœur partagé) **et** `~/work/iakaframe/cli/**` (le CLI
> de la méthode). **Deux dépôts = deux commits** (atomiques, conventional commits), poussés séparément. Le CLI
> `@naonedge/iakaframe` est **publié** sur le registre npm Forgejo et **consommé par la méthode** (« init/update
> iakaframe ») → la non-régression est **impérative** (§ 9).
>
> **Fondations** : `specs/contrat-concepts.md` (§ 2 niveaux, § 4 vocabulaire runner cible), `specs/glossaire-
> concepts.md`, `specs/instructions/cadrage-iakaframegui-et-moteur.md` (§ 3 audit VOLET B, § 7 AR-1→AR-9),
> `specs/instructions/P1-coquille-forge-authoring.md` (état P1 : `@iakaframe/core` + team pure livrés).
> Glossaire des rôles (source de vérité) : `iakaframe/specs/glossaire-iakaframe.md`.

---

## 1. Objectif

Consolider le **cœur de concepts partagé `@iakaframe/core`** comme **source de vérité** du vocabulaire, et
**réaligner le vocabulaire du CLI** (`~/work/iakaframe/cli`) sur le modèle validé — **sans casser** la plomberie
testée ni les commandes de la méthode. P2 = **tuyauterie de concepts** (vocabulaire + structure), **pas** une
nouvelle feature visible, **pas** de génération de kit (P3).

Trois chantiers (AR-2 « refactor en strates », AR-3 « cœur TS partagé ») :
1. **Promouvoir `@iakaframe/core`** en référentiel des concepts (Rôle, Persona, Skill, Garde-fou, Connecteur, Team
   pure, **Kit-format**, + les **enums** `RunnerKind`, `NodeKind`, `KitFormat`).
2. **Refactor de vocabulaire du CLI** sur trois foyers de dette prouvés par l'audit : `lib/agents.js` (agent→
   persona / rôle), `commands/config.js` (runner daté → enum unifié), `lib/kit.js` (`target` conflate format +
   plateforme → **deux concepts distincts**).
3. **Rétro-compat** : les noms de flags/valeurs qui changent gardent un **alias déprécié** ; les commandes testées
   continuent de marcher à l'identique.

---

## 2. Périmètre — IN / OUT

### 2.1 DANS le périmètre P2

- **Cœur `@iakaframe/core`** : ajouter les **enums de vocabulaire** (`RunnerKind`, `NodeKind`, `KitFormat`) +
  helpers (`contractFileForNode`, `kitNameForNode`, parseurs/normaliseurs de valeurs legacy). Les types Persona/
  Rôle/Skill/Garde/Connecteur/Team pure existent déjà (P1) — on **complète**, on ne refait pas.
- **Refactor CLI — vocabulaire & structure**, sur les trois foyers (§ 4).
- **Rétro-compat** (§ 6) : alias de flags, normalisation des valeurs legacy, lecture des anciens `.iakaframe` /
  `iakaframe.json` inchangée.
- **Stratégie core↔CLI** (§ 5) : décider et implémenter **align** (mirroir + test de parité) vs **consume**.
- **Tests** : mettre à jour/ajouter les tests CLI (`cli/test/*`) et core (`packages/core/__tests__/*`).

### 2.2 HORS périmètre P2 (différés — à ne PAS coder)

- **Génération de kits multi-cible** + **adaptateur de runner concret** + **déploiement multi-nœuds** → **P3**.
- **Adaptateur de méthode** (import BMAD/MetaGPT/SPARC) → **P∞**.
- **Toute UI forge nouvelle** (skin Cinabre, sélecteur de charte, écran de déploiement) → **todo séparé**.
- **Suppression** de fonctionnalités du CLI (aucune) ; **bump de version publiée** du CLI (décision humaine, § 9).
- **Retrait de `runner`/`model` du Cockpit** (instruction Cockpit dédiée) — hors de ces deux dépôts.
- **Renommage du répertoire `.claude/agents/`** : **INTERDIT** — c'est la **surface Claude Code** (les subagents
  vivent là ; « agent » y subsiste comme *forme d'implémentation*, cf. contrat-concepts § 6.1). Le refactor
  « agent→persona » porte sur le **vocabulaire de notre code** (identifiants, commentaires, logs), **pas** sur les
  chemins de déploiement imposés par le nœud.

---

## 3. Concepts cibles (rappel — ce sur quoi on aligne)

| Concept | Valeur canonique (source `@iakaframe/core`) |
|---|---|
| **RunnerKind** (run-time) | `claude-code` \| `ollama` \| `litellm` \| `codex` (aligné `IakaCockpit/src/hooks/useTeams.ts:34`) |
| **NodeKind** (déploiement) | `claude` \| `codex` \| `ollama-localhost` \| `ollama-lan` (AR-4) |
| **KitFormat** (contrat) | `claude-md` (→ `CLAUDE.md`) \| `agents-md` (→ `AGENTS.md`) |
| **Persona / Rôle** | une **persona** (nommée) **incarne un rôle** (7 canoniques) — jamais « agent = code-nom = rôle » |

> **Nœud ≠ Runner** (glossaire-concepts § 4) : le **nœud** est une destination de déploiement (forge) ; le
> **runner** un harnais d'exécution (cockpit). Le CLI manipule surtout des **nœuds** (où déployer le kit) et un
> **runner** local pour `go` — les deux vocabulaires deviennent explicites et distincts.

---

## 4. Mapping de refactor du CLI (avant → après, cité chemin:ligne)

### 4.1 `lib/agents.js` — agent→persona, séparer rôle et nom

| Avant (chemin:ligne) | Problème | Après |
|---|---|---|
| `lib/agents.js:1` commentaire « Equipe d'agents… » | vocabulaire « agent » comme concept | « Équipe de **personas** (incarnations de rôles) ». |
| `lib/agents.js:7-16` `SKILL_OF = { odin:…, aragorn:… }` | **conflate** code-nom = rôle = persona = clé de skill | Introduire une table **`ROLE_OF`** (code-nom → **roleKey** canonique) **et** `SKILL_OF` (roleKey → skill). Le code-nom devient une **donnée de persona**, pas le concept. Réutiliser `CANONICAL_ROLES`/`SKILL_*` de `@iakaframe/core` (align, § 5). |
| `lib/agents.js:17` `PORTFOLIO_AGENTS` | « agents » | `PORTFOLIO_ROLES` (ou `PORTFOLIO_PERSONAS`) — commentaire clarifié. |
| `lib/agents.js:27-32` `listAgents()` | nomme « agents » | `listPersonas()` (alias `listAgents` **conservé et déprécié** pour la rétro-compat interne). |
| `lib/agents.js:38-67` `affectAgent()` logs « + agent … » | log concept | « + persona … » dans les logs **destinés à l'humain** ; **le chemin `…/.claude/agents/` reste inchangé** (surface Claude Code). |
| `lib/agents.js:70-84` `assignedAgents`/`fullteam` | « agents » | `assignedPersonas`/`fullteam` (aliases conservés). |
| `commands/agents.js:21-22,42` « Equipe… / Agents affectes » | logs | libellés « personas » ; **la sous-commande `agents` garde son nom** (rétro-compat CLI) — seul le **discours** change. |

> **Règle** : la **commande** `iakaframe agents` **ne change pas de nom** (rétro-compat). Le refactor « agent→
> persona » est **conceptuel** (identifiants internes + logs + commentaires) et **n'altère aucun chemin de
> déploiement** (`.claude/agents/`).

### 4.2 `commands/config.js` + `commands/go.js` — runner daté → enum unifié

| Avant | Problème | Après |
|---|---|---|
| `commands/config.js:9` `RUNNERS = ['ps','codex','iakaide','aider']` | vocabulaire daté ; `iakaide` = anti-modèle ; `ps` trompeur | `RUNNERS = RunnerKind` de core = `['claude-code','ollama','litellm','codex']` **+ table d'alias legacy** (§ 6.2). |
| `config.js:2,28,69` commentaires « runner: ps\|codex\|iakaide » | doc datée | doc = enum unifié + mention « alias legacy acceptés ». |
| `config.js:56` `runner = … ? 'codex' : 'ps'` | défaut `ps` | défaut `claude-code`. |
| `config.js:58` warn `iakaide` | anti-modèle | déprécation douce : `iakaide`→`claude-code` avec warning stderr. |
| `go.js:1,68,77,82,86` `runner … 'ps'` / `iakaide` | idem | normaliser via l'alias (`ps`→`claude-code`) ; garder les **launchers réels** (`aider` reste un launcher **legacy** flaggé) sans casser `go`. |
| `index.js:37,41` aide `--runner ps\|codex\|iakaide\|aider` | aide datée | aide = enum unifié ; « (alias legacy : ps, iakaide, aider — dépréciés) ». |

> **Nuance `aider`** : `aider` est un **launcher réel** (pas dans l'enum Cockpit). Il **reste opérationnel** dans
> `go` comme **runner legacy non canonique** (flag/warning), **sans** entrer dans `RunnerKind`. On **ne casse pas**
> `go --runner aider`.

### 4.3 `lib/kit.js` — `target` conflate format + plateforme → deux concepts

| Avant | Problème | Après |
|---|---|---|
| `lib/kit.js:24-25` `kitName(target)` (claude→kit-claude…) | `target` = plateforme **et** nom de kit | `kitNameForNode(node)` : `NodeKind` → nom de kit. Réexporté depuis core (align). |
| `lib/kit.js:27-28` `contractFile(target)` (claude→CLAUDE.md sinon AGENTS.md) | mélange format dans « target » | `contractFileForNode(node)` **via `KitFormat`** : `node → KitFormat → fichier`. |
| `commands/init.js:8,19-27,45,51` `TARGETS`/`--target`/`.iakaframe target=` | « target » ambigu | Introduire `--node` (`NodeKind`) ; **`--target` = alias déprécié** (§ 6.1). Le marqueur `.iakaframe` écrit **`node=`** **et** conserve **`target=`** (mirror, non destructif). |
| `commands/onboard.js:14,20,31,49,52-53,156-157,166` `TARGETS`/`--target` | idem | idem : `--node` canonique, `--target` alias ; logs « nœud » au lieu de « cible ». |
| `commands/config.js:10,29,42,60,67` `TARGETS`/`cfg.target` | idem | `--node` canonique + alias `--target` ; `iakaframe.json` écrit **`node`** et **`target`** (mirror). |
| `index.js:25,29,37` aide `--target claude\|codex\|ollama` | aide datée | aide = `--node claude\|codex\|ollama-localhost\|ollama-lan` (+ alias `--target`). |

> **Valeur `ollama`** (legacy, indistincte) → normalisée en **`ollama-localhost`** par défaut (avec note : `lan`
> exige `--node ollama-lan` explicite). Cf. § 6.1.

---

## 5. Stratégie core ↔ CLI — ALIGN (reco MVP), pas CONSUME

**Deux options :**
- **CONSUME** : le CLI `import`e `@iakaframe/core` buildé. *Contre* : le CLI est **Node zéro-dépendance,
  cross-OS, publié** ; consommer un package TS buildé introduit une **dépendance + un ordre de build inter-dépôts**
  et casse l'ethos « zéro dép runtime ». Prématuré au MVP.
- **ALIGN** *(reco)* : `@iakaframe/core` **définit** les enums/valeurs canoniques (source de vérité) ; le CLI en
  tient un **miroir** en JS pur (`cli/src/lib/vocab.js` : `RUNNER_KINDS`, `NODE_KINDS`, `KIT_FORMATS`, tables
  d'alias) **sans import**, et un **test de parité** garantit que le miroir CLI == les valeurs exportées par core
  (comparaison sur des **fixtures JSON** exportées par core, lues par le test CLI). Le CLI reste **zéro-dép**.

**Décision à acter (Q-1, § 10)** : **ALIGN**. Migration vers CONSUME possible plus tard, quand le core sera publié
au registre npm Forgejo (P3+).

**Mécanique de parité** : `@iakaframe/core` expose un fichier de données neutre
`packages/core/src/vocab.json` (ou un export sérialisable) ; un test CLI (`cli/test/vocab-parity.test.js`) lit ce
fichier (chemin relatif inter-dépôts **résolu défensivement** ; si absent en CI isolée → test **skip** documenté,
jamais rouge) et vérifie l'égalité avec `cli/src/lib/vocab.js`. But : empêcher la **re-divergence** que l'audit a
constatée (CLI `ps/iakaide/aider` vs Cockpit `claude-code/…`).

---

## 6. Stratégie de rétro-compat (non-régression)

### 6.1 Flags & valeurs — nœud/format
- **`--node`** = canonique (`NodeKind`). **`--target`** = **alias accepté** → mappé sur `--node` avec **warning de
  déprécation sur stderr** (jamais stdout, pour ne pas polluer les parseurs).
- **Normalisation des valeurs** : `claude`→`claude` ; `codex`→`codex` ; **`ollama`→`ollama-localhost`** (défaut) ;
  `ollama-lan` seulement si explicite.
- **Marqueur `.iakaframe`** : écrit **`node=<canonique>`** **et** conserve **`target=<legacy>`** (mirror) → les
  lecteurs anciens continuent de lire `target`. **Lecture** : accepter les deux (`node` prioritaire, repli
  `target`).
- **`iakaframe.json`** : écrit `node` **et** `target` (mirror) ; `runner` en valeur **canonique** ; **lecture**
  tolère les anciennes valeurs via la table d'alias.

### 6.2 Runner — table d'alias legacy
`ps`→`claude-code` · `iakaide`→`claude-code` (**déprécié**, warning) · `aider`→`aider` (**legacy launcher**,
conservé hors enum) · `codex`→`codex` · valeurs canoniques acceptées telles quelles. La normalisation vit dans
`cli/src/lib/vocab.js` (`normalizeRunner(value) → {kind, deprecated, legacyLauncher}`).

### 6.3 Principe
Le refactor est de **vocabulaire et de structure**, **pas** une casse d'API : **toute** invocation qui marchait
avant marche après (au pire avec un warning de déprécation). Aucune commande, aucun flag existant n'est **retiré**
en P2.

---

## 7. Fichiers touchés — par dépôt

### 7.1 Dépôt `iakaFrameGUI` (`packages/core/`) — commit A
- `packages/core/src/runner.ts` *(nouveau)* — `RunnerKind` + garde `parseRunnerKind`.
- `packages/core/src/node.ts` *(nouveau)* — `NodeKind`, `KitFormat`, `contractFileForNode`, `kitNameForNode`,
  `normalizeLegacyTarget`.
- `packages/core/src/index.ts` — ré-exports.
- `packages/core/src/vocab.json` *(nouveau)* — données neutres pour le test de parité CLI.
- `packages/core/__tests__/runner.test.ts`, `node.test.ts` *(nouveaux)*.

### 7.2 Dépôt `iakaframe` (`cli/`) — commit B
- `cli/src/lib/vocab.js` *(nouveau)* — miroir aligné + tables d'alias + normaliseurs.
- `cli/src/lib/agents.js` — persona/rôle (§ 4.1), aliases conservés.
- `cli/src/lib/kit.js` — `kitNameForNode`/`contractFileForNode` (§ 4.3), anciennes fonctions conservées en alias.
- `cli/src/commands/config.js` — enum runner + `--node`/alias `--target` + mirror `iakaframe.json`.
- `cli/src/commands/go.js` — normalisation runner + launchers legacy.
- `cli/src/commands/init.js` — `--node`/alias + marqueur `.iakaframe` (node + target mirror).
- `cli/src/commands/onboard.js` — `--node`/alias + logs « nœud ».
- `cli/src/commands/agents.js` — libellés « personas » (nom de commande inchangé).
- `cli/src/index.js` — texte d'aide aligné (nœud/runner/alias).
- `cli/test/` — `vocab-parity.test.js` *(nouveau)* + mise à jour des tests impactés (`root`, `etat`, `go-args`,
  `table`, `banner` restent verts ; ajouter des cas alias/normalisation).

---

## 8. Critères d'acceptation (vérifiables)

P2 est **PASS** si **tous** les points sont vérifiés :

- **A-1 — Enum runner unifié.** `@iakaframe/core` exporte `RunnerKind = { claude-code, ollama, litellm, codex }` ;
  `cli/src/lib/vocab.js` en tient le miroir **identique** ; **A-1bis** le test de parité `vocab-parity.test.js`
  est **vert** (miroir == core).
- **A-2 — « agent » ne désigne plus le concept.** Dans `cli/src/lib/` : `grep -nw agent` ne renvoie **plus** le
  **concept** (les seules occurrences admises sont : le **chemin** `.claude/agents/`, le **nom de commande**
  `agents`, et des **aliases dépréciés** explicitement commentés). Revue manuelle + assertion ciblée.
- **A-3 — Persona incarne un rôle.** `lib/agents.js` sépare **`ROLE_OF`** (code-nom→roleKey) de **`SKILL_OF`**
  (roleKey→skill) ; un test vérifie qu'une persona résout **rôle** puis **skill** (plus de conflation).
- **A-4 — Format et nœud sont deux champs distincts.** `contractFileForNode(node)` passe par `KitFormat`
  (`claude-md`/`agents-md`) ; test : `claude`→`CLAUDE.md`/`claude-md` ; `codex`,`ollama-localhost`,`ollama-lan`→
  `AGENTS.md`/`agents-md`.
- **A-5 — Nœuds de 1er rang (AR-4).** `NodeKind` inclut `ollama-localhost` **et** `ollama-lan` (distincts) ;
  `--node ollama-lan` accepté ; `ollama` legacy → normalisé `ollama-localhost` (test).
- **A-6 — Rétro-compat flags.** `--target claude|codex|ollama` **fonctionne encore** (alias `--node`) avec warning
  **sur stderr** ; le marqueur `.iakaframe` contient **`node=`** ET **`target=`** ; `iakaframe.json` idem (test).
- **A-7 — Rétro-compat runner.** `--runner ps` → `claude-code` ; `--runner iakaide` → `claude-code` + warning ;
  `--runner aider` **marche toujours** (launcher legacy) ; valeurs canoniques acceptées (test `go-args`/config).
- **A-8 — Non-régression plomberie.** La suite `cli/test/*` est **verte** ; **smoke réel** : `iakaframe onboard
  --path <tmp> --skip-forgejo --no-push` puis `iakaframe update --path <tmp> --no-push` s'exécutent **sans erreur**
  et produisent la structure + l'état des lieux **comme avant** (comparaison de sortie / arbre).
- **A-9 — `snapshot`/`banner`/`services` inchangés** dans leur comportement observable (tests verts, sortie
  identique).
- **A-10 — Qualité.** Core : `npm run typecheck` + `npm run test` (packages/core) verts. CLI : `node --test`
  (ou le runner de test du CLI) vert ; pas de dépendance runtime ajoutée au CLI (`cli/package.json` `dependencies`
  inchangé — **zéro dép**).
- **A-11 — Deux commits, deux dépôts.** Commit A dans `iakaFrameGUI` (core), commit B dans `iakaframe` (cli),
  messages conventional, **poussés séparément** (sous réserve de la politique push, § 9).
- **A-12 — Rôles jamais en noms de code (doc/logs humains).** Les nouveaux libellés de logs/aide emploient
  **rôle/persona** ; les noms de code n'apparaissent que comme **données** (clé de `ROLE_OF`), jamais comme
  désignation de concept.

---

## 9. Dépendances, risque & gate humain (non-régression du CLI)

**Dépendances**
- **P1 livré** : `@iakaframe/core` existe (types Persona/Team pure). P2 le **complète** (enums vocab).
- Accès **lecture** au Cockpit (`useTeams.ts:34`) pour figer l'enum runner canonique.
- Toolchain Node/npm (core + CLI).

**Risque (élevé) — non-régression du CLI publié**
Le CLI est **publié** (`@naonedge/iakaframe`, registre npm Forgejo) et **utilisé par la méthode** : « init/update
iakaframe » en dépendent dans **tous** les projets. Une régression a un **rayon de blast large**. Précautions :

1. **Gate humain AVANT code** sur la **stratégie de rétro-compat** (§ 6) et la **stratégie align** (§ 5) — Q-1/Q-2.
2. **Aucun bump de version publiée** ni `npm publish` du CLI **sans feu vert humain** (le refactor peut rester
   local/committé sans republier ; publier = décision du décideur).
3. **Politique push** : respecter l'état « box offline » si applicable (committer local, ne pousser que sur feu
   vert) — mémoire « box offline vacances ». **Ne pas** republier tant que le smoke A-8 n'est pas validé par le
   décideur.
4. **Two-repo discipline** : ne pas mélanger core et CLI dans un même commit.

**Questions d'arbitrage (avant dispatch)**
- **Q-1 — core↔CLI : ALIGN confirmé** (miroir + parité), ou le décideur veut-il **CONSUME** dès P2 (CLI dépend du
  core buildé/publié) ? *(Reco : ALIGN.)*
- **Q-2 — `ollama` legacy → `ollama-localhost` par défaut** : OK, ou faut-il **exiger** `--node` explicite et
  **refuser** `ollama` nu ? *(Reco : normaliser vers localhost avec warning — moins cassant.)*
- **Q-3 — Aliases dépréciés : durée de vie.** On garde `--target`/`ps`/`iakaide` **combien de temps** (jusqu'à un
  vX ?), ou déprécation silencieuse permanente ? *(Reco : garder ≥ 1 version mineure, warning stderr.)*
- **Q-4 — Republication du CLI** : après P2 verte, on republie `@naonedge/iakaframe` (nouvelle mineure) ou on
  attend P3 ? *(Reco : attendre P3 pour republier — éviter deux churns publiés rapprochés.)*
- **Q-5 — `aider`** : conserver le launcher legacy (reco) ou le retirer de `go` (hors périmètre « pas de
  suppression » — donc **garder**) ?

> Tant que ce jalon n'est pas validé, **aucun code**. À la validation : « JALON VALIDÉ » + réponses Q-1→Q-5.

---

## 10. Phasage interne (un seul livrable P2, deux commits)

| Étape | Contenu | Critères |
|---|---|---|
| **1. Core vocab** | enums `RunnerKind`/`NodeKind`/`KitFormat` + helpers + `vocab.json` + tests | A-1, A-4, A-5, A-10 |
| **2. CLI miroir** | `cli/src/lib/vocab.js` + parité + tables d'alias | A-1bis, A-7 |
| **3. CLI kit/node** | `lib/kit.js` + `init`/`onboard`/`config` : `--node`/alias, format séparé, mirror | A-4, A-5, A-6 |
| **4. CLI persona** | `lib/agents.js` + `commands/agents.js` : rôle/persona, logs, aliases | A-2, A-3, A-12 |
| **5. CLI runner** | `config.js`/`go.js`/`index.js` : enum + normalisation | A-7 |
| **6. Non-régression** | suite CLI verte + smoke onboard/update ; core vert | A-8, A-9, A-10, A-11 |

---

## 11. Journal de décision

- **2026-07-06** — Cadrage P2 (l'architecte-cadreur) : cœur `@iakaframe/core` promu source de vérité des enums de
  vocabulaire ; refactor CLI en **strates** (agent→persona/rôle, runner unifié `claude-code|ollama|litellm|codex`,
  `target` scindé en **nœud** + **format**) ; **rétro-compat** par aliases (`--target`, `ps`, `iakaide`) et mirror
  des marqueurs ; stratégie **ALIGN** (miroir + parité, CLI zéro-dép). **Non-régression impérative** (CLI publié,
  méthode dépendante) → gate humain + pas de republication sans feu vert. **Inter-dépôts : deux commits**
  (`iakaFrameGUI/packages/core` + `iakaframe/cli`).
