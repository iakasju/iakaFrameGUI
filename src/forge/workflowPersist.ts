/**
 * workflowPersist — source réelle + écriture disque du pool **workflow** (Lot 5c, sous-lot
 * 5c-workflow, unification-workflow-pool-collection-5c.md — **Option A** : le pool
 * `library/workflows/<id>.md` est la **vérité unique**). Les DEUX surfaces d'authoring convergent
 * ici : la surface « éléments » (`workflowKind`) via ce module, la surface « méthode »
 * (`WorkflowAtelier`/`useForgeDocument`) via le **même** `pool_write("workflows")` (storage pool).
 *
 * Lecture : la grille amorce sur `frame.workflows` (les `.md` réels du pool dérivés par `buildFrame`),
 * `WORKFLOW_CATALOG` (`fallback`) restant le repli hors-ligne. Écriture : `serializeWorkflowDoc`
 * (partagé avec la surface méthode) — **non édité ⇒ ré-émission source verbatim** (byte-identité,
 * AC-W4), édité/neuf ⇒ frame-format canonique + **corps préservé** (`verbatimBody`). C-1 : l'`id`
 * (== nom de fichier) n'est jamais renommé. **Aucune** écriture collection (`library_write`) : le
 * chemin de la seconde maison est retiré (AC-W1).
 */
import {
  parseWorkflowMd,
  verbatimBody,
  type Workflow,
} from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";
import { loadFrame } from "./frame";
import { serializeWorkflowDoc } from "./workflowSerialize";
import type { OriginCapture } from "./useForgeDocument";

/** Source du réservoir : les workflows RÉELS parsés du pool (`frame.workflows`). Repli `[]`. */
export async function loadWorkflowsReservoir(api: Backend = backend): Promise<Workflow[]> {
  try {
    return (await loadFrame(api)).workflows;
  } catch {
    return [];
  }
}

/**
 * Persiste un workflow dans `<IAKAFRAME_HOME>/library/workflows/<id>.md` (**pool, vérité unique**).
 * Réutilise `serializeWorkflowDoc` en construisant la capture d'origine depuis les octets réels du
 * pool : un workflow **ré-enregistré sans changement** est **byte-identique** (source verbatim) ;
 * édité ⇒ frame-format canonique + prose préservée ; neuf ⇒ boilerplate. Rejette hors Tauri / racine
 * non résolue — l'appelant dégrade proprement.
 */
export async function persistWorkflow(w: Workflow, api: Backend = backend): Promise<void> {
  const existing = await api.poolRead("workflows", w.id);
  const origin: OriginCapture =
    existing != null
      ? { body: verbatimBody(existing), layout: null, source: existing, artifact: parseWorkflowMd(existing) }
      : { body: null, layout: null, source: null, artifact: null };
  const md = serializeWorkflowDoc(w, origin);
  await api.poolWrite("workflows", w.id, md);
}
