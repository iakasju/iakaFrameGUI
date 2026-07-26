/**
 * roleCards — dérivation **pure** des fiches à vignettes du pool **rôle** (chantier #3 Lot 2), clone
 * de `principleCards` adapté aux champs réels de `Role`. AUCUN I/O, AUCUN contrat touché : on
 * **consomme** la liste canonique vendorée `CANONICAL_ROLES` (`{key, label, roleIndex}`) et on projette
 * le view-model de fiche unifié.
 *
 * PARTICULARITÉ : la clé stable d'un rôle est **`key`** (pas `id`) — `idOf` du kind renvoie `key`.
 * Honnêteté (§ 8) : source = liste canonique **étiquetée** (repli de session). Le `roleIndex` réel
 * caste la teinte (couleur = rôle, dérivée du champ canon), jamais fabriquée.
 */
import { CANONICAL_ROLES, type Role } from "@iakaframe/core";
import { vignetteGradient, initialsOf } from "./casting";
import type { AuthoredEntity } from "./feanorHeadModel";
import type { ElementCardVM } from "./elementKind";

/** Le type FR affiché du pool. */
export const ROLE_TYPE_LABEL = "rôle";

/** Projette UN rôle en fiche à vignette (déterministe, casté par son `roleIndex` canon). */
export function buildRoleCard(r: Role): ElementCardVM {
  return {
    id: r.key,
    name: r.label,
    initials: initialsOf(r.label),
    gradient: vignetteGradient(r.roleIndex),
    pastille: null,
    royaume: null,
    ref: r.key,
    roleLabel: null,
    roleIndex: r.roleIndex,
    summary: null,
    chips: [{ key: `idx-${r.key}`, text: `index de casting · ${r.roleIndex}`, kind: "meta" as const }],
    emptyChipsLabel: "aucun index déclaré",
  };
}

/** Projette la liste des rôles complète (l'ordre `roleIndex` est conservé). */
export function buildRoleReservoir(roles: readonly Role[]): ElementCardVM[] {
  return roles.map(buildRoleCard);
}

/** Repli hors-ligne / source de session du pool : la liste canonique (copie éditable). */
export function cloneRoleCatalog(): Role[] {
  return CANONICAL_ROLES.map((r) => ({ ...r }));
}

/** Adapte un rôle vers l'entité générique de Fëanor-en-tête (édition). */
export function roleToAuthoredEntity(r: Role): AuthoredEntity {
  return {
    type: "role",
    typeLabel: ROLE_TYPE_LABEL,
    newLabel: "Nouveau rôle",
    name: r.label,
    key: null,
    roleIndex: r.roleIndex,
    pastille: null,
  };
}

/** Descripteur de **création vierge** d'un rôle (name vide → placeholder « Nouveau rôle »). */
export const ROLE_BLANK_ENTITY: AuthoredEntity = {
  type: "role",
  typeLabel: ROLE_TYPE_LABEL,
  newLabel: "Nouveau rôle",
  name: "",
  key: null,
  roleIndex: 2,
  pastille: null,
};
