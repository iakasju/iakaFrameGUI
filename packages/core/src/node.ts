/**
 * node.ts — le **nœud** de déploiement (forge 🟧) + le **format de kit** (`KitFormat`) : ENUMS.
 *
 * Contrat § 3.2/§ 3.3 (AR-4) : le **nœud** est la DESTINATION d'un déploiement (où poser le
 * kit) ; le **format** (`KitFormat`) détermine le **fichier-contrat** (`CLAUDE.md`/`AGENTS.md`).
 * Ces deux concepts, autrefois confondus dans le « target » du CLI, sont ici **distincts**.
 *
 * Nœuds de 1er rang (AR-4) : `claude`, `codex`, **`ollama-localhost`**, **`ollama-lan`**
 * (localhost ≠ lan — pas un simple champ host libre). La valeur legacy `ollama` (indistincte)
 * est **normalisée** vers `ollama-localhost` par défaut (`normalizeLegacyTarget`).
 *
 * ⚠️ Un **nœud** ≠ un **runner** (runner.ts) : `claude` (nœud) ≠ `claude-code` (runner).
 */

import vocab from "./vocab.json" with { type: "json" };

/** Destinations de déploiement de 1er rang (AR-4). `openwebui` = 5e nœud (P3c). */
export type NodeKind =
  | "claude"
  | "codex"
  | "ollama-localhost"
  | "ollama-lan"
  | "openwebui";

/**
 * Format de contrat d'un kit : `claude-md`→`CLAUDE.md` ; `agents-md`→`AGENTS.md` ;
 * `openwebui-models` (P3c) = **N Models JSON** (`models/<personaId>.json`, un par persona),
 * structurellement distinct des deux markdown/`.claude/` — d'où **pas** de fichier-contrat
 * unique (`contractFileByFormat` ne le mappe volontairement pas ; `contractFileForNode`
 * n'est pas signifiant pour ce format et retombe sur le défaut, jamais utilisé dans le flux).
 */
export type KitFormat = "claude-md" | "agents-md" | "openwebui-models";

/** Fichier-contrat déployé selon le format. */
export type ContractFile = "CLAUDE.md" | "AGENTS.md";

/** Les nœuds canoniques, dans l'ordre du vocabulaire partagé (`vocab.json`). */
export const NODE_KINDS: readonly NodeKind[] =
  vocab.nodeKinds as readonly NodeKind[];

/** Les formats de kit canoniques (`vocab.json`). */
export const KIT_FORMATS: readonly KitFormat[] =
  vocab.kitFormats as readonly KitFormat[];

/** Table de normalisation des valeurs de nœud legacy → canonique (`ollama`→`ollama-localhost`). */
export const NODE_ALIASES: Readonly<Record<string, NodeKind>> =
  vocab.nodeAliases as Record<string, NodeKind>;

/** Une valeur est-elle un nœud canonique ? (insensible à la casse) */
export function isNodeKind(value: unknown): value is NodeKind {
  return (
    typeof value === "string" &&
    NODE_KINDS.includes(value.toLowerCase() as NodeKind)
  );
}

/**
 * Normalise une valeur de nœud (canonique OU legacy `ollama` nu) vers un `NodeKind`, ou
 * `null` si inconnue. `ollama`→`ollama-localhost` par défaut (Q-2) ; `ollama-lan` doit être
 * explicite.
 */
export function normalizeLegacyTarget(value: unknown): NodeKind | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return NODE_ALIASES[v] ?? null;
}

/** Format de kit associé à un nœud (`claude`→`claude-md` ; les autres→`agents-md`). */
export function kitFormatForNode(node: NodeKind): KitFormat {
  return (vocab.formatByNode as Record<string, KitFormat>)[node] ?? "agents-md";
}

/**
 * Fichier-contrat d'un nœud, **via `KitFormat`** (le format porte le fichier, pas le nœud
 * directement) : `claude`→`CLAUDE.md` ; `codex`/`ollama-*`→`AGENTS.md`.
 */
export function contractFileForNode(node: NodeKind): ContractFile {
  const fmt = kitFormatForNode(node);
  return (vocab.contractFileByFormat as Record<string, ContractFile>)[fmt] ??
    "AGENTS.md";
}

/** Nom du dossier de kit pour un nœud (`claude`→`kit-claude`, `ollama-*`→`kit-ollama`, …). */
export function kitNameForNode(node: NodeKind): string {
  return (vocab.kitNameByNode as Record<string, string>)[node] ?? "kit-claude";
}
