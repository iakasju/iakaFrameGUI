/**
 * workflowProposition — proposition d'élément (brique B) du pool **workflow** (le cas RICHE). Champs
 * éditables = ceux que l'éditeur `WorkflowAtelier` (+ `WorkflowElementEditor`) façonne et que
 * `persistWorkflow`/`serializeWorkflowDoc` persistent : `name` (scalaire), `kind` (enum de gouvernance)
 * et `phases[]` (chaque phase : `name`, `description`, `roleKeys[]`, `gate {kind, condition}`).
 * **Verrouillé (C-1, jamais lu/proposé)** : `id` (== nom de fichier, jamais renommé). `methodId` et les
 * calages de rendu (`sectionTitle`/`sectionNote`) ne sont pas proposés : préservés depuis l'origine
 * par `serializeWorkflowDoc`.
 *
 * ⚠️ **Risque borné.** La proposition ne fait que **pré-remplir l'éditeur riche** : l'utilisateur relit
 * dans `WorkflowAtelier` puis « Enregistrer » emprunte le chemin d'écriture **inchangé**
 * (`persistWorkflow` → `poolWrite`, ré-émission verbatim si inchangé, canonique sinon). Une phase mal
 * formée par le modèle est donc un simple défaut de pré-remplissage relu par l'humain, jamais une
 * corruption disque. Le parseur reste **défensif** (ne lève jamais ; ignore ce qu'il ne comprend pas).
 * Mécanique live/repli **factorisée** (`elementProposition.ts`).
 */
import {
  DEFAULT_WORKFLOW_KIND,
  roleByKey,
  WORKFLOW_KINDS,
  slugify,
  type Gate,
  type GateKind,
  type Phase,
  type Workflow,
  type WorkflowKind,
} from "@iakaframe/core";
import {
  makeProposeRun,
  parseJsonObject,
  str,
  strList,
  type ElementPropositionSpec,
} from "./elementProposition";

/** Ensemble des `kind` de gouvernance canoniques (validation anti-invention). */
const KIND_SET: ReadonlySet<string> = new Set(WORKFLOW_KINDS);

/** Schéma des **champs éditables** d'un workflow (aucun `required`). `id`/`methodId` ABSENTS (verrous). */
export const WORKFLOW_PROPOSITION_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    kind: { type: "string", enum: [...WORKFLOW_KINDS] },
    phases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          roleKeys: { type: "array", items: { type: "string" } },
          gate: {
            type: "object",
            properties: {
              kind: { type: "string", enum: ["human", "auto"] },
              condition: { type: "string" },
            },
          },
        },
      },
    },
  },
} as const;

/** Parse défensif d'une gate proposée → `Gate` valide (kind canonique, condition scalaire). */
function parseProposedGate(raw: unknown): Gate {
  const g = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const kind: GateKind = str(g.kind) === "auto" ? "auto" : "human";
  return { kind, condition: str(g.condition) ?? "" };
}

/** Ne retient que les clés de rôle **canoniques** (jamais un rôle inventé). */
function filterRoleKeys(raw: unknown): string[] {
  const out: string[] = [];
  for (const k of strList(raw)) {
    const role = roleByKey(k);
    if (role && !out.includes(role.key)) out.push(role.key);
  }
  return out;
}

/**
 * Parseur **défensif** : `name` scalaire, `kind` retenu SEULEMENT s'il est canonique, `phases[]`
 * reconstruites avec des valeurs sûres (id dérivé du nom, order = index, roleKeys filtrés au canon,
 * gate valide). Une phase sans nom exploitable est **ignorée**. `id`/`methodId` jamais lus (C-1).
 */
export function parseWorkflowProposition(raw: string): Partial<Workflow> | null {
  const r = parseJsonObject(raw);
  if (r === null) return null;
  const out: Partial<Workflow> = {};

  const name = str(r.name);
  if (name !== undefined) out.name = name;

  const kind = str(r.kind);
  if (kind !== undefined && KIND_SET.has(kind)) out.kind = kind as WorkflowKind;

  if (Array.isArray(r.phases)) {
    const takenIds: string[] = [];
    const phases: Phase[] = [];
    r.phases.forEach((rawPhase, index) => {
      if (!rawPhase || typeof rawPhase !== "object" || Array.isArray(rawPhase)) return;
      const p = rawPhase as Record<string, unknown>;
      const pName = str(p.name);
      if (pName === undefined) return; // phase sans nom exploitable → ignorée (jamais fabriquée).
      // id unique dérivé du nom (jamais proposé par le modèle) — verrouillé côté éditeur ensuite.
      let id = slugify(pName) || `phase-${index + 1}`;
      let n = 2;
      while (takenIds.includes(id)) {
        id = `${slugify(pName) || `phase-${index + 1}`}-${n}`;
        n += 1;
      }
      takenIds.push(id);
      const phase: Phase = {
        id,
        order: phases.length,
        name: pName,
        description: str(p.description) ?? "",
        roleKeys: filterRoleKeys(p.roleKeys),
      };
      // Même règle que le parseur du cœur : une phase proposée SANS gate n'en reçoit pas.
      // Le LLM n'a pas à se voir prêter un feu vert qu'il n'a pas proposé.
      if (p.gate != null) phase.gate = parseProposedGate(p.gate);
      phases.push(phase);
    });
    if (phases.length > 0) out.phases = phases;
  }

  return Object.keys(out).length > 0 ? out : null;
}

const SPEC: ElementPropositionSpec<Workflow> = {
  typeLabel: "workflow",
  schema: WORKFLOW_PROPOSITION_SCHEMA,
  contractFields: [
    "Champs autorisés (tous optionnels) : name (nom d'affichage), kind (UNE famille de gouvernance",
    `parmi : ${WORKFLOW_KINDS.join(", ")} — défaut ${DEFAULT_WORKFLOW_KIND}), phases (liste ordonnée`,
    "de phases). Chaque phase : name (libellé, ex. « P1 — Cadrage »), description (« entrée → sortie »),",
    "roleKeys (clés de rôles canoniques porteurs), gate (le franchissement : { kind: « human » pour une",
    "validation décideur ou « auto » pour un gate qualité, condition: la règle de franchissement }).",
    "Ne propose JAMAIS d'id de phase ni d'ordre : la forge les dérive.",
  ],
  parse: parseWorkflowProposition,
};

/** Résolveur de proposition du pool workflow (branché sur `ElementKind.proposeElement`). */
export const resolveWorkflowProposition = makeProposeRun(SPEC);
