/**
 * scaffoldProposition — proposition d'élément (brique B) du pool **scaffold**. Champs éditables = ceux
 * que `scaffoldFrontmatterPatch` persiste + que `ScaffoldEditor` façonne : `level` (enum
 * `portfolio`|`project`) et `entries[]` (`{path, role, createIfAbsent}`). **Verrouillés (C-1 /
 * invariant, jamais lus/proposés)** : `id` (== nom, dérivé du nom saisi) et `nonDestructive` (toujours
 * `true`). Mécanique live/repli **factorisée** (`elementProposition.ts`).
 */
import type { Scaffold, ScaffoldEntry, ScaffoldLevel } from "@iakaframe/core";
import {
  makeProposeRun,
  parseJsonObject,
  str,
  type ElementPropositionSpec,
} from "./elementProposition";

/** Schéma des **champs éditables** d'un scaffold (aucun `required`). `id`/`nonDestructive` ABSENTS. */
export const SCAFFOLD_PROPOSITION_SCHEMA = {
  type: "object",
  properties: {
    level: { type: "string", enum: ["portfolio", "project"] },
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          role: { type: "string" },
          createIfAbsent: { type: "boolean" },
        },
      },
    },
  },
} as const;

/** Parse défensif d'une entrée : `path` requis (sinon ignorée), `role` scalaire, `createIfAbsent` booléen. */
function parseProposedEntry(raw: unknown): ScaffoldEntry | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const e = raw as Record<string, unknown>;
  const path = str(e.path);
  if (path === undefined) return null; // entrée sans chemin → ignorée (jamais fabriquée).
  return {
    path,
    role: str(e.role) ?? "",
    // Défaut `true` : cohérent avec l'invariant non-destructif du scaffold (créer si absent).
    createIfAbsent: typeof e.createIfAbsent === "boolean" ? e.createIfAbsent : true,
  };
}

/**
 * Parseur **défensif** : `level` retenu SEULEMENT s'il est canonique, `entries[]` reconstruites (path
 * requis) ; `id`/`nonDestructive` jamais lus (C-1 / invariant).
 */
export function parseScaffoldProposition(raw: string): Partial<Scaffold> | null {
  const r = parseJsonObject(raw);
  if (r === null) return null;
  const out: Partial<Scaffold> = {};

  const level = str(r.level);
  if (level === "portfolio" || level === "project") out.level = level as ScaffoldLevel;

  if (Array.isArray(r.entries)) {
    const entries = r.entries
      .map(parseProposedEntry)
      .filter((e): e is ScaffoldEntry => e !== null);
    if (entries.length > 0) out.entries = entries;
  }

  return Object.keys(out).length > 0 ? out : null;
}

const SPEC: ElementPropositionSpec<Scaffold> = {
  typeLabel: "scaffold",
  schema: SCAFFOLD_PROPOSITION_SCHEMA,
  contractFields: [
    "Champs autorisés (tous optionnels) : level (UN niveau : « portfolio » ou « project »), entries",
    "(liste d'échafaudages). Chaque entrée : path (chemin relatif, ex. « specs/instructions/ »), role",
    "(à quoi elle sert), createIfAbsent (booléen : créée si absente, jamais écrasée).",
    "Ne propose JAMAIS d'id : il naît du nom saisi et est verrouillé.",
  ],
  parse: parseScaffoldProposition,
};

/** Résolveur de proposition du pool scaffold (branché sur `ElementKind.proposeElement`). */
export const resolveScaffoldProposition = makeProposeRun(SPEC);
