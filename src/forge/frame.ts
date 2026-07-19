/**
 * frame — chargement et **inventaire d'un frame ouvert** (G3/G4/G5, socle mécanique de
 * « Open frame », `open-frame-gui-stefframe2.md`). Un frame = une racine `IAKAFRAME_HOME` qui
 * expose **11 types** : les **8 atomes de pool** sous `library/<type>/` (contenu lu via
 * `poolReadAll`, G1) + les **3 assemblages** `teams`/`methods`/`bindings` à plat (via
 * `libraryList`, `bindings` câblé par G2). Ce module :
 *   - charge les 11 types (I/O via la façade `backend`, injectable) ;
 *   - compte chaque type — `workflows` compté **une fois** (l'atome de pool ; la collection
 *     éditable `workflows/` reste hors inventaire, G5) ;
 *   - vérifie l'**intégrité référentielle** de l'ensemble chargé (miroir de `refs.ts`/`checkRefs`,
 *     en mémoire : les ids référencés par method/team/binding existent dans les pools chargés).
 *
 * Défensif (esprit cœur) : jamais d'exception ; un atome illisible est ignoré. `buildFrameInventory`
 * est **pur** (aucun I/O) → testable directement ; `loadFrame` n'ajoute que les appels backend.
 *
 * Périmètre LOT 1 : PAS d'entité Portfolio/Frame de 1er ordre (G6/LOT 2 séparé). Ici l'inventaire
 * est une structure de lecture simple, pas un conteneur modélisé dans `@iakaframe/core`.
 */
import {
  parseBinding,
  parseFrontmatter,
  parseMethodMd,
  parsePersona,
  parsePrinciple,
  parseRitual,
  parseScaffold,
  parseTeamMd,
  parseWorkflow,
  workflowById,
  type MethodMd,
  type TeamMd,
} from "@iakaframe/core";
import { backend, type Backend, type PoolType } from "../api/backend";

/** Les 8 types d'atomes de pool (lus en contenu sous `library/<type>/`, G1). */
export const POOL_FRAME_TYPES = [
  "personas",
  "roles",
  "principles",
  "rituals",
  "guardrails",
  "scaffolds",
  "workflows",
  "skills",
] as const satisfies readonly PoolType[];

/** Les 3 assemblages chargés à plat comme collections (`bindings` câblé par G2). */
export const COLLECTION_FRAME_TYPES = ["teams", "methods", "bindings"] as const;

/** Les 11 types d'un frame, dans l'ordre d'affichage (8 pools + 3 assemblages). */
export const FRAME_TYPES = [
  ...POOL_FRAME_TYPES,
  ...COLLECTION_FRAME_TYPES,
] as const;

export type PoolFrameType = (typeof POOL_FRAME_TYPES)[number];
export type CollectionFrameType = (typeof COLLECTION_FRAME_TYPES)[number];
export type FrameType = (typeof FRAME_TYPES)[number];

/** Une référence manquante détectée à l'intégrité (id référencé absent du pool chargé). */
export interface FrameMissingRef {
  /** Assemblage fautif (ex. `method:iakaframe`). */
  source: string;
  /** Champ porteur de la référence (ex. `principleIds`). */
  field: string;
  /** Id référencé introuvable. */
  id: string;
}

/** Rapport d'intégrité référentielle de l'ensemble chargé (critère B). */
export interface FrameIntegrityReport {
  ok: boolean;
  missing: FrameMissingRef[];
}

/** Inventaire d'un frame ouvert : racine + comptes des 11 types + intégrité (G3/G4/G5). */
export interface FrameInventory {
  /** Racine résolue (`IAKAFRAME_HOME`), ou `null` si non résolue. */
  root: string | null;
  /** Compte par type (les 11 clés toujours présentes). */
  counts: Record<FrameType, number>;
  /** Ids scannés par type de pool (servent l'intégrité). */
  poolIds: Record<PoolFrameType, string[]>;
  /** Intégrité référentielle de l'ensemble chargé. */
  integrity: FrameIntegrityReport;
}

