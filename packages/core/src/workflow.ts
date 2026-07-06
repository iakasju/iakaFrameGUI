/**
 * workflow.ts — le concept **Workflow / Phase / Gate** (P6) — cœur partagé 🟦.
 *
 * Le **workflow** est un concept **possédé par la forge** (contrat § 2.7), resté différé
 * jusqu'ici : les adaptateurs émettaient une section « phases / gates » **codée en dur**. P6
 * l'extrait en **DONNÉE** — pur, sans I/O, parseurs défensifs calqués sur les autres types du
 * cœur — pour qu'il devienne **paramétrable** (north-star multi-méthodes, AR-9).
 *
 * Invariants tenus :
 *  - **Zéro modèle/runner** (AR-1) : un workflow ne pose QUE de la structure de phases/gates.
 *  - **Agnosticisme** (AR-9) : `methodId` présent ; la logique de rendu ne hard-wire aucun
 *    « iakaframe » — elle rend **n'importe quel** workflow bien formé. iakaframe n'en est qu'une
 *    **instance** (`IAKAFRAME_CANONICAL_WORKFLOW`).
 *  - **Non-régression** : le canonique + `renderWorkflowMarkdown` sont **calés pour reproduire
 *    à l'octet près** le littéral de phases historiquement figé dans les adaptateurs.
 *  - **Rôles par libellé** (jamais un nom de code) : le rendu générique passe par `roleLabel`.
 */

import { roleLabel } from "./roles";

/** Type de gate d'une phase : validation **humaine** (décideur) ou **auto** (qualité). */
export type GateKind = "human" | "auto";

/** Une **gate** : condition de franchissement entre deux phases (+ jalon rôle→rôle optionnel). */
export interface Gate {
  /** humain (validation décideur) | auto (gate qualité). */
  kind: GateKind;
  /** Libellé de la condition de franchissement (ex. « le décideur valide »). */
  condition: string;
  /** Optionnel — jalon : rôle émetteur (clé canonique, ex. "architecture"). */
  from?: string;
  /** Optionnel — jalon : rôle récepteur (clé canonique, ex. "coordination"). */
  to?: string;
  /**
   * **Calage de rendu** (optionnel) : cellule « Gate » rendue telle quelle. Sert la
   * non-régression byte-identique quand la mise en forme historique est irrégulière. Absent →
   * la gate est rendue génériquement depuis `kind` + `condition`.
   */
  display?: string;
}

/** Une **phase** du workflow (une étape ordonnée, portée par ≥ 1 rôle, close par une gate). */
export interface Phase {
  /** Slug stable (ex. "cadrage"). */
  id: string;
  /** Ordre d'exécution (0..N-1). */
  order: number;
  /** Libellé (ex. "P1 — Cadrage"). */
  name: string;
  /** Courte description « entrée → sortie ». */
  description: string;
  /** Rôles porteurs (clés canoniques ; ≥ 1). */
  roleKeys: string[];
  /** Gate de sortie de la phase. */
  gate: Gate;
  /** Hors chaîne principale (ex. squad prod déclenché sur feu vert) — exclu du tableau. */
  offChain?: boolean;
  /** **Calage de rendu** (optionnel) : marqueur visuel préfixé au nom (ex. emoji). */
  badge?: string;
  /**
   * **Calage de rendu** (optionnel) : cellule « Rôle » rendue telle quelle. Absent → dérivée
   * des `roleKeys` via `roleLabel` (jamais un nom de code — rendu par libellés).
   */
  roleDisplay?: string;
}

/** Un **workflow** : une séquence ordonnée de phases/gates, propre à une méthode. */
export interface Workflow {
  /** Slug stable (ex. "iakaframe-canonical"). */
  id: string;
  /** Affichage. */
  name: string;
  /** Méthode (agnosticisme AR-9) — "iakaframe" au MVP. */
  methodId: string;
  /** Phases (rendues triées par `order`). */
  phases: Phase[];
  /**
   * **Calage de rendu** (optionnel) : titre de la section markdown (sans `## `). Absent → le
   * `name` du workflow sert de titre.
   */
  sectionTitle?: string;
  /**
   * **Calage de rendu** (optionnel) : note de bas de section (ex. squad prod hors chaîne).
   * Absent → aucune note.
   */
  sectionNote?: string;
}

// ---------------------------------------------------------------------------
// Parseurs défensifs (jamais d'exception ; un champ illisible → repli sûr).
// ---------------------------------------------------------------------------

/** Filtre un tableau brut en `string[]` (ignore non-string / vides). */
function toStringArray(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];
}

