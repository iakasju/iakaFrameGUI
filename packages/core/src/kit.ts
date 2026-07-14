/**
 * kit.ts — le **Kit** : manifeste d'assemblage total (E2 §5) — cœur 🟦.
 *
 * Le **Kit** est le point de rencontre `Méthode + Team + Binding(?)` : le **livrable standalone**,
 * overridable au Cockpit. Il est modélisé **par références** (Q-1/Q-4) : `methodId` + `teamId`
 * (le **Binding STRUCTUREL** — quelle Méthode va avec quelle Team, décidé au Kit et non dans la
 * Team) + `runnerBindingId?` (réf. au **Binding runner+modèle** d'E1, brique optionnelle) + le
 * `node` cible de génération.
 *
 * ⚠️ Ici, **manifeste seulement** : ni la génération d'arbre ni le handoff Rust (additifs, hors
 * E2a). Esprit du cœur : type pur + parseur défensif.
 */

import { NODE_KINDS, type NodeKind } from "./node";

/** Nœud de génération par défaut d'un Kit (claude au MVP). */
export const DEFAULT_KIT_NODE: NodeKind = "claude";

/**
 * Un **Kit** = manifeste d'assemblage par références. Le **Binding structurel** (Méthode↔Team)
 * est porté par `methodId` + `teamId` ; le **Binding runner+modèle** (E1) est référencé, optionnel.
 */
export interface Kit {
  /** Slug stable du kit. */
  id: string;
  /** Réf. Méthode (Binding structurel). */
  methodId: string;
  /** Réf. Team (Binding structurel). */
  teamId: string;
  /** Réf. Binding runner+modèle E1 (suggéré, optionnel). */
  runnerBindingId?: string;
  /** Nœud cible de génération (claude au MVP). */
  node: NodeKind;
}

/**
 * Parse défensif d'UN kit (`null` si inutilisable : pas d'`id`, ou pas de `methodId`/`teamId` —
 * un kit sans ses deux références structurelles n'a pas de sens). `node` non reconnu → repli
 * `DEFAULT_KIT_NODE` ; `runnerBindingId` conservé s'il est une chaîne non vide. Jamais d'exception.
 */
export function parseKit(raw: unknown): Kit | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id =
    typeof r.id === "string" && r.id.trim().length > 0 ? r.id.trim() : null;
  if (!id) return null;
  const methodId =
    typeof r.methodId === "string" && r.methodId.trim().length > 0
      ? r.methodId.trim()
      : null;
  const teamId =
    typeof r.teamId === "string" && r.teamId.trim().length > 0
      ? r.teamId.trim()
      : null;
  if (!methodId || !teamId) return null;
  const node: NodeKind = NODE_KINDS.includes(r.node as NodeKind)
    ? (r.node as NodeKind)
    : DEFAULT_KIT_NODE;
  const kit: Kit = { id, methodId, teamId, node };
  const runnerBindingId =
    typeof r.runnerBindingId === "string" && r.runnerBindingId.trim().length > 0
      ? r.runnerBindingId.trim()
      : undefined;
  if (runnerBindingId) kit.runnerBindingId = runnerBindingId;
  return kit;
}

/**
 * Parse le contenu texte d'UN fichier kit (`kit.json`). `null` si illisible/invalide (jamais
 * d'exception).
 */
export function parseKitText(text: string | undefined | null): Kit | null {
  if (!text || text.trim().length === 0) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  return parseKit(data);
}

/** Sérialise un kit pour la persistance (passe par `parseKit` d'abord). Indenté. */
export function serializeKit(kit: Kit): string {
  const clean = parseKit(kit) ?? kit;
  return JSON.stringify(clean, null, 2);
}
