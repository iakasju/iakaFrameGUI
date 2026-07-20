/**
 * roles.ts — LISTE CANONIQUE FERMÉE des 8 rôles iakaframe (cœur partagé 🟦).
 *
 * Repris de `IakaCockpit/src/theme/roles.ts:22-30` (source unique mûre). Le **rôle**
 * est la FONCTION d'un intervenant (portefeuille, coordination, …), DISTINCT du **nom**
 * (persona, cf. `persona.ts`). L'ordre = `roleIndex` (0→7), invariant qui pioche le
 * casting visuel. La liste est **fermée pour iakaframe** mais **paramétrable par méthode**
 * (agnosticisme AR-9) : une autre méthode déclarerait ses propres rôles ; au MVP seule la
 * liste iakaframe est peuplée.
 *
 * En documentation, un intervenant se désigne par son **rôle** (libellé ci-dessous),
 * JAMAIS par un nom de code (le `name` d'une persona est une donnée éditable).
 */

/** Un rôle canonique : clé stable + libellé d'affichage + index de casting. */
export interface Role {
  /** Clé canonique, référencée par `Persona.roleKey` (ex. "coordination"). */
  key: string;
  /** Libellé d'affichage capitalisé (menus de l'éditeur). */
  label: string;
  /** Index de rôle (0..7) = position dans la liste = clé de vignette. */
  roleIndex: number;
}

/**
 * Les 8 rôles canoniques iakaframe, dans l'ordre des `roleIndex` (0→7).
 *
 * `deploiement` (index 7) a été **promu rôle de plein droit** (CH-A) : le squad prod était
 * auparavant rangé en `coordination` faute de case disponible côté CLI, ce qui faisait
 * partager un rôle canonique à deux personas et imposait une exception codée. Ce n'était pas
 * un choix de vocabulaire mais une **lacune de modélisation** — le déploiement et la
 * coordination sont deux concepts distincts.
 */
export const CANONICAL_ROLES: readonly Role[] = [
  { key: "portefeuille", label: "Portefeuille", roleIndex: 0 },
  { key: "coordination", label: "Coordination", roleIndex: 1 },
  { key: "architecture", label: "Architecture", roleIndex: 2 },
  { key: "fabrication", label: "Fabrication", roleIndex: 3 },
  { key: "tests", label: "Tests", roleIndex: 4 },
  { key: "graphisme", label: "Graphisme", roleIndex: 5 },
  { key: "doc", label: "Doc", roleIndex: 6 },
  { key: "deploiement", label: "Déploiement", roleIndex: 7 },
] as const;

/** Clés des 8 rôles canoniques (ordre `roleIndex`). */
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
