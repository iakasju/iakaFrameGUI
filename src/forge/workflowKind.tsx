/**
 * workflowKind — le **workflow en tant que pool authorable** de l'hôte générique `ElementReservoir`
 * (chantier #3 Lot 3, le cas riche). Branché **sans toucher l'hôte** ni FeanorHead. La particularité
 * du lot : l'`Editor` injecté **réutilise l'éditeur existant** `WorkflowAtelier` (via l'adaptateur
 * `WorkflowElementEditor`) — jamais réimplémenté.
 *
 * Source (Lot 5c, sous-lot 5c-workflow — Option A) = `frame.workflows`, les `.md` RÉELS du **pool**
 * `library/workflows/` (via `loadWorkflowsReservoir`), `WORKFLOW_CATALOG` (`fallback`) restant le
 * repli hors-ligne. Édition/création persistées sur disque (`persistWorkflow` → `poolWrite`,
 * ré-émission verbatim si inchangé). **Même vérité unique** que la surface « méthode »
 * (`WorkflowAtelier`) — plus aucune écriture collection. AUCUN contrat cœur touché.
 */
import { cloneWorkflow, type Workflow } from "@iakaframe/core";
import {
  buildWorkflowReservoir,
  cloneWorkflowCatalog,
  workflowToAuthoredEntity,
  WORKFLOW_BLANK_ENTITY,
  WORKFLOW_STARTER,
  WORKFLOW_TYPE_LABEL,
} from "./workflowCards";
import type { ElementKind } from "./elementKind";
import { WorkflowElementEditor } from "../components/WorkflowElementEditor";
import { resolveWorkflowProposition } from "./workflowProposition";

/**
 * Workflow **vierge** complet (brique B) — base de fusion en création : l'amorce `WORKFLOW_STARTER`
 * (workflow valide minimal), deep-clonée (le canonique gelé n'est jamais muté). Miroir de la semence
 * de `WorkflowElementEditor`. `id`/`name` restent vides → dérivés/saisis à la création (jamais proposés).
 */
function blankWorkflow(): Workflow {
  return cloneWorkflow(WORKFLOW_STARTER);
}

/** Le pool **workflow** de l'hôte générique (Lot 3, cas riche — éditeur `WorkflowAtelier` réutilisé). */
export const workflowKind: ElementKind<Workflow> = {
  type: "workflow",
  typeLabel: WORKFLOW_TYPE_LABEL,
  scopeClass: "workflow-reservoir",
  crumbCollection: "workflows",
  crumb: "LIBRARY / WORKFLOWS",
  title: "Le réservoir de workflows",
  subtitle: (
    <>
      Les <strong>workflows</strong> — chacun est un artefact autonome{" "}
      <code>{"{ id · kind · phases[] }"}</code> du pool <code>library/workflows/</code> (vérité
      unique), référencé par une méthode. Ouvrez une fiche pour l'éditer (type <code>kind</code>,
      phases &amp; gates) dans l'éditeur riche. Source : les <code>.md</code> réels du pool (persistés).
    </>
  ),
  sectionLabel: "Workflows",
  sectionMeta: (n) => `— la collection · ${n}`,
  newButtonLabel: "Nouveau workflow",
  idOf: (w) => w.id,
  buildCards: buildWorkflowReservoir,
  toAuthoredEntity: workflowToAuthoredEntity,
  blankEntity: WORKFLOW_BLANK_ENTITY,
  fallback: cloneWorkflowCatalog,
  Editor: ({ element, existingIds, onSubmit, onCancel }) => (
    <WorkflowElementEditor
      element={element}
      existingIds={existingIds}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  ),
  // Brique B (cas riche) : Fëanor propose les champs éditables (name/kind/phases) — `id` jamais proposé
  // (C-1), `kind`/rôles/gates validés au canon. La proposition pré-remplit l'éditeur riche
  // `WorkflowAtelier` ; l'écriture reste `persistWorkflow` inchangé (ré-émission verbatim si inchangé).
  proposeElement: resolveWorkflowProposition,
  blankElement: blankWorkflow,
};
