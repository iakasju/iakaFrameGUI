/**
 * portfolio.ts — le **Portefeuille / Frame** : entité conteneur de 1er ordre AU-DESSUS de
 * Method/Team/Binding (le « super-étage » Odin), G6 de `open-frame-gui-stefframe2.md` — cœur 🟦.
 *
 * Le modèle plafonnait au niveau équipe/méthode (mono-team, mono-méthode) : rien ne représentait
 * **un frame ouvert comme un tout cohérent**, ni l'**étage portefeuille** (backlog transverse,
 * scaffold `portfolio`, persona `odin`). Le `Portfolio` comble ce manque :
 *   - **root** : chemin racine du frame (contrepartie modélisée du `chapeau` Rust) ;
 *   - **inventory** : l'inventaire des **11 types** (ids présents par type) + leurs comptes ;
 *   - **assembly** : l'assemblage résolu **method + team + binding** (mono au MVP) ;
 *   - **facet** : la facette portefeuille (scaffold `level:"portfolio"`, persona rôle portefeuille
 *     — « Odin » —, backlog transverse `BACKLOG.md`), enfin réunie en UN foyer au lieu de trois
 *     formes éclatées.
 *
 * **Read-only au MVP** : on charge/assemble/affiche/vérifie ; l'édition de cet étage est différée.
 * Esprit du cœur : type pur + `parsePortfolio` **défensif** (record invalide → `null`, jamais
 * d'exception) ; `buildPortfolio` assemble depuis les lectures existantes (pools + collections),
 * **sans I/O** (l'I/O vit dans la forge Rust). `checkPortfolioRefs` exécute l'intégrité
 * référentielle (I1) **dans le périmètre du frame** (miroir `checkRefs` du CLI / `refs.ts`).
 */

import { parsePersonaBinding, type Binding, type BindingOrigin } from "./binding";
import { isNodeKind, type NodeKind } from "./node";
import { type Persona } from "./persona";
import { PORTFOLIO_SCAFFOLD, type Scaffold } from "./scaffold";
import type { MethodMd, TeamMd } from "./frontmatter";

/** Les **11 types** d'éléments d'un frame (ordre canonique d'affichage). */
export type FrameElementType =
  | "personas"
  | "roles"
  | "principles"
  | "rituals"
  | "guardrails"
  | "scaffolds"
  | "workflows"
  | "skills"
  | "methods"
  | "teams"
  | "bindings";

/** Les 11 types, dans l'ordre canonique (source de vérité des comptes + du rendu). */
export const FRAME_ELEMENT_TYPES: readonly FrameElementType[] = [
  "personas",
  "roles",
  "principles",
  "rituals",
  "guardrails",
  "scaffolds",
  "workflows",
  "skills",
  "methods",
  "teams",
  "bindings",
];

/** Élément atomique minimal d'un frame : un id (les pools génériques, où seul l'id compte ici). */
export interface FrameAtom {
  id: string;
}

/** Inventaire du frame : les ids présents par type (11 clés). */
export type FrameInventory = Record<FrameElementType, string[]>;

/** Assemblage résolu du frame (mono-method/team/binding au MVP). Records `.md` (ids). */
export interface FrameAssembly {
  method: MethodMd | null;
  team: TeamMd | null;
  binding: Binding | null;
}

/**
 * Facette **portefeuille** (niveau Odin) : les éléments de niveau portefeuille enfin rattachés à
 * un foyer. Chaque champ est `null` si l'élément n'est pas présent dans le frame.
 */
export interface PortfolioFacet {
  /** Id du scaffold `level:"portfolio"` (ex. `"portefeuille"`/`"portfolio"`). */
  portfolioScaffoldId: string | null;
  /** Id de la persona du rôle `portefeuille` (nom par défaut « Odin »). */
  odinPersonaId: string | null;
  /** Chemin du backlog transverse (`BACKLOG.md` du scaffold portefeuille, sinon repli catalogue). */
  backlogPath: string | null;
}

/**
 * Le **Portfolio / Frame** : un frame ouvert comme un tout cohérent. Entité de 1er ordre au-dessus
 * de Method/Team/Binding — l'étage d'accueil de « Open frame ».
 */
