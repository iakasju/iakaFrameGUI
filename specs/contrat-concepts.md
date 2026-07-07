# Contrat de concepts — le cœur partagé iakaframe (forge · cockpit · CLI)

> **Livrable P0 — fondation.** Modèle de concepts **formel** du cœur partagé, source unique de vérité du
> vocabulaire et des schémas que la **forge** (iakaFrameGUI), le **cockpit** (IakaCockpit) et le **CLI**
> (`@naonedge/iakaframe`) doivent respecter à l'identique.
> **Statut : VALIDÉ** (jalon du 2026-07-05, AR-1→AR-9 tranchés).
> Réf. : `specs/instructions/cadrage-iakaframegui-et-moteur.md` (§ 2, § 7), doc chapeau **v0.4.0**,
> glossaire des rôles `iakaframe/specs/glossaire-iakaframe.md`. Libellés : `specs/glossaire-concepts.md`.
> Doc en français ; identifiants en anglais ; **rôles jamais désignés par un nom de code**.

---

## 0. Principes directeurs (ce que ce contrat garantit)

1. **Trois niveaux, une frontière nette.** Chaque concept vit à **un** niveau : **cœur partagé** (contrat commun),
   **forge** (build-time : authoring/packaging/déploiement) ou **cockpit** (run-time : liaison/exécution).
2. **Split déployable / run-time.** Ce qui est un **fichier écrit sur disque** relève de la **forge** (via un
   adaptateur de runner) ; ce qui est **actif à l'exécution** relève du **cockpit**. Cette ligne est la même que
   celle observée sur Claude Code (§ 6.1) — elle **valide** la frontière produit.
3. **Team forgée PURE + Binding (AR-1 révisé, 2026-07-07 — cf. `specs/instructions/E1-evolution-binding-ar1.md`).**
   La **Team** (définition) reste **PURE** : personas + rôles + skills + gardes + workflow + connecteurs, **jamais**
   de `runner` ni de `model`. Le couple runner+modèle vit dans le **Binding**, une **couche séparée et optionnelle**
   (`persona → runner+modèle`, par nœud) : la **forge** en pose un **par défaut au déploiement** (kit
   **standalone-runnable** en terminal nu, sans Cockpit), le **cockpit** peut l'**overrider** au run-time — **sans
   toucher à la définition**. **Modèle 3 couches** : Team pure + (Binding ?) = **Kit exécutable**. La **pureté est
   une propriété de la Team, pas du Kit** (un Kit lié peut légitimement porter un modèle).
4. **Agnosticisme de méthode (AR-9).** Le cœur modélise « **une** méthode » (un jeu de rôles/phases/workflows/
   gardes) dont **iakaframe est une instance**. On ne hard-wire pas « iakaframe-only ». Aucun code d'import au MVP,
   mais le schéma laisse la porte ouverte.
5. **MVP-first.** On modélise le nécessaire, pas au-delà. Chaque concept porte un marqueur **[MVP]** / **[différé]**.

**Légende des niveaux** : 🟦 **cœur partagé** · 🟧 **forge** (build-time) · 🟩 **cockpit** (run-time).

---

## 1. Vue d'ensemble — qui possède quoi, déployable vs run-time

