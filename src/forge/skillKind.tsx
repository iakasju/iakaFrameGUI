/**
 * skillKind — la **skill en tant que pool authorable** de l'hôte générique `ElementReservoir`,
 * rebranché sur l'atome **DISQUE** `SkillAtom {id, name, description, subskills}` (chantier #4 Lot C,
 * AR-E E1). Avant le Lot C, le pool parlait le type d'**attribution catalogue** `Skill {id, roleKey,
 * label}` (dont `label`/`roleKey` étaient des contrôles fantômes jetés au save). Désormais il parle la
 * **vérité disque** : `SkillEditor` édite `description` (load-bearing, garde visible) + `subskills`
 * (via `<ListEditor>`), `id`/`name` verrouillés (C-1), corps `SKILL.md` différé.
 *
 * Source réelle = `frame.skills` (atomes parsés) ; repli = catalogue projeté en atomes ; édition
 * **persistée sur disque** via `persistSkill` (Lot 5c, câblé par `ElementsAuthoring`). AUCUN contrat
 * cœur touché : le rebranchement est un mapping `src/` au-dessus du contrat 5c déjà en place.
 */
import { type SkillAtom } from "@iakaframe/core";
import {
  buildSkillReservoir,
  cloneSkillCatalog,
  skillToAuthoredEntity,
  SKILL_BLANK_ENTITY,
  SKILL_TYPE_LABEL,
} from "./skillCards";
import type { ElementKind } from "./elementKind";
import { SkillEditor } from "../components/SkillEditor";
import { resolveSkillProposition } from "./skillProposition";

/** Skill **vierge** complète (brique B) — base de fusion en création (miroir de l'`EMPTY` de l'éditeur). */
function blankSkill(): SkillAtom {
  return { id: "", name: "", description: "", subskills: [] };
}

/** Le pool **skill** de l'hôte générique (rebranché sur `SkillAtom` — Lot C). */
export const skillKind: ElementKind<SkillAtom> = {
  type: "skill",
  typeLabel: SKILL_TYPE_LABEL,
  scopeClass: "skill-reservoir",
  crumbCollection: "skills",
  crumb: "LIBRARY / SKILLS",
  title: "Le réservoir de skills",
  subtitle: (
    <>
      Le <strong>« comment » outillé d'un rôle</strong> — chaque skill est un{" "}
      <code>{"{ description · subskills }"}</code> sur disque : un{" "}
      <strong>blurb de déclenchement</strong> (load-bearing) et une éventuelle composition de
      sous-skills. Ouvrez une fiche pour l'éditer (id/name verrouillés, corps différé). Source : les
      skills réelles du frame courant.
    </>
  ),
  sectionLabel: "Skills",
  sectionMeta: (n) => `— le catalogue · ${n}`,
  newButtonLabel: "Nouvelle skill",
  idOf: (s) => s.id,
  buildCards: buildSkillReservoir,
  toAuthoredEntity: skillToAuthoredEntity,
  blankEntity: SKILL_BLANK_ENTITY,
  fallback: cloneSkillCatalog,
  Editor: ({ element, existingIds, onSubmit, onCancel }) => (
    <SkillEditor element={element} existingIds={existingIds} onSubmit={onSubmit} onCancel={onCancel} />
  ),
  // Brique B : Fëanor propose les champs éditables (description/subskills) — `id`/`name` et le corps
  // `SKILL.md` (différé) jamais proposés. Repli honnête `null`+`reason` ; écriture inchangée (`persistSkill`).
  proposeElement: resolveSkillProposition,
  blankElement: blankSkill,
};
