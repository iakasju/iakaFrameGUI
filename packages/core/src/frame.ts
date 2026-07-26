/**
 * frame.ts — le **Frame** : conteneur de 1er ordre au-dessus de Method/Team/Binding (G6/LOT 2) —
 * cœur 🟦. Promotion du socle de lecture `src/forge/frame.ts` (G3/G4/G5) en **entité modélisée**
 * dans `@iakaframe/core`, enrichie de l'**assemblage résolu** (method + team + binding) et de la
 * **facette portefeuille** (l'étage Odin).
 *
 * Un frame = une racine `IAKAFRAME_HOME` qui expose **12 types** : les **8 atomes de pool** sous
 * `library/<type>/` + les **4 assemblages** `teams`/`methods`/`bindings`/`frames` à plat (le type
 * `frames` = AR-1, réservoir de frames). Ce module porte, **sans aucun I/O** (l'I/O reste dans la
 * forge, `loadFrame`) :
 *   - la **taxonomie des 12 types** (`POOL_FRAME_TYPES`/`COLLECTION_FRAME_TYPES`/`FRAME_TYPES`),
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
import { parseBinding, parseTools } from "./binding";
import { parsePersona, type Persona } from "./persona";
import { parsePrinciple, type Principle } from "./principle";
import { parseRitual, type Ritual } from "./ritual";
import { parseScaffold, PORTFOLIO_SCAFFOLD, type Scaffold } from "./scaffold";
import { parseWorkflow, workflowById } from "./workflow";

// ---------------------------------------------------------------------------
// 1. Taxonomie des 12 types — littéraux autonomes (DÉCOUPLÉS du backend `PoolType`).
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

/**
 * Les 4 assemblages chargés à plat comme collections (`bindings` câblé par G2, `frames` = AR-1).
 * `frames` = réservoir de frames : descripteurs `<id>.md` (method+team nommés) à plat, miroir de
 * teams/methods/bindings. Note d'asymétrie `kits` : côté CLI la table `COLLECTIONS` porte `kits`
 * (13 collections) ; côté GUI `kits` n'est PAS un `FrameType` → 12 types (8 pools + 4 collections).
 */
export const COLLECTION_FRAME_TYPES = ["teams", "methods", "bindings", "frames"] as const;

/** Les 12 types d'un frame, dans l'ordre d'affichage (8 pools + 4 assemblages). */
export const FRAME_TYPES = [
  ...POOL_FRAME_TYPES,
  ...COLLECTION_FRAME_TYPES,
] as const;

export type PoolFrameType = (typeof POOL_FRAME_TYPES)[number];
export type CollectionFrameType = (typeof COLLECTION_FRAME_TYPES)[number];
export type FrameType = (typeof FRAME_TYPES)[number];

/**
 * Libellés FR des 12 types de frame — **source unique** (à côté de `FRAME_TYPES`), réutilisée par
 * l'affichage de l'element pool (`element-pool.ts`) ET par la GUI (`OpenFramePanel`). Zéro doublon :
 * les consommateurs importent cette map plutôt que de la redéfinir localement. Clés = exactement les
 * 12 `FRAME_TYPES` (le type `Record<FrameType, string>` garantit qu'aucune clé ne manque ni n'est en trop).
 */
export const FRAME_TYPE_LABELS: Record<FrameType, string> = {
  personas: "Personas",
  roles: "Rôles",
  principles: "Principes",
  rituals: "Rituels",
  guardrails: "Gardes-fous",
  scaffolds: "Scaffolds",
  workflows: "Workflows",
  skills: "Skills",
  teams: "Teams",
  methods: "Méthodes",
  bindings: "Bindings",
  frames: "Frames",
};

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

/**
 * Un **assignment** d'un binding SF2 : le **triplet du modèle persona** `{runner, model, tools}`
 * conservé au parse (T4 — SF2 n'ampute plus). `runner`/`model` ne sont **pas validés ici** (le
 * vocab est ré-asserté au host) ; `tools` est une allowlist runner-scoped (via `parseTools`).
 */
export interface FrameAssignment {
  personaId: string;
  runner: string;
  model: string;
  tools: string[];
}

/** Frontmatter d'un binding SF2 (schéma `assignments`, distinct du `bindings[]` du cœur). */
export interface FrameBinding {
  id: string;
  methodId: string;
  teamId: string;
  /** Assignments typés porteurs du triplet `{runner, model, tools}` (T2/T4). */
  assignments: FrameAssignment[];
  /** Dérivé (`assignments.map(a => a.personaId)`) — sert l'intégrité `binding→personaId`. */
  personaIds: string[];
}

