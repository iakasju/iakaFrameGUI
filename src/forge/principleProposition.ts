/**
 * principleProposition — proposition d'élément (brique B) du pool **principe**. Champs éditables =
 * ceux que `principleFrontmatterPatch` persiste : `label, policy, trigger` (scalaires libres).
 * **Verrouillé (C-1, jamais lu/proposé)** : `id`. Mécanique live/repli **factorisée**
 * (`elementProposition.ts`) — ce fichier ne porte que le **schéma** + le **parseur défensif** du pool.
 */
import type { Principle } from "@iakaframe/core";
import {
  makeProposeRun,
  parseJsonObject,
  str,
  type ElementPropositionSpec,
} from "./elementProposition";

/** Schéma des **champs éditables** d'un principe (aucun `required` : proposition partielle permise). */
export const PRINCIPLE_PROPOSITION_SCHEMA = {
  type: "object",
  properties: {
    label: { type: "string" },
    policy: { type: "string" },
    trigger: { type: "string" },
  },
} as const;

/** Parseur **défensif** : uniquement `label/policy/trigger` validés ; `id` jamais lu (C-1). */
export function parsePrincipleProposition(raw: string): Partial<Principle> | null {
  const r = parseJsonObject(raw);
  if (r === null) return null;
  const out: Partial<Principle> = {};
  const label = str(r.label);
  if (label !== undefined) out.label = label;
  const policy = str(r.policy);
  if (policy !== undefined) out.policy = policy;
  const trigger = str(r.trigger);
  if (trigger !== undefined) out.trigger = trigger;
  return Object.keys(out).length > 0 ? out : null;
}

const SPEC: ElementPropositionSpec<Principle> = {
  typeLabel: "principe",
  schema: PRINCIPLE_PROPOSITION_SCHEMA,
  contractFields: [
    "Champs autorisés (tous optionnels) : label (libellé court), policy (la politique : le « quoi »/",
    "« pourquoi »), trigger (le déclencheur : quand la politique s'applique).",
  ],
  parse: parsePrincipleProposition,
};

/** Résolveur de proposition du pool principe (branché sur `ElementKind.proposeElement`). */
export const resolvePrincipleProposition = makeProposeRun(SPEC);
