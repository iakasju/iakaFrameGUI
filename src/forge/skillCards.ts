/**
 * skillCards — dérivation **pure** des fiches à vignettes du pool **skill** (chantier #3 Lot 2,
 * extension-feanor-en-tete-pages-elements.md § 5 Lot 2), clone de `principleCards` adapté aux
 * champs réels de `Skill`. AUCUN I/O, AUCUN contrat touché : on **consomme** le catalogue canonique
 * vendoré `CATALOG_SKILLS` (`{id, roleKey, label}`) et on projette le view-model de fiche unifié de
 * l'hôte générique. Pure addition `src/` au-dessus du contrat (parité drift 0 par construction).
 *
 * Honnêteté (§ 8) : la source est le **catalogue canonique étiqueté comme tel** (repli de session),
 * jamais une donnée fabriquée. La skill se rattache à un **rôle** réel (`roleKey`) : la teinte de la
 * vignette est castée par le `roleIndex` canon du rôle (couleur = rôle, pas un hash arbitraire).
 * MVP = attribution d'id (le corps riche `SKILL.md`/allowedTools est différé côté cœur, cf. skill.ts).
 */
import {
  CATALOG_SKILLS,
  roleByKey,
  roleIndexOf,
  roleLabel,
  type Skill,
} from "@iakaframe/core";
import { vignetteGradient, initialsOf } from "./casting";
import type { AuthoredEntity } from "./feanorHeadModel";
import type { ElementCardVM } from "./elementKind";

/** Le type FR affiché du pool. */
export const SKILL_TYPE_LABEL = "skill";

/** Projette UNE skill en fiche à vignette (déterministe, castée par le rôle réel). */
export function buildSkillCard(s: Skill): ElementCardVM {
  const idx = roleIndexOf(s.roleKey);
  const knownRole = roleByKey(s.roleKey);
  return {
    id: s.id,
    name: s.label,
    initials: initialsOf(s.label),
    gradient: vignetteGradient(idx),
    pastille: null,
    royaume: null,
    ref: s.id,
    // La skill EST le « comment » d'un rôle → on montre le rôle de rattachement (réel).
    roleLabel: knownRole ? roleLabel(s.roleKey) : null,
    roleIndex: idx,
    summary: null,
    chips: [{ key: `role-${s.id}`, text: `rôle · ${s.roleKey}`, kind: "meta" as const }],
    emptyChipsLabel: "attribution d'id — corps de skill différé",
  };
}

/** Projette le pool de skills complet (l'ordre d'entrée est conservé). */
export function buildSkillReservoir(skills: readonly Skill[]): ElementCardVM[] {
  return skills.map(buildSkillCard);
}

/** Repli hors-ligne / source de session du pool : le catalogue canonique (copie éditable). */
export function cloneSkillCatalog(): Skill[] {
  return CATALOG_SKILLS.map((s) => ({ ...s }));
}

/** Adapte une skill vers l'entité générique de Fëanor-en-tête (édition). */
export function skillToAuthoredEntity(s: Skill): AuthoredEntity {
  return {
    type: "skill",
    typeLabel: SKILL_TYPE_LABEL,
    newLabel: "Nouvelle skill",
    name: s.label,
    key: s.roleKey || null,
    roleIndex: roleIndexOf(s.roleKey),
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
  roleIndex: 2,
  pastille: null,
};
