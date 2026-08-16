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

/**
 * **Famille de gouvernance d'un workflow** (`kind` first-class — correction-biais-modele-frame.md
 * § 3.1). Rend agnostique le modèle : le pipeline-à-gates n'est plus le présupposé unique, chaque
 * famille est un cas de **première classe**.
 *   - `pipeline` — étapes séquentielles + gates (iakaframe, waterfall) ;
 *   - `cycle` — itération/boucle sans gate hiérarchique (scrum, design-thinking) ;
 *   - `flow` — flux tiré continu, sans conteneur temporel (kanban, gtd) ;
 *   - `cycle-with-gate` — cycle avec **un** gate d'engagement aux frontières (shape up).
 * MVP **permissif** (AC5, ARB-1) : l'énum est **ouverte à extension** et **tolérée à la validation**
 * (un `kind` hors énum est accepté ; le rejet strict relève du Finding 3). Absent → lu `pipeline`.
 */
export type WorkflowKind = "pipeline" | "cycle" | "flow" | "cycle-with-gate";

/** Les familles de gouvernance de l'énum MVP (vocabulaire documenté ; validation stricte = Finding 3). */
export const WORKFLOW_KINDS: readonly WorkflowKind[] = [
  "pipeline",
  "cycle",
  "flow",
  "cycle-with-gate",
];

/** `kind` par défaut quand absent (rétro-compat des lecteurs, AC5) : un workflow sans `kind` est un pipeline. */
export const DEFAULT_WORKFLOW_KIND: WorkflowKind = "pipeline";

