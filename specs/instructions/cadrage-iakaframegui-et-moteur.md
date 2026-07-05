# Instruction — Cadrage iakaFrameGUI (la forge) + re-nivelage du moteur CLI partagé

> **Phase** : P1 — Cadrage · **Cadreur** : l'architecte-cadreur · **Exécutant** : le développeur-devops.
> **Statut : CADRÉ — À VALIDER par le décideur** (jalon humain) avant tout code.
> **Date de cadrage** : 2026-07-05. Doc en français ; code et identifiants en anglais.
> **Nature** : ANALYSE + RECOMMANDATION. Ce document **n'arbitre pas** les décisions structurantes
> (keep/refactor/rewrite, tracé de la frontière runner/modèle) — il les **éclaire** ; le décideur tranche.

---

## 0. Sources lues (rien n'est supposé — lecture seule)

- **Vision cible & vocabulaire** : `iakaframe/specs/glossaire-iakaframe.md:8-21` (8 rôles, libellé canonique),
  `iakaframe/specs/instructions/alignement-methode-source.md` (bascule **agent→persona**, **rôle vs persona**,
  agnosticisme « discipline, pas technologie », **kits par solution**, runners hétérogènes — doc chapeau v0.4.0),
  `iakaframe/specs/etat-des-lieux.md:10-11` (méthode v0.6.1 ; doc chapeau **v0.4.0**).
- **Moteur CLI partagé** (`@naonedge/iakaframe`, Node zéro-dépendance) : `iakaframe/cli/src/index.js`
  (roster des commandes), `.../lib/agents.js`, `.../lib/kit.js`, `.../commands/config.js`,
  `.../commands/agents.js`, `.../commands/onboard.js`, `.../commands/go.js`,
  `iakaframe/specs/instructions/cible-ollama-modeles-agents.md` (table modèle↔agent, cibles).