export interface Portfolio {
  /** Chemin racine du frame (le `chapeau`, contrepartie modélisée côté données). */
  root: string;
  /** Inventaire des 11 types (ids). */
  inventory: FrameInventory;
  /** Assemblage résolu method + team + binding. */
  assembly: FrameAssembly;
  /** Facette portefeuille (scaffold portfolio + odin + backlog). */
  facet: PortfolioFacet;
}

/** Un inventaire vide (les 11 clés à `[]`). */
export function emptyInventory(): FrameInventory {
  return {
    personas: [],
    roles: [],
    principles: [],
    rituals: [],
    guardrails: [],
    scaffolds: [],
    workflows: [],
    skills: [],
    methods: [],
    teams: [],
    bindings: [],
  };
}

/** Comptes par type (les 11 clés) — pour l'affichage « N personas, N roles… » (critère A/F). */
export function frameCounts(p: Portfolio): Record<FrameElementType, number> {
  const counts = {} as Record<FrameElementType, number>;
  for (const t of FRAME_ELEMENT_TYPES) counts[t] = p.inventory[t].length;
  return counts;
}

/** Total d'éléments du frame (tous types confondus). */
export function frameTotal(p: Portfolio): number {
  return FRAME_ELEMENT_TYPES.reduce((acc, t) => acc + p.inventory[t].length, 0);
}

// ---------------------------------------------------------------------------
// Assemblage (buildPortfolio) — PUR, sans I/O. Le front lit pools + collections via le backend,
// parse chaque atome/assemblage avec les parseurs du cœur, puis assemble ICI.
// ---------------------------------------------------------------------------

/**
 * Sources d'assemblage d'un Portfolio (lectures déjà parsées côté appelant). Les **8 pools** :
 * `personas` (typées, pour repérer `odin` via `roleKey`), `scaffolds` (typés, pour repérer le
 * niveau `portfolio`), et les 6 autres en `FrameAtom[]` (seul l'id compte pour l'inventaire/I1) —
 * NB : un frame range son **workflow** dans le pool `workflows/` (compté **une fois**, G5 ; l'espace
 * collection `workflows/` reste un détail interne au MVP). Les **3 assemblages** : `methods`/`teams`/
 * `bindings` en records `.md`. `workflowId` d'une méthode est résolu contre le **pool** `workflows`.
 */
export interface PortfolioSources {
  root: string;
  personas: readonly Persona[];
  roles: readonly FrameAtom[];
  principles: readonly FrameAtom[];
  rituals: readonly FrameAtom[];
  guardrails: readonly FrameAtom[];
  scaffolds: readonly Scaffold[];
  workflows: readonly FrameAtom[];
  skills: readonly FrameAtom[];
  methods: readonly MethodMd[];
  teams: readonly TeamMd[];
  bindings: readonly Binding[];
}

/** Ids d'une liste d'atomes (ordre préservé, vides ignorés). */
function idsOf(atoms: readonly FrameAtom[]): string[] {
  return atoms.map((a) => a.id).filter((id) => typeof id === "string" && id.length > 0);
}

/**
 * Assemble un `Portfolio` depuis des sources déjà lues/parsées (PUR, sans I/O). Résout l'assemblage
 * **par le binding** quand il est présent (`binding.methodId`/`teamId`) sinon retombe sur le 1er
 * élément de chaque collection (mono au MVP). Détermine la facette portefeuille (scaffold
 * `level:"portfolio"`, persona rôle `portefeuille`, backlog `BACKLOG.md`).
 */
