/**
 * runner.ts — le **runner** (harnais d'exécution d'une persona, cockpit 🟩) : ENUM CANONIQUE.
 *
 * Contrat § 4.1 / glossaire-concepts § 3 : le runner est un concept **run-time** (cockpit),
 * jamais un fichier déployable. Le cœur n'en fournit que le **vocabulaire canonique** (source
 * de vérité), aligné sur le **modèle persona** (instruction parite-enforcement-multirunner
 * § 5.2/6.1) : l'enum runner cible est `{claude, chatgpt, ollama-local, ollama-distant,
 * litellm}`. Le CLI en tient un miroir JS pur (align, cf. P2 § 5) ; la résolution des **alias
 * legacy** (`claude-code`/`ps`/`iakaide`→`claude`, `ollama`→`ollama-local`, `ollama-lan`→
 * `ollama-distant`, `codex` conservé résolvable pour rétro-compat, `aider` = launcher legacy
 * hors enum) est portée par `vocab.runnerAliases`.
 *
 * ⚠️ Un **runner** (cible d'EXÉCUTION de persona) n'est PAS un **host** (point d'ENTRÉE
 * `{claude, codex, openwebui}`, où vit l'enforcement) : le runner OpenAI-compatible s'appelle
 * `chatgpt` (jamais `openai`, la norme d'API) ; le host `codex` ≠ un runner (host-isé, § 6.1/6.2).
 * De même un **nœud** (`NodeKind`, node.ts) reste distinct du runner.
 */

import vocab from "./vocab.json" with { type: "json" };

/**
 * Vocabulaire unifié des runners (AR-2), aligné sur le **modèle persona** (§ 5.2/6.1) : cinq
 * cibles d'exécution. `codex` en est **absent** (host, pas runner) mais reste un **alias legacy
 * résolvable** (cf. `vocab.runnerAliases`) — aucun binding existant ne casse.
 */
export type RunnerKind =
  | "claude"
  | "chatgpt"
  | "ollama-local"
  | "ollama-distant"
  | "litellm";

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