/** Contenus `.md` bruts d'un frame, par type — entrée pure de `buildFrameInventory`. */
export interface FrameRaw {
  root: string | null;
  pools: Record<PoolFrameType, string[]>;
  teams: string[];
  methods: string[];
  bindings: string[];
}

/** Frontmatter d'un binding SF2 (schéma `assignments`, distinct du `bindings[]` du cœur). */
interface FrameBinding {
  id: string;
  methodId: string;
  teamId: string;
  personaIds: string[];
}

/** Extrait le trim d'une valeur de frontmatter si c'est une string non vide, sinon `null`. */
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/**
 * Id d'un atome de pool depuis son `.md`, par type. Utilise le parseur `@iakaframe/core`
 * lorsqu'il existe (persona/principle/ritual/scaffold/workflow → `.id`) ; pour `roles` l'id
 * référencé par `Method.roleKeys` est le **`key`** ; `guardrails`/`skills` n'ont pas de parseur
 * dédié → id de frontmatter. `null` si illisible (l'atome reste compté, mais hors intégrité).
 */
function poolAtomId(type: PoolFrameType, md: string): string | null {
  const { data } = parseFrontmatter(md);
  switch (type) {
    case "personas":
      return parsePersona(data)?.id ?? null;
    case "principles":
      return parsePrinciple(data)?.id ?? null;
    case "rituals":
      return parseRitual(data)?.id ?? null;
    case "scaffolds":
      return parseScaffold(data)?.id ?? null;
    case "workflows":
      return parseWorkflow(data)?.id ?? null;
    case "roles":
      return str(data.key) ?? str(data.id);
    case "guardrails":
    case "skills":
      return str(data.id);
  }
}

/** Parse un binding SF2 (frontmatter `assignments`). Passe par `parseBinding` (binding.ts) pour
 * l'id/teamId, complété par `methodId` + `personaIds` (schéma `assignments` propre au frame). */
function parseFrameBinding(md: string): FrameBinding | null {
  const { data } = parseFrontmatter(md);
  const core = parseBinding(data);
  const id = core?.id ?? str(data.id);
  if (!id) return null;
  const teamId = core?.teamId ?? str(data.teamId) ?? "";
  const methodId = str(data.methodId) ?? "";
  const assignments = Array.isArray(data.assignments) ? data.assignments : [];
  const personaIds = assignments
    .map((a) =>
      a && typeof a === "object" ? str((a as Record<string, unknown>).personaId) : null,
    )
    .filter((p): p is string => p !== null);
  return { id, methodId, teamId, personaIds };
}

/** Ajoute chaque id de `ids` absent de `set` à `missing`, étiqueté `source`/`field`. */
function needEach(
  missing: FrameMissingRef[],
  source: string,
  field: string,
  ids: readonly string[],
  set: Set<string>,
): void {
  for (const id of ids) {
    if (id && !set.has(id)) missing.push({ source, field, id });
  }
}

/**
 * Intégrité référentielle en mémoire (critère B), miroir des règles de `refs.ts`/`checkRefs` :
 *   - method : principleIds ⊆ principles, ritualIds ⊆ rituals, guardrailIds ⊆ guardrails,
 *     roleKeys ⊆ roles, scaffoldIds ⊆ scaffolds, workflowId résolu (pool ou catalogue du cœur) ;
 *   - team : personas ⊆ personas, coordinator ∈ personas ;
 *   - binding : methodId ∈ methods, teamId ∈ teams, personaIds ⊆ personas.
 */