export function buildPortfolio(src: PortfolioSources): Portfolio {
  const inventory: FrameInventory = {
    personas: src.personas.map((p) => p.id).filter((id) => id.length > 0),
    roles: idsOf(src.roles),
    principles: idsOf(src.principles),
    rituals: idsOf(src.rituals),
    guardrails: idsOf(src.guardrails),
    scaffolds: src.scaffolds.map((s) => s.id).filter((id) => id.length > 0),
    workflows: idsOf(src.workflows),
    skills: idsOf(src.skills),
    methods: src.methods.map((m) => m.id).filter((id) => id.length > 0),
    teams: src.teams.map((t) => t.id).filter((id) => id.length > 0),
    bindings: src.bindings.map((b) => b.id).filter((id) => id.length > 0),
  };

  const binding = src.bindings[0] ?? null;
  const method =
    (binding && src.methods.find((m) => m.id === binding.methodId)) ||
    src.methods[0] ||
    null;
  const team =
    (binding && src.teams.find((t) => t.id === binding.teamId)) || src.teams[0] || null;

  const portfolioScaffold = src.scaffolds.find((s) => s.level === "portfolio") ?? null;
  const odin = src.personas.find((p) => p.roleKey === "portefeuille") ?? null;
  const backlogEntry =
    portfolioScaffold?.entries.find((e) => /(^|\/)BACKLOG\.md$/.test(e.path)) ??
    PORTFOLIO_SCAFFOLD.entries.find((e) => e.path === "BACKLOG.md");

  return {
    root: src.root,
    inventory,
    assembly: { method, team, binding },
    facet: {
      portfolioScaffoldId: portfolioScaffold?.id ?? null,
      odinPersonaId: odin?.id ?? null,
      backlogPath: backlogEntry?.path ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Intégrité référentielle (I1) DANS le périmètre du frame (critère B / F). Miroir `checkRefs`.
// ---------------------------------------------------------------------------

/** Une référence manquante détectée dans le périmètre du frame. */
export interface PortfolioMissingRef {
  /** Assemblage porteur de la référence. */
  scope: "method" | "team" | "binding";
  /** Champ portant l'id manquant (ex. `"principleIds"`). */
  field: string;
  /** L'id introuvable. */
  id: string;
  /** Type de pool/collection où l'id aurait dû exister. */
  type: FrameElementType;
}

/** Rapport d'intégrité du frame (miroir `RefsReport` de la forge). */
export interface PortfolioRefsReport {
  ok: boolean;
  missing: PortfolioMissingRef[];
}

/**
 * Vérifie l'intégrité référentielle **dans le périmètre du Portfolio** : chaque id référencé par
 * `method`/`team`/`binding` existe dans l'inventaire chargé du **même** frame (critère B). NB : dans
 * un frame, le fichier d'un rôle a pour id son **key** (`roleKeys ⊆ inventory.roles`) ; `workflowId`
 * est résolu contre le **pool** `workflows`. Défensif : jamais d'exception (`ok:true` si rien à
 * vérifier).
 */
export function checkPortfolioRefs(p: Portfolio): PortfolioRefsReport {
  const missing: PortfolioMissingRef[] = [];
  const set = (t: FrameElementType) => new Set(p.inventory[t]);

  const personas = set("personas");
  const need = (
    scope: PortfolioMissingRef["scope"],
    field: string,
    id: string | undefined,
    pool: Set<string>,
    type: FrameElementType,
  ) => {
    if (id && !pool.has(id)) missing.push({ scope, field, id, type });
  };
  const needEach = (
    scope: PortfolioMissingRef["scope"],
    field: string,
    ids: readonly string[],
    pool: Set<string>,
    type: FrameElementType,
  ) => {
    for (const id of ids) need(scope, field, id, pool, type);
  };

  const { method, team, binding } = p.assembly;

  if (method) {
    needEach("method", "principleIds", method.principleIds, set("principles"), "principles");
    needEach("method", "ritualIds", method.ritualIds, set("rituals"), "rituals");
    needEach("method", "guardrailIds", method.guardrailIds, set("guardrails"), "guardrails");
    needEach("method", "roleKeys", method.roleKeys, set("roles"), "roles");
    needEach("method", "scaffoldIds", method.scaffoldIds, set("scaffolds"), "scaffolds");
    need("method", "workflowId", method.workflowId, set("workflows"), "workflows");
  }

  if (team) {
    needEach("team", "personas", team.personas, personas, "personas");
    need("team", "coordinator", team.coordinator, personas, "personas");
  }

  if (binding) {
    need("binding", "methodId", binding.methodId, set("methods"), "methods");
    need("binding", "teamId", binding.teamId, set("teams"), "teams");
    needEach(
      "binding",
      "assignments",
      binding.assignments.map((a) => a.personaId),
      personas,
      "personas",
    );
  }

  return { ok: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// Parseur défensif (record invalide → null, jamais d'exception) — critère F.
// ---------------------------------------------------------------------------

/** Filtre un tableau brut en `string[]` (ignore non-string / vides). */
function toStringArray(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];
}

/** Coerce un record en `MethodMd` (défensif ; `null` sans `id`). */
function coerceMethodMd(raw: unknown): MethodMd | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" && r.id.trim().length > 0 ? r.id.trim() : null;
  if (!id) return null;
  const method: MethodMd = {
    id,
    name: typeof r.name === "string" && r.name.trim().length > 0 ? r.name.trim() : id,
    principleIds: toStringArray(r.principleIds),
    ritualIds: toStringArray(r.ritualIds),
    guardrailIds: toStringArray(r.guardrailIds),
    roleKeys: toStringArray(r.roleKeys),
    scaffoldIds: toStringArray(r.scaffoldIds),
  };
  if (typeof r.workflowId === "string" && r.workflowId.trim().length > 0) {
    method.workflowId = r.workflowId.trim();
  }
  return method;
}

/** Coerce un record en `TeamMd` (défensif ; `null` sans `id`). */
function coerceTeamMd(raw: unknown): TeamMd | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" && r.id.trim().length > 0 ? r.id.trim() : null;
  if (!id) return null;
  return {
    id,
    name: typeof r.name === "string" && r.name.trim().length > 0 ? r.name.trim() : id,
    personas: toStringArray(r.personas),
    coordinator: typeof r.coordinator === "string" ? r.coordinator.trim() : "",
    guardrails: toStringArray(r.guardrails),
    vignetteTeam:
      typeof r.vignetteTeam === "string" && r.vignetteTeam.trim().length > 0
        ? r.vignetteTeam.trim()
        : "none",
  };
}

/**
 * Coerce un record en `Binding` unifié (défensif ; `null` sans `id`/`methodId`/`teamId`). **Tolérant**
 * comme la porte `.md` (open-frame charge un frame imparfait plutôt que de masquer le binding) :
 * `node` invalide/absent → `"claude"`, `origin` invalide → `"forge-default"`. Les `assignments`
 * passent par `parsePersonaBinding` (runner **strict**, P-C : liaison à runner inconnu jetée).
 */
function coerceBinding(raw: unknown): Binding | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" && r.id.trim().length > 0 ? r.id.trim() : null;
  const methodId =
    typeof r.methodId === "string" && r.methodId.trim().length > 0 ? r.methodId.trim() : null;
  const teamId =
    typeof r.teamId === "string" && r.teamId.trim().length > 0 ? r.teamId.trim() : null;
  if (!id || !methodId || !teamId) return null;

  const node: NodeKind = isNodeKind(r.node)
    ? ((r.node as string).toLowerCase() as NodeKind)
    : "claude";
  const origin: BindingOrigin =
    r.origin === "cockpit-override" ? "cockpit-override" : "forge-default";
  const assignments = Array.isArray(r.assignments)
    ? r.assignments
        .map(parsePersonaBinding)
        .filter((a): a is NonNullable<typeof a> => a !== null)
    : [];

  return { id, methodId, teamId, node, origin, assignments };
}

/** Coerce un inventaire brut en `FrameInventory` (11 clés ; types manquants → `[]`). */
function coerceInventory(raw: unknown): FrameInventory {
  const inv = emptyInventory();
  if (typeof raw !== "object" || raw === null) return inv;
  const r = raw as Record<string, unknown>;
  for (const t of FRAME_ELEMENT_TYPES) inv[t] = toStringArray(r[t]);
  return inv;
}

/**
 * Parse défensif d'UN Portfolio (record invalide → `null`, jamais d'exception). `root` (string non
 * vide) est **requis** (un frame sans racine n'a pas de sens) ; l'inventaire est normalisé sur les
 * 11 clés ; l'assemblage et la facette sont coercés défensivement (sous-records illisibles → `null`).
 */
export function parsePortfolio(raw: unknown): Portfolio | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const root = typeof r.root === "string" && r.root.trim().length > 0 ? r.root.trim() : null;
  if (!root) return null;

  const assemblyRaw =
    typeof r.assembly === "object" && r.assembly !== null
      ? (r.assembly as Record<string, unknown>)
      : {};
  const facetRaw =
    typeof r.facet === "object" && r.facet !== null
      ? (r.facet as Record<string, unknown>)
      : {};

  const strOrNull = (v: unknown): string | null =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : null;

  return {
    root,
    inventory: coerceInventory(r.inventory),
    assembly: {
      method: coerceMethodMd(assemblyRaw.method),
      team: coerceTeamMd(assemblyRaw.team),
      binding: coerceBinding(assemblyRaw.binding),
    },
    facet: {
      portfolioScaffoldId: strOrNull(facetRaw.portfolioScaffoldId),
      odinPersonaId: strOrNull(facetRaw.odinPersonaId),
      backlogPath: strOrNull(facetRaw.backlogPath),
    },
  };
}
