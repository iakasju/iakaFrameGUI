/**
 * roleKind — le **rôle en tant que pool authorable** de l'hôte générique `ElementReservoir` (chantier
 * #3 Lot 2). Clone du pilote `principleKind` adapté aux champs réels de `Role`, branché **sans toucher
 * l'hôte** ni FeanorHead. PARTICULARITÉ : `idOf` renvoie **`key`** (la clé stable d'un rôle, pas `id`).
 *
 * Source = liste canonique vendorée `CANONICAL_ROLES` (étiquetée, honnête) ; édition **persistée sur
 * disque** via `persistRole` (Lot 5c, câblé par `ElementsAuthoring`). AUCUN contrat cœur touché.
 * Lot B (chantier #4) fait : `scope` **éditable** (`roleFrontmatterPatch` élargi) et `roleIndex`
 * **verrouillé** (contrôle fantôme levé) dans `RoleEditor`.
 */
import { type Role } from "@iakaframe/core";
import {
  buildRoleReservoir,
  cloneRoleCatalog,
  roleToAuthoredEntity,
  ROLE_BLANK_ENTITY,
  ROLE_TYPE_LABEL,
} from "./roleCards";
import type { ElementKind } from "./elementKind";
import { RoleEditor } from "../components/RoleEditor";
import { resolveRoleProposition } from "./roleProposition";

/** Rôle **vierge** complet (brique B) — base de fusion en création (miroir de l'`EMPTY` de l'éditeur). */
function blankRole(): Role {
  return { key: "", label: "", roleIndex: 0, scope: "team" };
}

/** Le pool **rôle** de l'hôte générique (Lot 2). */
export const roleKind: ElementKind<Role> = {
  type: "role",
  typeLabel: ROLE_TYPE_LABEL,
  scopeClass: "role-reservoir",
  crumbCollection: "rôles",
  crumb: "LIBRARY / RÔLES",
  title: "Le réservoir de rôles",
  subtitle: (
    <>
      Les <strong>fonctions</strong> des intervenants — chaque rôle est un{" "}
      <code>{"{ key · label · roleIndex }"}</code>, référencé par les personas (jamais copié). Ouvrez
      une fiche pour l'éditer. Source : la liste canonique (édition locale de session).
    </>
  ),
  sectionLabel: "Rôles",
  sectionMeta: (n) => `— la liste canonique · ${n}`,
  newButtonLabel: "Nouveau rôle",
  idOf: (r) => r.key,
  buildCards: buildRoleReservoir,
  toAuthoredEntity: roleToAuthoredEntity,
  blankEntity: ROLE_BLANK_ENTITY,
  fallback: cloneRoleCatalog,
  Editor: ({ element, existingIds, onSubmit, onCancel }) => (
    <RoleEditor element={element} existingIds={existingIds} onSubmit={onSubmit} onCancel={onCancel} />
  ),
  // Brique B : Fëanor propose les champs éditables (label/scope) — `key`/`roleIndex` (identité/index)
  // jamais proposés (C-1). Repli honnête `null`+`reason` ; écriture inchangée (`persistRole`).
  proposeElement: resolveRoleProposition,
  blankElement: blankRole,
};
