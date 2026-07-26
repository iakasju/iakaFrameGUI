/**
 * WorkflowElementEditor — **adaptateur** qui branche l'éditeur riche existant `WorkflowAtelier` sur le
 * contrat `Editor` de l'hôte générique `ElementReservoir` (chantier #3 Lot 3). Il **ne réécrit PAS**
 * l'éditeur de workflow : il **réutilise** `WorkflowAtelier` tel quel (sélecteur `kind` ·
 * pipeline/cycle/flow/cycle-with-gate · gates optionnels · phases : ajouter/supprimer/réordonner).
 *
 * Écart d'interface comblé ici (MVP) : `WorkflowAtelier` édite en **live** (`workflow` +
 * `onWorkflowChange` continu, aucun bouton de commit propre), là où l'hôte attend le contrat
 * `Editor` (`element`/`onSubmit(element)`/`onCancel`). L'adaptateur porte donc un **brouillon de
 * session** (seed = le workflow ouvert, ou l'amorce `WORKFLOW_STARTER` en création), passe
 * `onWorkflowChange = setDraft`, ajoute le **nom/id** (que `WorkflowAtelier` n'édite pas) et la
 * **barre Annuler/Enregistrer** qui remonte `onSubmit(draft)`. L'`id` est dérivé du nom à la création
 * (`slugify`, unique) puis **verrouillé** (C-1). Ne persiste rien (Lot 5 différé) : remonte à `onSubmit`.
 */
import { useState } from "react";
import { cloneWorkflow, slugify, type Workflow } from "@iakaframe/core";
import type { ElementEditorProps } from "../forge/elementKind";
import { WORKFLOW_STARTER } from "../forge/workflowCards";
import { WorkflowAtelier } from "../forge/ateliers/WorkflowAtelier";

export function WorkflowElementEditor({
  element,
  existingIds = [],
  onSubmit,
  onCancel,
}: ElementEditorProps<Workflow>) {
  const editing = Boolean(element);
  // Brouillon de session — deep-clone (le canonique gelé n'est jamais muté) ; création = amorce.
  const [draft, setDraft] = useState<Workflow>(() =>
    element ? cloneWorkflow(element) : cloneWorkflow(WORKFLOW_STARTER),
  );

  function submit() {
    const name = draft.name.trim();
    if (name.length === 0) return;
    // id : dérivé du nom à la création (unique) ; verrouillé une fois posé (C-1).
    const id =
      editing && draft.id ? draft.id : uniqueId(slugify(name) || "workflow", existingIds);
    onSubmit({ ...draft, id, name });
  }

  const nameOk = draft.name.trim().length > 0;

  return (
    <div className="panel workflow-element-editor">
      <h3>{editing ? "Éditer le workflow" : "Nouveau workflow"}</h3>

      <div className="field">
        <label>Nom</label>
        <input
          value={draft.name}
          placeholder="ex. Workflow canonique iakaframe"
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        />
      </div>

      {editing ? (
        <div className="field">
          <label>id</label>
          <input className="locked" value={draft.id} disabled />
          <div className="lockhint">
            🔒 id définitif — jamais renommé une fois créé (constitution C-1)
          </div>
        </div>
      ) : (
        <div className="field">
          <div className="lockhint">
            ⓘ l'id naîtra du nom (slug unique) et sera verrouillé à la création
          </div>
        </div>
      )}

      {/* L'éditeur riche existant, réutilisé tel quel (kind · phases · gates). Le `workbench` lui
          rend le layout à deux colonnes (rail + édition), comme sous l'onglet Méthode › Workflow. */}
      <div className="workbench workflow-atelier-host">
        <WorkflowAtelier workflow={draft} onWorkflowChange={setDraft} />
      </div>

      <div className="row">
        <div style={{ flex: 1 }} />
        {onCancel && (
          <button className="btn ghost" type="button" onClick={onCancel}>
            Annuler
          </button>
        )}
        <button className="btn" type="button" disabled={!nameOk} onClick={submit}>
          {editing ? "Enregistrer" : "Créer le workflow"}
        </button>
      </div>
    </div>
  );
}

/** Assure un id unique dans le pool (suffixe -2, -3… si collision). */
function uniqueId(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
