/**
 * skillProposition — proposition d'élément (brique B) du pool **skill**. Champs éditables = ceux que
 * `skillFrontmatterPatch` persiste : `description` (blurb de déclenchement, load-bearing) et
 * `subskills[]` (composition). **Verrouillés (C-1, jamais lus/proposés)** : `id`, `name`. Le **corps
 * `SKILL.md` reste DIFFÉRÉ** (hors périmètre, § 8) — jamais proposé. Mécanique live/repli
 * **factorisée** (`elementProposition.ts`).
 *
 * `subskills` sont des **ids de skills** : filtrés au catalogue (`CATALOG_SKILLS`) comme les `skills`
 * du pilote persona — jamais d'id halluciné qui entrerait en silence (l'utilisateur relit de toute façon).
 */
import { CATALOG_SKILLS, type SkillAtom } from "@iakaframe/core";
import {
  filterCatalogIds,
  makeProposeRun,
  parseJsonObject,
  str,
  type ElementPropositionSpec,
} from "./elementProposition";

/** Ids de skills du catalogue (filtre anti-hallucination des `subskills`). */
const SKILL_IDS: ReadonlySet<string> = new Set(CATALOG_SKILLS.map((s) => s.id));

/** Schéma des **champs éditables** d'une skill (aucun `required`). `id`/`name`/corps ABSENTS. */
export const SKILL_PROPOSITION_SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string" },
    subskills: { type: "array", items: { type: "string" } },
  },
} as const;

/**
 * Parseur **défensif** : `description` scalaire, `subskills` filtrés au catalogue ; `id`/`name`/corps
 * jamais lus (C-1 / différé).
 */
export function parseSkillProposition(raw: string): Partial<SkillAtom> | null {
  const r = parseJsonObject(raw);
  if (r === null) return null;
  const out: Partial<SkillAtom> = {};
  const description = str(r.description);
  if (description !== undefined) out.description = description;
  const subskills = filterCatalogIds(r.subskills, SKILL_IDS);
  if (subskills.length > 0) out.subskills = subskills;
  return Object.keys(out).length > 0 ? out : null;
}

const SPEC: ElementPropositionSpec<SkillAtom> = {
  typeLabel: "skill",
  schema: SKILL_PROPOSITION_SCHEMA,
  contractFields: [
    "Champs autorisés (tous optionnels) : description (le blurb de déclenchement, load-bearing : quand",
    "et pourquoi la skill s'active), subskills (ids de skills du catalogue composées ici).",
    "Ne propose JAMAIS le corps de la skill (SKILL.md) ni son id/name : différés et verrouillés.",
  ],
  parse: parseSkillProposition,
};

/** Résolveur de proposition du pool skill (branché sur `ElementKind.proposeElement`). */
export const resolveSkillProposition = makeProposeRun(SPEC);
