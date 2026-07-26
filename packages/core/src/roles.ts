/**
 * roles.ts — LISTE CANONIQUE FERMÉE des 9 rôles iakaframe (cœur partagé 🟦).
 *
 * Repris de `IakaCockpit/src/theme/roles.ts:22-30` (source unique mûre). Le **rôle**
 * est la FONCTION d'un intervenant (portefeuille, coordination, …), DISTINCT du **nom**
 * (persona, cf. `persona.ts`). L'ordre = `roleIndex` (0→8), invariant qui pioche le
 * casting visuel. La liste est **fermée pour iakaframe** mais **paramétrable par méthode**
 * (agnosticisme AR-9) : une autre méthode déclarerait ses propres rôles ; au MVP seule la
 * liste iakaframe est peuplée.
 *
 * NB (VOLET B2) : les 9 clés sont alignées sur le canon `methods/iakaframe.md`
 * (`[portefeuille, coordination, cadrage, dev, qualite, deploiement, design, documentation,
 * frame]`). `deploiement` (persona helm) est en 6ᵉ position (index 5) conformément au casting
 * canon. `frame` (persona feanor, Constructeur de frame) est le 9ᵉ rôle, en queue (index 8) :
 * ajouté SANS renumérotation (aucun roleIndex existant ne change — D-C). Base d'index cœur = 0,
 * base bibliothèque = 1 (mapping GUI = library − 1) : NE PAS unifier ici (D-C).
 *
 * En documentation, un intervenant se désigne par son **rôle** (libellé ci-dessous),
 * JAMAIS par un nom de code (le `name` d'une persona est une donnée éditable).
 */

import type { FrontmatterPatch } from "./frontmatter";

/**
 * Un rôle : clé stable + libellé d'affichage + index de casting. **Lot 5c** : `id` et `scope`
 * sont **optionnels et additifs** — présents sur les rôles **réels parsés** du disque
 * (`library/roles/<key>.md` porte `id, key, label, roleIndex, scope`), absents des entrées
 * `CANONICAL_ROLES` (repli synthétique). Aucune signature existante n'est modifiée : les
 * consommateurs historiques (`roleByKey`, `buildRoleCard`, …) n'utilisent que `key/label/roleIndex`.
 */
export interface Role {
  /** Id de fichier (== `key` au canon). Optionnel : absent du repli synthétique (Lot 5c). */
  id?: string;
  /** Clé canonique, référencée par `Persona.roleKey` (ex. "coordination") — **identité (C-1)**. */
  key: string;
  /** Libellé d'affichage capitalisé (menus de l'éditeur) — seul champ éditable au MVP. */
  label: string;
  /** Index de rôle = position dans la liste = clé de vignette. **CHAMP DE FICHIER** en 5c (base
   * bibliothèque 1) : préservé verbatim, **jamais recalculé** à l'écriture. */
  roleIndex: number;
  /** Portée (`team`/…) — champ de fichier réel, préservé verbatim. Optionnel (repli synthétique). */
  scope?: string;
}

/** Les 9 rôles canoniques iakaframe, dans l'ordre des `roleIndex` (0→8). */
export const CANONICAL_ROLES: readonly Role[] = [
  { key: "portefeuille", label: "Portefeuille", roleIndex: 0 },
  { key: "coordination", label: "Coordination", roleIndex: 1 },
  { key: "cadrage", label: "Cadrage", roleIndex: 2 },
  { key: "dev", label: "Développement", roleIndex: 3 },
  { key: "qualite", label: "Qualité", roleIndex: 4 },
  { key: "deploiement", label: "Déploiement", roleIndex: 5 },
  { key: "design", label: "Design", roleIndex: 6 },
  { key: "documentation", label: "Documentation", roleIndex: 7 },
  { key: "frame", label: "Constructeur de frame", roleIndex: 8 },
] as const;

/** Clés des 9 rôles canoniques (ordre `roleIndex`). */
export const CANONICAL_ROLE_KEYS: readonly string[] = CANONICAL_ROLES.map(
  (r) => r.key,
);

/** Un rôle donné (par clé, insensible à la casse) est-il canonique ? */
export function isCanonicalRole(roleKey: string): boolean {
  const k = roleKey.toLowerCase();
  return CANONICAL_ROLES.some((r) => r.key === k);
}

/** Le rôle canonique correspondant à une clé (insensible à la casse), ou `null`. */
export function roleByKey(roleKey: string): Role | null {
  const k = roleKey.toLowerCase();
  return CANONICAL_ROLES.find((r) => r.key === k) ?? null;
}

/**
 * Libellé d'affichage d'une clé de rôle : le label canonique s'il en est un, sinon la
 * valeur telle quelle (tolérant : rôles hors-liste d'une autre méthode).
 */
export function roleLabel(roleKey: string): string {
  return roleByKey(roleKey)?.label ?? roleKey;
}

/** `roleIndex` du rôle canonique d'une clé, ou `0` par défaut. */
export function roleIndexOf(roleKey: string): number {
  return roleByKey(roleKey)?.roleIndex ?? 0;
}

// ---------------------------------------------------------------------------
// Lot 5c — persistance du pool `roles` (parseur + patch non-destructif). ADDITIONS PURES.
// ---------------------------------------------------------------------------

/**
 * Parse défensif d'UN rôle **réel** (`library/roles/<key>.md`, frontmatter `id, key, label,
 * roleIndex, scope`) — Lot 5c, calqué sur `parsePrinciple`. **Identité = `key`** (repli `id`) :
 * `null` si aucun des deux (record inutilisable). `roleIndex` est **lu tel quel** (champ de fichier,
 * base bibliothèque 1) — jamais recalculé ; absent → repli sur le canon puis `0`. `scope`/`id`
 * défensifs (repli `team`/`key`). `label` repli sur `key`. Jamais d'exception.
 */
export function parseRole(raw: unknown): Role | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const s = (v: unknown): string | null =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  const key = s(r.key) ?? s(r.id);
  if (!key) return null;
  const id = s(r.id) ?? key;
  const label = s(r.label) ?? key;
  const roleIndex =
    typeof r.roleIndex === "number" && Number.isFinite(r.roleIndex)
      ? r.roleIndex
      : (roleByKey(key)?.roleIndex ?? 0);
  const scope = s(r.scope) ?? "team";
  return { id, key, label, roleIndex, scope };
}

/**
 * **Patch de frontmatter** d'un rôle pour une réécriture **non-destructive** (Lot 5c, C-1) :
 * uniquement le champ éditable `label`. **Exclus** : `id` ET `key` (verrou de non-renommage C-1),
 * `roleIndex` (préservé verbatim, jamais recalculé) et `scope`. Toute clé hors patch + le corps sont
 * **préservés à l'octet** par `patchFrontmatter`. Un patch au `label` inchangé ⇒ document
 * byte-identique (round-trip AC3).
 */
export function roleFrontmatterPatch(r: Role): FrontmatterPatch {
  return {
    label: { kind: "scalar", value: r.label },
  };
}
