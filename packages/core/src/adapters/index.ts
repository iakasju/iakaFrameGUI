/**
 * adapters — barrel des **adaptateurs de runner** (génération de kit, pur).
 *
 * Génération = pure (cœur) ; déploiement = I/O (forge Rust). Ce sous-module n'exporte que la
 * partie pure : contrat `RunnerAdapter`, générateur Claude Code, câblage des gardes, registre.
 */

export * from "./types";
export * from "./guards";
export * from "./claudeCode";
export * from "./registry";
export { GUARD_SCRIPTS } from "./guardScripts.generated";