- **Run-time / Cockpit** (état de l'art du modèle Team déjà construit) :
  `IakaCockpit/src/theme/roles.ts` (7 rôles canoniques, **rôle ≠ persona**),
  `IakaCockpit/src/mock/demoTeam.ts` (graine de personas + `SKILL_BY_AGENT`),
  `IakaCockpit/src/hooks/useTeams.ts` (entité `Team`/`Agent`, runner+modèle+skills, coordinateur),
  `IakaCockpit/specs/instructions/L11-teams-agents-definition.md` (cadre actuel « team = objet de 1er rang »).
- **État de l'art technique** (vérifié le 2026-07-05) : partage de cœur entre deux apps Tauri + un CLI Node
  (sidecar Tauri 2, workspace Cargo, package partagé) — cf. § 5.4 (sources en fin de document).

---

## 1. Vision & frontière — la forge et le pilotage (validé par le décideur le 2026-07-05)

### 1.1 Deux produits, deux temps

| | **iakaFrameGUI** (ce projet) | **IakaCockpit** (existant) |
|---|---|---|
| Temps | **BUILD-TIME — la FORGE** | **RUN-TIME — le PILOTAGE** |
| Verbe | configurer, éditer, **assembler**, **packager**, **déployer** | **sélectionner**, **lier**, **piloter**, exécuter |
| Objets manipulés | méthodes, skills, **personas** (dont leur **nommage**), workflows ; assemblage en **teams** ; **kits par solution** ; déploiement vers des **plateformes / nœuds** | une **team déployée** choisie par projet ; **affectation runner+modèle** par persona ; **sessions** |
| Ne possède PAS | le couple **runner+modèle** par persona (fin réglage aval) | l'**authoring** (composition, nommage, skills) — il le **consomme** |

### 1.2 Le pipeline (à graver)

```
  ┌──────────────────────── iakaFrameGUI (FORGE, build-time) ───────────────────────┐
  │  Méthode ─┐                                                                      │
  │  Skills ──┤─►  PERSONAS (nommées ici) ─►  TEAMS (assemblées ici) ─►  KITS        │
  │  Workflows┘                                          │            (par solution) │
  └──────────────────────────────────────────────────────┼─────────────┬───────────┘
                                                          │  DÉPLOIEMENT │
                                                          ▼             ▼
                                         plateformes / NŒUDS D'EXÉCUTION cibles :
                                         claude · codex · ollama-localhost · ollama-lan
                                                          │
  ┌──────────────────────── IakaCockpit (PILOTAGE, run-time) ◄──────────┘───────────┐
  │  SÉLECTIONNE une team déployée  ─►  AFFECTE runner+modèle à chaque persona       │
  │                                  ─►  EXÉCUTE les sessions (terminal-source, chat) │
  └─────────────────────────────────────────────────────────────────────────────────┘
```

**On FABRIQUE / DÉPLOIE dans la forge → on SÉLECTIONNE / LIE / PILOTE dans le cockpit.**

### 1.3 Conséquence directe sur le Cockpit (à noter, pas à exécuter ici)

Le `TeamsEditor` du Cockpit (L11 : `useTeams.ts`, `TeamsEditor.tsx`, `catalog.ts`) **se recentre**. Aujourd'hui
il fait de l'**authoring complet** — création/édition de team, **nommage des personas**, composition du roster,
skills (`useTeams.ts:229-250`, `L11-teams-agents-definition.md:104-118`). Selon la frontière validée, la
**composition/authoring/nommage monte dans la forge** ; le Cockpit **garde la sélection d'une team déployée +
l'affectation runner+modèle**. C'est une **migration de responsabilité**, à cadrer séparément côté Cockpit
(hors périmètre de cette instruction, tracé en § 6.2 / § 7).

---

## 2. Modèle de concepts cible & niveaux — qui possède quoi

### 2.1 Les concepts, correctement nivelés

| Concept | Définition (niveau) | Propriétaire |
|---|---|---|
| **Méthode** | La discipline (phases, gates, identité, cycle d'instruction). N'est PAS une techno. | **Cœur partagé** (source `iakaframe/`) |
| **Rôle** | La **fonction** (portefeuille, coordination, architecture, fabrication, tests, graphisme, doc). Liste canonique **fermée** (7). Réf. `IakaCockpit/src/theme/roles.ts:22-30`. | **Cœur partagé** |
| **Skill** | La **méthode outillée** d'un rôle (id `iakaframe-*`). | **Cœur partagé** (catalogue) · **édité** dans la forge |
| **Persona** | L'**incarnation nommée** d'un rôle : nom + royaume + badge + `roleIndex` + skills. **Le nommage est ici.** | **Forge** (authoring) ; **schéma** partagé |
| **Workflow** | Enchaînement de rôles/gates pour un type de travail (ex. cycle feature). **Concept neuf.** | **Forge** (authoring) |
| **Team** | Un **roster de personas** + coordinateur + casting. Objet de 1er rang. | **Schéma partagé** ; **composée** dans la forge ; **sélectionnée** dans le cockpit |
| **Kit / cible-solution** | Le **paquet** généré pour une solution (`claude`→`CLAUDE.md`, `codex`/`ollama`→`AGENTS.md`, + `openwebui`/`anythingllm`). Format de packaging + contrat. | **Forge** (génère) ; **format** partagé |
| **Plateforme / nœud d'exécution** | La **destination** d'un déploiement : `claude`, `codex`, `ollama-localhost`, `ollama-lan`. **Concept à modéliser** (localhost vs lan aujourd'hui indistincts). | **Forge** (déploie) |
| **Garde-fou** | Contrainte **exécutée** attachée à une team/persona (identité, périmètre, délégation, permissions). Concept **universel** ; mécanisme **spécifique-runner** (sur Claude Code = **hooks** `settings.json` + `permissions`). Concept de **1re classe** (cf. AR-8). | **Cœur partagé** (intention) ; **généré par nœud** dans la forge |
| **Connecteur (MCP)** | Source d'**outils/ressources externes** attachable à une team (serveurs MCP : stdio/http/sse/ws). | **Cœur partagé** (déclaration) ; **généré** dans la forge |
| **Runner** | Le **harnais d'exécution** d'un persona à l'exécution (`claude-code`, `codex`, `ollama`, `litellm`…). | **Cockpit** (run-time) |
| **Modèle** | Le **modèle LLM** affecté à un persona à l'exécution. | **Cockpit** (run-time) |
| **Nommage des personas** | Choisir/éditer les noms (aujourd'hui figés en dur). **Concept de 1re classe.** | **Forge** |

> **Garde-fou = concept de 1re classe (à graver).** Le **canal d'identité** (identity-guard), la **garde de
> délégation** et la **garde de périmètre** de la méthode **SONT** des hooks `settings.json`. Un « déploiement de
> team » doit donc **GÉNÉRER les gardes adaptées au nœud** cible — ce n'est pas un détail d'implémentation mais un
> concept que le cœur porte (l'**intention** de garde) et que l'**adaptateur de runner** traduit (le **mécanisme**).

### 2.2 Ligne de partage runner/modèle — le point de tension à trancher

La frontière validée dit : **la forge ne possède PAS le couple runner+modèle par persona** (§ 1.1). Or le Cockpit,
en L11, a **inscrit runner+modèle+skills DANS la définition d'agent de la team** (`useTeams.ts:59-86` :
`interface Agent { … runner; model; skills }`, `L11-teams-agents-definition.md:50-54`). **Ces deux affirmations se
recouvrent partiellement.** Deux lectures possibles — **à arbitrer (§ 7, AR-1)** :

- **Lecture A — team « pure définition »** : la **team forgée** ne porte que persona + rôle + skills + composition
  (aucun runner/modèle). Le couple runner+modèle est une **surcouche de liaison run-time** posée par le Cockpit
  (table `persona → runner+modèle`). ⇒ conforme à la frontière ; impose de **sortir `runner`/`model` du schéma
  `Agent`** L11 (vers une couche cockpit).
- **Lecture B — team « avec défauts »** : la team forgée porte un **runner/modèle par défaut** (suggestion), que
  le Cockpit **peut surcharger** au run-time. ⇒ pragmatique (réutilise L11 tel quel), mais brouille la frontière.

**Reco (à valider)** : **Lecture A** pour la pureté de la frontière, avec une **table de suggestion**
modèle↔rôle (déjà esquissée : `cible-ollama-modeles-agents.md:25-34`) fournie par la forge comme **aide**, non
comme propriété de la team. Décision = décideur.

### 2.3 Ce que possède le cœur partagé (moteur commun forge+cockpit)

Le **schéma de données** (Team, Persona, Rôle, Skill, **Garde-fou**, **Connecteur**, Kit-cible, Nœud) + le
**vocabulaire canonique** (glossaire) + la **plomberie de méthode** (Forgejo, structure, état des lieux, jalons,
ASCII). C'est le contrat que les **deux** apps doivent respecter à l'identique — aujourd'hui **il n'existe pas en un
seul endroit** : il est **dupliqué et divergent** entre le CLI (`lib/agents.js`) et le Cockpit (`roles.ts`,
`useTeams.ts`) — cf. § 3.

**Contrainte de design gravée dès maintenant (cf. AR-9) : le cœur est AGNOSTIQUE DE MÉTHODE.** Il doit pouvoir
représenter des personas / phases / workflows / gardes **étrangers** à iakaframe (voir § 2.5, l'axe « adaptateur de
méthode »). On **ne hard-wire PAS** « iakaframe-only » dans le schéma. On ne code pas cet import au MVP, mais on ne
se ferme pas la porte : le cœur modélise « une méthode » (un jeu de rôles/phases/workflows/gardes), iakaframe n'en
étant qu'une **instance**.

### 2.4 Les deux AXES d'adaptation — le nord de l'architecture

Entre le **cœur de concepts** (abstrait, agnostique) et le **monde réel** (un nœud concret, une méthode concrète),
la forge s'appuie sur **deux familles d'adaptateurs**. C'est la boussole de l'archi.

- **Adaptateur de RUNNER** : traduit le cœur de concepts → **surface concrète d'un nœud d'exécution**. C'est
  précisément **le cœur de la « génération de kits »** (P3). Premier adaptateur de référence : **Claude Code**
  (§ 2.4.1) ; puis **Codex** (`AGENTS.md`), **Ollama + outil agentique**, **Open WebUI (Models)**. Chaque
  adaptateur sait, pour son nœud : quels **fichiers déployables** écrire, et quelles **gardes** générer.
- **Adaptateur de MÉTHODE** *(north-star, backlog — PAS le MVP)* : importer d'**autres méthodes** (BMAD, MetaGPT,
  SPARC…), les manipuler dans la GUI, les déployer. Valeur stratégique validée par le décideur. La **seule** chose
  à faire **maintenant** est la **contrainte de design** ci-dessus (cœur agnostique de méthode) — **aucun code**.

#### 2.4.1 Inventaire DURCI de la cible Claude Code (1er adaptateur de runner de référence)

> Obtenu de l'expert Claude Code. À intégrer au modèle comme **la référence de ce qu'une forge génère/déploie pour
> un nœud Claude Code**. **RÉSERVE (à ne pas figer en dur)** : les **compteurs et versions précis** (nombre exact
> d'événements de hooks, `v2.1.x`, listes de clés exhaustives) sont **INDICATIFS** → **à vérifier contre
> `code.claude.com/docs` avant tout câblage dur**. Ce qui est **solide**, c'est le **squelette** : les familles de
> déployables + le **split déployable / run-time**.

**DÉPLOYABLES (fichiers écrits sur disque → générés/poussés par la FORGE) :**

| Famille | Emplacement | Contenu clé |
|---|---|---|
| **Subagents** | `.claude/agents/*.md` | frontmatter : `name`, `description`, `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `effort`, `isolation`, `color`. |
| **Skills** | `.claude/skills/<n>/SKILL.md` | `description`/`when_to_use`, `allowed-tools`, `context: fork+agent`, `paths`, `hooks`, corps + assets. |
| **Hooks** | `settings.json` | événements nombreux (`SessionStart/End`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStart/Stop`, `TaskCreated/Completed`, `PreCompact`, `Notification`…), matchers + `if`, types `command\|http\|mcp_tool\|prompt\|agent`. |
| **Settings** | `settings.json` / `settings.local.json` | **5 niveaux** Managed > Local > Project > User > CLI ; clés : `permissions`, `env`, `model`, `hooks`, `plugins`, MCP allow/deny… |
| **Permissions** | (dans settings) | règles `allow`/`ask`/`deny`, patterns (`Bash(...)`, `Read(.env)`, `mcp__srv__*`, `Agent(...)`), modes. |
| **Instructions** | `CLAUDE.md` (managed/user/project/local/nested) + `.claude/rules/*` (path-scopé) | + imports `@`. |
| **Connecteurs (MCP)** | `.mcp.json` | `stdio`/`http`/`sse`/`ws` ; tools + resources + prompts ; auth. |
| **Plugins** | bundle + `plugin.json` + marketplace | bundle de skills + agents + hooks + MCP + LSP + monitors. |
| **Périphériques** | — | output-styles, statusline, keybindings. |

**RUN-TIME (jamais des fichiers → CÔTÉ COCKPIT, hors forge) :** mode de permission **actif**, **modèle/runner
actif**, `effort`, invocation, **exécution** des hooks, délégation.

**Lecture pour le modèle iakaframe.** Ce split **confirme la frontière** : tout ce qui est **fichier déployable**
relève de la **forge** (via l'adaptateur runner) ; tout ce qui est **actif à l'exécution** (modèle/runner actif,
mode permission courant) relève du **Cockpit**. Les **gardes-fous** de la méthode (identité/périmètre/délégation)
tombent naturellement dans « hooks + permissions » **déployables** — d'où leur promotion en concept de 1re classe
(§ 2.1). Le **connecteur MCP** est un déployable de 1re classe attaché à la team.

---

## 3. Audit du moteur CLI actuel — concepts, niveaux, défauts (cité chemin:ligne)

### 3.1 Cartographie des concepts que le CLI manipule aujourd'hui

| Concept | Présent ? | Où | Niveau réel / défaut |
|---|---|---|---|
| Méthode | oui (implicite) | `lib/kit.js:47-64` (`copyKit`), kits `kit-claude/…` | **Non modélisée** : la méthode est **figée dans des kits copiés verbatim**, pas un objet manipulable/assemblable. |
| Rôle vs persona | **non** | `lib/agents.js:7-16` (`SKILL_OF`), `agents/*.md` | **Conflation totale** : le code-nom (odin, aragorn…) **=** rôle **=** nom de fichier **=** persona. Aucun `roleIndex`, aucune fonction séparée du nom. **En retard sur le Cockpit** (`roles.ts`). |
| Persona (nommage) | **non** | `lib/agents.js:7-16` | Noms **codés en dur** dans une map. **Pas éditables, pas données.** Le « nommage » — concept de 1re classe de la forge — **n'existe pas**. |
| Skill | oui | `lib/agents.js:7-16,50-53` | Correct-ish : `SKILL_OF` mappe code-nom→skill, copie du dossier `skills/<skill>`. Mais **couplé en dur** au code-nom. |
| Workflow | **non** | — | **Absent** du CLI. |
| Team | **quasi-non** | `lib/agents.js:79-84` (`fullteam`), `commands/agents.js:34-38` | « team » = **« copier TOUS les agents dans `.claude/agents` »**. **Pas d'entité team**, pas de roster nommé, pas de composition, pas de coordinateur. **Très en retard** sur `useTeams.ts` (entité riche). |
| Kit / cible | oui | `lib/kit.js:24-29` (`kitName`, `contractFile`), `commands/onboard.js:14` | **Conflation** : `target` mélange (a) le **format de contrat** (`CLAUDE.md` vs `AGENTS.md`) et (b) la **plateforme d'exécution**. Trois cibles en dur `claude|codex|ollama` ; `openwebui`/`anythingllm` (cités dans la méthode) **absents du code**. |
| Nœud d'exécution | **non** | `commands/config.js:10`, `commands/onboard.js:14` | `ollama` est **une** cible indistincte. **`ollama-localhost` vs `ollama-lan` non modélisés** — pourtant explicitement demandés. `lib/... services` sonde des hosts mais aucun **nœud** n'est un objet. |
| Runner | oui (daté) | `commands/config.js:9` (`RUNNERS=['ps','codex','iakaide','aider']`), `commands/go.js:68-90` | **Vocabulaire daté et divergent** : `ps` (= claude déguisé), **`iakaide`** (l'IDE **anti-modèle**), `aider`. **Ne matche PAS** le vocabulaire Cockpit `claude-code\|ollama\|litellm\|codex` (`useTeams.ts:34`). Deux moteurs, deux runner-sets incompatibles. |
| Modèle | à moitié | `commands/config.js:30,68` (`aiderModel`), instruction `cible-ollama-…:25-34` | Présent **seulement** via `aiderModel` (couplé au runner aider). **Mal nivelé** : le modèle est un concept **run-time** (Cockpit) ; le CLI en porte un bout, en table figée hors code. |

### 3.2 Défauts structurants (synthèse)

1. **Le vocabulaire est pré-v0.4.0** : le CLI dit **« agent »** partout (`agents.js`, `commands/agents.js`), jamais
   **« persona »** ; il **conflate rôle et persona** (`SKILL_OF`), là où le Cockpit a déjà tranché rôle≠persona
   (`roles.ts:5-9`, `demoTeam.ts:6-7`). **Le laggard, c'est le moteur « partagé »**, pas les apps.
2. **Le « cœur partagé » n'est pas partagé** : le schéma de team/persona/rôle est **dupliqué et divergent** entre
   `cli/src/lib/agents.js` (plat, en dur) et `IakaCockpit/src/hooks/useTeams.ts` (riche, typé). Aucune source
   unique. Toute évolution doit être écrite **deux fois**, avec **deux vocabulaires runner** incompatibles.
3. **Concepts manquants** : **team-entité**, **workflow**, **nœud d'exécution** (localhost/lan), **nommage de
   persona comme donnée**, **génération de kit** (les kits sont **écrits à la main** puis copiés, pas **générés**
   depuis une team composée — `copyKit` est un `cp -r`, `lib/kit.js:47-64`).
4. **Conflation cible/format/plateforme** : `target` porte trois sens (`kitName`, `contractFile`, plateforme) —
   `lib/kit.js:24-29`.
5. **Runner daté** : `iakaide` (anti-modèle acté), `ps` (nom trompeur pour claude) — `config.js:9`.

### 3.3 Ce qui est SAIN et doit être préservé (ne pas jeter)

La **plomberie de méthode** est solide, testée, zéro-dépendance, cross-OS, publiée sur le registre npm Forgejo :
- `onboard`/`init` (structure + Forgejo + 1er commit + push) — `commands/onboard.js`, non destructif, auto-détection
  init↔update (`onboard.js:39-46`).
- `snapshot`/`update` (état des lieux MD/HTML + commit + push).
- `banner`/`jalon`/`brief`/`recap` (ASCII FIGlet embarqué, cadre de jalon) — `index.js:43-49`.
- `services` (sonde git/Ollama/ComfyUI). `lib/forgejo.js`, `lib/git.js`, `lib/root.js` (chapeau cross-OS).
- Suite de tests présente (`cli/test/*.test.js`).

**Cette couche est le vrai actif réutilisable.** Le problème n'est pas la plomberie ; c'est la **couche haute de
concepts** (agents/team/kit/runner) qui est datée et divergente.

---

## 4. Recommandation — GARDER / REFACTORER / REFAIRE (argumentée, décision au décideur)

### 4.1 Les trois options, pour/contre

| Option | Pour | Contre |
|---|---|---|
| **GARDER tel quel** | Zéro effort ; plomberie prouvée. | Fige la divergence CLI↔Cockpit ; « agent » pré-v0.4.0 ; team/workflow/nœud absents ; nommage impossible. **Bloque la forge.** |
| **REFAIRE (rewrite complet)** | Table rase, modèle propre d'emblée. | **Jette la plomberie testée** (Forgejo/état/jalons/ASCII) ; risque élevé ; casse le CLI utilisé au terminal ; contraire à « réutiliser l'existant / MVP ». |
| **REFACTORER par strates** *(reco)* | Préserve la plomberie ; aligne le vocabulaire ; **extrait un cœur partagé unique** ; ajoute les concepts manquants **sans big-bang**. | Effort intermédiaire ; exige un phasage discipliné pour ne pas tout ouvrir d'un coup. |

### 4.2 Recommandation (à valider — non tranchée)

**Voie recommandée : REFACTORER en strates, en NE refaisant que la couche haute de concepts, la forge réutilisant
le Cockpit comme source du modèle déjà mûr — pas le CLI.** Concrètement, un triptyque :

1. **GARDER** la plomberie de méthode du CLI (§ 3.3) telle quelle — elle est le socle des deux apps.
2. **REFACTORER** la couche concepts du CLI pour l'aligner sur v0.4.0 : `agent→persona`, unifier le vocabulaire
   **runner** avec le Cockpit, séparer `cible` en **format-de-contrat** + **plateforme/nœud**, introduire
   `ollama-localhost`/`ollama-lan`. Passe **compatibilité-préservante** (les commandes existantes continuent).
3. **CONSTRUIRE-NEUF** (dans la **forge**, pas dans le CLI) l'**authoring** : composition de team, **nommage de
   persona**, workflows, **génération de kit** depuis une team — en **réutilisant le modèle Cockpit** (`roles.ts`,
   `useTeams.ts`, `catalog.ts`) comme graine du **cœur partagé**, plutôt que de ré-inventer.

> Nuance importante : le naïf « le CLI est le moteur, la forge le consomme » est **partiellement faux**. Le
> **modèle de concepts le plus mûr vit dans le Cockpit** (rôle≠persona, entité Team). La bonne cible n'est donc
> pas « bâtir la forge sur le CLI » mais « **extraire un cœur partagé** dont le CLI et les deux apps deviennent
> consommateurs », en promouvant le modèle Cockpit au rang de contrat commun.

### 4.3 Architecture de partage — état de l'art (vérifié le 2026-07-05)

Trois patrons possibles pour partager le cœur entre **deux apps Tauri (React+Rust)** + **un CLI Node** :

- **(a) CLI Node = moteur, invoqué en sidecar Tauri.** Tauri 2 supporte l'embarquement de binaires externes
  (`externalBin`) et documente **Node.js en sidecar** via un binaire auto-contenu (`pkg`). Pour : un seul moteur,
  déjà écrit/testé/publié. Contre : IPC + deux langages ; le sidecar reste « boîte noire » pour le front.
- **(b) Crate Rust partagée** (workspace Cargo) consommée par les deux backends Tauri ; CLI réécrit en Rust.
  Pour : idéal côté Rust, `Cargo.lock` commun. Contre : **réécrit le CLI Node** (perte de la plomberie JS testée
  + du canal npm) — s'apparente à un rewrite.
- **(c) Package TS « cœur de concepts » partagé** (schéma Team/Persona/Rôle/Kit + logique pure) consommé par les
  **deux fronts React** ET le **CLI Node** ; le Rust reste mince (I/O par app). Pour : les deux fronts et le CLI
  sont déjà en **JS/TS** → partage naturel, colle à « réutiliser l'existant » ; extrait précisément la couche qui
  diverge aujourd'hui. Contre : ne partage pas la logique **Rust** (mais elle est mince et propre à chaque app).

**Reco (à valider, AR-3)** : **(c) pour le cœur de concepts** (le schéma qui diverge) **+ (a) pour la plomberie**
(la forge invoque le CLI existant en sidecar pour onboard/init/snapshot/jalon). On évite le rewrite Rust (b) au
stade MVP. Sources en fin de document.

### 4.4 Phasage MVP (ne rien casser d'un coup)

| Phase | Contenu | Touche |
|---|---|---|
| **P0 — Contrat** *(doc, zéro code)* | Figer le **modèle de concepts** (§ 2) + étendre le **glossaire** (persona/team/kit/plateforme/nœud/runner/modèle et leurs niveaux). Trancher les AR § 7. | `iakaframe/specs/` |
| **P1 — Coquille forge (MVP)** | Monter le shell **Tauri (React+Rust)** d'iakaFrameGUI ; **consommer le CLI existant TEL QUEL** (sidecar ou spawn) pour `onboard/init/snapshot/jalon` ; **1er écran d'authoring** : personas (**nommage**) + composition de team, en **réutilisant le schéma Cockpit** (`roles.ts`/`useTeams.ts` promus en cœur partagé). Déploiement = appeler l'existant (`iakaframe init --target …`, `agents fullteam`). | `iakaFrameGUI/`, **CLI non modifié** |
| **P2 — Cœur partagé + refactor vocabulaire CLI** | Extraire le **package cœur** (schéma + rôle/persona/team/kit) consommé par la forge, le Cockpit et le CLI ; passe **`agent→persona`** + unification **runner** + `cible→(format, plateforme/nœud)` + `ollama-localhost/lan` dans le CLI, **en préservant les commandes**. | CLI + cœur partagé + Cockpit (adoption) |
| **P3 — Adaptateur runner + génération de kit + déploiement multi-nœuds** | Formaliser l'**adaptateur de RUNNER** (§ 2.4) — **Claude Code en premier**, avec l'inventaire durci § 2.4.1 comme surface de référence, y compris la **génération des gardes** (hooks/permissions) et des **connecteurs** (MCP). **Générer** les kits **depuis une team composée** (au lieu de kits écrits à la main) ; déployer vers **nœuds** (`git`/`ssh` LAN, `ollama pull`, `.claude/` local). Workflows. Puis d'autres adaptateurs (Codex/Ollama/Open WebUI). | forge + CLI |
| **P∞ — Adaptateur de MÉTHODE** *(north-star, post-MVP, backlog)* | Importer/manipuler/déployer d'autres méthodes (BMAD, MetaGPT, SPARC…). **Rien à coder avant** — seule la **contrainte d'agnosticisme** (§ 2.3, AR-9) est honorée dès le cœur (P0/P2). | — |

Chaque phase est un livrable autonome derrière son propre gate. **Aucun big-bang.** L'**adaptateur runner Claude
Code** est la **base de la génération de kits** (P3) ; l'**adaptateur de méthode** reste **post-MVP** — on n'en paie
au MVP que la **contrainte de design** (cœur agnostique de méthode), jamais du code.

---

## 5. Périmètre du MVP iakaFrameGUI — IN / OUT

### 5.1 DANS le MVP (P1)

- Coquille **Tauri (React + Rust)**, stack **identique au Cockpit** (React 18/TS/Vite + Tauri 2/Rust ; SQLite non
  sensible ; secrets keychain ; **CSP stricte jamais null** ; façade unique d'`invoke`). Stack propre, **ports
  hôte distincts** du Cockpit, **stack Docker préfixée `iakaframegui-*`** si besoin (convention isolation).
- **Authoring de personas** : lister/créer/éditer une persona = **nommage** + rôle (parmi les 7 canoniques) +
  royaume + `roleIndex` + skills. **Réutilise `roles.ts`/`demoTeam.ts` du Cockpit** comme graine.
- **Composition de team** : roster de personas + coordinateur + casting (réutilise le modèle `useTeams.ts`).
- **Déploiement basique** : générer/poser le kit d'une cible via le **CLI existant** invoqué (sidecar), vers une
  destination locale (`.claude/` d'un projet) — **sans** ré-implémenter la plomberie.
- Marqueur méthode + Forgejo via le CLI (onboard/init) **inchangé**.

### 5.2 HORS MVP (différé, tracé)

- **Refactor du CLI** (vocabulaire, runner, nœud) → **P2**, cadré séparément.
- **Adaptateur de RUNNER** (Claude Code d'abord, inventaire durci § 2.4.1) + **génération de kit depuis team** +
  **déploiement multi-nœuds** (ssh LAN, ollama pull) → **P3**.
- **Adaptateur de MÉTHODE** (import BMAD/MetaGPT/SPARC…) → **post-MVP (P∞)** ; seule l'**agnosticisme de méthode**
  du cœur est honoré dès P0/P2 (contrainte de design, pas de code).
- **Workflows** (éditeur d'enchaînement rôles/gates) → P3.
- **Migration du `TeamsEditor` du Cockpit** (recentrage authoring→forge) → **instruction Cockpit dédiée** (§ 6.2).
- **Couple runner+modèle** dans la forge : **exclu** (frontière) — reste au Cockpit. La forge peut, au plus,
  **suggérer** une table modèle↔rôle (aide, non propriété).
- Cibles `openwebui`/`anythingllm` : hors MVP forge (kits existent côté méthode, pas prioritaires).

---

## 6. Impacts hors périmètre (à cadrer ailleurs — signalés, pas traités ici)

### 6.1 Cœur partagé
La création du package **cœur partagé** (P2) touche **trois dépôts** (CLI, forge, Cockpit). Elle mérite sa **propre
instruction** avec plan de migration non destructif (le Cockpit doit continuer à tourner pendant l'adoption).

### 6.2 Recentrage du Cockpit
Le retrait de l'authoring/nommage du `TeamsEditor` (L11) vers la forge est une **instruction côté IakaCockpit**,
à écrire quand la forge sait produire/déployer une team. D'ici là, **le Cockpit reste tel quel** (aucune
régression). Tension à résoudre : **L11 met runner+modèle dans la team** (`useTeams.ts:59-86`) alors que la
frontière les veut run-time — cf. AR-1.

---

## 7. Arbitrages — TRANCHÉS par le décideur au jalon (2026-07-05)

> **JALON VALIDÉ.** Les 9 arbitrages sont **tranchés** ci-dessous et gravés. La prose détaillée qui suit
> (§ 7.1) est conservée comme trace du raisonnement ; **la décision prime**.

| # | Décision actée |
|---|---|
| **AR-1** | Team forgée **PURE** (persona + rôle + skills). **runner + modèle = run-time, CÔTÉ COCKPIT** — jamais dans la team forgée. |
| **AR-2** | **REFACTOR en strates** du CLI : garder la plomberie testée, réaligner le vocabulaire (agent→persona, runner unifié, cible→format+nœud). |
| **AR-3** | **Package TS** (cœur de concepts) **+ CLI en sidecar Tauri**. **Pas de rewrite Rust** au MVP. |
| **AR-4** | Nœuds **`ollama-localhost`** et **`ollama-lan`** de **1er rang**, aux côtés de `claude` et `codex`. |
| **AR-5** | **Nommage de persona LIBRE**, avec le **roster canonique comme gabarit de départ**. |
| **AR-6** | **MVP resserré** : éditer/assembler personas + teams, **déployer sur UN nœud (Claude Code)**. Multi-nœuds / workflows / import de méthode = **DIFFÉRÉS**. |
| **AR-7** | **Tauri (React + Rust)** + isolation Docker/ports **`iakaframegui-*`** (convention méthode). |
| **AR-8** | **Garde-fou & Connecteur (MCP) = concepts de 1re classe** du cœur. |
| **AR-9** | **Agnosticisme de méthode gravé dès le cœur** (modélisation seule, **zéro code d'import** au MVP). |

> **Livrables P0 déclenchés** : `specs/PROJET.md` (version validée), `specs/contrat-concepts.md` (modèle formel),
> `specs/glossaire-concepts.md` (glossaire étendu). P1 (coquille forge + authoring) sera confié au développeur-devops.

### 7.1 Prose de raisonnement (trace — la décision ci-dessus prime)

**AR-1 — Où vit le couple runner+modèle ?** C'est LA question de frontière. La vision dit « la forge n'a pas le
couple runner/modèle par persona ». Le Cockpit, lui, l'a déjà **gravé dans la définition d'agent de la team** (L11,
`useTeams.ts:59-86`). Il faut choisir : soit la team forgée devient **pure** (persona+rôle+skills, sans
runner/modèle — le Cockpit pose la liaison run-time par-dessus ; ma reco), soit la team porte un **runner/modèle
par défaut suggéré** que le Cockpit surcharge (réutilise L11 mais brouille la frontière). Ce choix décide s'il faut
**retirer `runner`/`model` du schéma `Agent`** L11 — donc l'ampleur du recentrage Cockpit.

**AR-2 — Verdict CLI : keep / refactor / rewrite ?** Ma recommandation est **refactorer en strates** (garder la
plomberie, aligner le vocabulaire, construire l'authoring neuf dans la forge en réutilisant le modèle Cockpit). Je
ne tranche pas : si tu veux un modèle 100 % propre d'emblée quitte à réécrire, ou au contraire figer le CLI et tout
faire dans la forge, c'est ton appel. Le risque du rewrite : perdre une plomberie Forgejo/état-des-lieux/jalons
**testée et publiée**.

**AR-3 — Architecture de partage : sidecar Node, crate Rust, ou package TS partagé ?** Ma reco : **package TS pour
le cœur de concepts** (la couche qui diverge, naturellement partageable entre les deux fronts React et le CLI Node)
**+ CLI en sidecar** pour la plomberie. Alternative « tout Rust » (crate partagée) = plus pur côté backend mais
**réécrit le CLI** et perd le canal npm/terminal. À trancher selon ton appétit pour du Rust partagé.

**AR-4 — Modélisation des nœuds d'exécution.** On confirme que `ollama-localhost` et `ollama-lan` deviennent des
**nœuds distincts** de premier rang (et pas un simple champ host libre) ? Idem : `claude`/`codex` sont-ils des
**nœuds** (destinations de déploiement) distincts des **runners** homonymes du Cockpit ? (Reco : oui, séparer
explicitement « nœud/plateforme de déploiement » de « runner d'exécution ».)

**AR-5 — Nommage des personas : liberté totale ou dérivé des 7 rôles ?** La forge possède le nommage. Autorise-t-on
des personas **hors des 8 noms de code** actuels (nommage libre par le décideur), ou reste-t-on sur le roster
canonique + les castings iakagraph existants (`catalog.ts`) ? (Reco : nommage libre, avec le roster canonique comme
défaut.)

**AR-6 — Périmètre du MVP forge (P1).** On confirme que le MVP = **coquille + authoring persona/team + déploiement
via CLI existant**, en laissant refactor CLI (P2) et génération de kit / multi-nœuds (P3) pour plus tard ? (Reco :
oui, MVP.)

**AR-7 — Stack et isolation.** On confirme **Tauri (React+Rust)** calqué sur le Cockpit (mêmes gardes : façade
unique, CSP stricte, keychain), avec **ports et stack Docker propres** (`iakaframegui-*`, pas de collision avec le
Cockpit) ?

**AR-8 — Garde-fou et Connecteur (MCP) comme concepts de 1re classe du cœur.** Les gardes de la méthode
(identité/périmètre/délégation) sont techniquement des **hooks `settings.json`** ; le MCP est un `.mcp.json`. Je les
**hisse au 1er rang** du cœur partagé (§ 2.1) : le cœur porte l'**intention** (garde X, connecteur Y attaché à la
team), l'**adaptateur de runner** génère le **mécanisme** propre au nœud. On confirme ce niveau (plutôt que de les
laisser en détail d'implémentation par kit) ? (Reco : oui — sinon le canal d'identité n'est pas déployable de façon
portable.)

**AR-9 — Agnosticisme de méthode gravé dès le cœur (north-star adaptateur de méthode).** Valeur stratégique validée :
pouvoir un jour **importer d'autres méthodes** (BMAD, MetaGPT, SPARC…). La conséquence **immédiate** n'est pas du
code mais une **contrainte de design** : le schéma du cœur représente « une méthode » (jeu de rôles/phases/
workflows/gardes) dont iakaframe est **une instance**, sans hard-wirer « iakaframe-only ». On confirme qu'on paie
cette contrainte **dès P0/P2** (léger surcoût de modélisation), l'import réel restant **post-MVP** ? (Reco : oui —
c'est peu cher à l'amont, très cher à rétrofitter.)

---

## 8. Critères d'acceptation du CADRAGE (ce que valide le jalon)

Ce cadrage est **PASS** quand le décideur a :
1. **validé la frontière** forge/cockpit et le pipeline (§ 1) ;
2. **validé (ou amendé) le modèle de concepts & niveaux** (§ 2), **AR-1** en particulier (runner/modèle) ;
3. **choisi le verdict CLI** (§ 4, AR-2) et **l'architecture de partage** (AR-3) ;
4. **tranché** AR-4→AR-9 (dont **AR-8** garde-fou/connecteur au 1er rang et **AR-9** agnosticisme de méthode) ;
5. **validé les deux axes d'adaptateurs** (§ 2.4) : runner (Claude Code d'abord, inventaire durci § 2.4.1) en P3,
   méthode en post-MVP ;
6. autorisé l'écriture des **instructions d'exécution** P0 (contrat/glossaire) puis P1 (coquille forge).

> Tant que ce jalon n'est pas validé, **aucun code** n'est écrit (ni forge, ni CLI). Le brouillon `specs/PROJET.md`
> (marqué « à valider ») ne fait pas foi : **cette instruction fait foi**.

---

## 9. Journal de décision

- **2026-07-05** — Le décideur grave la **frontière** : iakaFrameGUI = forge (build-time, authoring/packaging/
  déploiement, **nommage des personas**) ; IakaCockpit = pilotage (run-time, **runner+modèle**, sessions).
- **2026-07-05** — L'architecte-cadreur audite le moteur CLI partagé (lecture seule) : plomberie saine à garder,
  couche concepts datée/divergente (agent≠persona non fait, pas de team-entité, runner daté `iakaide`/`ps`, nœuds
  et workflow absents, kits copiés non générés) ; découvre que **le modèle mûr vit dans le Cockpit**, pas dans le
  CLI. Reco : **refactor en strates + cœur partagé extrait du modèle Cockpit**, MVP forge sur CLI existant.
  Décisions structurantes laissées au décideur (AR-1→AR-7).
- **2026-07-05** — Enrichissement (inventaire durci Claude Code obtenu de l'expert + deux axes stratégiques) :
  **Garde-fou** et **Connecteur (MCP)** hissés en concepts de 1re classe du cœur (§ 2.1) ; ajout des **deux axes
  d'adaptateurs** (runner / méthode, § 2.4) avec **Claude Code** comme 1er adaptateur runner de référence
  (déployables vs run-time, § 2.4.1 — **chiffres/versions INDICATIFS, à vérifier contre `code.claude.com/docs`
  avant câblage dur**) ; **agnosticisme de méthode** gravé comme contrainte de design du cœur (§ 2.3 ; north-star
  « importer BMAD/MetaGPT/SPARC »). Phasage ajusté (adaptateur runner Claude Code = base de la génération de kits en
  P3 ; adaptateur méthode = P∞ post-MVP). Nouveaux arbitrages **AR-8** (garde-fou/connecteur 1er rang) et **AR-9**
  (agnosticisme de méthode dès le cœur).
- **2026-07-05** — **JALON VALIDÉ** par le décideur : AR-1→AR-9 **tranchés** (§ 7). Descente en **P0**, livrables :
  `specs/PROJET.md` (version validée), `specs/contrat-concepts.md` (modèle formel : niveaux + split déployable/
  run-time + inventaire durci Claude Code avec réserve), `specs/glossaire-concepts.md` (glossaire étendu, articulé
  au glossaire des rôles sans le dupliquer). **P1** (coquille forge + authoring) confié au développeur-devops.
