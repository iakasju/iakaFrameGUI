/**
 * roleProposition — proposition d'élément (brique B) du pool **rôle**. Champs éditables = ceux que
 * `roleFrontmatterPatch` persiste : `label, scope` (scalaires libres). **Verrouillés (C-1, jamais
 * lus/proposés)** : `id`, `key` (non-renommage) et `roleIndex` (champ de fichier, jamais recalculé).
 * Mécanique live/repli **factorisée** (`elementProposition.ts`).
 */
import type { Role } from "@iakaframe/core";
import {
  makeProposeRun,
  parseJsonObject,
  str,
  type ElementPropositionSpec,
} from "./elementProposition";

/** Schéma des **champs éditables** d'un rôle (aucun `required`). `key`/`roleIndex` ABSENTS (verrous). */
export const ROLE_PROPOSITION_SCHEMA = {
  type: "object",
  properties: {
    label: { type: "string" },
    scope: { type: "string" },
  },
} as const;

/** Parseur **défensif** : uniquement `label/scope` validés ; `id`/`key`/`roleIndex` jamais lus (C-1). */
export function parseRoleProposition(raw: string): Partial<Role> | null {
  const r = parseJsonObject(raw);
  if (r === null) return null;
  const out: Partial<Role> = {};
  const label = str(r.label);
  if (label !== undefined) out.label = label;
  const scope = str(r.scope);
  if (scope !== undefined) out.scope = scope;
  return Object.keys(out).length > 0 ? out : null;
}

const SPEC: ElementPropositionSpec<Role> = {
  typeLabel: "rôle",
  schema: ROLE_PROPOSITION_SCHEMA,
  contractFields: [
    "Champs autorisés (tous optionnels) : label (libellé d'affichage), scope (portée, ex. « team »).",
    "Ne propose JAMAIS key ni roleIndex : ce sont l'identité et l'index de fichier, verrouillés.",
  ],
  parse: parseRoleProposition,
};

/** Résolveur de proposition du pool rôle (branché sur `ElementKind.proposeElement`). */
export const resolveRoleProposition = makeProposeRun(SPEC);
