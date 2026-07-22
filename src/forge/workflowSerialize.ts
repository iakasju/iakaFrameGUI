/**
 * workflowSerialize — closure de **sérialisation du document Workflow** (étape 3bis, doctrine
 * `GUI ← frame`). Isolée de `ForgeShell` pour être **partagée** avec les tests document-level
 * (byte-parité AC-2) — c'est ici que se joue la parade au piège de l'**alignement manuel** du
 * frontmatter du frame (`kind: auto,␣␣criteria`, non reproductible génériquement).
 *
 * Règle de Save (option 3a) :
 *  - **non édité** depuis l'Open (artefact deep-equal à la capture d'origine) → ré-émission du
 *    **texte source capturé verbatim** ⇒ Open→Save byte-identique (honore l'alignement manuel) ;
 *  - **édité / neuf** → sérialisation **canonique** frame-format (`serializeWorkflowMd`), prose
 *    préservée (capture du corps) ou boilerplate minimal (document neuf).
 */
import { serializeWorkflowMd, type Workflow } from "@iakaframe/core";
import type { OriginCapture } from "./useForgeDocument";

/** Corps `.md` minimal généré au Save d'un workflow **neuf** (renvoie au récit humain). */
export const workflowBody = (w: Workflow): string =>
  `# ${w.name}\n\nWorkflow (phases + gates) — artefact autonome de \`workflows/\`. Forgé par iakaFrameGUI.\n`;

/**
 * Extrait la **prose seule** d'un corps workflow capturé à l'Open. Frame-format : la prose est
 * rendue **telle quelle** (byte-préservée sur édition, AC-4). Corps **legacy** (ancien encodage
 * GUI, bloc de données `<!-- iakaframe:workflow …`) : on **tronque** au marqueur pour ne pas
 * réinjecter le bloc de données retiré des écritures. `null` en entrée (document neuf) → `null`.
 */
export const workflowProse = (body: string | null): string | null => {
  if (body == null) return null;
  const marker = body.indexOf("<!-- iakaframe:workflow");
  if (marker >= 0) return `${body.slice(0, marker).trimEnd()}\n`;
  return body;
};

/** Égalité structurelle de deux workflows (deep-equal) — non édité ⇒ ré-émission verbatim. */
function sameWorkflow(a: Workflow, b: Workflow): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Sérialise le **document Workflow** au Save. Non édité (deep-equal à la capture) → **source
 * verbatim** (byte-parité AC-2) ; sinon → **canonique** frame-format (prose capturée ou boilerplate).
 */
export function serializeWorkflowDoc(w: Workflow, origin: OriginCapture): string {
  if (
    origin.source != null &&
    origin.artifact != null &&
    sameWorkflow(w, origin.artifact as Workflow)
  ) {
    return origin.source;
  }
  return serializeWorkflowMd(w, workflowProse(origin.body) ?? workflowBody(w));
}
