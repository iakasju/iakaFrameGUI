# Instruction P3 — Adaptateur de runner Claude Code : génération de kit + déploiement (MVP)

> **Phase** : P3 — Réalisation · **Cadreur** : l'architecte-cadreur · **Exécutant** : le développeur-devops ·
> **Gate** : le responsable qualité.
> **Statut : CADRÉ — À VALIDER par le décideur** (jalon humain) avant tout code.
> **Date** : 2026-07-06. Français ; identifiants en anglais ; **rôles jamais désignés par un nom de code**.
>
> **Fondations** : `specs/contrat-concepts.md` (§ 2.1 Garde-fou, § 2.4/2.4.1 **inventaire durci Claude Code** +
> réserve, § 3.2 Kit, § 3.4 Adaptateur de runner, § 6), `specs/glossaire-concepts.md`,
> `specs/instructions/cadrage-iakaframegui-et-moteur.md` (§ 7 AR-1→AR-9),
> `specs/instructions/P1-coquille-forge-authoring.md` (team pure + `@iakaframe/core`),
> `specs/instructions/P2-coeur-partage-refactor-cli.md` (**`NodeKind`/`KitFormat`/`RunnerKind`** + CLI aligné).
> **Gardes existantes à réutiliser** : `iakaFrameGUI/global/hooks/{identity-guard,perimeter-guard}.mjs`
> (+ `identity-remind`, `delegation-guard`).

---

## 1. Objectif

Donner à la forge sa **première capacité de PRODUCTION** : traduire une **team PURE** en **kit déployable** et le
**déployer sur un nœud**, avec **Claude Code comme premier adaptateur de runner de référence**. C'est le passage du
« on édite » (P1) au « on fabrique et on pose » : la forge **génère** une arborescence `.claude/` réelle depuis le
modèle (au lieu de copier un kit statique — le `cp -r` relevé à l'audit) et l'**écrit dans un projet cible**.

**SCOPE MVP CONFIRMÉ (non rediscuté) : un seul nœud, `claude`.** Les autres nœuds et les workflows sont différés
(§ 2.2).

---

## 2. Périmètre — IN / OUT

### 2.1 DANS le périmètre P3 (MVP — Claude Code seul)

1. **Étape 0 — Vérification des schémas Claude Code** (§ 3, **obligatoire AVANT câblage dur**).
2. **Adaptateur de runner Claude Code** = **fonction pure** `team → arborescence de fichiers déployables`
   (aucune I/O). Réutilise le vocab P2 (`NodeKind.claude`, `KitFormat.claude-md`).
3. **Génération de kit réelle** depuis le modèle (remplace, côté forge, l'approche « copie de kit statique »).
4. **Génération des gardes-fous** comme **hooks + permissions** dans `settings.json` (AR-8) : le canal d'identité
   et la garde de périmètre sont **GÉNÉRÉS** (câblage), **jamais remplacés** — on **réutilise** les scripts
   existants `global/hooks/`.
5. **Déploiement sur UN nœud Claude Code** : écrire l'arborescence dans un **dossier cible** (commande Rust de la
   forge, façade unique, pathguard), **non destructif** par défaut.

### 2.2 HORS périmètre P3 (différés — à ne PAS coder)

- **Autres nœuds concrets** : `codex` (AGENTS.md), `ollama-localhost`, `ollama-lan` — **modélisés en P2**,
  adaptateurs concrets **différés (P3b)**. On garde l'archi **extensible** (interface d'adaptateur) mais on
  n'implémente **que** Claude Code.