/** Chaîne non vide → trim ; sinon `undefined`. */
function optString(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

/** Parse défensif d'UNE gate. Repli `kind:"human"` ; `condition` vide toléré. */
export function parseGate(raw: unknown): Gate {
  if (typeof raw !== "object" || raw === null) {
    return { kind: "human", condition: "" };
  }
  const r = raw as Record<string, unknown>;
  const kind: GateKind = r.kind === "auto" ? "auto" : "human";
  const condition = typeof r.condition === "string" ? r.condition : "";
  const gate: Gate = { kind, condition };
  const from = optString(r.from);
  if (from) gate.from = from;
  const to = optString(r.to);
  if (to) gate.to = to;
  const display = typeof r.display === "string" ? r.display : undefined;
  if (display !== undefined) gate.display = display;
  return gate;
}

/**
 * Parse défensif d'UNE phase (`null` si inutilisable : pas d'`id`). `order` non numérique → 0 ;
 * `roleKeys` filtrées ; `gate` parsée défensivement.
 */
export function parsePhase(raw: unknown): Phase | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id = optString(r.id);
  if (!id) return null;
  const order = typeof r.order === "number" && Number.isFinite(r.order) ? r.order : 0;
  const name = optString(r.name) ?? id;
  const description = typeof r.description === "string" ? r.description : "";
  const phase: Phase = {
    id,
    order,
    name,
    description,
    roleKeys: toStringArray(r.roleKeys),
    gate: parseGate(r.gate),
  };
  if (r.offChain === true) phase.offChain = true;
  const badge = optString(r.badge);
  if (badge) phase.badge = badge;
  const roleDisplay = typeof r.roleDisplay === "string" ? r.roleDisplay : undefined;
  if (roleDisplay !== undefined) phase.roleDisplay = roleDisplay;
  return phase;
}

/**
 * Parse défensif d'UN workflow (`null` si inutilisable : pas d'`id` ou aucune phase valide).
 * Les phases invalides sont filtrées ; jamais d'exception.
 */
export function parseWorkflow(raw: unknown): Workflow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id = optString(r.id);
  if (!id) return null;
  const name = optString(r.name) ?? id;
  const methodId = optString(r.methodId) ?? DEFAULT_METHOD_ID_WORKFLOW;
  const phases = Array.isArray(r.phases)
    ? r.phases.map(parsePhase).filter((p): p is Phase => p !== null)
    : [];
  if (phases.length === 0) return null;
  const workflow: Workflow = { id, name, methodId, phases };
  const sectionTitle = optString(r.sectionTitle);
  if (sectionTitle) workflow.sectionTitle = sectionTitle;
  const sectionNote = typeof r.sectionNote === "string" ? r.sectionNote : undefined;
  if (sectionNote !== undefined) workflow.sectionNote = sectionNote;
  return workflow;
}

/** Méthode par défaut (agnosticisme AR-9) — dupliqué localement pour éviter un cycle team↔workflow. */
const DEFAULT_METHOD_ID_WORKFLOW = "iakaframe";

// ---------------------------------------------------------------------------
// Le workflow canonique iakaframe (donnée calée sur le littéral historique).
// ---------------------------------------------------------------------------

/**
 * **`IAKAFRAME_CANONICAL_WORKFLOW`** — le workflow de la méthode iakaframe, en DONNÉE.
 *
 * Fidèle à `methode-de-travail.md` (§ phases/jalons) et au miroir `kit-codex/AGENTS.md`.
 * **Calé pour reproduire à l'octet près** le littéral de phases historiquement figé dans les
 * adaptateurs (cf. `renderWorkflowMarkdown`). Quatre phases : cadrage → réalisation → staging
 * (chaîne cible-staging) + `prod` **`offChain`** (squad prod hors chaîne, feu vert humain).
 * **Aucune** table modèle (AR-1).
 */
