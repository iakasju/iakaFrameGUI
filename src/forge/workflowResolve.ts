/**
 * workflowResolve — **résolution de la référence workflow** d'une Méthode (P6b §4.2, EW-7).
 *
 * Le cœur reste **sans I/O** (comme le Binding P7) : c'est la **forge** qui, AVANT génération, lit
 * `workflows/<id>.md` via la façade `library_*`, le parse (`parseWorkflowMd`) et **injecte** l'objet
 * `Workflow` dans `KitGenOptions.workflow`. Cette résolution est **isolée ici** (testable, pure de
 * tout rendu). Ordre de résolution (§4.1) :
 *   1. `method.workflowId` → **collection** `<home>/workflows/<id>.md` (source prioritaire, P6b) ;
 *   2. à défaut, **catalogue du cœur** (`resolveWorkflow`) ;
 *   3. à défaut, **canonique** (`IAKAFRAME_CANONICAL_WORKFLOW`).
 * Référence **absente/illisible** → **repli canonique + signal NON bloquant** (Q-7, jamais d'échec).
 * NB (Q-9) : la collection éditable `<home>/workflows/` est **distincte** du pool d'atomes I1
 * `<home>/library/workflows/` — on lit bien la **collection** ici.
 */
import {
  parseWorkflowMd,
  resolveWorkflow,
  type Method,
  type Workflow,
} from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";

/** Résultat de résolution : le workflow (toujours ≥ canonique) + un signal non bloquant éventuel. */
export interface ResolvedWorkflow {
  workflow: Workflow;
  /** Signal non bloquant (Q-7) : référence pendante/illisible → repli canonique. */
  warning?: string;
}

/**
 * Résout le workflow d'une Méthode pour l'injection à la génération (EW-7). Défensif : jamais
 * d'exception ; toute défaillance dégrade en **repli canonique + warning**.
 */
export async function resolveMethodWorkflow(
  method: Method | null | undefined,
  api: Backend = backend,
): Promise<ResolvedWorkflow> {
  const id = method?.workflowId?.trim();
  // Pas de référence → catalogue du cœur, sinon canonique (repli pur, aucun I/O).
  if (!id) return { workflow: resolveWorkflow(method) };

  // 1) Collection `workflows/` (source prioritaire P6b).
  let text: string | null = null;
  try {
    text = await api.libraryRead("workflows", id);
  } catch {
    text = null;
  }
  if (text != null) {
    const wf = parseWorkflowMd(text);
    if (wf) return { workflow: wf };
    // Présent mais illisible → repli + signal (Q-7).
    return {
      workflow: resolveWorkflow(method),
      warning: `workflow « ${id} » illisible — repli sur le workflow canonique`,
    };
  }

  // 2) Absent de la collection : peut-être un id du catalogue du cœur (ex. iakaframe-canonical).
  const fromCatalog = resolveWorkflow(method);
  if (fromCatalog.id === id) return { workflow: fromCatalog };

  // 3) Référence pendante (ni collection ni catalogue) → repli canonique + signal (Q-7).
  return {
    workflow: fromCatalog,
    warning: `workflow « ${id} » introuvable — repli sur le workflow canonique`,
  };
}
