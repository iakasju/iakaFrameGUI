/**
 * guardrailProposition — proposition d'élément (brique B) du pool **garde-fou**. Champs éditables =
 * ceux que `guardrailFrontmatterPatch` persiste : `label, policy` (scalaires libres). **Verrouillés
 * (C-1 / load-bearing, jamais lus/proposés)** : `id`, ainsi que `kind` + `hook` (enum + spec de
 * branchement couplés au code des hooks). Mécanique live/repli **factorisée** (`elementProposition.ts`).
 */
import type { Guardrail } from "@iakaframe/core";
import {
  makeProposeRun,
  parseJsonObject,
  str,
  type ElementPropositionSpec,
} from "./elementProposition";

/** Schéma des **champs éditables** d'un garde-fou (aucun `required`). `kind`/`hook` ABSENTS (verrous). */
export const GUARDRAIL_PROPOSITION_SCHEMA = {
  type: "object",
  properties: {
    label: { type: "string" },
    policy: { type: "string" },
  },
} as const;

/** Parseur **défensif** : uniquement `label/policy` validés ; `id`/`kind`/`hook` jamais lus (C-1). */
export function parseGuardrailProposition(raw: string): Partial<Guardrail> | null {
  const r = parseJsonObject(raw);
  if (r === null) return null;
  const out: Partial<Guardrail> = {};
  const label = str(r.label);
  if (label !== undefined) out.label = label;
  const policy = str(r.policy);
  if (policy !== undefined) out.policy = policy;
  return Object.keys(out).length > 0 ? out : null;
}

const SPEC: ElementPropositionSpec<Guardrail> = {
  typeLabel: "garde-fou",
  schema: GUARDRAIL_PROPOSITION_SCHEMA,
  contractFields: [
    "Champs autorisés (tous optionnels) : label (libellé court), policy (la prose de la garde : ce",
    "qu'elle contraint et pourquoi).",
    "Ne propose JAMAIS kind ni hook : ils sont load-bearing (couplés au code des hooks) et verrouillés.",
  ],
  parse: parseGuardrailProposition,
};

/** Résolveur de proposition du pool garde-fou (branché sur `ElementKind.proposeElement`). */
export const resolveGuardrailProposition = makeProposeRun(SPEC);
