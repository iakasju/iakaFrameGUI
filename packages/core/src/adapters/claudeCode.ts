/**
 * claudeCode.ts — **adaptateur de runner Claude Code** (pur) : `team pure → KitFileTree`.
 *
 * Première capacité de PRODUCTION de la forge : on **génère** l'arborescence `.claude/`
 * réelle depuis le modèle (au lieu de copier un kit statique). Fonction **PURE** — aucun
 * `fs`, aucun accès disque : l'arbre est un dictionnaire { chemin → contenu } inspectable en
 * mémoire, donc testable **sans nœud réel**. L'écriture disque est la responsabilité de la
 * forge Rust (`kit_deploy`).
 *
 * Invariants tenus (§ 7) :
 *  - **Team PURE en entrée** : aucun `runner`/`model` n'est lu ni émis (G-5). Le `model` du
 *    frontmatter subagent est **OMIS** (liaison run-time = Cockpit).
 *  - **Déterminisme** : personas triées par `roleIndex` puis `id` ; skills/connecteurs triés.
 *  - **Nœud/format via P2** : `claude → claude-md → CLAUDE.md` résolu par les helpers, jamais
 *    réécrit.
 *  - **Canal d'identité câblé, jamais réécrit** : les scripts de garde sont copiés verbatim
 *    (voir `guardScripts.generated.ts`), le câblage vit dans `guards.ts`.
 *
 * Schémas de fichiers conformes à l'étape 0 (`specs/notes/claude-code-schemas-2026-07-06.md`).
 */

import { toolsForPersona } from "../binding";
import { serializeAgentContract } from "../frontmatter";
import { DEFAULT_METHOD_ID, resolveWorkflow } from "../method";
import type { Persona } from "../persona";
import { personaBadge } from "../persona";
import { roleLabel } from "../roles";
import { CATALOG_SKILLS } from "../skill";
import { renderWorkflowMarkdown } from "../workflow";
import type { Team } from "../team";
import { GUARD_SCRIPTS } from "./guardScripts.generated";
import { buildClaudeSettings, buildGuardrailWiring } from "./guards";
import type { KitFileTree, KitGenOptions } from "./types";

/** Tri déterministe des personas : rôle (casting) puis id (stabilité). */
function byRoleThenId(a: Persona, b: Persona): number {
  return a.roleIndex - b.roleIndex || a.id.localeCompare(b.id);
}

