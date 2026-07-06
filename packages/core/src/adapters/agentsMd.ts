/**
 * agentsMd.ts — **builder `AGENTS.md` mutualisé** (DRY) pour les nœuds **sans hooks**
 * (`codex`, `ollama-localhost`, `ollama-lan`) — pur, testable **sans nœud réel** (P3b).
 *
 * Point structurant P3b : ces nœuds **n'ont pas de hooks** → le canal d'identité et les
 * gardes ne peuvent pas être câblés en mécanisme. Ils sont **embarqués en TEXTE
 * comportemental** dans `AGENTS.md`, **généré depuis le catalogue de gardes** (rendu `prose`),
 * pas figé à la main. Le canal d'identité est ainsi **reproduit fidèlement**, jamais dénaturé.
 *
 * Invariants tenus (§ 7) :
 *  - **Team PURE en entrée**, **zéro `runner`/`model`** en sortie (aucune table MODELES ; le
 *    « modèle conseillé » des gabarits historiques n'est **pas** repris — AR-1).
 *  - **Déterminisme** : personas triées par `roleIndex` puis `id`.
 *  - **`KitFormat.agents-md`** : le fichier-contrat est `AGENTS.md` (helpers P2), jamais
 *    `CLAUDE.md`.
 *  - **Aucun `settings.json`, aucun hook** : les gardes sont des **sections de prose** (G-6).
 *
 * Ossature inspirée des gabarits éprouvés `iakaframe/kit-codex/AGENTS.md` et
 * `iakaframe/kit-ollama/AGENTS.md` ; prose d'identité issue de `kit-openwebui/AGENTS.md`
 * (portée par le catalogue `guardrail.ts`).
 */

import { CATALOG_GUARDRAILS, type Guardrail } from "../guardrail";
import type { Persona } from "../persona";
import { personaBadge } from "../persona";
import { roleLabel } from "../roles";
import type { Team } from "../team";
import { renderMcpJson } from "./mcp";
import type { KitFileTree, KitGenOptions } from "./types";

/** Tri déterministe des personas : rôle (casting) puis id (stabilité). */
function byRoleThenId(a: Persona, b: Persona): number {
  return a.roleIndex - b.roleIndex || a.id.localeCompare(b.id);
}

/**
 * Spécificités d'un nœud `AGENTS.md` (ce qui **distingue** codex / ollama-localhost /
 * ollama-lan). Le reste du contrat est **mutualisé** (DRY) par `buildAgentsMd`.
 */
export interface AgentsMdNodeSpec {
  /** Titre H1 du contrat (« … incarnation Codex » / « … incarnation Ollama »). */
  title: string;
  /** Blockquote d'introduction (sous le H1). */
  intro: string;
  /** Bloc « Pré-requis » propre au nœud (endpoint Ollama, CLI Codex, …). */
  prerequisites: string;
}

/**
 * Section « roster » : personas de la team **par rôle** (nom + rôle + pastille d'identité).
 * Aucun modèle affecté (AR-1) — on décrit des **personas/rôles**, jamais un moteur.
 */
function renderRoster(team: Team, personas: Persona[]): string {
  const coord = personas.find((p) => p.id === team.coordinator);
  const coordLine = coord
    ? `${coord.name} (rôle ${roleLabel(coord.roleKey)})`
    : "_non désigné_";
  const rows = personas
    .map(
      (p) =>
        `| ${p.name} | ${roleLabel(p.roleKey)} | \`${personaBadge(p)}\` |`,
    )
    .join("\n");
  return `## Le roster (${personas.length} personas)

> **Coordination (chef de projet)** : ${coordLine}. Tu joues **un rôle à la fois**, annoncé
> explicitement — sous ce nœud le roster est une **galerie de personas**, pas un dispatch natif.

| Persona (nom) | Rôle | Pastille d'identité |
|---|---|---|
${rows}`;
}

/** Section mutualisée « Ce qu'est iakaframe ». */
const WHAT_IS_IAKAFRAME = `## Ce qu'est iakaframe

Une **méthode de travail IA-augmentée** : c'est le **workflow** qui produit la qualité, pas l'IA
seule. Un **décideur humain** pilote ; une **galerie de personas** exécute, dans un cadre strict —
**on ne code jamais avant d'avoir cadré**.`;