- **Workflows** (génération/orchestration) → **différés**.
- **Adaptateur de méthode** (BMAD/MetaGPT/SPARC) → **P∞**.
- **UI skin / sélecteur de charte Cinabre** → **todo séparé**.
- **Liaison runner + modèle** par persona → **Cockpit** (hors forge). La forge choisit le **nœud cible** du
  déploiement (ça, c'est un choix de forge) mais **jamais** le runner/modèle d'exécution d'une persona.
- **Plugins, output-styles, statusline, keybindings, settings multi-niveaux** (inventaire § 2.4.1) → différés.
- **Migration du `cp -r` du CLI** (`lib/kit.js copyKit`) vers l'adaptateur : la génération MVP vit **côté forge**
  (§ 5) ; le `copyKit` du CLI (bootstrap du kit de la méthode elle-même) **reste inchangé** (non-régression P2).
  Faire consommer l'adaptateur par le CLI = arbitrage différé (§ 9, Q-3).

---

## 3. ÉTAPE 0 (obligatoire) — Vérifier les schémas déployables Claude Code contre la doc

> **RÉSERVE CRITIQUE (issue de P0).** L'inventaire durci § 2.4.1 a des **détails et versions INDICATIFS**. Le
> **squelette** (familles de déployables + split déployable/run-time) est **solide** ; les **détails de schéma**
> (clés de frontmatter, structure exacte de `SKILL.md`, **événements de hooks réellement disponibles**, clés de
> `settings.json`/`permissions`) sont **mouvants**. **Interdiction de câbler un schéma en dur sans l'avoir
> vérifié.**

**Avant** d'écrire le générateur, le développeur-devops **vérifie contre `code.claude.com/docs`** et **note la
source (URL + date)** dans un court addendum (`specs/notes/claude-code-schemas-<date>.md`) :

1. **Subagent** `.claude/agents/*.md` : clés de frontmatter réellement supportées (`name`, `description`, `tools`,
   `model`… ) et lesquelles sont **optionnelles**. → confirmer qu'on peut **omettre `model`** (invariant § 7).
2. **Skill** `.claude/skills/<n>/SKILL.md` : structure du frontmatter (`description`/`when_to_use`,
   `allowed-tools`…) et l'emplacement attendu.
3. **Hooks** (`settings.json`) : **quels événements existent réellement** (`Stop`, `SubagentStop`, `PreToolUse`,
   `UserPromptSubmit`, `PostToolUse`…), la forme des **matchers**, et le format d'entrée `command`.
4. **Settings / permissions** : clés (`permissions.allow/ask/deny`, `hooks`, `env`…) et la syntaxe des **patterns**
   (`Bash(...)`, `Read(.env)`, `Task`, `Edit`…).
5. **`.mcp.json`** : forme minimale d'un serveur (`command`/`transport`/`args`).

**Livrable de l'étape 0** : la note de vérification + une **table « prévu vs confirmé »**. Tout écart entre
l'inventaire § 2.4.1 et la doc réelle est **tranché en faveur de la doc**, et le schéma du générateur est ajusté.
On **s'appuie sur le squelette**, on reste **prudent sur les détails** : au moindre doute sur une clé, la générer
en **minimal viable** (les clés sûres) plutôt qu'exhaustif.

---

## 4. Où vit l'adaptateur / le générateur — décision & justification

| Brique | Emplacement | Pourquoi |
|---|---|---|
| **Adaptateur pur** `team → KitFileTree` | **`@iakaframe/core`** (`src/adapters/claudeCode.ts`) | **Fonction pure, sans I/O** → testable **sans nœud réel** (on inspecte l'arbre en mémoire) ; c'est un **concept du cœur** (§ 3.4 contrat) ; réutilisable plus tard par le CLI/Cockpit. |
| **Écriture disque / déploiement** | **Forge Rust** (`src-tauri/src/kit_deploy.rs`) via **façade unique** | L'I/O fichiers + **pathguard** (anti-traversal) + non-destructif appartiennent au backend de la forge (calque `teams_store` P1). Le GUI déclenche ; le front ne touche pas au FS directement. |
| **Copie des scripts de garde** | Forge (déploiement) | Les hooks `global/hooks/*.mjs` sont **copiés** dans le `.claude/hooks/` cible (réutilisation, pas réécriture). |

**Principe** : **génération = pure (core)**, **déploiement = I/O (forge Rust)**. Cette séparation rend le générateur
**100 % testable hors nœud** et isole le seul point risqué (l'écriture) derrière un pathguard.

> **Type d'échange** : `interface KitFileTree { files: Record<string, string /*contenu*/>; }` — chemins
> **relatifs** au dossier cible (ex. `".claude/agents/aragorn.md"`). Le déploiement écrit ce dictionnaire.

---

## 5. Contrat de l'adaptateur Claude Code (`team → fichiers`)

**Signature (core, pure)** :
```ts
// @iakaframe/core
export interface KitGenOptions { methodInstructions?: string; /* corps CLAUDE.md de la méthode */ }
export function generateClaudeCodeKit(team: Team, opts?: KitGenOptions): KitFileTree;
```

### 5.1 Liste EXACTE des fichiers générés pour un nœud Claude Code (MVP)

| Fichier généré | Source dans le modèle | Contenu (minimal viable — ajusté par l'étape 0) |
|---|---|---|
| `.claude/agents/<personaId>.md` (un par persona) | `team.personas[]` | frontmatter **minimal** : `name` (= `persona.name`), `description` (rôle + mission courte). **`model` OMIS** (invariant § 7). `tools` seulement si dérivable des skills/gardes ; sinon absent. Corps = rappel du rôle + skills attachées. |
| `.claude/skills/<skillId>/SKILL.md` (un par skill référencée) | `persona.skills[]` (dédupliqués) | frontmatter (`description`/`when_to_use`, `allowed-tools` si connu) + corps. **Si le corps de skill n'est pas éditable en MVP** (P1) → générer un **stub** référençant le skill-rôle (id), pas un faux contenu. |
| `CLAUDE.md` | `team` + `opts.methodInstructions` | instructions projet : contexte de la team (rôles présents, coordinateur), + corps de méthode fourni. |
| `.claude/settings.json` | `team.personas[].guardrails[]` (dédupliqués) | **hooks + permissions** générés (§ 6). |
| `.claude/hooks/<script>.mjs` | `global/hooks/*` (copie) | scripts de garde **réutilisés** (identity/perimeter/…), copiés tels quels. |
| `.mcp.json` | `team.connectors[]` | **seulement si** la team déclare ≥ 1 connecteur ; sinon **non généré**. |

### 5.2 Invariants de génération
- **Zéro fuite runner/model** : aucun fichier généré ne contient de `runner` ni de `model` de persona (§ 7). Le
  `model` du frontmatter subagent est **omis** (laissé au run-time Cockpit).
- **Déterminisme** : même team → même arbre (ordre stable, tri des personas par `roleIndex`).
- **Nœud/format via P2** : le choix `NodeKind.claude` → `KitFormat.claude-md` → `CLAUDE.md` (pas `AGENTS.md`) est
  résolu par les helpers P2 (`contractFileForNode`), pas réécrit.

---

## 6. Comment les gardes-fous deviennent hooks + permissions (AR-8)

Le garde-fou est un **concept d'intention** (§ 2.1 contrat) ; l'adaptateur le **traduit** en mécanisme Claude Code.
**Mapping (à confirmer par l'étape 0)** :

| `Guardrail.kind` | Génère dans `settings.json` | Script réutilisé (`.claude/hooks/`) |
|---|---|---|
| `identity` | hook sur **`Stop`** + **`SubagentStop`** (+ **`UserPromptSubmit`** pour le remind) | `identity-guard.mjs` (+ `identity-remind`) |
| `perimeter` | hook **`PreToolUse`**, matcher `Edit\|Write\|Bash\|NotebookEdit` | `perimeter-guard.mjs` |
| `delegation` | hook **`PreToolUse`**, matcher `Task` | `delegation-guard.mjs` |
| `permission` | règles **`permissions.allow/ask/deny`** (patterns) | — |
| `custom` | **[différé]** (déclaré, non généré au MVP) | — |

**Règles impératives** :
- **Le canal d'identité est GÉNÉRÉ, jamais remplacé** : on **câble** `identity-guard.mjs` dans `settings.json` ;
  on ne réécrit pas sa logique, on **copie** le script existant. La position de la pastille
  (ouverture/clôture) reste la règle du script, intacte.
- **Réutilisation** : les scripts proviennent de `global/hooks/` (source versionnée) — copiés dans le `.claude/
  hooks/` cible pour la **portabilité** du kit (le kit déployé est autonome). *(Copier vs référencer un chemin
  global = arbitrage Q-5 ; reco : copier.)*
- **Chemins de hook** : les entrées `command` dans `settings.json` pointent vers les scripts copiés (chemin relatif
  au projet ou `$CLAUDE_PROJECT_DIR`), conformément à ce que confirme l'étape 0.

---

## 7. Invariants à tenir (garde-fous de l'exécution)

1. **Team PURE en entrée** : l'adaptateur reçoit une `Team` **sans** `runner`/`model` (P1/AR-1). Un test vérifie
   qu'**aucune sortie** ne contient ces champs (grep sur l'arbre généré).
2. **Nœud ≠ runner** : la forge choisit le **nœud cible** (`claude`) du déploiement — c'est légitime ; elle ne
   fixe **jamais** le runner/modèle d'exécution d'une persona (ça reste au Cockpit).
3. **Canal d'identité généré, jamais remplacé** (§ 6).
4. **Vocab P2 réutilisé** (`NodeKind`/`KitFormat`/helpers) — pas de reconstruction ad hoc.
5. **Non-régression CLI** : si une partie de la génération touche le CLI, la suite `cli/test/*` reste verte et
   `copyKit`/`init` conservent leur comportement (le MVP P3 vit **côté forge** → risque CLI faible).
6. **Rôles jamais en noms de code** dans la doc/UI ; le `name` de persona (donnée) peut être un nom libre.

---

## 8. Critères d'acceptation (vérifiables)

P3 est **PASS** si **tous** les points sont vérifiés :

- **G-0 — Étape 0 faite** : la note `specs/notes/claude-code-schemas-<date>.md` existe, cite les URLs
  `code.claude.com/docs` (+ date) et contient la table « prévu vs confirmé ». Le schéma du générateur **reflète**
  cette vérification.
- **G-1 — Adaptateur pur** : `generateClaudeCodeKit(team)` existe dans `@iakaframe/core`, **sans aucune I/O**
  (aucun `fs`), retourne un `KitFileTree`.
- **G-2 — Génération depuis la team gabarit** : sur la team gabarit (7 personas), l'arbre contient **un
  `.claude/agents/<personaId>.md` par persona** (7), les **`SKILL.md`** des skills référencées, un **`CLAUDE.md`**,
  un **`.claude/settings.json`**. Contenu **valide** (frontmatter parsable, cohérent avec l'étape 0).
- **G-3 — Gardes → hooks + permissions** : `settings.json` généré câble `identity-guard` sur `Stop`/`SubagentStop`,
  `perimeter-guard` sur `PreToolUse(Edit|Write|Bash|NotebookEdit)`, et (si gardes présentes) les autres ; les
  **scripts** correspondants sont présents dans `.claude/hooks/`.
- **G-4 — `.mcp.json` conditionnel** : généré **si et seulement si** la team déclare ≥ 1 connecteur ; absent
  sinon.
- **G-5 — Aucune fuite runner/model** : `grep -R "runner\|model" <arbre généré>` ne renvoie **aucun** champ de
  persona runner/model (le `model` du frontmatter subagent est **omis**). Test automatisé.
- **G-6 — Déploiement dans un dossier tmp** : la commande de déploiement écrit l'arbre sous un `destDir` de test ;
  l'**arborescence attendue** est présente sur disque ; **non destructif** (un fichier existant hors `--force`
  n'est pas écrasé) ; **pathguard** refuse tout chemin hors `destDir` (test traversal).
- **G-7 — Testable sans nœud réel** : tous les tests de génération tournent **sans Claude Code installé** (pur +
  tmp dir). Aucun test P3 n'exige un runner réel.
- **G-8 — Cohérence avec un vrai `.claude/`** : une **recette manuelle** (documentée) déploie le kit dans un projet
  jouet, ouvre Claude Code, et vérifie que les subagents/skills sont **reconnus** et que le **canal d'identité**
  fonctionne (badge exigé). *(Recette manuelle, hors CI.)*
- **G-9 — Extensibilité** : l'adaptateur Claude Code implémente une **interface d'adaptateur** générique
  (`RunnerAdapter`) réutilisable par les nœuds différés (codex/ollama) — **sans** les implémenter.
- **G-10 — Qualité** : `@iakaframe/core` typecheck + tests verts ; forge Rust `cargo test` (kit_deploy + pathguard)
  vert ; front lint/test verts ; **si** le CLI est touché, `cli/test/*` vert.
- **G-11 — Rôles jamais en noms de code** (doc/UI/logs).

---

## 9. Dépendances, risque & questions d'arbitrage

**Dépendances**
- **P1** (team pure + `@iakaframe/core`) et **P2** (`NodeKind`/`KitFormat`/helpers) livrés.
- **Accès web** `code.claude.com/docs` pour l'étape 0 (obligatoire).
- **Scripts de garde** `global/hooks/*` présents (fait).

**Risque** — modéré : le risque n'est pas la plomberie (isolée en tmp/pathguard) mais la **justesse des schémas
Claude Code** (détails mouvants). L'**étape 0 le neutralise** : on vérifie avant de câbler, on génère **minimal
viable** en cas de doute. Second risque : **fuite d'un `model`/`runner`** dans un frontmatter → **test G-5**
bloquant.

**Questions d'arbitrage (prose — à trancher avant dispatch)**
- **Q-1 — Périmètre P3 vs P3b : un seul nœud confirmé.** Le MVP est **Claude Code seul** (acté). Confirme-t-on que
  `codex`/`ollama-localhost`/`ollama-lan` sont **entièrement P3b** (aucune génération, juste l'interface
  d'adaptateur en place) ? *(Reco : oui — un nœud, proprement, avant d'en ajouter.)*
- **Q-2 — Workflows dans P3 ?** Ma reco : **différer** (aucun workflow généré au MVP). Confirmer, ou veux-tu un
  minimum (ex. l'ordre des phases inscrit dans `CLAUDE.md`) ?
- **Q-3 — Où vit le générateur / le CLI le consomme-t-il ?** Reco : **adaptateur pur dans `@iakaframe/core`**,
  **déploiement dans la forge (Rust)** ; le **`copyKit` du CLI reste inchangé** (le CLI ne consomme pas encore
  l'adaptateur). Migrer le CLI vers l'adaptateur = P3b+ (quand le core est publié). Confirmer.
- **Q-4 — Omission du `model` dans le frontmatter subagent.** Reco : **omettre** (le modèle est run-time/Cockpit ;
  ça **garantit** l'invariant AR-1). Confirmer que Claude Code fonctionne sans `model` explicite (à valider à
  l'étape 0) — sinon, arbitrer un défaut neutre **non** stocké dans la team.
- **Q-5 — Scripts de garde : copier vs référencer.** Reco : **copier** `global/hooks/*` dans le `.claude/hooks/`
  cible (kit autonome/portable). Alternative : référencer les scripts globaux `~/.claude/` (plus DRY, moins
  portable). Confirmer.
- **Q-6 — Dossier cible du déploiement.** Reco : un **projet choisi** par l'utilisateur (le kit s'écrit dans son
  `.claude/` + `CLAUDE.md`), non destructif, `--force` explicite. Confirmer (ou déployer d'abord dans un
  sous-dossier de prévisualisation puis « installer »).

> Tant que ce jalon n'est pas validé, **aucun code**. À la validation : « JALON VALIDÉ » + réponses Q-1→Q-6.

---

## 10. Phasage interne (un seul livrable P3)

| Étape | Contenu | Critères |
|---|---|---|
| **0. Vérif schémas** | note `claude-code-schemas-<date>.md` contre la doc | G-0 |
| **1. Interface + adaptateur pur** | `RunnerAdapter` + `generateClaudeCodeKit` (core, pur) + tests arbre | G-1, G-2, G-5, G-9 |
| **2. Gardes → settings** | mapping guardrails → hooks/permissions + copie scripts | G-3, G-4 |
| **3. Déploiement Rust** | `kit_deploy` (façade, pathguard, non destructif) + tests tmp | G-6, G-7 |
| **4. Recette + qualité** | recette manuelle `.claude/` réel + typecheck/tests | G-8, G-10, G-11 |

---

## 11. Journal de décision

- **2026-07-06** — Cadrage P3 (l'architecte-cadreur) : 1re capacité de **production** de la forge — **adaptateur de
  runner Claude Code** (pur, dans `@iakaframe/core`) `team pure → arborescence .claude/` (agents/*.md sans `model`,
  SKILL.md, CLAUDE.md, settings.json avec **gardes générées** en hooks+permissions réutilisant `global/hooks/`,
  .mcp.json conditionnel) + **déploiement** (forge Rust, pathguard, non destructif). **MVP = un seul nœud
  `claude`** ; codex/ollama + workflows = **P3b/différés**. **Étape 0 obligatoire** : vérifier les schémas
  déployables contre `code.claude.com/docs` avant câblage (réserve P0). Invariants : team pure zéro runner/model,
  canal d'identité **généré jamais remplacé**, vocab P2 réutilisé. Générateur **testable sans nœud réel**.
