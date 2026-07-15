/**
 * mappers — ponts entre les **types riches GUI** (`Team` avec `Persona[]`, `Method`, `Kit`) et les
 * **records au schéma de la bibliothèque** (`TeamMd`/`MethodMd`/`KitMd`, que des ids) exposés par
 * `@iakaframe/core`. La bibliothèque range **des ids** (§3.9/3.10/3.12) : à l'écriture on projette
 * les objets riches sur leurs ids ; à la lecture on **réhydrate** depuis les catalogues du cœur
 * (roster canonique pour les personas). Défensif : id inconnu filtré, jamais d'exception.
 *
 * Note MVP : la Team GUI ne modélise pas encore de gardes **team-wide** (les gardes vivent par
 * persona) ; `guardrails[]` du `.md` team est donc écrit vide au MVP (additif, non régressif).
 */
import {
  CANONICAL_ROSTER,
  DEFAULT_KIT_NODE,
  NODE_KINDS,
  parseMethod,
  type Kit,
  type KitMd,
  type Method,
  type MethodMd,
  type NodeKind,
  type Persona,
  type Team,
  type TeamMd,
} from "@iakaframe/core";

// --- Team <-> TeamMd ---------------------------------------------------------

/** Projette une `Team` riche sur son enregistrement `.md` (ids seulement). */
export function teamToMd(team: Team): TeamMd {
  return {
    id: team.id,
    name: team.name,
    personas: team.personas.map((p) => p.id),
    coordinator: team.coordinator,
    guardrails: [], // MVP : pas de gardes team-wide dans la Team GUI (additif)
    vignetteTeam: team.vignetteTeam || "none",
  };
}

/** Réhydrate une `Team` riche depuis un `TeamMd` (personas résolues au roster canonique). */
export function mdToTeam(md: TeamMd): Team {
  const byId = new Map<string, Persona>(CANONICAL_ROSTER.map((p) => [p.id, p]));
  const personas = md.personas
    .map((id) => byId.get(id))
    .filter((p): p is Persona => p !== undefined);
  const coordinator =
    personas.some((p) => p.id === md.coordinator) && md.coordinator
      ? md.coordinator
      : (personas[0]?.id ?? "");
  return {
    id: md.id,
    name: md.name,
    vignetteTeam: md.vignetteTeam || "none",
    coordinator,
    personas,
    connectors: [],
  };
}

// --- Method <-> MethodMd -----------------------------------------------------

/** Projette une `Method` riche sur son enregistrement `.md`. */
export function methodToMd(method: Method): MethodMd {
  const md: MethodMd = {
    id: method.id,
    name: method.name,
    principleIds: [...method.principleIds],
    ritualIds: [...method.ritualIds],
    guardrailIds: [...method.guardrailIds],
    roleKeys: [...method.roleKeys],
    scaffoldIds: [...method.scaffoldIds],
  };
  if (method.workflowId && method.workflowId.trim().length > 0) {
    md.workflowId = method.workflowId;
  }
  return md;
}

/** Réhydrate une `Method` riche depuis un `MethodMd` (le cœur tient déjà des ids). */
export function mdToMethod(md: MethodMd): Method {
  const method = parseMethod(md);
  if (method) return method;
  // Repli défensif (parseMethod n'échoue que sans id — déjà garanti non-null par parseMethodMd).
  return {
    id: md.id,
    name: md.name || md.id,
    scaffoldIds: md.scaffoldIds,
    principleIds: md.principleIds,
    ritualIds: md.ritualIds,
    guardrailIds: md.guardrailIds,
    roleKeys: md.roleKeys,
    ...(md.workflowId ? { workflowId: md.workflowId } : {}),
  };
}

// --- Kit <-> KitMd -----------------------------------------------------------

/** Projette un `Kit` riche sur son enregistrement `.md` (manifeste de références). */
export function kitToMd(kit: Kit): KitMd {
  const md: KitMd = {
    id: kit.id,
    methodId: kit.methodId,
    teamId: kit.teamId,
    node: kit.node,
  };
  if (kit.runnerBindingId && kit.runnerBindingId.trim().length > 0) {
    md.bindingId = kit.runnerBindingId;
  }
  return md;
}

/** Réhydrate un `Kit` riche depuis un `KitMd` (`bindingId` → `runnerBindingId`). */
export function mdToKit(md: KitMd): Kit {
  const node: NodeKind = NODE_KINDS.includes(md.node as NodeKind)
    ? (md.node as NodeKind)
    : DEFAULT_KIT_NODE;
  const kit: Kit = { id: md.id, methodId: md.methodId, teamId: md.teamId, node };
  if (md.bindingId && md.bindingId.trim().length > 0) kit.runnerBindingId = md.bindingId;
  return kit;
}
