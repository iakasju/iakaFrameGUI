/**
 * frame.ts — le **Frame** : conteneur de 1er ordre au-dessus de Method/Team/Binding (G6/LOT 2) —
 * cœur 🟦. Promotion du socle de lecture `src/forge/frame.ts` (G3/G4/G5) en **entité modélisée**
 * dans `@iakaframe/core`, enrichie de l'**assemblage résolu** (method + team + binding) et de la
 * **facette portefeuille** (l'étage Odin).
 *
 * Un frame = une racine `IAKAFRAME_HOME` qui expose **11 types** : les **8 atomes de pool** sous
 * `library/<type>/` + les **3 assemblages** `teams`/`methods`/`bindings` à plat. Ce module porte,
 * **sans aucun I/O** (l'I/O reste dans la forge, `loadFrame`) :
 *   - la **taxonomie des 11 types** (`POOL_FRAME_TYPES`/`COLLECTION_FRAME_TYPES`/`FRAME_TYPES`),
 *     **découplée du backend** : ce sont des littéraux `const` autonomes (le cœur ne dépend
 *     d'aucun enum `PoolType`) ; la compat avec l'enum backend est ré-assertée côté forge ;
 *   - l'**intégrité référentielle** (`FrameMissingRef`/`FrameIntegrityReport`/`checkFrameRefs`) ;
 *   - le schéma de **binding SF2** (`FrameBinding`/`parseFrameBinding`, schéma `assignments`,
 *     **distinct** du `Binding` E1 du cœur qui porte `bindings[]`) ;
 *   - l'**assemblage** `buildFrame(raw): Frame` (pur, promotion de `buildFrameInventory`) +
 *     la garde défensive `parseFrame(raw): Frame | null`.
 *
 * Esprit du cœur : type pur + parseurs défensifs qui **ne jettent JAMAIS** — `buildFrame` dégrade
 * proprement (atome/assemblage illisible → ignoré ; facette non trouvée → `null`) ; `parseFrame`
 * calque le contrat des `parse*` (record invalide → `null`).
 */

import { parseFrontmatter } from "./frontmatter";
import { parseMethodMd, parseTeamMd, type MethodMd, type TeamMd } from "./frontmatter";
import { parseBinding } from "./binding";
import { parsePersona } from "./persona";
import { parsePrinciple } from "./principle";
import { parseRitual } from "./ritual";
import { parseScaffold, PORTFOLIO_SCAFFOLD } from "./scaffold";
import { parseWorkflow, workflowById } from "./workflow";

// ---------------------------------------------------------------------------
// 1. Taxonomie des 11 types — littéraux autonomes (DÉCOUPLÉS du backend `PoolType`).
// ---------------------------------------------------------------------------

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
] as const;

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

// ---------------------------------------------------------------------------
// 2. Intégrité référentielle (critère B) — miroir en mémoire de `refs.ts`/`checkRefs`.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 3. Binding SF2 (`assignments`) — DISTINCT du `Binding` E1 du cœur (`bindings[]`).
// ---------------------------------------------------------------------------

/** Frontmatter d'un binding SF2 (schéma `assignments`, distinct du `bindings[]` du cœur). */
export interface FrameBinding {
  id: string;
  methodId: string;
  teamId: string;
  personaIds: string[];
}

// ---------------------------------------------------------------------------
// 4. Schéma de l'entité — assemblage résolu + facette portefeuille + inventaire + intégrité.
// ---------------------------------------------------------------------------

/** L'assemblage résolu d'un frame (mono-méthode / mono-team au MVP). */
export interface FrameAssembly {
  /** Le binding, pivot de l'appariement (schéma SF2 `assignments`). `null` si aucun. */
  binding: FrameBinding | null;
  /** La méthode résolue depuis `binding.methodId` (repli : 1re méthode chargée). `null` si aucune. */
  method: MethodMd | null;
  /** La team résolue depuis `binding.teamId` (repli : 1re team chargée). `null` si aucune. */
  team: TeamMd | null;
}

/** La facette PORTEFEUILLE (l'étage Odin) — dérivée, jamais un nouvel I/O. */
export interface FramePortfolioFacet {
  /** Id du scaffold de niveau `portfolio` présent dans le frame (par `level`), sinon `null`. */
  scaffoldId: string | null;
  /** Id de la persona du rôle `portefeuille` (« Odin » par défaut, détectée par RÔLE), sinon `null`. */
  personaId: string | null;
  /** Backlog transverse : entrée `BACKLOG.md` (dérivée de `PORTFOLIO_SCAFFOLD`), sinon `null`. */
  backlog: string | null;
}

