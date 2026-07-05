/**
 * runner.ts — le **runner** (harnais d'exécution d'une persona, cockpit 🟩) : ENUM CANONIQUE.
 *
 * Contrat § 4.1 / glossaire-concepts § 3 : le runner est un concept **run-time** (cockpit),
 * jamais un fichier déployable. Le cœur n'en fournit que le **vocabulaire canonique** (source
 * de vérité), aligné sur `IakaCockpit/src/hooks/useTeams.ts:34`. Le CLI en tient un miroir JS
 * pur (align, cf. P2 § 5) ; la résolution des **alias legacy** (`ps`/`iakaide`→`claude-code`,
 * `aider` = launcher legacy hors enum) vit côté CLI (`cli/src/lib/vocab.js`).
 *
 * ⚠️ Un **nœud** (`NodeKind`, node.ts) ≠ un **runner** : `claude` (nœud) ≠ `claude-code`
 * (runner). Ne jamais confondre destination de déploiement (forge) et harnais (cockpit).
 */

import vocab from "./vocab.json" with { type: "json" };

/** Vocabulaire unifié des runners (AR-2), aligné sur le Cockpit `useTeams.ts:34`. */
export type RunnerKind = "claude-code" | "ollama" | "litellm" | "codex";

/** Les runners canoniques, dans l'ordre du vocabulaire partagé (`vocab.json`). */
export const RUNNER_KINDS: readonly RunnerKind[] =
  vocab.runnerKinds as readonly RunnerKind[];

/** Table d'alias → valeur canonique (legacy inclus : `ps`/`iakaide`→`claude-code`). */
export const RUNNER_ALIASES: Readonly<Record<string, RunnerKind>> =
  vocab.runnerAliases as Record<string, RunnerKind>;

/** Alias **dépréciés** (warning attendu côté CLI) : `ps`, `iakaide`. */
export const DEPRECATED_RUNNER_ALIASES: readonly string[] =
  vocab.deprecatedRunnerAliases as readonly string[];

/**
 * Launchers **legacy** conservés hors enum `RunnerKind` (AR : « pas de suppression »).
 * `aider` reste opérationnel côté CLI comme runner legacy non canonique (Q-5).
 */
export const LEGACY_RUNNER_LAUNCHERS: readonly string[] =
  vocab.legacyRunnerLaunchers as readonly string[];

/** Une valeur est-elle un runner canonique ? (insensible à la casse) */
export function isRunnerKind(value: unknown): value is RunnerKind {
  return (
    typeof value === "string" &&
    RUNNER_KINDS.includes(value.toLowerCase() as RunnerKind)
  );
}

/**
 * Résout une valeur (canonique OU alias) vers un `RunnerKind`, ou `null` si inconnue.
 * Ne traite PAS les launchers legacy (ex. `aider`) : ceux-là ne sont pas des `RunnerKind`
 * (renvoie `null`) — la logique launcher legacy vit côté CLI.
 */
export function parseRunnerKind(value: unknown): RunnerKind | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return RUNNER_ALIASES[v] ?? null;
}
