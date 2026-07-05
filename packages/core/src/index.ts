/**
 * @iakaframe/core — cœur de concepts partagé iakaframe (forge · cockpit · CLI).
 *
 * AMORCE (P1, AR-3) : **types de concepts + référentiels + parseurs défensifs**. Pure ESM,
 * zéro dépendance runtime — conçu pour être publié/partagé plus tard (le CLI sidecar et le
 * Cockpit le consommeront en P2), mais gardé **local** au MVP. Ne contient AUCUNE logique
 * d'adaptateur, AUCUNE génération de kit (différés P3).
 *
 * Invariant fondateur (AR-1) : le modèle de **Team** est PUR — aucune clé `runner`, aucune
 * clé `model`, ni dans les types ni dans ce qui est (dé)sérialisé.
 */

export * from "./roles";
export * from "./skill";
export * from "./guardrail";
export * from "./connector";
export * from "./persona";
export * from "./team";
export * from "./roster";
export * from "./runner";
export * from "./node";