/** Le **Frame** : conteneur de 1er ordre au-dessus de Method/Team/Binding (G6). */
export interface Frame {
  /** Racine résolue (`IAKAFRAME_HOME`), ou `null`. */
  root: string | null;
  /** Inventaire des 11 types (les 11 clés toujours présentes) — critère A. */
  counts: Record<FrameType, number>;
  /** Ids scannés par pool (servent l'intégrité ET la détection de facette). */
  poolIds: Record<PoolFrameType, string[]>;
  /** L'assemblage résolu (method + team + binding). */
  assembly: FrameAssembly;
  /** La facette portefeuille (scaffold portfolio + persona du rôle portefeuille + backlog). */
  portfolio: FramePortfolioFacet;
  /** Intégrité référentielle exécutée DANS le périmètre de ce frame — critère B. */
  integrity: FrameIntegrityReport;
}

/** Contenus `.md` bruts d'un frame, par type — entrée pure de `buildFrame`. */
export interface FrameRaw {
  root: string | null;
  pools: Record<PoolFrameType, string[]>;
  teams: string[];
  methods: string[];
  bindings: string[];
}

/**
 * Entrée `BACKLOG.md` **dérivée** du `PORTFOLIO_SCAFFOLD` (chemin canonique du backlog transverse).
 * Valeur, pas un I/O : c'est la source de `FramePortfolioFacet.backlog` quand un scaffold
 * `portfolio` est présent (repli `"BACKLOG.md"` si l'entrée canonique venait à changer).
 */
export const PORTFOLIO_BACKLOG_ENTRY: string =
  PORTFOLIO_SCAFFOLD.entries.find((e) => e.path.endsWith("BACKLOG.md"))?.path ??
  "BACKLOG.md";

// ---------------------------------------------------------------------------
// 5. Helpers défensifs (jamais d'exception).
// ---------------------------------------------------------------------------

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

/**
 * Parse un binding SF2 (frontmatter `assignments`). Passe par `parseBinding` (binding.ts) pour
 * l'id/teamId, complété par `methodId` + `personaIds` (schéma `assignments` propre au frame).
 * Défensif : `null` si aucun `id` exploitable.
 */
export function parseFrameBinding(md: string): FrameBinding | null {
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

// ---------------------------------------------------------------------------
// 6. Intégrité + assemblage + facette (purs).
// ---------------------------------------------------------------------------

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

/**
 * Résout l'assemblage (mono-frame) : le 1er binding est le pivot ; method/team sont résolus par
 * `binding.methodId`/`teamId` dans ce qui est chargé, avec repli sur la 1re method/team. Sans
 * binding, on retombe sur la 1re method/team chargée. Jamais d'exception (tout `null` si vide).
 */
function resolveAssembly(
  methods: MethodMd[],
  teams: TeamMd[],
  bindings: FrameBinding[],
): FrameAssembly {
  const binding = bindings[0] ?? null;
  const method = binding
    ? methods.find((m) => m.id === binding.methodId) ?? methods[0] ?? null
    : methods[0] ?? null;
  const team = binding
    ? teams.find((t) => t.id === binding.teamId) ?? teams[0] ?? null
    : teams[0] ?? null;
  return { binding, method, team };
}

/**
 * Détecte la facette portefeuille depuis les `md` **déjà chargés** (aucun I/O neuf) :
 *   - scaffold : 1er atome `scaffolds` dont `parseScaffold(...).level === "portfolio"` → son id ;
 *   - persona : 1er atome `personas` dont `parsePersona(...).roleKey === "portefeuille"` → son id
 *     (**par RÔLE**, jamais par le nom « odin » — robuste au renommage) ;
 *   - backlog : `PORTFOLIO_BACKLOG_ENTRY` si un scaffold `portfolio` est présent, sinon `null`.
 */
function detectPortfolioFacet(raw: FrameRaw): FramePortfolioFacet {
  let scaffoldId: string | null = null;
  for (const md of raw.pools.scaffolds ?? []) {
    const { data } = parseFrontmatter(md);
    const sc = parseScaffold(data);
    if (sc && sc.level === "portfolio") {
      scaffoldId = sc.id;
      break;
    }
  }
  let personaId: string | null = null;
  for (const md of raw.pools.personas ?? []) {
    const { data } = parseFrontmatter(md);
    const p = parsePersona(data);
    if (p && p.roleKey === "portefeuille") {
      personaId = p.id;
      break;
    }
  }
  const backlog = scaffoldId !== null ? PORTFOLIO_BACKLOG_ENTRY : null;
  return { scaffoldId, personaId, backlog };
}

// ---------------------------------------------------------------------------
// 7. Assemblage (buildFrame) — pur, promotion de `buildFrameInventory` (jamais d'exception).
// ---------------------------------------------------------------------------

/**
 * Construit le **Frame** (PUR, sans I/O) depuis les contenus `.md` bruts. Reprend à l'identique le
 * comptage (G5 : `workflows` compté **une fois**, l'atome de pool) et l'intégrité (`checkFrameRefs`)
 * du socle, **plus** l'assemblage résolu et la facette portefeuille. Défensif : un atome/assemblage
 * illisible est ignoré ; la facette non trouvée → champs `null` ; jamais d'exception, jamais `null`.
 */
export function buildFrame(raw: FrameRaw): Frame {
  const poolIds = {} as Record<PoolFrameType, string[]>;
  const counts = {} as Record<FrameType, number>;
  for (const type of POOL_FRAME_TYPES) {
    const mds = raw.pools[type] ?? [];
    counts[type] = mds.length;
    poolIds[type] = mds
      .map((md) => poolAtomId(type, md))
      .filter((id): id is string => id !== null);
  }

  const methods = (raw.methods ?? [])
    .map((md) => parseMethodMd(md))
    .filter((m): m is MethodMd => m !== null);
  const teams = (raw.teams ?? [])
    .map((md) => parseTeamMd(md))
    .filter((t): t is TeamMd => t !== null);
  const bindings = (raw.bindings ?? [])
    .map((md) => parseFrameBinding(md))
    .filter((b): b is FrameBinding => b !== null);

  counts.teams = teams.length;
  counts.methods = methods.length;
  counts.bindings = bindings.length;

  return {
    root: raw.root,
    counts,
    poolIds,
    assembly: resolveAssembly(methods, teams, bindings),
    portfolio: detectPortfolioFacet(raw),
    integrity: checkFrameRefs(poolIds, methods, teams, bindings),
  };
}

// ---------------------------------------------------------------------------
// 8. Garde défensive de symétrie — parseFrame(unknown): Frame | null (critère F).
// ---------------------------------------------------------------------------

/** Coerce une valeur brute en `string[]` (ignore non-string / vides). */
function coerceStringArray(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];
}

