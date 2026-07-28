/**
 * skillPersist — source réelle + écriture disque **non-destructive** du pool skill, rebranché sur
 * l'atome **DISQUE** `SkillAtom {id, name, description, subskills}` (chantier #4 Lot C, AR-E E1). Le
 * disque stocke l'atome en **DOSSIER** `library/skills/<id>/SKILL.md` (convention Claude Agent Skills :
 * le nom du dossier fait foi). L'hôte d'authoring (`skillKind`) parle désormais **directement** l'atome
 * (plus de mapping atome ↔ attribution) : `frame.skills` EST déjà `SkillAtom[]`.
 *
 * **Le correctif Lot C** : l'écriture porte enfin l'entrée réelle de l'éditeur (`description`/`subskills`)
 * au lieu de relire l'atome et **jeter** l'édition (le quasi no-op d'avant). `skillFrontmatterPatch(s)`
 * ne réécrit que `description`/`subskills` (émise non vide seulement) et préserve `id`/`name` + toute clé
 * load-bearing (`layer`, inconnues) **à l'octet** (`patchFrontmatter`).
 *
 * **Chantier #4 « corps skill »** : le **corps** (payload) devient éditable. À l'écriture d'un fichier
 * existant, on **compose deux patcheurs sur des régions disjointes** :
 * `patchBody(patchFrontmatter(existing, skillFrontmatterPatch(s)), s.body)` — le frontmatter reste
 * byte-préservé (seules `description`/`subskills` changent si édités), et seul le corps change s'il a
 * été édité (round-trip byte-exact quand `s.body === verbatimBody(existing)`).
 */
import {
  patchFrontmatter,
  patchBody,
  skillFrontmatterPatch,
  serializeSkillMd,
  type SkillAtom,
} from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";
import { loadFrame } from "./frame";

/** Source du réservoir : les skills RÉELLES parsées (`frame.skills` est déjà `SkillAtom[]`). */
export async function loadSkillsReservoir(api: Backend = backend): Promise<SkillAtom[]> {
  try {
    return (await loadFrame(api)).skills;
  } catch {
    return [];
  }
}

/**
 * Persiste une skill dans `<IAKAFRAME_HOME>/library/skills/<id>/SKILL.md`. Édition → **composition
 * non-destructive** : `patchFrontmatter` applique les `description`/`subskills` **édités** (préserve
 * `id`/`name` + clés load-bearing à l'octet ; un champ inchangé ⇒ ligne verbatim), puis `patchBody`
 * remplace le **corps** édité en conservant le frontmatter à l'octet (régions disjointes) — corps
 * inchangé ⇒ identité byte. Création → `serializeSkillMd` (`name == id`, description + subskills +
 * corps saisis). Le writer Rust crée le sous-dossier `<id>/` au besoin.
 */
export async function persistSkill(s: SkillAtom, api: Backend = backend): Promise<void> {
  const existing = await api.poolRead("skills", s.id);
  const md =
    existing != null
      ? patchBody(patchFrontmatter(existing, skillFrontmatterPatch(s)), s.body)
      : serializeSkillMd(
          {
            id: s.id,
            name: s.name || s.id,
            description: s.description,
            subskills: s.subskills,
          },
          s.body,
        );
  await api.poolWrite("skills", s.id, md);
}
