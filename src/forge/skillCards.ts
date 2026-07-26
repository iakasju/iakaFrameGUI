/**
 * skillCards — dérivation **pure** des fiches à vignettes du pool **skill**, rebranché sur l'atome
 * **DISQUE** `SkillAtom {id, name, description, subskills}` (chantier #4 Lot C, AR-E E1). Avant le Lot C,
 * la projection consommait le type d'**attribution catalogue** `Skill {id, roleKey, label}` (vue
 * catalogue) ; désormais elle consomme la **vérité disque** (`frame.skills`), dont `description` et
 * `subskills` sont les vrais champs. AUCUN I/O, AUCUN contrat touché : pure addition/rebranchement `src/`.
 *
 * Honnêteté (§ 8) : la fiche ne montre que ce que l'atome **déclare** — `description` en résumé,
 * `subskills` en puces (jamais fabriqués). Le **rôle** de rattachement (`roleLabel`/teinte) n'est PAS un
 * champ de l'atome : c'est une **méta d'affichage dérivée du catalogue** (`CATALOG_SKILLS`) par id **si
 * connu**, sinon retombe sur une teinte neutre — jamais une donnée inventée. Le corps `SKILL.md` (payload)
 * reste hors carte (différé, AR-D).
 */
import {
  CATALOG_SKILLS,
  roleIndexOf,
  roleLabel,
  type SkillAtom,
} from "@iakaframe/core";
import { vignetteGradient, initialsOf } from "./casting";
import type { AuthoredEntity } from "./feanorHeadModel";
import type { ElementCardVM } from "./elementKind";

/** Le type FR affiché du pool. */
export const SKILL_TYPE_LABEL = "skill";

/** Index de casting neutre par défaut (skill hors-catalogue : aucune teinte de rôle à dériver). */
const DEFAULT_SKILL_ROLE_INDEX = 2;

/** Rôle d'affichage (méta) dérivé du catalogue par id — `null` si la skill est hors-catalogue. */
function displayRole(id: string): { roleKey: string; index: number } | null {
  const cat = CATALOG_SKILLS.find((s) => s.id === id);
  return cat ? { roleKey: cat.roleKey, index: roleIndexOf(cat.roleKey) } : null;
}

/** Projette UNE skill (atome disque) en fiche à vignette (déterministe). */
export function buildSkillCard(a: SkillAtom): ElementCardVM {
  const role = displayRole(a.id);
  const idx = role ? role.index : DEFAULT_SKILL_ROLE_INDEX;
  return {
    id: a.id,
    name: a.name,
    initials: initialsOf(a.name),
    gradient: vignetteGradient(idx),
    pastille: null,
    royaume: null,
    ref: a.id,
    // Rôle de rattachement = méta d'affichage catalogue (jamais un champ de l'atome).
    roleLabel: role ? roleLabel(role.roleKey) : null,
    roleIndex: idx,
    // Résumé = la `description` réelle (blurb de déclenchement), champ load-bearing de l'atome.
    summary: a.description.trim().length > 0 ? a.description : null,
    // Puces = les `subskills` réelles (composition) — jamais fabriquées.
    chips: a.subskills.map((s) => ({ key: `sub-${a.id}-${s}`, text: s, kind: "sk" as const })),
    emptyChipsLabel: "skill atomique — aucune sous-skill",
  };
}

/** Projette le pool de skills complet (l'ordre d'entrée est conservé). */
export function buildSkillReservoir(skills: readonly SkillAtom[]): ElementCardVM[] {
  return skills.map(buildSkillCard);
}

/**
 * Repli hors-ligne / source de session du pool : le catalogue canonique **projeté en atomes** (copie
 * éditable). Repli d'affichage uniquement (name == id, description/subskills vides) — remplacé par les
 * atomes réels (`frame.skills`) dès que le disque répond.
 */
export function cloneSkillCatalog(): SkillAtom[] {
  return CATALOG_SKILLS.map((s) => ({ id: s.id, name: s.id, description: "", subskills: [] }));
}

/** Adapte une skill (atome) vers l'entité générique de Fëanor-en-tête (édition). */
export function skillToAuthoredEntity(a: SkillAtom): AuthoredEntity {
  const role = displayRole(a.id);
  return {
    type: "skill",
    typeLabel: SKILL_TYPE_LABEL,
    newLabel: "Nouvelle skill",
    name: a.name,
    key: role ? role.roleKey : null,
    roleIndex: role ? role.index : DEFAULT_SKILL_ROLE_INDEX,
    pastille: null,
  };
}

/** Descripteur de **création vierge** d'une skill (name vide → placeholder « Nouvelle skill »). */
export const SKILL_BLANK_ENTITY: AuthoredEntity = {
  type: "skill",
  typeLabel: SKILL_TYPE_LABEL,
  newLabel: "Nouvelle skill",
  name: "",
  key: null,
  roleIndex: DEFAULT_SKILL_ROLE_INDEX,
  pastille: null,
};