/** Section mutualisée « Les 3 phases (cible staging) + squad prod ». */
const PHASES = `## Les 3 phases (cible : staging) + le squad prod

| Phase | Rôle | Entrée → Sortie | Gate |
|---|---|---|---|
| 🔵 **P1 — Cadrage** | architecture | besoin → \`specs/instructions/<feature>.md\` | **humain** (le décideur valide) |
| 🔴 **P2 — Réalisation** | fabrication + tests | instruction → branche + commits + tests verts | **auto** (typecheck/lint/tests) |
| 🟢 **P3 — Staging** | fabrication (devops) + tests | PASS → build/déploiement **staging** (\`vX.Y.Z-rc\`) | auto |

La chaîne **s'arrête au staging**. La **mise en production** est un **squad séparé**, déclenché
**sur feu vert humain** — hors les 3 phases. Au-dessus des projets : le rôle **portefeuille**
(switch de projet, vue d'ensemble). Transverses : **graphisme** (design on-brand), **doc** (guides).`;

/** Section mutualisée « Règle absolue — cadrage avant code ». */
const CADRAGE_AVANT_CODE = `## Règle absolue — cadrage avant code

Avant toute tâche non triviale :
1. **Lire / écrire l'instruction** dans \`specs/instructions/<feature>.md\` (gabarit \`_TEMPLATE.md\`).
2. Pas d'instruction → la rédiger (rôle **architecture**) et la faire **valider** avant de coder.
3. Implémenter **étape par étape**, avec **commits atomiques**.
4. Lancer **typecheck + lint + tests** avant de clore.
5. Action vraiment destructive → **demander confirmation** par message avant d'agir.`;

/** Section mutualisée « Conventions (permanentes) ». */
const CONVENTIONS = `## Conventions (permanentes)

- **Échanges & doc en français** ; **code & identifiants en anglais**.
- **MVP d'abord, puis itérer.** Pas de sur-ingénierie.
- **Self-hosted / open-source d'abord** ; cloud en fallback justifié.
- **Réutiliser l'existant** avant de réimplémenter.
- **Commits atomiques et fréquents** (*conventional commits* : \`feat:\`/\`fix:\`/\`docs:\`/\`chore:\`/\`wip:\`).
  Jamais de \`reset --hard\` ni \`push --force\` côté agent.
- **Isolation par projet** : stack/ports propres, pas de collision entre projets.`;

/** Section mutualisée « Structure du projet ». */
const PROJECT_STRUCTURE = `## Structure du projet

\`\`\`
mon-projet/
├── AGENTS.md                 ← ce contrat (lu à la racine du repo)
├── specs/
│   ├── PROJET.md             ← vision / décisions (jamais de code ici)
│   ├── instructions/         ← le cœur : une instruction par feature, AVANT de coder
│   │   └── _TEMPLATE.md
│   └── etat-des-lieux.md     ← généré par les scripts
└── src/ …                    ← le code
\`\`\``;

/**
 * Rend une garde-fou de méthode en **section de prose** (heading + body). Utilise le rendu
 * `prose` du catalogue — **fidèle** au hook, jamais réécrit ici.
 */
function renderGuardProse(g: Guardrail): string | null {
  const p = g.rendering.prose;
  if (!p) return null;
  return `## ${p.heading}\n\n${p.body}`;
}

/**
 * **Gardes de méthode en texte** : le contrat d'un nœud sans hooks embarque le rituel
 * comportemental des gardes canoniques (identité, périmètre, délégation) — c'est le **seul**
 * mécanisme d'identité disponible sur ce nœud (G-6). Ordre du catalogue (déterminisme).
 */
function renderMethodGuards(): string {
  return CATALOG_GUARDRAILS.map(renderGuardProse)
    .filter((s): s is string => s !== null)
    .join("\n\n");
}

/**
 * **Builder `AGENTS.md` mutualisé** (DRY) : assemble l'ossature commune + les specifics du
 * nœud. Pur, déterministe. C'est le cœur réutilisé par les 3 adaptateurs `agents-md`.
 */
export function buildAgentsMd(team: Team, spec: AgentsMdNodeSpec): string {
  const personas = [...team.personas].sort(byRoleThenId);
  const sections = [
    `# ${spec.title}`,
    spec.intro,
    spec.prerequisites,
    WHAT_IS_IAKAFRAME,
    renderRoster(team, personas),
    PHASES,
    CADRAGE_AVANT_CODE,
    renderMethodGuards(),
    CONVENTIONS,
    PROJECT_STRUCTURE,
  ];
  return sections.join("\n\n") + "\n";
}

/**
 * Génère le `KitFileTree` d'un nœud `agents-md` : `AGENTS.md` (contrat) + `.mcp.json`
 * **conditionnel** (Q-4 : généré pour tous les nœuds dès qu'une team déclare ≥ 1 connecteur,
 * au format MCP standard). **Aucun `settings.json`, aucun hook** (nœud sans hooks).
 */
