/**
 * skillPersist — source réelle + écriture disque **non-destructive** du pool skill (Lot 5c). Le
 * disque stocke l'atome `SkillAtom {id,name,description,subskills}` en **DOSSIER**
 * `library/skills/<id>/SKILL.md` (writer Rust étendu au 5c). L'hôte d'authoring (`skillKind`) parle
 * le type d'attribution `Skill {id,roleKey,label}` — on mappe atome → attribution pour la grille
 * (enrichissement `roleKey`/`label` depuis le catalogue par id, pour l'affichage). L'écriture repart
 * de l'atome réel : le patch (`description`/`subskills`) préserve `id`/`name` + **le corps** (payload
 * de la skill) à l'octet. L'authoring riche (éditer `description`/`subskills`) est différé.
 */
import {
  patchFrontmatter,
  skillFrontmatterPatch,
  serializeSkillMd,
  parseSkill,
  parseFrontmatter,
  CATALOG_SKILLS,
  type Skill,
} from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";
import { loadFrame } from "./frame";

/** Mappe l'atome disque → le type d'attribution de la grille (roleKey/label enrichis, display). */
function atomToAttribution(a: { id: string; name: string }): Skill {
  const cat = CATALOG_SKILLS.find((s) => s.id === a.id); // roleKey/label d'affichage si connu
  return { id: a.id, roleKey: cat?.roleKey ?? "", label: cat?.label ?? a.name };
}

/** Source du réservoir : les skills RÉELLES parsées (`frame.skills`), mappées à l'attribution. */
export async function loadSkillsReservoir(api: Backend = backend): Promise<Skill[]> {
  try {
    return (await loadFrame(api)).skills.map(atomToAttribution);
  } catch {
    return [];
  }
}

/**
 * Persiste une skill dans `<IAKAFRAME_HOME>/library/skills/<id>/SKILL.md`. Édition → patch
 * **non-destructif** repartant de l'atome réel (préserve `id`/`name` + corps + `subskills` à
 * l'octet) ; création → `serializeSkillMd` (`name == id`, description vide, sans subskills). Le
 * writer Rust crée le sous-dossier `<id>/` au besoin.
 */
export async function persistSkill(s: Skill, api: Backend = backend): Promise<void> {
  const existing = await api.poolRead("skills", s.id);
  const md =
    existing != null
      ? patchFrontmatter(
          existing,
          skillFrontmatterPatch(
            parseSkill(parseFrontmatter(existing).data) ?? {
              id: s.id, name: s.id, description: "", subskills: [],
            },
          ),
        )
      : serializeSkillMd({ id: s.id, name: s.id, description: "", subskills: [] });
  await api.poolWrite("skills", s.id, md);
}
