/**
 * registry.ts — **registre des adaptateurs de runner** par nœud (extensibilité AR-4).
 *
 * P3b : **4 nœuds implémentés**. Le nœud `claude` a un adaptateur **hooks** (`CLAUDE.md` +
 * `settings.json`, P3, inchangé) ; `codex` / `ollama-localhost` / `ollama-lan` ont des
 * adaptateurs **`AGENTS.md`** (nœuds sans hooks, gardes en prose). L'interface `RunnerAdapter`
 * est **stable** (aucune signature changée) ; la seule variation entre les 3 nœuds `agents-md`
 * est le **rendu** (endpoint / entête), porté par leur `generate` respectif.
 */

import { kitFormatForNode, NODE_KINDS, type NodeKind } from "../node";
import {
  generateCodexKit,
  generateOllamaLanKit,
  generateOllamaLocalhostKit,
} from "./agentsMd";
import { generateClaudeCodeKit } from "./claudeCode";
import { generateOpenWebUIKit } from "./openwebui";
import type { RunnerAdapter } from "./types";

/** Adaptateur de référence : le nœud Claude Code (hooks + `CLAUDE.md`, P3 inchangé). */
export const claudeCodeAdapter: RunnerAdapter = {
  node: "claude",
  kitFormat: kitFormatForNode("claude"),
  implemented: true,
  generate: generateClaudeCodeKit,
};

/** Adaptateur **codex** (`AGENTS.md`, nœud sans hooks — gardes en prose). */
export const codexAdapter: RunnerAdapter = {
  node: "codex",
  kitFormat: kitFormatForNode("codex"),
  implemented: true,
  generate: generateCodexKit,
};

/** Adaptateur **ollama-localhost** (`AGENTS.md`, endpoint `http://localhost:11434`). */
export const ollamaLocalhostAdapter: RunnerAdapter = {
  node: "ollama-localhost",
  kitFormat: kitFormatForNode("ollama-localhost"),
  implemented: true,
  generate: generateOllamaLocalhostKit,
};

/** Adaptateur **ollama-lan** (`AGENTS.md`, endpoint `http://<host-lan>:11434`, host paramétrable Q-5). */
export const ollamaLanAdapter: RunnerAdapter = {
  node: "ollama-lan",
  kitFormat: kitFormatForNode("ollama-lan"),
  implemented: true,
  generate: generateOllamaLanKit,
};

/** Adaptateur **openwebui** (`openwebui-models` : N Models JSON, un par persona — P3c). */
export const openWebUIAdapter: RunnerAdapter = {
  node: "openwebui",
  kitFormat: kitFormatForNode("openwebui"),
  implemented: true,
  generate: generateOpenWebUIKit,
};

/** Registre { nœud → adaptateur } couvrant TOUS les `NodeKind` (les 5 implémentés, P3c). */
export const RUNNER_ADAPTERS: Readonly<Record<NodeKind, RunnerAdapter>> = {
  claude: claudeCodeAdapter,
  codex: codexAdapter,
  "ollama-localhost": ollamaLocalhostAdapter,
  "ollama-lan": ollamaLanAdapter,
  openwebui: openWebUIAdapter,
};

/** Adaptateur d'un nœud (toujours défini : les `NodeKind` sont tous couverts). */
export function getAdapter(node: NodeKind): RunnerAdapter {
  return RUNNER_ADAPTERS[node];
}

/** Nœuds effectivement implémentés (MVP : `["claude"]`). */
export function implementedNodes(): NodeKind[] {
  return NODE_KINDS.filter((n) => RUNNER_ADAPTERS[n].implemented);
}