export function checkFrameRefs(
  poolIds: Record<PoolFrameType, string[]>,
  methods: MethodMd[],
  teams: TeamMd[],
  bindings: FrameBinding[],
): FrameIntegrityReport {
  const missing: FrameMissingRef[] = [];
  const personas = new Set(poolIds.personas);
  const principles = new Set(poolIds.principles);
  const rituals = new Set(poolIds.rituals);
  const guardrails = new Set(poolIds.guardrails);
  const roles = new Set(poolIds.roles);
  const scaffolds = new Set(poolIds.scaffolds);
  const workflows = new Set(poolIds.workflows);
  const methodIds = new Set(methods.map((m) => m.id));
  const teamIds = new Set(teams.map((t) => t.id));

  for (const m of methods) {
    const src = `method:${m.id}`;
    needEach(missing, src, "principleIds", m.principleIds, principles);
    needEach(missing, src, "ritualIds", m.ritualIds, rituals);
    needEach(missing, src, "guardrailIds", m.guardrailIds, guardrails);
    needEach(missing, src, "roleKeys", m.roleKeys, roles);
    needEach(missing, src, "scaffoldIds", m.scaffoldIds, scaffolds);
    const wf = m.workflowId?.trim();
    if (wf && !workflows.has(wf) && workflowById(wf) === undefined) {
      missing.push({ source: src, field: "workflowId", id: wf });
    }
  }

  for (const t of teams) {
    const src = `team:${t.id}`;
    if (t.coordinator && !personas.has(t.coordinator)) {
      missing.push({ source: src, field: "coordinator", id: t.coordinator });
    }
    needEach(missing, src, "personas", t.personas, personas);
  }

  for (const b of bindings) {
    const src = `binding:${b.id}`;
    if (b.methodId && !methodIds.has(b.methodId)) {
      missing.push({ source: src, field: "methodId", id: b.methodId });
    }
    if (b.teamId && !teamIds.has(b.teamId)) {
      missing.push({ source: src, field: "teamId", id: b.teamId });
    }
    needEach(missing, src, "personaId", b.personaIds, personas);
  }

  return { ok: missing.length === 0, missing };
}

/** Construit l'inventaire (PUR, sans I/O) depuis les contenus `.md` bruts d'un frame. */
export function buildFrameInventory(raw: FrameRaw): FrameInventory {
  const poolIds = {} as Record<PoolFrameType, string[]>;
  const counts = {} as Record<FrameType, number>;
  for (const type of POOL_FRAME_TYPES) {
    const mds = raw.pools[type] ?? [];
    counts[type] = mds.length;
    poolIds[type] = mds
      .map((md) => poolAtomId(type, md))
      .filter((id): id is string => id !== null);
  }

  const methods = raw.methods
    .map((md) => parseMethodMd(md))
    .filter((m): m is MethodMd => m !== null);
  const teams = raw.teams
    .map((md) => parseTeamMd(md))
    .filter((t): t is TeamMd => t !== null);
  const bindings = raw.bindings
    .map((md) => parseFrameBinding(md))
    .filter((b): b is FrameBinding => b !== null);

  counts.teams = teams.length;
  counts.methods = methods.length;
  counts.bindings = bindings.length;

  return {
    root: raw.root,
    counts,
    poolIds,
    integrity: checkFrameRefs(poolIds, methods, teams, bindings),
  };
}

/**
 * Charge le frame de la racine courante (`IAKAFRAME_HOME`) : lit les 8 pools en contenu (`poolReadAll`,
 * G1) + les 3 assemblages (`libraryList`, `bindings` câblé G2), puis assemble l'inventaire. Défensif :
 * chaque lecture qui échoue dégrade en `[]` (l'inventaire reste cohérent). Backend injectable (tests).
 */
export async function loadFrame(api: Backend = backend): Promise<FrameInventory> {
  const root = await api.iakaframeHome().catch(() => null);
  const pools = {} as Record<PoolFrameType, string[]>;
  await Promise.all(
    POOL_FRAME_TYPES.map(async (type) => {
      pools[type] = await api.poolReadAll(type).catch(() => []);
    }),
  );
  const [teams, methods, bindings] = await Promise.all([
    api.libraryList("teams").catch(() => []),
    api.libraryList("methods").catch(() => []),
    api.libraryList("bindings").catch(() => []),
  ]);
  return buildFrameInventory({ root, pools, teams, methods, bindings });
}
