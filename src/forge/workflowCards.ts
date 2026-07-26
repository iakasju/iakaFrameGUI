/**
 * workflowCards — dérivation **pure** des fiches à vignettes du pool **workflow** (chantier #3 Lot 3),
 * sœur de `scaffoldCards`/`principleCards`. AUCUN I/O, AUCUN contrat touché : on **consomme** le
 * catalogue de workflows vendoré `WORKFLOW_CATALOG` (au MVP : le seul `IAKAFRAME_CANONICAL_WORKFLOW`,
 * `{id, name, methodId, kind?, phases[]}`) et on projette le view-model de fiche **unifié** de l'hôte
 * générique. Pure addition `src/` au-dessus du contrat (parité drift 0 par construction).
 *
 * Le workflow est le **cas riche** : son éditeur (`WorkflowAtelier`) existe déjà et est réutilisé tel
 * quel (cf. `WorkflowElementEditor`). Honnêteté (§ 8) : source = catalogue canonique **étiqueté**
 * (repli de session, deep-clone par `cloneWorkflow` — le canonique gelé n'est jamais muté). La teinte
 * de vignette est castée par le `kind` (couleur dérivée du champ, jamais un rôle) ; les `phases`
 * (champs réels) deviennent des puces méta.
 */
import {
  WORKFLOW_CATALOG,
  DEFAULT_WORKFLOW_KIND,
  WORKFLOW_KINDS,
  cloneWorkflow,
  type Workflow,
  type WorkflowKind,
} from "@iakaframe/core";
import { vignetteGradient, initialsOf } from "./casting";
import type { AuthoredEntity } from "./feanorHeadModel";
import type { ElementCardVM } from "./elementKind";

/** Le type FR affiché du pool. */
export const WORKFLOW_TYPE_LABEL = "workflow";

/** `methodId` par défaut d'un workflow neuf (MVP : la méthode iakaframe). */
const DEFAULT_METHOD_ID = "iakaframe";

/**
 * Teinte de vignette d'un workflow, castée par son **`kind` réel** (couleur dérivée du champ, pas un
 * rôle) : index stable dans `WORKFLOW_KINDS`, décalé pour rester dans la palette de casting (0..8).
 */
export function workflowTint(kind: WorkflowKind | undefined): number {
  const i = WORKFLOW_KINDS.indexOf(kind ?? DEFAULT_WORKFLOW_KIND);
  return (i < 0 ? 0 : i) + 2; // pipeline→2 (bleu) … cycle-with-gate→5
}

/** Projette UN workflow en fiche à vignette (déterministe, casté par son `kind`). */
export function buildWorkflowCard(w: Workflow): ElementCardVM {
  const kind = w.kind ?? DEFAULT_WORKFLOW_KIND;
  const tint = workflowTint(kind);
  const n = w.phases.length;
  return {
    id: w.id,
    name: w.name,
    initials: initialsOf(w.name || w.id),
    gradient: vignetteGradient(tint),
    pastille: null,
    royaume: null,
    ref: w.id,
    roleLabel: null,
    roleIndex: tint,
    summary: `${kind} · ${n} phase${n > 1 ? "s" : ""}`,
    chips: w.phases.map((p) => ({
      key: `phase-${w.id}-${p.id}`,
      text: p.name.replace(/^P\d+ — /, ""),
      kind: "meta" as const,
    })),
    emptyChipsLabel: "aucune phase déclarée",
  };
}

/** Projette le pool de workflows complet (l'ordre d'entrée est conservé). */
export function buildWorkflowReservoir(workflows: readonly Workflow[]): ElementCardVM[] {
  return workflows.map(buildWorkflowCard);
}

/** Repli hors-ligne / source de session du pool : le catalogue canonique (deep-clone éditable). */
export function cloneWorkflowCatalog(): Workflow[] {
  return Object.values(WORKFLOW_CATALOG).map(cloneWorkflow);
}

/** Adapte un workflow vers l'entité générique de Fëanor-en-tête (édition). */
export function workflowToAuthoredEntity(w: Workflow): AuthoredEntity {
  return {
    type: "workflow",
    typeLabel: WORKFLOW_TYPE_LABEL,
    newLabel: "Nouveau workflow",
    name: w.name || w.id,
    key: w.kind ?? DEFAULT_WORKFLOW_KIND,
    roleIndex: workflowTint(w.kind),
    pastille: null,
  };
}

/** Descripteur de **création vierge** d'un workflow (name vide → placeholder « Nouveau workflow »). */
export const WORKFLOW_BLANK_ENTITY: AuthoredEntity = {
  type: "workflow",
  typeLabel: WORKFLOW_TYPE_LABEL,
  newLabel: "Nouveau workflow",
  name: "",
  key: DEFAULT_WORKFLOW_KIND,
  roleIndex: workflowTint(DEFAULT_WORKFLOW_KIND),
  pastille: null,
};

/**
 * **Amorce de création** d'un workflow neuf : un workflow valide minimal (une phase, `kind` par
 * défaut) que `WorkflowElementEditor` réutilise en semence de session. `id`/`name` restent vides —
 * ils naissent du nom saisi à la création (l'`WorkflowAtelier` n'édite que `kind`/phases/gates).
 */
export const WORKFLOW_STARTER: Workflow = {
  id: "",
  name: "",
  methodId: DEFAULT_METHOD_ID,
  kind: DEFAULT_WORKFLOW_KIND,
  phases: [
    {
      id: "phase",
      order: 0,
      name: "Nouvelle phase",
      description: "",
      roleKeys: [],
      gate: { kind: "human", condition: "" },
    },
  ],
};