/**
 * Descripteur d'une **frame** (type `frames`, AR-1 — réservoir de frames) : un **assemblage nommé**
 * = un tuple d'ids (`methodId` + `teamId`) piochant dans la library partagée. N'a **pas** de copie
 * de briques (I1/E2 : ids seulement). `default: true` désigne la frame héritée / le repli.
 */
export interface FrameDescriptor {
  id: string;
  name: string;
  version: string;
  methodId: string;
  teamId: string;
  default: boolean;
}

/** Références sortantes d'une skill (composition `subskills`) — pour l'intégrité (T3/B). */
export interface SkillRefs {
  id: string;
  subskills: string[];
}

/** Références sortantes d'un workflow (`agentsRoleKeys` agrégés) — pour l'intégrité (T5). */
export interface WorkflowRefs {
  id: string;
  roleKeys: string[];
  /**
   * `soleActor` (Finding 3, D-6) : marque N=1 du modèle agnostique — une **réf persona** que rien
   * ne contrôlait, exactement comme les `actorsRoleKeys` avant v0.26.0. `null` si absent. Vérifiée
   * comme ref persona à l'intégrité (ferme le trou des deux côtés, parité CLI↔GUI).
   */
  soleActor: string | null;
}

// ---------------------------------------------------------------------------
// 4. Schéma de l'entité — assemblage résolu + facette portefeuille + inventaire + intégrité.
// ---------------------------------------------------------------------------

/**
 * L'assemblage résolu d'un frame. **Multi-frame (AR-1)** : le pivot est la **frame active** parmi
 * N (la frame `default`, ou la 1re chargée à défaut) — plus `bindings[0]`. `method`/`team`/`binding`
 * sont résolus depuis les ids de la frame active ; repli legacy (`bindings[0]`) quand aucune frame
 * n'est déclarée (zéro régression sur les racines sans descripteur `frames`).
 */
export interface FrameAssembly {
  /** La frame active, pivot de l'assemblage (descripteur `frames`). `null` si aucune déclarée. */
  frame: FrameDescriptor | null;
  /** Le binding apparié (schéma SF2 `assignments`). `null` si aucun. */
  binding: FrameBinding | null;
  /** La méthode résolue depuis `frame.methodId`/`binding.methodId` (repli : 1re). `null` si aucune. */
  method: MethodMd | null;
  /** La team résolue depuis `frame.teamId`/`binding.teamId` (repli : 1re). `null` si aucune. */
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
  /**
   * Les personas **réelles parsées** du pool `personas` (promotion de la `personaList` déjà calculée
   * pour l'intégrité, aujourd'hui jetée). **Pure addition dérivée** (AR-2) : source unique des fiches
   * du réservoir — royaume/pastille/skills/guardrails/mission viennent des `.md`, jamais d'une table
   * synthétique. Ordre = ordre de chargement du pool. Vide si aucune persona (jamais inventée).
   */
  personas: Persona[];
  /**
   * Les **principes réels parsés** du pool `principles` (Lot 5b — promotion, à la manière de
   * `personas`). **Pure addition dérivée** : source unique des fiches du réservoir de principes
   * (label/policy/trigger viennent des `.md`, jamais du catalogue synthétique). Ordre = ordre de
   * chargement. Vide si aucun principe.
   */
  principles: Principle[];
  /** Les **rituels réels parsés** du pool `rituals` (Lot 5b, même promotion que `principles`). */
  rituals: Ritual[];
  /** Les **scaffolds réels parsés** du pool `scaffolds` (Lot 5b, même promotion que `principles`). */
  scaffolds: Scaffold[];
  /** L'assemblage résolu (method + team + binding). */
  assembly: FrameAssembly;
  /**
   * Les descripteurs du **réservoir de frames** (type `frames`, AR-1), dans l'ordre de chargement.
   * Exposés parce que **choisir** une frame active suppose de pouvoir les **lister** :
   * `assembly.frame` ne dit que celle qui est active. Vide si la racine n'en déclare aucune.
   */
  frames: FrameDescriptor[];
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
  /** Descripteurs de frames (type `frames`, AR-1). Optionnel : absent = racine sans réservoir. */
  frames?: string[];
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
  const rawAssignments = Array.isArray(data.assignments) ? data.assignments : [];
  const assignments: FrameAssignment[] = rawAssignments
    .map((a): FrameAssignment | null => {
      if (!a || typeof a !== "object") return null;
      const r = a as Record<string, unknown>;
      const personaId = str(r.personaId);
      if (!personaId) return null;
      // Triplet conservé (T4) : runner/model défensifs (non validés ici) ; tools via parseTools.
      return {
        personaId,
        runner: str(r.runner) ?? "",
        model: str(r.model) ?? "",
        tools: parseTools(r.tools),
      };
    })
    .filter((a): a is FrameAssignment => a !== null);
  const personaIds = assignments.map((a) => a.personaId);
  return { id, methodId, teamId, assignments, personaIds };
}