export const IAKAFRAME_CANONICAL_WORKFLOW: Workflow = {
  id: "iakaframe-canonical",
  name: "Workflow canonique iakaframe",
  methodId: "iakaframe",
  sectionTitle: "Les 3 phases (cible : staging) + le squad prod",
  sectionNote:
    "La chaîne **s'arrête au staging**. La **mise en production** est un **squad séparé**, déclenché\n" +
    "**sur feu vert humain** — hors les 3 phases. Au-dessus des projets : le rôle **portefeuille**\n" +
    "(switch de projet, vue d'ensemble). Transverses : **graphisme** (design on-brand), **doc** (guides).",
  phases: [
    {
      id: "cadrage",
      order: 0,
      name: "P1 — Cadrage",
      description: "besoin → `specs/instructions/<feature>.md`",
      roleKeys: ["architecture"],
      badge: "🔵",
      roleDisplay: "architecture",
      gate: {
        kind: "human",
        condition: "le décideur valide",
        from: "architecture",
        to: "coordination",
        display: "**humain** (le décideur valide)",
      },
    },
    {
      id: "realisation",
      order: 1,
      name: "P2 — Réalisation",
      description: "instruction → branche + commits + tests verts",
      roleKeys: ["fabrication", "tests"],
      badge: "🔴",
      roleDisplay: "fabrication + tests",
      gate: {
        kind: "auto",
        condition: "typecheck/lint/tests",
        display: "**auto** (typecheck/lint/tests)",
      },
    },
    {
      id: "staging",
      order: 2,
      name: "P3 — Staging",
      description: "PASS → build/déploiement **staging** (`vX.Y.Z-rc`)",
      roleKeys: ["fabrication", "tests"],
      badge: "🟢",
      roleDisplay: "fabrication (devops) + tests",
      gate: {
        kind: "auto",
        condition: "build/déploiement staging OK",
        display: "auto",
      },
    },
    {
      id: "prod",
      order: 3,
      name: "Squad prod",
      description: "staging → mise en production, surveillance, rollback",
      roleKeys: ["coordination"],
      offChain: true,
      gate: {
        kind: "human",
        condition: "feu vert humain",
      },
    },
  ],
};

/**
 * **Catalogue de workflows** du cœur (MVP : le seul canonique). Clé = `Workflow.id`. Un jour,
 * plusieurs méthodes peupleront ce catalogue ; la team en **choisit** une (`workflowId`).
 */
export const WORKFLOW_CATALOG: Readonly<Record<string, Workflow>> = {
  [IAKAFRAME_CANONICAL_WORKFLOW.id]: IAKAFRAME_CANONICAL_WORKFLOW,
};

/** Un workflow du catalogue par id (insensible : `undefined` si absent). */
export function workflowById(id: string | undefined | null): Workflow | undefined {
  return id ? WORKFLOW_CATALOG[id] : undefined;
}

// ---------------------------------------------------------------------------
// Rendu markdown mutualisé (générique — rend N'IMPORTE QUEL workflow bien formé).
// ---------------------------------------------------------------------------

/** Cellule « Rôle » : override de calage, sinon libellés des rôles (jamais un nom de code). */
function renderRoleCell(phase: Phase): string {
  if (phase.roleDisplay !== undefined) return phase.roleDisplay;
  return phase.roleKeys.map(roleLabel).join(" + ");
}

/** Cellule « Gate » : override de calage, sinon rendu générique `**humain|auto** (condition)`. */
function renderGateCell(gate: Gate): string {
  if (gate.display !== undefined) return gate.display;
  const kindLabel = gate.kind === "human" ? "humain" : "auto";
  return gate.condition.length > 0
    ? `**${kindLabel}** (${gate.condition})`
    : `**${kindLabel}**`;
}

/** Cellule « Phase » : badge optionnel + nom en gras. */
function renderPhaseCell(phase: Phase): string {
  const prefix = phase.badge ? `${phase.badge} ` : "";
  return `${prefix}**${phase.name}**`;
}

/**
 * **`renderWorkflowMarkdown(workflow) → string`** — section markdown « phases / gates » **pure**,
 * générée **depuis la donnée** (remplace le littéral figé). Générique : rend n'importe quel
 * workflow bien formé (un workflow factice à 2 phases se rend correctement).
 *
 * Structure : `## <titre>` + tableau `| Phase | Rôle | Entrée → Sortie | Gate |` des phases de la
 * **chaîne principale** (les phases `offChain` sont **exclues** du tableau — décrites dans la note),
 * + la note de section optionnelle. **Calé** : pour `IAKAFRAME_CANONICAL_WORKFLOW`, la sortie est
 * **byte-identique** au littéral historique.
 */
export function renderWorkflowMarkdown(workflow: Workflow): string {
  const heading = workflow.sectionTitle ?? workflow.name;
  const mainPhases = [...workflow.phases]
    .filter((p) => p.offChain !== true)
    .sort((a, b) => a.order - b.order);

  const rows = mainPhases.map(
    (p) =>
      `| ${renderPhaseCell(p)} | ${renderRoleCell(p)} | ${p.description} | ${renderGateCell(p.gate)} |`,
  );
  const table = [
    "| Phase | Rôle | Entrée → Sortie | Gate |",
    "|---|---|---|---|",
    ...rows,
  ].join("\n");

  const sections = [`## ${heading}`, table];
  if (workflow.sectionNote !== undefined && workflow.sectionNote.length > 0) {
    sections.push(workflow.sectionNote);
  }
  return sections.join("\n\n");
}