/** Une **gate** : condition de franchissement entre deux phases (+ jalon rôle→rôle optionnel). */
export interface Gate {
  /** humain (validation décideur) | auto (gate qualité). */
  kind: GateKind;
  /** Libellé de la condition de franchissement (ex. « le décideur valide »). */
  condition: string;
  /** Optionnel — jalon : rôle émetteur (clé canonique, ex. "cadrage"). */
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

/**
 * Une **phase** du workflow (une étape ordonnée, portée par ≥ 1 rôle, **éventuellement** close
 * par une gate).
 *
 * ⚠️ **`gate` est OPTIONNEL, et c'est structurant** : une étape peut n'avoir **aucun** gate. Le
 * canon en fournit le cas d'espèce — `library/workflows/iakaframe-3phases.md` déclare **5 étapes
 * pour 4 gates**, l'étape `surveillance` n'en portant aucun, et le fichier canon écrit lui-même
 * que cette absence *« est une DÉCLARATION, pas un oubli »* et que si *« un parseur venait à
 * exiger un gate par étape : REMONTER, ne pas en inventer un »*. Un gate y ferait attendre un feu
 * vert humain à une mission dont la nature est d'agir **sans ordre**.
 */
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
  /**
   * Gate de sortie de la phase — **présent-si-porté** : la clé est **OMISE** quand la phase n'a
   * pas de gate, jamais posée à `undefined`. Même convention que `Workflow.kind`,
   * `WorkflowMd.methodId`, `Gate.from`/`to`/`display`, `Phase.badge`/`roleDisplay`.
   */
  gate?: Gate;
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
  /**
   * **Famille de gouvernance** (`kind` first-class, § 3.1). Optionnel/présent-si-porté : absent =
   * lu `pipeline` (rétro-compat, {@link DEFAULT_WORKFLOW_KIND}). MVP permissif : un `kind` hors énum
   * est **toléré** (AC5) — la validation stricte est différée (Finding 3).
   */
  kind?: WorkflowKind;
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
  };
  // **Présent-si-porté** : sans `gate` à l'entrée, la clé est OMISE — on n'en fabrique pas.
  // `gate` présent mais malformé ⇒ `parseGate` reste défensif (comportement inchangé).
  if (r.gate != null) phase.gate = parseGate(r.gate);
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
  // `kind` first-class, présent-si-porté (permissif AC5 : toute valeur non vide est acceptée ; un
  // `kind` absent est lu `pipeline` par les consommateurs via DEFAULT_WORKFLOW_KIND).
  const kind = optString(r.kind);
  if (kind) workflow.kind = kind as WorkflowKind;
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
  kind: "pipeline",
  sectionTitle: "Les 3 phases (cible : staging) + le squad prod",
  sectionNote:
    "La chaîne **s'arrête au staging**. La **mise en production** est un **squad séparé**, déclenché\n" +
    "**sur feu vert humain** — hors les 3 phases. Au-dessus des projets : le rôle **portefeuille**\n" +
    "(switch de projet, vue d'ensemble). Transverses : **design** (design on-brand), **documentation** (guides).",
  phases: [
    {
      id: "cadrage",
      order: 0,
      name: "P1 — Cadrage",
      description: "besoin → `specs/instructions/<feature>.md`",
      roleKeys: ["cadrage"],
      badge: "🔵",
      roleDisplay: "cadrage",
      gate: {
        kind: "human",
        condition: "le décideur valide",
        from: "cadrage",
        to: "coordination",
        display: "**humain** (le décideur valide)",
      },
    },
    {
      id: "realisation",
      order: 1,
      name: "P2 — Réalisation",
      description: "instruction → branche + commits + tests verts",
      roleKeys: ["dev", "qualite"],
      badge: "🔴",
      roleDisplay: "dev + qualite",
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
      roleKeys: ["dev", "qualite"],
      badge: "🟢",
      roleDisplay: "dev (devops) + qualite",
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

/**
 * Cellule « Gate » : override de calage, sinon rendu générique `**humain|auto** (condition)`.
 * Phase **sans gate** ⇒ `—` (le tableau garde sa colonne, il n'invente pas de feu vert).
 */
function renderGateCell(gate: Gate | undefined): string {
  if (gate === undefined) return "—";
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

// ---------------------------------------------------------------------------
// Helpers d'ÉDITION **purs** (P6b) — ajout/suppression/réordonnancement + normalisation `order`
// + nettoyage des overrides de calage (Q-3). Aucune I/O, aucun modèle/runner (AR-1). Le canonique
// gelé n'est **jamais** muté : toutes ces fonctions renvoient une **copie** (seed = `cloneWorkflow`).
// ---------------------------------------------------------------------------

/** Deep-clone d'une gate (copie de valeur, aucun partage de référence). */
function cloneGate(g: Gate): Gate {
  const gate: Gate = { kind: g.kind, condition: g.condition };
  if (g.from !== undefined) gate.from = g.from;
  if (g.to !== undefined) gate.to = g.to;
  if (g.display !== undefined) gate.display = g.display;
  return gate;
}

/** Deep-clone d'une phase (roleKeys et gate copiés — aucun partage de référence). */
export function clonePhase(p: Phase): Phase {
  const phase: Phase = {
    id: p.id,
    order: p.order,
    name: p.name,
    description: p.description,
    roleKeys: [...p.roleKeys],
  };
  // Clone conditionnel : clé OMISE si la phase n'en porte pas (jamais `gate: undefined`).
  if (p.gate !== undefined) phase.gate = cloneGate(p.gate);
  if (p.offChain !== undefined) phase.offChain = p.offChain;
  if (p.badge !== undefined) phase.badge = p.badge;
  if (p.roleDisplay !== undefined) phase.roleDisplay = p.roleDisplay;
  return phase;
}

/**
 * **`cloneWorkflow(wf)`** — deep-clone d'un workflow (EW-8) : copie de valeur intégrale, aucun
 * partage de référence avec la source. Sert au **seed** du document Workflow depuis le **canonique
 * gelé** (`IAKAFRAME_CANONICAL_WORKFLOW`) — éditer la copie ne mute jamais le constant.
 */
export function cloneWorkflow(wf: Workflow): Workflow {
  const clone: Workflow = {
    id: wf.id,
    name: wf.name,
    methodId: wf.methodId,
    phases: wf.phases.map(clonePhase),
  };
  if (wf.kind !== undefined) clone.kind = wf.kind;
  if (wf.sectionTitle !== undefined) clone.sectionTitle = wf.sectionTitle;
  if (wf.sectionNote !== undefined) clone.sectionNote = wf.sectionNote;
  return clone;
}

/** Renumérote les phases `0..N-1` selon leur position dans le tableau (source de vérité). */
function renumber(phases: Phase[]): Phase[] {
  return phases.map((p, i) => (p.order === i ? p : { ...p, order: i }));
}

/** Slug d'id unique pour une nouvelle phase (`phase`, `phase-2`, … évite les collisions). */
function uniquePhaseId(existing: Set<string>, base = "phase"): string {
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * **`addPhase(wf)`** — ajoute une phase valide en **fin de chaîne** (EW-9) : `id` unique
 * auto-slugifié, `name` par défaut, `roleKeys: []` (autorisé mais signalé — Q-6), gate `human`
 * vide. Renvoie une **copie** ; `order` reste contigu.
 */
export function addPhase(wf: Workflow): Workflow {
  const ids = new Set(wf.phases.map((p) => p.id));
  const id = uniquePhaseId(ids);
  const phase: Phase = {
    id,
    order: wf.phases.length,
    name: "Nouvelle phase",
    description: "",
    roleKeys: [],
    gate: { kind: "human", condition: "" },
  };
  return { ...wf, phases: renumber([...wf.phases.map(clonePhase), phase]) };
}

/**
 * **`removePhase(wf, id)`** — retire une phase et **renumérote** `order` (EW-9/EW-10). **Refuse**
 * de descendre sous **1 phase** (renvoie le workflow inchangé). Renvoie une copie.
 */
export function removePhase(wf: Workflow, id: string): Workflow {
  const kept = wf.phases.filter((p) => p.id !== id);
  if (kept.length === 0 || kept.length === wf.phases.length) {
    return wf; // suppression sous 1 refusée, ou id inconnu → no-op
  }
  return { ...wf, phases: renumber(kept.map(clonePhase)) };
}

/**
 * **`movePhase(wf, id, dir)`** — échange une phase avec sa voisine (`"up"`/`"down"`) et
 * **normalise** `order` (Q-2, EW-9). No-op aux bornes ou id inconnu. Renvoie une copie.
 */
export function movePhase(wf: Workflow, id: string, dir: "up" | "down"): Workflow {
  const phases = wf.phases.map(clonePhase);
  const i = phases.findIndex((p) => p.id === id);
  if (i < 0) return wf;
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= phases.length) return wf;
  [phases[i], phases[j]] = [phases[j], phases[i]];
  return { ...wf, phases: renumber(phases) };
}

/** Champs de phase librement éditables (hors calage, hors gate — Q-3). */
export type PhaseFieldsPatch = Partial<
  Pick<Phase, "name" | "description" | "roleKeys" | "offChain">
>;

/**
 * **`updatePhaseFields(wf, id, patch)`** — édite les champs libres d'une phase (`name`,
 * `description`, `roleKeys`, `offChain`). **Nettoie l'override de calage correspondant** (Q-3) :
 * éditer `roleKeys` **supprime** `roleDisplay` (sinon l'override masquerait l'édition au rendu).
 * Renvoie une copie ; id inconnu → no-op.
 */
export function updatePhaseFields(
  wf: Workflow,
  id: string,
  patch: PhaseFieldsPatch,
): Workflow {
  let touched = false;
  const phases = wf.phases.map((p) => {
    if (p.id !== id) return p;
    touched = true;
    const next = clonePhase(p);
    if (patch.name !== undefined) next.name = patch.name;
    if (patch.description !== undefined) next.description = patch.description;
    if (patch.offChain !== undefined) next.offChain = patch.offChain;
    if (patch.roleKeys !== undefined) {
      next.roleKeys = [...patch.roleKeys];
      delete next.roleDisplay; // Q-3 : le calage dérivé ne doit plus masquer l'édition.
    }
    return next;
  });
  return touched ? { ...wf, phases } : wf;
}

/**
 * **`updatePhaseGate(wf, id, patch)`** — édite la gate d'une phase (`kind`, `condition`,
 * `from`/`to`). **Nettoie l'override de calage** `gate.display` (Q-3) dès qu'un champ rendu change,
 * pour que l'édition soit visible au rendu/diagramme. Renvoie une copie ; id inconnu → no-op.
 *
 * **Phase sans gate : la gate est CRÉÉE** (repli `{ kind: "human", condition: "" }` avant patch) —
 * c'est le geste « poser un gate ». Son symétrique est `removePhaseGate`.
 */
export function updatePhaseGate(
  wf: Workflow,
  id: string,
  patch: Partial<Pick<Gate, "kind" | "condition" | "from" | "to">>,
): Workflow {
  let touched = false;
  const phases = wf.phases.map((p) => {
    if (p.id !== id) return p;
    touched = true;
    const next = clonePhase(p);
    // Poser un gate sur une phase qui n'en a pas : on le CRÉE, on ne refuse pas l'édition.
    const gate: Gate = next.gate ?? { kind: "human", condition: "" };
    next.gate = gate;
    if (patch.kind !== undefined) gate.kind = patch.kind;
    if (patch.condition !== undefined) gate.condition = patch.condition;
    if (patch.from !== undefined) {
      if (patch.from === "") delete gate.from;
      else gate.from = patch.from;
    }
    if (patch.to !== undefined) {
      if (patch.to === "") delete gate.to;
      else gate.to = patch.to;
    }
    delete gate.display; // Q-3 : override de gate nettoyé à toute édition de la gate.
    return next;
  });
  return touched ? { ...wf, phases } : wf;
}

/**
 * **`removePhaseGate(wf, id)`** — **retire** la gate d'une phase : la clé `gate` est **supprimée**,
 * pas mise à `undefined`. Symétrique exact d'`updatePhaseGate` (qui pose et crée) — un modèle qui
 * laisse ajouter sans laisser retirer n'a fait que déplacer l'obligation. Renvoie une copie ;
 * id inconnu ⇒ **no-op** (l'objet d'origine, à l'identité près).
 */
export function removePhaseGate(wf: Workflow, id: string): Workflow {
  let touched = false;
  const phases = wf.phases.map((p) => {
    if (p.id !== id || p.gate === undefined) return p;
    touched = true;
    const next = clonePhase(p);
    delete next.gate;
    return next;
  });
  return touched ? { ...wf, phases } : wf;
}
