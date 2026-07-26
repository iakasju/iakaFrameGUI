/**
 * ritualProposition — proposition d'élément (brique B) du pool **rituel**. Champs éditables = ceux que
 * `ritualFrontmatterPatch` persiste : `label` (scalaire), `side` (enum `forge`|`cockpit`),
 * `triggers[]` et `actions[]` (listes libres). **Verrouillé (C-1, jamais lu/proposé)** : `id`.
 * Mécanique live/repli **factorisée** (`elementProposition.ts`).
 */
import type { Ritual, RitualSide } from "@iakaframe/core";
import {
  makeProposeRun,
  parseJsonObject,
  str,
  strList,
  type ElementPropositionSpec,
} from "./elementProposition";

/** Schéma des **champs éditables** d'un rituel (aucun `required`). `id` ABSENT (verrou C-1). */
export const RITUAL_PROPOSITION_SCHEMA = {
  type: "object",
  properties: {
    label: { type: "string" },
    side: { type: "string", enum: ["forge", "cockpit"] },
    triggers: { type: "array", items: { type: "string" } },
    actions: { type: "array", items: { type: "string" } },
  },
} as const;

/**
 * Parseur **défensif** : `label` scalaire, `side` retenu SEULEMENT s'il est canonique
 * (`forge`|`cockpit`, jamais une tranche inventée), `triggers`/`actions` listes non vides ; `id`
 * jamais lu (C-1).
 */
export function parseRitualProposition(raw: string): Partial<Ritual> | null {
  const r = parseJsonObject(raw);
  if (r === null) return null;
  const out: Partial<Ritual> = {};
  const label = str(r.label);
  if (label !== undefined) out.label = label;
  // side : uniquement les valeurs canoniques de l'énum (jamais une tranche inventée).
  const side = str(r.side);
  if (side === "forge" || side === "cockpit") out.side = side as RitualSide;
  const triggers = strList(r.triggers);
  if (triggers.length > 0) out.triggers = triggers;
  const actions = strList(r.actions);
  if (actions.length > 0) out.actions = actions;
  return Object.keys(out).length > 0 ? out : null;
}

const SPEC: ElementPropositionSpec<Ritual> = {
  typeLabel: "rituel",
  schema: RITUAL_PROPOSITION_SCHEMA,
  contractFields: [
    "Champs autorisés (tous optionnels) : label (libellé court), side (UNE tranche : « forge » pour la",
    "fabrication ou « cockpit » pour le run), triggers (mots-clés qui déclenchent le geste), actions",
    "(étapes du geste, listées).",
  ],
  parse: parseRitualProposition,
};

/** Résolveur de proposition du pool rituel (branché sur `ElementKind.proposeElement`). */
export const resolveRitualProposition = makeProposeRun(SPEC);
