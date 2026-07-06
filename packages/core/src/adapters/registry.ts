/**
 * registry.ts — **registre des adaptateurs de runner** par nœud (extensibilité AR-4).
 *
 * Au MVP, seul le nœud `claude` a un adaptateur **réel** (`generateClaudeCodeKit`). Les nœuds
 * `codex` / `ollama-localhost` / `ollama-lan` sont **déclarés** mais **non implémentés**
 * (P3b) : leur adaptateur existe (archi ouverte) et expose `implemented: false` ; appeler
 * `generate` lève une erreur explicite. On garde ainsi l'archi extensible **sans** coder ces
 * nœuds.
 */

import { kitFormatForNode, NODE_KINDS, type NodeKind } from "../node";
import { generateClaudeCodeKit } from "./claudeCode";
import type { RunnerAdapter } from "./types";

/** Adaptateur de référence : le nœud Claude Code (seul implémenté au MVP). */
export const claudeCodeAdapter: RunnerAdapter = {
  node: "claude",
  kitFormat: kitFormatForNode("claude"),
  implemented: true,
  generate: generateClaudeCodeKit,
};

/** Fabrique un adaptateur **déclaré non implémenté** (P3b) pour un nœud différé. */
function notImplementedAdapter(node: NodeKind): RunnerAdapter {
  return {
    node,
    kitFormat: kitFormatForNode(node),
    implemented: false,
    generate() {
      throw new Error(
        `Adaptateur de nœud « ${node} » non implémenté (différé P3b). ` +
          `Seul « claude » est disponible au MVP.`,
      );
    },
  };
}

/** Registre { nœud → adaptateur } couvrant TOUS les `NodeKind` (implémentés ou déclarés). */
export const RUNNER_ADAPTERS: Readonly<Record<NodeKind, RunnerAdapter>> = {
  claude: claudeCodeAdapter,
  codex: notImplementedAdapter("codex"),
  "ollama-localhost": notImplementedAdapter("ollama-localhost"),
  "ollama-lan": notImplementedAdapter("ollama-lan"),
};

/** Adaptateur d'un nœud (toujours défini : les `NodeKind` sont tous couverts). */
export function getAdapter(node: NodeKind): RunnerAdapter {
  return RUNNER_ADAPTERS[node];
}

/** Nœuds effectivement implémentés (MVP : `["claude"]`). */
export function implementedNodes(): NodeKind[] {
  return NODE_KINDS.filter((n) => RUNNER_ADAPTERS[n].implemented);
}
