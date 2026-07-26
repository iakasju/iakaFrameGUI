/**
 * rolePersist — source réelle + écriture disque **non-destructive** du pool rôle (Lot 5c,
 * persistance-5c-roles-guardrails-skills.md). Calque de `principlePersist` (5b). PARTICULARITÉ :
 * l'identité d'un rôle est **`key`** (verrou C-1) — le fichier est `library/roles/<key>.md`.
 *
 * Lecture : la grille amorce sur `frame.roles` (les `.md` réels dérivés par `buildFrame`), le
 * `fallback` synthétique (`CANONICAL_ROLES`) restant le **repli hors-ligne**. Écriture : édition →
 * `patchFrontmatter` (touche `label` **et `scope`** — champs éditables du Lot B ; `id`/`key`/`roleIndex`
 * + corps préservés à l'octet, `roleIndex` **jamais recalculé**) ; création → `serializeRoleMd`
 * canonique (`id == key`, `roleIndex` tel quel, `scope` repli `team`).
 */
import {
  patchFrontmatter,
  roleFrontmatterPatch,
  serializeRoleMd,
  type Role,
} from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";
import { loadFrame } from "./frame";

/** Source du réservoir : les rôles RÉELS parsés du frame chargé (`frame.roles`). Repli `[]`. */
export async function loadRolesReservoir(api: Backend = backend): Promise<Role[]> {
  try {
    return (await loadFrame(api)).roles;
  } catch {
    return [];
  }
}

/**
 * Persiste un rôle dans `<IAKAFRAME_HOME>/library/roles/<key>.md`. Relire le `.md` d'origine
 * (`poolRead` par **`key`**) rend le patch non-destructif : on repart des octets réels. Création :
 * `id == key`, `scope` repli `team`. Rejette hors Tauri / racine non résolue — l'appelant dégrade.
 */
export async function persistRole(role: Role, api: Backend = backend): Promise<void> {
  const existing = await api.poolRead("roles", role.key);
  const md =
    existing != null
      ? patchFrontmatter(existing, roleFrontmatterPatch(role)) // édition : patch en place (label)
      : serializeRoleMd({
          id: role.id ?? role.key,
          key: role.key,
          label: role.label,
          roleIndex: role.roleIndex,
          scope: role.scope ?? "team",
        });
  await api.poolWrite("roles", role.key, md);
}
