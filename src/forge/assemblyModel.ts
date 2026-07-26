/**
 * assemblyModel — dérivation **pure** du récit « frères » à partir de l'assemblage déjà résolu
 * (`FrameAssembly`, produit par `buildFrame`/`resolveAssembly` du cœur). AUCUN I/O, AUCUN second
 * résolveur : on **consomme** le frame en mémoire et on projette un view-model prêt à rendre par
 * `AssemblyView`. Pure **addition** (Lot 1, invariant de parité § 3.2) — ne touche aucun contrat.
 *
 * Le mariage `roleKey → persona` est reconstruit en résolvant chaque id de persona via le
 * `CANONICAL_ROSTER` du cœur (la table canonique persona→rôle, déjà utilisée par `mappers.ts`) :
 * pour le frame iakaframe les ids de team SONT les ids du roster → le mariage est exact et fidèle à
 * la maquette. Une persona hors roster retombe sur `roleKey = null` (affiché « — », jamais deviné).
 */
import { CANONICAL_ROSTER } from "@iakaframe/core";
import { vignetteGradient, initialsOf } from "./casting";
import type { FrameAssembly } from "./frame";

/** Index id → persona canonique (name/roleKey/roleIndex), construit une fois. */
const ROSTER_BY_ID = new Map(CANONICAL_ROSTER.map((p) => [p.id, p]));

/** Une persona projetée pour le rendu (vignette + rôle casté). */
export interface AssemblyPersonaVM {
  id: string;
  name: string;
  initials: string;
  /** Rôle canonique casté par cette persona (`null` si l'id n'est pas au roster). */
  roleKey: string | null;
  roleIndex: number;
  gradient: [string, string];
  isCoordinator: boolean;
}

/** Une ligne du binding — le mariage `roleKey (méthode) → persona (team)`, avec runner·model. */
export interface AssemblyBindingRowVM {
  roleKey: string | null;
  persona: AssemblyPersonaVM;
  runner: string;
  model: string;
}

/** Le frère « méthode » projeté (que des ids référencés — jamais de corps recopié). */
export interface AssemblyMethodVM {
  id: string;
  name: string;
  workflowId: string | null;
  principleIds: string[];
  ritualIds: string[];
  guardrailIds: string[];
  roleKeys: string[];
  scaffoldIds: string[];
}

/** Le frère « team » projeté. */
export interface AssemblyTeamVM {
  id: string;
  name: string;
  coordinatorId: string;
  members: AssemblyPersonaVM[];
}

/** Le view-model complet du récit « frères » (frame → méthode + team + binding). */
export interface AssemblyModel {
  /** Vrai dès qu'au moins un frère est résolu (sinon : rien à raconter). */
  hasAssembly: boolean;
  frame: { id: string; name: string; version: string; default: boolean } | null;
  method: AssemblyMethodVM | null;
  team: AssemblyTeamVM | null;
  binding: { id: string; rows: AssemblyBindingRowVM[] } | null;
  /**
   * roleKeys de la méthode qu'**aucune** persona (team ∪ binding) ne couvre — l'orphelin du
   * mariage, dérivé ici. Complète le verdict d'intégrité référentielle (`frame.integrity`).
   */
  uncoveredRoleKeys: string[];
}

/** Résout un id de persona en VM de rendu (roster → name/roleKey/roleIndex ; repli honnête). */
function resolvePersona(id: string, coordinatorId: string): AssemblyPersonaVM {
  const p = ROSTER_BY_ID.get(id);
  const roleIndex = p?.roleIndex ?? 0;
  const name = p?.name ?? id;
  return {
    id,
    name,
    initials: initialsOf(name),
    roleKey: p?.roleKey ?? null,
    roleIndex,
    gradient: vignetteGradient(roleIndex),
    isCoordinator: id === coordinatorId,
  };
}

/**
 * Projette l'assemblage résolu en view-model « frères ». Défensif : chaque frère peut être `null`
 * (racine partielle) sans jamais lever. La méthode et la team restent **deux frères de même
 * niveau** — la structure de retour ne les imbrique jamais l'un dans l'autre.
 */
export function buildAssemblyModel(assembly: FrameAssembly): AssemblyModel {
  const frameDesc = assembly.frame
    ? {
        id: assembly.frame.id,
        name: assembly.frame.name || assembly.frame.id,
        version: assembly.frame.version,
        default: assembly.frame.default,
      }
    : null;

  const method: AssemblyMethodVM | null = assembly.method
    ? {
        id: assembly.method.id,
        name: assembly.method.name || assembly.method.id,
        workflowId: assembly.method.workflowId?.trim() || null,
        principleIds: assembly.method.principleIds,
        ritualIds: assembly.method.ritualIds,
        guardrailIds: assembly.method.guardrailIds,
        roleKeys: assembly.method.roleKeys,
        scaffoldIds: assembly.method.scaffoldIds,
      }
    : null;

  const coordinatorId = assembly.team?.coordinator ?? "";
  const team: AssemblyTeamVM | null = assembly.team
    ? {
        id: assembly.team.id,
        name: assembly.team.name || assembly.team.id,
        coordinatorId,
        members: assembly.team.personas.map((id) => resolvePersona(id, coordinatorId)),
      }
    : null;

  const binding = assembly.binding
    ? {
        id: assembly.binding.id,
        rows: assembly.binding.assignments.map((a): AssemblyBindingRowVM => {
          const persona = resolvePersona(a.personaId, coordinatorId);
          return { roleKey: persona.roleKey, persona, runner: a.runner, model: a.model };
        }),
      }
    : null;

  // Couverture : un roleKey de la méthode est couvert si une persona (team ∪ binding) le caste.
  const covered = new Set<string>();
  for (const m of team?.members ?? []) if (m.roleKey) covered.add(m.roleKey);
  for (const r of binding?.rows ?? []) if (r.roleKey) covered.add(r.roleKey);
  const uncoveredRoleKeys = (method?.roleKeys ?? []).filter((rk) => !covered.has(rk));

  return {
    hasAssembly: method !== null || team !== null || binding !== null,
    frame: frameDesc,
    method,
    team,
    binding,
    uncoveredRoleKeys,
  };
}
