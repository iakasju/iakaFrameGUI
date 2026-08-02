/**
 * @iakaframe/core — cœur de concepts partagé iakaframe (forge · cockpit · CLI).
 *
 * P1 (AR-3) : **types de concepts + référentiels + parseurs défensifs**. Pure ESM, zéro
 * dépendance runtime — conçu pour être publié/partagé plus tard (le CLI sidecar et le
 * Cockpit le consommeront), mais gardé **local** au MVP.
 *
 * P3 (AR-4) : **adaptateur de runner Claude Code** = génération PURE d'un kit déployable
 * (`generateClaudeCodeKit`, module `./adapters`). Toujours zéro I/O : l'écriture disque
 * (déploiement) vit dans la forge Rust. Les nœuds `codex`/`ollama-*` sont déclarés mais non
 * implémentés (P3b).
 *
 * Invariant fondateur (AR-1) : le modèle de **Team** est PUR — aucune clé `runner`, aucune
 * clé `model`, ni dans les types ni dans ce qui est (dé)sérialisé.
 */

export * from "./roles";
export * from "./workflow";
export * from "./skill";
export * from "./guardrail";
export * from "./connector";
export * from "./persona";
export * from "./team";
export * from "./principle";
export * from "./ritual";
export * from "./scaffold";
export * from "./method";
export * from "./kit";
export * from "./frontmatter";
export * from "./handoff";
export * from "./roster";
export * from "./runner";
export * from "./node";
export * from "./binding";
export * from "./discovery";
export * from "./frame";
export * from "./element-pool";
export * from "./llm";
export * from "./adapters";