| Concept | Niveau | Déployable (fichier) ? | Run-time ? | MVP |
|---|---|---|---|---|
| **Méthode** | 🟦 cœur | via ses artefacts (instructions, gates) | non | [MVP] (iakaframe seule) |
| **Rôle** | 🟦 cœur | non (référentiel) | non | [MVP] |
| **Persona** (+ nommage) | 🟧 forge (schéma 🟦) | oui (subagent/profil) | non | [MVP] |
| **Skill** | 🟦 cœur (catalogue), 🟧 édition | oui (`SKILL.md`) | non | [MVP] |
| **Tool / Permission** | 🟦 cœur (déclaration) | oui (allow/ask/deny) | **oui** (mode actif) | [MVP] déclaration ; run-time 🟩 |
| **Garde-fou** | 🟦 cœur (intention), 🟧 génération | oui (hooks + permissions) | **oui** (exécution du hook) | [MVP] identité/périmètre |
| **Connecteur (MCP)** | 🟦 cœur (déclaration), 🟧 génération | oui (`.mcp.json`) | **oui** (serveur actif) | [MVP] déclaration |
| **Workflow** | 🟧 forge | oui (à terme) | orchestré 🟩 | [différé P3] |
| **Team** (définition PURE) | 🟦 schéma, 🟧 composition, 🟩 sélection | oui (via kit) | sélection/pilotage | [MVP] |
| **Binding** (persona→runner+modèle) | 🟦 schéma, 🟧 défaut au déploiement, 🟩 override | oui (artefact à côté du kit) | **oui** (override) | [MVP révisé E1] |
| **Kit** (Team + Binding? = exécutable) | 🟧 forge (génère) | **oui** (le kit EST le déployable) | non | [MVP] (cible Claude Code) |
| **Nœud d'exécution** | 🟧 forge (déploie vers) | destination | héberge l'exécution | [MVP] `claude` ; [différé] codex/ollama-* |
| **Adaptateur de runner** | 🟧 forge | produit les déployables | non | [MVP] Claude Code |
| **Adaptateur de méthode** | 🟧 forge | — | non | [différé P∞] |
| **Runner** | 🟦 schéma, posé via **Binding** | non en soi (kind) | **oui** | vit dans le Binding |
| **Modèle** | 🟦 schéma, posé via **Binding** | non en soi (alias) | **oui** | vit dans le Binding |

### 1.1 Les TROIS couches (modèle cible — E1, 2026-07-07)

| Couche | Contenu | Propriétaire | Pureté |
|---|---|---|---|
| **1. Team (définition)** | personas · rôles · skills · gardes · workflow · connecteurs | **Forge** (foyer unique) ; Cockpit consomme | **PURE** — jamais de runner/modèle |
| **2. Binding (liaison)** | `persona → runner + modèle`, par nœud ; optionnel | **Forge** (défaut au déploiement) / **Cockpit** (override) | environnement-spécifique |
| **3. Kit déployé** | Team + (Binding ?) → **exécutable** | Forge (génère) | pur **sans** Binding ; **standalone-runnable avec** |

> **Bascule** : la **pureté est une propriété de la Team, pas du Kit**. Une Team reste pure/agnostique/portable ;
> un **Kit peut être lié** (bound) pour tourner **seul dans un terminal, sans Cockpit**. Détail :
> `specs/instructions/E1-evolution-binding-ar1.md`.

---

## 2. Concepts du CŒUR PARTAGÉ 🟦

### 2.1 Méthode
- **Définition.** La **discipline** de travail : phases, gates, cycle d'instruction, canal d'identité. **N'est pas
  une technologie** (doc chapeau v0.4.0). iakaframe en est **une instance**.
- **Niveau.** 🟦 cœur partagé.
- **Attributs (schéma agnostique).** `id`, `name`, `roles[]` (réf. Rôle), `phases[]` (nom + ordre + gate),
  `workflows[]` (réf. Workflow), `guardrails[]` (réf. Garde-fou, intentions par défaut). Pour iakaframe : les 7
  rôles canoniques + les phases P1/P2/P3 + les gates.
- **Déployable / run-time.** Se déploie **indirectement** via ses artefacts (instructions, gates, gardes) ; pas
  d'exécution propre.
- **MVP.** [MVP] : **iakaframe uniquement**. Le champ `id`/`name` existe (agnosticisme AR-9) mais **une seule
  méthode** est peuplée. Import d'autres méthodes = [différé P∞].

### 2.2 Rôle
- **Définition.** La **fonction** d'un intervenant (portefeuille, coordination, architecture, fabrication, tests,
  graphisme, doc). Liste canonique **fermée** (7) pour iakaframe. **Distinct du nom** (persona).
