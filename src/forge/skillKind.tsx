/**
 * skillKind — la **skill en tant que pool authorable** de l'hôte générique `ElementReservoir`
 * (chantier #3 Lot 2). Clone du pilote `principleKind` adapté aux champs réels de `Skill` : un
 * `buildCards` + un `Editor` + un `toAuthoredEntity` propres à la skill, branchés **sans toucher
 * l'hôte** ni FeanorHead.
 *
 * Source = catalogue canonique vendoré `CATALOG_SKILLS` (étiqueté, honnête) ; édition **persistée
 * sur disque** via `persistSkill` (Lot 5c, câblé par `ElementsAuthoring`). AUCUN contrat cœur touché.
 * NB : l'authoring des champs riches (`description`/`subskills`) + la levée des contrôles fantômes
 * (`label`/`roleKey`) restent au **Lot C** (chantier #4).
 */
import { type Skill } from "@iakaframe/core";
import {
  buildSkillReservoir,
  cloneSkillCatalog,
  skillToAuthoredEntity,
  SKILL_BLANK_ENTITY,
  SKILL_TYPE_LABEL,
} from "./skillCards";
import type { ElementKind } from "./elementKind";
import { SkillEditor } from "../components/SkillEditor";

/** Le pool **skill** de l'hôte générique (Lot 2). */
export const skillKind: ElementKind<Skill> = {
  type: "skill",
  typeLabel: SKILL_TYPE_LABEL,
  scopeClass: "skill-reservoir",
  crumbCollection: "skills",
  crumb: "LIBRARY / SKILLS",
  title: "Le réservoir de skills",
  subtitle: (
    <>
      Le <strong>« comment » outillé d'un rôle</strong> — chaque skill est un{" "}
      <code>{"{ label · roleKey }"}</code>, rattachée à un rôle et référencée (jamais copiée) par les
      personas. Ouvrez une fiche pour l'éditer. Source : le catalogue canonique (édition locale de
      session).
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
};