export function generateAgentsMdKit(team: Team, spec: AgentsMdNodeSpec): KitFileTree {
  const files: Record<string, string> = {};
  files["AGENTS.md"] = buildAgentsMd(team, spec);
  if (team.connectors.length > 0) {
    files[".mcp.json"] = renderMcpJson(team.connectors);
  }
  return { files };
}

// --- Specifics par nœud (ce qui les distingue) ---

/** Spécificités du nœud **codex** (CLI OpenAI, pas d'endpoint local). */
export function codexNodeSpec(): AgentsMdNodeSpec {
  return {
    title: "AGENTS.md — contrat de travail iakaframe (incarnation Codex)",
    intro: `> Fichier lu en priorité par **Codex** à chaque session, à la racine du projet.
> Généré par la forge iakaFrameGUI depuis une **team PURE** — non écrit à la main.
> Équivalent \`AGENTS.md\` du \`CLAUDE.md\` de l'incarnation Claude. Aucun modèle affecté ici
> (le choix de modèle est **run-time**, hors forge).`,
    prerequisites: `## Pré-requis

- **Codex CLI** installé et connecté (compte ChatGPT ou clé API OpenAI).
- **Git** + un dépôt (Forgejo recommandé en self-hosted ; un repo local suffit pour démarrer).`,
  };
}

/** Endpoint Ollama d'un nœud (localhost ou LAN paramétrable, Q-5). */
function ollamaEndpoint(host: string): string {
  return `http://${host}:11434`;
}

/** Spécificités communes aux nœuds **ollama** (endpoint paramétré). */
function ollamaNodeSpec(scope: "localhost" | "lan", host: string): AgentsMdNodeSpec {
  const endpoint = ollamaEndpoint(host);
  const scopeLabel = scope === "localhost" ? "local (localhost)" : "LAN";
  return {
    title: `AGENTS.md — contrat de travail iakaframe (incarnation Ollama / ${scopeLabel})`,
    intro: `> Cible **ollama** (${scopeLabel}) : les personas tournent sur des **modèles locaux
> Ollama**, via un **outil agentique open** (Aider, Continue, Cline, opencode…) pointé sur
> l'endpoint ci-dessous. Généré par la forge iakaFrameGUI depuis une **team PURE** — aucun
> modèle affecté ici (choix de modèle = **run-time**, hors forge).`,
    prerequisites: `## Pré-requis

- **Ollama** lancé et joignable à l'endpoint du nœud : \`${endpoint}\`.
- Un **outil agentique** pointé sur cet endpoint (il lit \`AGENTS.md\` à la racine du repo).
- **Git** + un dépôt (Forgejo self-hosted recommandé ; un repo local suffit pour démarrer).`,
  };
}

/** Spécificités du nœud **ollama-localhost** (endpoint `http://localhost:11434`). */
export function ollamaLocalhostNodeSpec(): AgentsMdNodeSpec {
  return ollamaNodeSpec("localhost", "localhost");
}

/**
 * Spécificités du nœud **ollama-lan** (endpoint `http://<host-lan>:11434`). Le host est
 * **paramétrable** (Q-5) : `opts.lanHost` si fourni, sinon le **placeholder documenté**
 * `<host-lan>` à compléter dans l'`AGENTS.md`.
 */
export function ollamaLanNodeSpec(opts?: KitGenOptions): AgentsMdNodeSpec {
  const host = opts?.lanHost && opts.lanHost.trim().length > 0 ? opts.lanHost.trim() : "<host-lan>";
  return ollamaNodeSpec("lan", host);
}

// --- Adaptateurs concrets (purs) ---

/** **Adaptateur codex (pur)** : team pure → `AGENTS.md` (+ `.mcp.json` si connecteurs). */
export function generateCodexKit(team: Team): KitFileTree {
  return generateAgentsMdKit(team, codexNodeSpec());
}

/** **Adaptateur ollama-localhost (pur)** : endpoint `http://localhost:11434`. */
export function generateOllamaLocalhostKit(team: Team): KitFileTree {
  return generateAgentsMdKit(team, ollamaLocalhostNodeSpec());
}

/** **Adaptateur ollama-lan (pur)** : endpoint `http://<host-lan>:11434` (host paramétrable, Q-5). */
export function generateOllamaLanKit(team: Team, opts?: KitGenOptions): KitFileTree {
  return generateAgentsMdKit(team, ollamaLanNodeSpec(opts));
}