- **Niveau.** 🟦 cœur partagé. Réf. modèle mûr : `IakaCockpit/src/theme/roles.ts:22-30`.
- **Attributs.** `key` (ex. `coordination`), `label`, `roleIndex` (0..6, invariant qui pioche la vignette).
- **Déployable / run-time.** Non : référentiel. Sert à **typer** les personas et à choisir le casting.
- **MVP.** [MVP]. Réutilise les libellés du glossaire des rôles (`glossaire-iakaframe.md:8-21`).
- **Agnosticisme.** La liste est **fermée pour iakaframe** mais **paramétrable par méthode** : une autre méthode
  déclare ses propres rôles (AR-9). Au MVP, seule la liste iakaframe est peuplée.

### 2.3 Skill
- **Définition.** La **méthode outillée** d'un rôle : le « comment » d'un intervenant (id `iakaframe-*`).
- **Niveau.** 🟦 cœur (catalogue) ; 🟧 **éditée** dans la forge.
- **Attributs.** `id`, `roleKey`, `description`/`when_to_use`, `allowedTools[]`, `body` + assets, `hooks[]`
  (optionnel), `paths[]` (optionnel). Réf. surface Claude Code : `SKILL.md` (§ 6.1).
- **Déployable / run-time.** **Déployable** : la forge écrit `.claude/skills/<n>/SKILL.md`. Pas d'exécution
  propre (le runner l'invoque au run-time).
- **MVP.** [MVP] pour l'**attribution** d'ids de skills connus à une persona ; l'**éditeur de corps de skill**
  riche est [différé].

### 2.4 Tool / Permission
- **Définition.** Un **outil** mobilisable (Bash, Read, Write, appel MCP…) et sa **règle de permission**
  (`allow` / `ask` / `deny`) par **patterns**.
- **Niveau.** 🟦 cœur (déclaration de l'intention) ; 🟩 le **mode de permission actif** est run-time (cockpit).
- **Attributs.** `pattern` (ex. `Bash(git*)`, `Read(.env)`, `mcp__srv__*`, `Agent(...)`), `effect`
  (`allow|ask|deny`).
- **Déployable / run-time.** **Déployable** : règles écrites dans les settings du nœud. **Run-time** : le mode
  effectif appliqué durant une session appartient au **cockpit** (§ 5.1).
- **MVP.** [MVP] déclaration ; mode actif = cockpit.

### 2.5 Garde-fou (concept de 1re classe — AR-8)
- **Définition.** Une **contrainte exécutée** attachée à une team/persona pour faire respecter la discipline :
  **canal d'identité** (badges/pastilles), **garde de périmètre**, **garde de délégation**, permissions.
- **Niveau.** 🟦 cœur porte l'**intention** (garde X sur team/persona) ; 🟧 la forge **génère le mécanisme** propre
  au nœud via l'adaptateur de runner ; 🟩 le hook **s'exécute** au run-time (cockpit).
- **Mécanisme spécifique-runner.** Sur **Claude Code** : **hooks `settings.json`** + **permissions**. Sur un autre
  nœud : mécanisme équivalent (ou dégradé documenté).
- **Attributs (intention, agnostique du nœud).** `id`, `kind` (`identity` | `perimeter` | `delegation` |
  `permission` | `custom`), `scope` (team | persona | rôle), `event` (abstrait : `on-message` / `on-tool` /
  `on-delegate` / `on-session`…), `action` (abstrait), `params`.
- **Déployable / run-time.** **Déployable** (hooks + permissions écrits) **et** actif au run-time (exécution).
- **MVP.** [MVP] : générer les gardes **identité** et **périmètre** pour le nœud Claude Code (les gardes de la
  méthode existent déjà comme hooks — cf. `iakaFrameGUI/global/hooks/`). Gardes custom éditables = [différé].
- **⚠️ Non-régression.** Le **canal d'identité** ne doit **jamais** être cassé par la modélisation : la forge le
  **génère**, elle ne le remplace pas. La position de la pastille (ouverture/clôture) reste la règle.

### 2.6 Connecteur (MCP) (concept de 1re classe — AR-8)
- **Définition.** Une **source d'outils/ressources externes** attachable à une team : un serveur **MCP**.
- **Niveau.** 🟦 cœur (déclaration) ; 🟧 la forge **génère** le `.mcp.json` ; 🟩 le serveur est **actif** au
  run-time (cockpit).
- **Attributs.** `id`, `name`, `transport` (`stdio` | `http` | `sse` | `ws`), `endpoint`/`command`, `auth`
  (référence keychain, **jamais** de secret en clair), `tools[]`/`resources[]`/`prompts[]` exposés.
- **Déployable / run-time.** **Déployable** (`.mcp.json`) + actif au run-time.
- **MVP.** [MVP] : **déclaration** d'un connecteur attaché à une team + génération du `.mcp.json`. Découverte
  dynamique des tools = [différé].
- **Invariant secret.** Aucun credential dans la déclaration : les secrets vont au **keychain** (write-only),
  comme dans le Cockpit.

### 2.7 Workflow
- **Définition.** Un **enchaînement de rôles/phases/gates** pour un type de travail (ex. cycle feature : cadrage →
  fabrication → tests → gate).
- **Niveau.** 🟧 forge (authoring) ; 🟩 l'**orchestration** effective est run-time.
- **Attributs.** `id`, `name`, `steps[]` (roleKey + gate + condition), `methodId` (agnostique).
- **Déployable / run-time.** Déployable à terme ; orchestré au run-time.
- **MVP.** **[différé P3].** Modélisé a minima (le champ existe) mais **pas d'éditeur** au MVP.

### 2.8 Team
- **Définition.** Un **roster de personas** + coordinateur + casting visuel. **Objet de premier rang.** **PURE**
  (AR-1) : aucun runner/modèle.
- **Niveau.** 🟦 **schéma** partagé ; 🟧 **composée** dans la forge ; 🟩 **sélectionnée** dans le cockpit.
- **Attributs (schéma pur — AR-1).**
  ```ts
  interface Persona {            // ex-« Agent », renommé (v0.4.0 : persona)
    id: string;                  // slug stable, unique dans la team
    name: string;                // NOMMAGE LIBRE (AR-5) — ex. "Aragorn" ou un nom choisi
    roleKey: string;             // réf. Rôle (ex. "coordination")
    royaume: string;             // MAJUSCULE — pastille [ROYAUME][Nom]
    roleIndex: number;           // 0..N-1 — pioche la vignette du casting
    skills: string[];            // ids de skills (ex. "iakaframe-cadrage")
    guardrails: string[];        // ids de gardes attachées (AR-8)
    // PAS de runner, PAS de model (AR-1 : run-time, côté cockpit)
  }
  interface Team {
    id: string;
    name: string;
    methodId: string;            // agnosticisme (AR-9) — "iakaframe" au MVP
    vignetteTeam: string;        // casting visuel ("lotr"… ; "none" = pastilles)
    coordinator: string;         // id de persona (= chef de projet)
    personas: Persona[];
    connectors: string[];        // ids de connecteurs MCP attachés (AR-8)
  }
  ```
- **Déployable / run-time.** La team se **déploie** sous forme de **Kit** (§ 3.2), **éventuellement accompagnée d'un
  Binding** (§ 2.9) qui la rend exécutable. La Team elle-même reste **pure**.
- **MVP.** [MVP]. **Migration depuis le Cockpit** : le schéma dérive de `IakaCockpit/src/hooks/useTeams.ts:59-86`
  **moins** les champs `runner`/`model` (retirés de la définition — AR-1). Ces champs **migrent vers le Binding**
  (§ 2.9), pas dans la Team. Le retrait effectif côté Cockpit est une instruction Cockpit ultérieure (recentrage).
- **Note de renommage.** `Agent`→`Persona`, `agent.runner/model` **retirés** de la définition forgée → portés par le
  **Binding** (couche séparée, § 2.9).

### 2.9 Binding (liaison persona→runner+modèle) — concept de 1re classe (E1, 2026-07-07)
- **Définition.** Couche **séparée et optionnelle** associant, **pour un nœud donné**, chaque persona à un **runner**
  et un **modèle**. Rend le **Kit exécutable** (standalone, sans Cockpit).
- **Niveau.** 🟦 **schéma partagé** ; 🟧 la **forge** pose un **défaut au déploiement** ; 🟩 le **cockpit**
  **override** au run-time.
- **Attributs.**
  ```ts
  interface PersonaBinding { personaId: string; runner: RunnerKind; model: string; } // "" = défaut runner
  interface Binding {
    id: string;
    node: NodeKind;                          // Binding PAR nœud
    teamId: string;
    bindings: PersonaBinding[];
    origin: "forge-default" | "cockpit-override";
  }
  ```
- **Invariant secret.** Aucun credential (runner=kind, modèle=alias) → **keychain** pour les secrets.
- **Séparation dure.** Le Binding **n'entre jamais** dans la **définition de Team**. Artefact **distinct** (déployé
  à côté du kit — Q-1 de E1).
- **MVP (révisé E1).** Schéma + défaut forge au déploiement + override cockpit. Détail & lots aval (Forge « étape de
  liaison » P7 ; recentrage Cockpit) : `specs/instructions/E1-evolution-binding-ar1.md`.

---

## 3. Concepts de la FORGE 🟧 (build-time)

### 3.1 Persona & nommage (AR-5)
- **Définition.** La **persona** est l'incarnation **nommée** d'un rôle (schéma en § 2.8). Le **nommage est un
  concept de 1re classe de la forge** : on choisit/édite librement le nom.
- **Niveau.** 🟧 forge (authoring) ; schéma 🟦 partagé.
- **Règle de nommage (AR-5).** **Libre.** Le **roster canonique** (portefeuille→une persona, coordination→une
  persona, …, doc→une persona) sert de **gabarit de départ** proposé, non d'obligation. Réf. graine :
  `IakaCockpit/src/mock/demoTeam.ts:40-48` (7 personas, une par rôle).
- **Déployable / run-time.** La persona se **déploie** en **subagent** (Claude Code) ou profil équivalent
  (§ 6.1). Pas de run-time propre.
- **MVP.** [MVP] : créer/éditer/nommer des personas, leur affecter un rôle + skills + gardes.
- **⚠️ Doc.** En documentation, une persona est désignée par son **rôle** (libellé canonique), **jamais** par un
  nom de code interne (glossaire des rôles). Le champ `name` (nommage libre) est une donnée produit, pas une
  désignation de doc.

### 3.2 Kit
- **Définition.** Le **paquet généré** pour une **solution** cible : l'ensemble des **fichiers déployables** d'une
  team pour un nœud donné. **Le kit EST le déployable.**
- **Niveau.** 🟧 forge (génère) ; **format** partagé 🟦.
- **Attributs.** `targetSolution` (`claude` | `codex` | `ollama` | `openwebui` | `anythingllm`), `contractFile`
  (`CLAUDE.md` pour `claude` ; `AGENTS.md` sinon), `files[]` (subagents, skills, hooks/gardes, settings,
  `.mcp.json`, instructions). Généré par l'**adaptateur de runner** (§ 3.4).
- **Déployable / run-time.** **C'est le déployable.** Aucun run-time.
- **MVP.** [MVP] : **génération pour Claude Code seulement** (kit `.claude/`). Autres solutions = [différé P3].
- **Note d'audit.** Aujourd'hui les kits sont **écrits à la main** puis copiés (`iakaframe/cli/src/lib/kit.js:47`).
  Cible : **générés depuis une team** (P3).

### 3.3 Nœud d'exécution (AR-4)
- **Définition.** La **destination** d'un déploiement : où le kit est posé et où l'exécution aura lieu.
- **Niveau.** 🟧 forge (déploie vers) ; héberge l'exécution (pilotée par le cockpit).
- **Nœuds de 1er rang (AR-4).** `claude`, `codex`, **`ollama-localhost`**, **`ollama-lan`**. `localhost` et `lan`
  sont **distincts** (pas un simple champ host libre).
- **Attributs.** `id`, `kind` (`claude` | `codex` | `ollama-localhost` | `ollama-lan` | …), `contractFile`
  (dérivé), `endpoint`/`host` (pour les nœuds ollama), `deployMethod` (`local-fs` | `git` | `ssh` | `ollama-pull`).
- **Déployable / run-time.** Destination ; ne se déploie pas lui-même.
- **MVP.** [MVP] : **un seul nœud, `claude`** (dépôt local `.claude/`). Les autres nœuds sont **modélisés**
  (le champ existe, AR-4) mais **non câblés** au MVP (AR-6).
- **Distinction importante.** Un **nœud** (destination de déploiement, forge) est **distinct** du **runner**
  (harnais d'exécution, cockpit) même quand les noms se ressemblent (`claude` nœud ≠ `claude-code` runner).

### 3.4 Adaptateur de runner (axe 1 — le cœur de la génération de kits)
- **Définition.** Le composant qui **traduit** le cœur de concepts (team pure + gardes + connecteurs) vers la
  **surface concrète d'un nœud** : quels fichiers déployables écrire, quelles gardes générer.
- **Niveau.** 🟧 forge.
- **Attributs.** `node` (réf. Nœud), `emit(team) → Kit` (fonction pure de génération), `guardrailMapping`
  (intention de garde → mécanisme du nœud), `contractFile`.
- **MVP.** [MVP] : **adaptateur Claude Code** (§ 6.1). Codex/Ollama/Open WebUI = [différé P3].

### 3.5 Adaptateur de méthode (axe 2 — north-star, post-MVP)
- **Définition.** Le composant qui **importe** une méthode étrangère (BMAD, MetaGPT, SPARC…) dans le cœur
  agnostique : mappe ses rôles/phases/workflows/gardes sur le schéma commun.
- **Niveau.** 🟧 forge.
- **MVP.** **[différé P∞].** **Aucun code au MVP.** Seule la **contrainte d'agnosticisme** (§ 0.4, AR-9) est
  honorée : `methodId` sur Team/Workflow, listes de rôles paramétrables par méthode. On ne se ferme pas la porte.

---

## 4. Runner & Modèle — portés par le BINDING (E1) — forge défaut / cockpit override

> **Révision E1 (2026-07-07).** Runner et Modèle **ne sont plus « hors forge »** : ils vivent dans le **Binding**
> (§ 2.9), que la **forge** pose par défaut au déploiement et que le **cockpit** peut overrider. Le **schéma** est
> partagé 🟦.

### 4.1 Runner
- **Définition.** Le **harnais d'exécution** d'une persona (`claude-code`, `codex`, `ollama`, `litellm`… — vocab
  unifié AR-2, aligne `useTeams.ts:34`). En soi, un **kind**, jamais un fichier.
- **Où il vit.** Dans le **Binding** (`PersonaBinding.runner`). **Forge** : défaut au déploiement. **Cockpit** :
  override.

### 4.2 Modèle
- **Définition.** Le **modèle LLM** affecté à une persona.
- **Où il vit.** Dans le **Binding** (`PersonaBinding.model` ; `""` = défaut du runner). **Jamais** dans la
  **définition de Team** (qui reste pure). Un **Kit lié** peut légitimement porter le modèle (dans ses fichiers
  générés ou un artefact `binding.json` à côté — Q-1 de E1).
- **Nœuds exigeant un modèle** (Ollama/Codex/Open WebUI) : la forge **doit** permettre de le choisir au déploiement
  pour un kit **standalone-runnable**. Claude Code : modèle **omissible** (défaut runner).

---

## 5. La liaison forge ↔ cockpit (comment la team pure devient exécutable)

1. **Forge** : compose une **Team PURE** (personas + rôles + skills + gardes + connecteurs) → **génère un Kit**
   (adaptateur de runner) → **déploie** sur un **Nœud** (Claude Code au MVP).
2. **Cockpit** : **sélectionne** une team déployée pour un projet → pose une **surcouche de liaison**
   `persona → (runner, modèle)` → **exécute** les sessions (terminal-source, chat-vue, gardes actives).
3. **Table de liaison (cockpit, hors team forgée).** `binding: { teamId, projectId, perPersona: { personaId →
   { runner, model } } }`. C'est **là** que vivent runner+modèle (AR-1) — pas dans `Team`.

> Conséquence pour le Cockpit : les champs `runner`/`model` de `useTeams.ts:59-86` migrent **hors** de la
> définition de team vers cette surcouche. Cadré dans une **instruction Cockpit** dédiée (hors P0).

---

## 6. Inventaire durci — Claude Code, 1er adaptateur de runner de référence

> **RÉSERVE explicite (à respecter avant tout câblage dur).** Les **compteurs et versions précis** (nombre exact
> d'événements de hooks, `v2.1.x`, exhaustivité des clés) sont **INDICATIFS** → **à revérifier contre
> `code.claude.com/docs`** au moment du câblage. Ce qui est **solide et sur quoi on s'appuie**, c'est le
> **squelette** : les **familles de déployables** + le **split déployable / run-time**.

### 6.1 DÉPLOYABLES (fichiers écrits sur disque → générés/poussés par la FORGE)

| Famille | Emplacement | Contenu clé (indicatif) |
|---|---|---|
| **Subagents** | `.claude/agents/*.md` | frontmatter : `name`, `description`, `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `effort`, `isolation`, `color`. |
| **Skills** | `.claude/skills/<n>/SKILL.md` | `description`/`when_to_use`, `allowed-tools`, `context: fork+agent`, `paths`, `hooks`, corps + assets. |
| **Hooks** (= gardes) | `settings.json` | événements (`SessionStart/End`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStart/Stop`, `TaskCreated/Completed`, `PreCompact`, `Notification`…), matchers + `if`, types `command\|http\|mcp_tool\|prompt\|agent`. |
| **Settings** | `settings.json` / `settings.local.json` | **5 niveaux** Managed > Local > Project > User > CLI ; clés : `permissions`, `env`, `model`, `hooks`, `plugins`, MCP allow/deny… |
| **Permissions** (= gardes) | dans settings | règles `allow`/`ask`/`deny` ; patterns `Bash(...)`, `Read(.env)`, `mcp__srv__*`, `Agent(...)` ; modes. |
| **Instructions** | `CLAUDE.md` (managed/user/project/local/nested) + `.claude/rules/*` (path-scopé) | + imports `@`. |
| **Connecteurs (MCP)** | `.mcp.json` | `stdio`/`http`/`sse`/`ws` ; tools + resources + prompts ; auth (→ keychain). |
| **Plugins** | bundle + `plugin.json` + marketplace | bundle de skills + agents + hooks + MCP + LSP + monitors. |
| **Périphériques** | — | output-styles, statusline, keybindings. |

### 6.2 RUN-TIME (jamais des fichiers → CÔTÉ COCKPIT)
Mode de permission **actif**, **modèle/runner actif**, `effort`, invocation, **exécution** des hooks, délégation.

### 6.3 Ce que l'adaptateur Claude Code doit produire au MVP
Depuis une **Team PURE**, générer le kit `.claude/` : un **subagent par persona** (rôle + skills), les **skills**
attachées, les **gardes** de la méthode (identité + périmètre) en **hooks + permissions**, le `CLAUDE.md`
d'instructions, et — si la team déclare des connecteurs — le `.mcp.json`. **Plugins, périphériques, multi-niveaux
de settings, workflows = [différé].**

---

## 7. Ce qui est prêt pour P1 (coquille forge + authoring)

- **Schéma de données** `Team` / `Persona` **PUR** (§ 2.8) — dérivé du Cockpit **moins** runner/modèle.
- **Référentiels** : 7 rôles canoniques (§ 2.2), roster canonique comme gabarit (§ 3.1), catalogue de skills
  connus (§ 2.3).
- **Frontière d'implémentation** : authoring (forge) écrit des teams pures ; le déploiement invoque le **CLI en
  sidecar** ; runner/modèle **hors périmètre forge**.
- **Cible de déploiement MVP** : un seul nœud **Claude Code**, adaptateur de runner § 6.3.
- **Gardes** : réutiliser les hooks d'identité/périmètre existants (`iakaFrameGUI/global/hooks/`) comme sortie de
  l'adaptateur — **ne pas casser le canal d'identité**.

> **Reste [différé]** (ne pas coder au MVP) : multi-nœuds, génération de kit multi-cible, workflows, adaptateur de
> méthode, éditeur de corps de skill/garde custom, découverte dynamique MCP.