/** Est-ce un record simple (objet non-null, non-tableau) ? */
function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}

/** Coerce la facette portefeuille (champs `string | null`), défaut tout `null`. */
function coercePortfolio(raw: unknown): FramePortfolioFacet {
  if (!isRecord(raw)) return { scaffoldId: null, personaId: null, backlog: null };
  return {
    scaffoldId: str(raw.scaffoldId),
    personaId: str(raw.personaId),
    backlog: str(raw.backlog),
  };
}

/** Coerce l'intégrité (`ok` booléen + `missing` filtré), défaut `{ ok: true, missing: [] }`. */
function coerceIntegrity(raw: unknown): FrameIntegrityReport {
  if (!isRecord(raw)) return { ok: true, missing: [] };
  const missing = Array.isArray(raw.missing)
    ? raw.missing
        .map((m): FrameMissingRef | null => {
          if (!isRecord(m)) return null;
          const source = str(m.source);
          const field = str(m.field);
          const id = str(m.id);
          return source && field && id ? { source, field, id } : null;
        })
        .filter((m): m is FrameMissingRef => m !== null)
    : [];
  return { ok: raw.ok === true && missing.length === 0, missing };
}

/**
 * Garde défensive de symétrie (esprit cœur, critère F) : `raw` non-objet / `null` / tableau /
 * forme inexploitable (pas de `counts` objet) → **`null`** (jamais d'exception) ; sinon coercition
 * défensive vers un `Frame` sûr (comptes manquants → `0` ; facette absente → `null` ; intégrité
 * absente → `{ ok: true, missing: [] }`). Au MVP le Frame n'est pas persisté : garde minimale,
 * pas un désérialiseur lourd (l'assemblage `method`/`team`/`binding` n'est pas reconstruit ici).
 */
export function parseFrame(raw: unknown): Frame | null {
  if (!isRecord(raw)) return null;
  // Un Frame plausible porte au moins un `counts` objet (sinon forme inexploitable → null).
  if (!isRecord(raw.counts)) return null;
  const rawCounts = raw.counts;

  const counts = {} as Record<FrameType, number>;
  for (const type of FRAME_TYPES) {
    const v = rawCounts[type];
    counts[type] = typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
  }

  const rawPools = isRecord(raw.poolIds) ? raw.poolIds : {};
  const poolIds = {} as Record<PoolFrameType, string[]>;
  for (const type of POOL_FRAME_TYPES) {
    poolIds[type] = coerceStringArray(rawPools[type]);
  }

  return {
    root: typeof raw.root === "string" ? raw.root : null,
    counts,
    poolIds,
    assembly: { binding: null, method: null, team: null },
    portfolio: coercePortfolio(raw.portfolio),
    integrity: coerceIntegrity(raw.integrity),
  };
}
