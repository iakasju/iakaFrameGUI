/**
 * roleKind — le **rôle en tant que pool authorable** de l'hôte générique `ElementReservoir` (chantier
 * #3 Lot 2). Clone du pilote `principleKind` adapté aux champs réels de `Role`, branché **sans toucher
 * l'hôte** ni FeanorHead. PARTICULARITÉ : `idOf` renvoie **`key`** (la clé stable d'un rôle, pas `id`).
 *
 * Source = liste canonique vendorée `CANONICAL_ROLES` (étiquetée, honnête) ; édition **persistée sur
 * disque** via `persistRole` (Lot 5c, câblé par `ElementsAuthoring`). AUCUN contrat cœur touché.
 * NB : l'authoring de `scope` + la levée du contrôle fantôme `roleIndex` restent au **Lot B**
 * (chantier #4).
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
};
