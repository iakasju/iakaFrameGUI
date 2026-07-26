/**
 * skill.ts — la **skill** (méthode outillée d'un rôle) + catalogue connu (cœur 🟦).
 *
 * Contrat § 2.3 : une skill est le « comment » d'un rôle (id `iakaframe-*`). En P1, une
 * persona ne porte que des **ids de skills** (`Persona.skills: string[]`) ; l'éditeur de
 * corps riche (`SKILL.md`, allowedTools, hooks…) est **différé**. On expose ici l'interface
 * déclarative + un catalogue de skills connues servant de suggestions à l'authoring.
 */

import type { FrontmatterPatch } from "./frontmatter";

/** Déclaration d'une skill (MVP = attribution d'id ; corps riche différé). */
export interface Skill {
  /** Id stable de la skill (ex. "iakaframe-cadrage"). */
  id: string;
  /** Rôle auquel la skill se rattache (réf. `Role.key`). */
  roleKey: string;
  /** Libellé lisible (menu d'attribution). */
  label: string;
}

/**
 * Catalogue des skills connues (gabarit d'authoring). Dérivé de la table
 * `SKILL_BY_AGENT` du Cockpit (`mock/demoTeam.ts:55-64`), reclassé **par rôle** (jamais
 * par nom de code). La saisie libre d'un id hors-catalogue reste tolérée (AR-5).
 */
export const CATALOG_SKILLS: readonly Skill[] = [
  { id: "iakaframe-odin", roleKey: "portefeuille", label: "Odin (portefeuille)" },
  { id: "iakaframe-aragorn", roleKey: "coordination", label: "Coordination projet" },
  { id: "iakaframe-cadrage", roleKey: "cadrage", label: "Cadrage / architecture" },
  { id: "iakaframe-qualite", roleKey: "qualite", label: "Qualité / gate" },
  { id: "iakaframe-naonedge", roleKey: "design", label: "Charte NaonEdge" },
  { id: "iakaframe-nathalie", roleKey: "documentation", label: "Documentation" },
  { id: "iakaframe-deploiement", roleKey: "deploiement", label: "Déploiement (Helm)" },
] as const;

/** Ids de skills connues (ordre du catalogue). */
export const CATALOG_SKILL_IDS: readonly string[] = CATALOG_SKILLS.map(
  (s) => s.id,
);

/** Skills connues d'un rôle (par clé, insensible à la casse) ; `[]` si aucune. */
export function skillsForRole(roleKey: string): Skill[] {
  const k = roleKey.toLowerCase();
  return CATALOG_SKILLS.filter((s) => s.roleKey === k);
}

// ---------------------------------------------------------------------------
// Lot 5c — persistance du pool `skills`. ADDITIONS PURES (type d'atome distinct du `Skill`
// {id,roleKey,label} ci-dessus, qui est la vue d'attribution catalogue — incompatible avec la
// forme disque {id,name,description,subskills}, d'où un type dédié plutôt qu'une modification).
// ---------------------------------------------------------------------------

/**
 * L'atome de skill **réel** du disque, stocké en **DOSSIER** `library/skills/<id>/SKILL.md`
 * (convention Claude Agent Skills : le nom du dossier fait foi). Forme mesurée `{ id, name,
 * description, subskills }` : `description` est **load-bearing** (blurb de déclenchement, comme
 * `persona.description`) ; le **corps** est le vrai payload (préservé verbatim). Identité = `id`
 * (== `name` == nom de dossier, verrouillé C-1).
 */
export interface SkillAtom {
  /** Id (== nom de dossier == `name`) — **identité (C-1)**. */
  id: string;
  /** Nom (== id au canon, verrouillé C-1). */
  name: string;
  /** Blurb de déclenchement (load-bearing) — éditable au MVP. */
  description: string;
  /** Sous-skills composées (fermeture de composition) — éditables au MVP. */
  subskills: string[];
}

/**
 * Parse défensif d'UN atome skill réel — Lot 5c. `null` si pas d'`id`. `name` repli sur `id` ;
 * `description` défensif (`""`) ; `subskills` coercé en `string[]`. Distinct de `parseSkillRefs`
 * (frame.ts, refs sortantes) qu'il ne modifie pas. Jamais d'exception.
 */
export function parseSkill(raw: unknown): SkillAtom | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" && r.id.trim().length > 0 ? r.id.trim() : null;
  if (!id) return null;
  const name = typeof r.name === "string" && r.name.trim().length > 0 ? r.name.trim() : id;
  const description = typeof r.description === "string" ? r.description : "";
  const subskills = Array.isArray(r.subskills)
    ? r.subskills.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  return { id, name, description, subskills };
}

/**
 * **Patch de frontmatter** d'une skill (Lot 5c, C-1) : les champs éditables `description` et
 * `subskills`. **Exclus** : `id` et `name` (verrou C-1). Le **corps** (payload de la skill) et toute
 * clé hors patch sont **préservés à l'octet** par `patchFrontmatter`.
 *
 * ⚠️ **`subskills` n'est émis que s'il est NON VIDE** : au canon, une skill atomique n'a **aucune**
 * ligne `subskills`. L'émettre à vide ferait **ajouter** une ligne `subskills: []` par
 * `patchFrontmatter` (clé absente ⇒ ajout canonique) et **casserait le round-trip**. Omis ⇒ la clé
 * absente reste absente, et une liste réelle inchangée est laissée verbatim.
 */
export function skillFrontmatterPatch(s: SkillAtom): FrontmatterPatch {
  const patch: FrontmatterPatch = {
    description: { kind: "scalar", value: s.description },
  };
  if (s.subskills.length > 0) {
    patch.subskills = { kind: "list", value: [...s.subskills] };
  }
  return patch;
}