/**
 * Parse un descripteur de **frame** (type `frames`, AR-1) depuis son `.md` (frontmatter). Défensif :
 * `null` si pas d'`id` exploitable. `default` est coercé en booléen ; `name`/`version`/`methodId`/
 * `teamId` retombent sur `""` s'ils manquent (le descripteur reste comptabilisé mais l'intégrité le
 * signalera). Un descripteur ne porte **que des ids** (I1/E2), jamais de corps recopié.
 */
export function parseFrameDescriptor(md: string): FrameDescriptor | null {
  const { data } = parseFrontmatter(md);
  const id = str(data.id);
  if (!id) return null;
  return {
    id,
    name: str(data.name) ?? "",
    version: str(data.version) ?? "",
    methodId: str(data.methodId) ?? "",
    teamId: str(data.teamId) ?? "",
    default: data.default === true,
  };
}

/**
 * Références d'une skill depuis son `SKILL.md` (frontmatter). `subskills` (optionnel, absent =
 * skill atomique) est coercé en `string[]` défensivement. `null` si pas d'`id` exploitable.
 */
export function parseSkillRefs(md: string): SkillRefs | null {
  const { data } = parseFrontmatter(md);
  const id = str(data.id);
  if (!id) return null;
  return { id, subskills: coerceStringArray(data.subskills) };
}

/**
 * Références d'un workflow depuis son `.md` (frontmatter) : agrège le champ d'acteurs de chaque étape.
 * Lecture **ALIAS-AWARE** du modèle agnostique (correction-biais-modele-frame.md § 3.1), miroir exact
 * du CLI (`frame-lint.js` `workflowRoleKeys`) :
 *   - conteneur d'étapes unifié : `phases` (canon, A-1) OU `stages` (alias Kanban) ;
 *   - champ d'acteurs unifié : `actorsRoleKeys` (canon, A-2) OU `agentsRoleKeys` (alias rétro-compat).
 * Avant ce lot, seul `phases[].agentsRoleKeys` était lu : les refs d'acteurs des 8 frames forgés
 * (`actorsRoleKeys`, et `stages` pour Kanban) échappaient à l'intégrité (§ 1.3). Dédupliqué, défensif ;
 * `null` si pas d'`id`. Distinct du `roleKeys` calibré rendu par `parseWorkflow`.
 */