/** Sérialise un objet en JSON indenté (2 espaces) avec `\n` final (lisible sur disque). */
function json(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

/** Entrée du **contrat d'agent** (format autorité, partagé byte-à-byte avec le CLI). */
export interface AgentContractInput {
  /** `name:` du contrat = **id** slug (jamais le nom d'affichage). */
  id: string;
  /** `description:` — texte canon (fourni par un loader de fixture, ou synthétisé côté forge). */
  description: string;
  /** `tools:` — allowlist runner-scoped issue du **binding** (omise si vide). */
  tools: string[];
  /** `skills:` — liste RÉSOLUE (transitive) préchargée par le runner (R8 § 5.2 ; omise si vide). */
  skills?: string[];
  /** `guardrails:` — flow-list des ids de garde (vocabulaire canon `identity, perimeter`, …). */
  guardrails: string[];
  /** Corps du contrat (verbatim canon côté parité, stub côté forge). */
  body: string;
}

/**
 * **Rendu du contrat d'agent** `.claude/agents/<id>.md` — format AUTORITÉ **convergé sur le CLI**
 * (`renderAgentContract`, `generate-agents.js`). Ordre FIXE `name(=id), description, tools?,
 * guardrails` ; **pas de `model`** (le modèle vit dans le `binding.json`, hors contrat). PUR.
 * Verrouillé byte-à-byte par le golden de parité (`__tests__/parite-generateurs.test.ts`).
 */
export function renderAgentContract(input: AgentContractInput): string {
  return serializeAgentContract(
    {
      id: input.id,
      description: input.description,
      tools: input.tools,
      skills: input.skills,
      guardrails: input.guardrails,
    },
    input.body,
  );
}

/**
 * `.claude/agents/<id>.md` **de la forge** (team PURE) : réutilise le format autorité
 * `renderAgentContract`. `name` = **id** ; `tools` **câblés depuis le binding**
 * (`toolsForPersona`, omis si vide) ; `guardrails` = ceux de la persona (flow-list) ; **jamais de
 * `model`**. La `description` et le **corps** sont **synthétisés** ici (la team pure ne porte ni
 * l'un ni l'autre — la parité byte-à-byte du corps canon passe par un loader de fixture, cf.
 * `renderAgentContract` + `__tests__/parite-generateurs.test.ts`).
 */
function renderAgent(team: Team, p: Persona, tools: string[]): string {
  const role = roleLabel(p.roleKey);
  const badge = personaBadge(p);
  const skills =
    p.skills.length > 0
      ? p.skills.map((s) => `- \`${s}\``).join("\n")
      : "_Aucune skill attachée (déclaration MVP)._";
  const body = `
# ${p.name} — rôle ${role}

Pastille d'identité (canal d'identité iakaframe) : \`${badge}\`.
Ouverture = pastille AVANT le bloc, en première ligne ; clôture = pastille APRÈS le bloc.

## Périmètre
Tu incarnes le rôle **${role}** de la team « ${team.name} ». Tiens ton périmètre ;
en cas de doute, remonte à la coordination plutôt que d'improviser.

## Skills attachées
${skills}
`;
  return renderAgentContract({
    id: p.id,
    description: `Persona incarnant le rôle « ${role} » de la team « ${team.name} ». À solliciter pour les tâches de ${role.toLowerCase()}.`,
    tools,
    guardrails: p.guardrails,
    body,
  });
}

/**
 * `.claude/skills/<id>/SKILL.md` — frontmatter minimal (`name`, `description`) + corps
 * **stub** (le corps riche des skills n'est pas éditable au MVP P1 → on référence le
 * skill-rôle, pas de faux contenu).
 */
function renderSkill(skillId: string): string {
  const known = CATALOG_SKILLS.find((s) => s.id === skillId);
  const role = known ? roleLabel(known.roleKey) : "";
  const description = known
    ? `${known.label} — outillage du rôle « ${role} ».`
    : `Skill « ${skillId} » (déclaration MVP).`;
  const roleLine = known
    ? `Cette skill outille le rôle **${role}**.`
    : `Skill hors catalogue connu.`;
  return `---
name: ${skillId}
description: ${description}
---

# Skill ${skillId}

> Stub généré (MVP P1) : le corps riche des skills n'est pas encore éditable dans la forge.
> Référence de skill-rôle : \`${skillId}\`.

${roleLine}
`;
}

/**
 * `CLAUDE.md` — fichier-contrat du nœud Claude Code : contexte de la team (rôles présents,
 * coordination) + corps de méthode fourni par l'appelant. Les intervenants sont désignés par
 * leur **rôle** (jamais un nom de code) ; le `name` reste une donnée d'affichage.
 */
function renderClaudeMd(team: Team, personas: Persona[], opts?: KitGenOptions): string {
  const coord = personas.find((p) => p.id === team.coordinator);
  const coordLine = coord
    ? `${coord.name} (rôle ${roleLabel(coord.roleKey)})`
    : "_non désigné_";
  const rolesLines = personas
    .map((p) => `- **${roleLabel(p.roleKey)}** : ${p.name} \`${personaBadge(p)}\``)
    .join("\n");
  // E2 : l'id de méthode provient de la Méthode du Kit ; **sans `method`** → repli canonique
  // (`DEFAULT_METHOD_ID` = "iakaframe") → sortie byte-identique à l'actuelle.
  const methodId = opts?.method?.id ?? DEFAULT_METHOD_ID;
  const method =
    opts?.methodInstructions && opts.methodInstructions.trim().length > 0
      ? opts.methodInstructions.trim()
      : `Méthode « ${methodId} » : chaque intervenant tient son rôle, s'identifie par sa\npastille à l'ouverture et à la clôture, et ne sort pas de son périmètre.`;
  // Section phases/gates — MÊME rendu et MÊME ordre de résolution que `AGENTS.md` (I-2/I-3) :
  // workflow injecté par la forge (P6b) d'abord, sinon celui de la Méthode du Kit (E2), sinon le
  // canonique → **sans `method` ni `workflow`, la sortie reste celle du canonique**.
  const workflowSection = renderWorkflowMarkdown(
    opts?.workflow ?? resolveWorkflow(opts?.method),
  );
  return `# ${team.name} — kit Claude Code

> Fichier-contrat généré par la forge iakaFrameGUI depuis une **team PURE**.
> Généré, non écrit à la main. Méthode : ${methodId}.

## Team
- **Coordination (chef de projet)** : ${coordLine}
- **Rôles présents** (${personas.length}) :

${rolesLines}

${workflowSection}

## Méthode

${method}
`;
}

/**
 * `.mcp.json` — **stub de déclaration** conditionnel. Généré **seulement si** la team
 * déclare ≥ 1 connecteur (G-4). Au MVP, la team ne porte que des **ids** de connecteurs
 * (config complète différée) : on émet une entrée `stdio` minimale par id (déclaration à
 * compléter côté déploiement/Cockpit), jamais de secret.
 */
function renderMcp(connectors: string[]): string {
  const ids = [...new Set(connectors)].sort();
  const mcpServers: Record<string, { type: "stdio"; command: string }> = {};
  for (const id of ids) mcpServers[id] = { type: "stdio", command: id };
  return json({ mcpServers });
}

/**
 * **Adaptateur Claude Code (pur)** : team pure → arborescence `.claude/` déployable.
 * Aucune I/O. Voir la liste EXACTE des fichiers dans l'instruction P3 § 5.1.
 */
export function generateClaudeCodeKit(team: Team, opts?: KitGenOptions): KitFileTree {
  const files: Record<string, string> = {};
  const personas = [...team.personas].sort(byRoleThenId);
  const binding = opts?.binding;

  // 1. Un subagent par persona (`tools` câblés depuis le binding — omis si vide ; jamais de model).
  for (const p of personas) {
    files[`.claude/agents/${p.id}.md`] = renderAgent(
      team,
      p,
      toolsForPersona(binding, p.id),
    );
  }

  // 2. Une SKILL.md par skill référencée (dédupliquée, triée).
  const skillIds = [...new Set(personas.flatMap((p) => p.skills))].sort();
  for (const sid of skillIds) {
    files[`.claude/skills/${sid}/SKILL.md`] = renderSkill(sid);
  }

  // 3. Fichier-contrat de méthode.
  files["CLAUDE.md"] = renderClaudeMd(team, personas, opts);

  // 4. Gardes-fous → hooks + permissions, et copie des scripts référencés.
  const wiring = buildGuardrailWiring(team);
  files[".claude/settings.json"] = json(buildClaudeSettings(wiring));
  for (const script of wiring.scripts) {
    const content = GUARD_SCRIPTS[script];
    if (content !== undefined) files[`.claude/hooks/${script}`] = content;
  }

  // 5. `.mcp.json` conditionnel.
  if (team.connectors.length > 0) {
    files[".mcp.json"] = renderMcp(team.connectors);
  }

  return { files };
}