export function parseWorkflowRefs(md: string): WorkflowRefs | null {
  const { data } = parseFrontmatter(md);
  const id = str(data.id);
  if (!id) return null;
  const roleKeys: string[] = [];
  const rawSteps = data.phases != null ? data.phases : data.stages;
  const steps = Array.isArray(rawSteps) ? rawSteps : [];
  for (const ph of steps) {
    if (ph && typeof ph === "object") {
      const r = ph as Record<string, unknown>;
      const actors = r.actorsRoleKeys != null ? r.actorsRoleKeys : r.agentsRoleKeys;
      for (const k of coerceStringArray(actors)) {
        if (!roleKeys.includes(k)) roleKeys.push(k);
      }
    }
  }
  return { id, roleKeys, soleActor: str(data.soleActor) };
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
 * Intégrité référentielle en mémoire (critère B), miroir des règles de `refs.ts`/`checkRefs`.
 * **Noyau** (toujours) :
 *   - method : principleIds ⊆ principles, ritualIds ⊆ rituals, guardrailIds ⊆ guardrails,
 *     roleKeys ⊆ roles, scaffoldIds ⊆ scaffolds, workflowId résolu (pool ou catalogue du cœur) ;
 *   - team : personas ⊆ personas, coordinator ∈ personas, **guardrails ⊆ guardrails (T6)** ;
 *   - binding : methodId ∈ methods, teamId ∈ teams, personaIds ⊆ personas.
 * **Trous d'audit comblés** (paramètres optionnels — omis = aucun contrôle, rétro-compat) :
 *   - persona (T1) : roleKey ∈ roles, skills ⊆ skills, guardrails ⊆ guardrails ;
 *   - workflow (T5) : agentsRoleKeys ⊆ roles ;
 *   - skill (T3/B) : subskills ⊆ skills, **anti-self-ref** (id ∉ subskills).
 */
export function checkFrameRefs(
  poolIds: Record<PoolFrameType, string[]>,
  methods: MethodMd[],
  teams: TeamMd[],
  bindings: FrameBinding[],
  personaList: Persona[] = [],
  workflowRefs: WorkflowRefs[] = [],
  skillRefs: SkillRefs[] = [],
): FrameIntegrityReport {
  const missing: FrameMissingRef[] = [];
  const personas = new Set(poolIds.personas);
  const principles = new Set(poolIds.principles);
  const rituals = new Set(poolIds.rituals);
  const guardrails = new Set(poolIds.guardrails);
  const roles = new Set(poolIds.roles);
  const scaffolds = new Set(poolIds.scaffolds);
  const workflows = new Set(poolIds.workflows);
  const skills = new Set(poolIds.skills);
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
    needEach(missing, src, "guardrails", t.guardrails, guardrails); // T6
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

  // T1 — persona → { roleKey ∈ roles, skills ⊆ skills, guardrails ⊆ guardrails }.
  for (const p of personaList) {
    const src = `persona:${p.id}`;
    if (p.roleKey && !roles.has(p.roleKey)) {
      missing.push({ source: src, field: "roleKey", id: p.roleKey });
    }
    needEach(missing, src, "skills", p.skills, skills);
    needEach(missing, src, "guardrails", p.guardrails, guardrails);
  }

  // T5 — workflow → agentsRoleKeys ⊆ roles ; soleActor ∈ personas (Finding 3, D-6).
  for (const w of workflowRefs) {
    needEach(missing, `workflow:${w.id}`, "agentsRoleKeys", w.roleKeys, roles);
    if (w.soleActor && !personas.has(w.soleActor)) {
      missing.push({ source: `workflow:${w.id}`, field: "soleActor", id: w.soleActor });
    }
  }

  // T3/B — skill → subskills ⊆ skills, anti-self-ref (id ∉ subskills).
  for (const s of skillRefs) {
    const src = `skill:${s.id}`;
    if (s.subskills.includes(s.id)) {
      missing.push({ source: src, field: "subskills", id: s.id }); // self-ref signalée
    }
    needEach(missing, src, "subskills", s.subskills.filter((x) => x !== s.id), skills);
  }

  return { ok: missing.length === 0, missing };
}

/**
 * Le pointeur désigne-t-il une frame **absente** du réservoir chargé ? Sert le message d'alerte
 * (I-4) : on retombe sur le défaut, mais on **le dit** — un pointeur mort qui bascule en silence
 * afficherait un assemblage juste pour une frame que l'utilisateur ne croit pas active.
 *
 * `false` si aucun pointeur n'est posé (cas nominal) ou si la frame pointée existe.
 */
export function activeFrameIsDangling(
  frames: readonly FrameDescriptor[],
  activeFrameId?: string | null,
): boolean {
  if (!activeFrameId) return false;
  return !frames.some((f) => f.id === activeFrameId);
}

/**
 * Résout l'assemblage **multi-frame (AR-1)** : le pivot est la **frame active** parmi N. L'ordre de
 * résolution est **le pointeur d'abord**, puis le défaut du réservoir :
 *
 *   1. `activeFrameId` — le **pointeur de frame active** du projet (`iakaframe.json`, clé `frame`) ;
 *   2. la frame `default: true` du réservoir ;
 *   3. la 1re chargée.
 *
 * **Sans pointeur, le comportement est celui d'avant, à l'identique** (invariant I-3). Un pointeur
 * qui désigne une frame **absente** est ignoré au profit du défaut — l'appelant le signale à
 * l'utilisateur via {@link activeFrameIsDangling} : jamais un écran silencieusement faux (I-4).
 *
 * **Repli legacy — zéro régression :** sans aucun descripteur `frames`, on retombe sur le
 * comportement mono-frame historique (le 1er binding est le pivot ; method/team depuis le binding).
 * Jamais d'exception (tout `null` si vide).
 */
function resolveAssembly(
  methods: MethodMd[],
  teams: TeamMd[],
  bindings: FrameBinding[],
  frames: FrameDescriptor[] = [],
  activeFrameId?: string | null,
): FrameAssembly {
  const pointed = activeFrameId
    ? (frames.find((f) => f.id === activeFrameId) ?? null)
    : null;
  const active = pointed ?? frames.find((f) => f.default) ?? frames[0] ?? null;

  if (active) {
    // Pivot = frame active : method/team par ses ids ; binding apparié au couple (repli 1er binding).
    const method =
      methods.find((m) => m.id === active.methodId) ?? methods[0] ?? null;
    const team = teams.find((t) => t.id === active.teamId) ?? teams[0] ?? null;
    const binding =
      bindings.find(
        (b) => b.methodId === active.methodId && b.teamId === active.teamId,
      ) ??
      bindings[0] ??
      null;
    return { frame: active, binding, method, team };
  }

  // Repli legacy (aucune frame déclarée) : le 1er binding est le pivot.
  const binding = bindings[0] ?? null;
  const method = binding
    ? methods.find((m) => m.id === binding.methodId) ?? methods[0] ?? null
    : methods[0] ?? null;
  const team = binding
    ? teams.find((t) => t.id === binding.teamId) ?? teams[0] ?? null
    : teams[0] ?? null;
  return { frame: null, binding, method, team };
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
export function buildFrame(raw: FrameRaw, activeFrameId?: string | null): Frame {
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
  const frames = (raw.frames ?? [])
    .map((md) => parseFrameDescriptor(md))
    .filter((f): f is FrameDescriptor => f !== null);

  // Références sortantes des atomes de pool à intégrité étendue (T1/T5/T3), depuis les `md` déjà lus.
  const personaList = (raw.pools.personas ?? [])
    .map((md) => parsePersona(parseFrontmatter(md).data))
    .filter((p): p is Persona => p !== null);
  // Lot 5b — promotion des 3 pools plats à parseur (même patron que `personaList`) : source réelle
  // des fiches de leurs réservoirs, dérivée des `.md`, jamais du catalogue synthétique.
  const principleList = (raw.pools.principles ?? [])
    .map((md) => parsePrinciple(parseFrontmatter(md).data))
    .filter((p): p is Principle => p !== null);
  const ritualList = (raw.pools.rituals ?? [])
    .map((md) => parseRitual(parseFrontmatter(md).data))
    .filter((r): r is Ritual => r !== null);
  const scaffoldList = (raw.pools.scaffolds ?? [])
    .map((md) => parseScaffold(parseFrontmatter(md).data))
    .filter((s): s is Scaffold => s !== null);
  const workflowRefs = (raw.pools.workflows ?? [])
    .map((md) => parseWorkflowRefs(md))
    .filter((w): w is WorkflowRefs => w !== null);
  const skillRefs = (raw.pools.skills ?? [])
    .map((md) => parseSkillRefs(md))
    .filter((s): s is SkillRefs => s !== null);

  counts.teams = teams.length;
  counts.methods = methods.length;
  counts.bindings = bindings.length;
  counts.frames = frames.length;

  return {
    root: raw.root,
    counts,
    poolIds,
    // AR-2 : la liste riche déjà parsée pour l'intégrité est PROMUE (plus jetée) — source des fiches.
    personas: personaList,
    principles: principleList,
    rituals: ritualList,
    scaffolds: scaffoldList,
    frames,
    assembly: resolveAssembly(methods, teams, bindings, frames, activeFrameId),
    portfolio: detectPortfolioFacet(raw),
    integrity: checkFrameRefs(
      poolIds,
      methods,
      teams,
      bindings,
      personaList,
      workflowRefs,
      skillRefs,
    ),
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
    // Garde défensif : ni les descripteurs ni les listes riches (personas/principles/rituals/
    // scaffolds) ne sont dans son schéma d'entrée (Frame déjà sérialisé) — listes vides, jamais
    // inventées (symétrie avec `frames`).
    personas: [],
    principles: [],
    rituals: [],
    scaffolds: [],
    frames: [],
    assembly: { frame: null, binding: null, method: null, team: null },
    portfolio: coercePortfolio(raw.portfolio),
    integrity: coerceIntegrity(raw.integrity),
  };
}
