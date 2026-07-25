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

/** Un rôle canonique : clé stable + libellé d'affichage + index de casting. */
export interface Role {
  /** Clé canonique, référencée par `Persona.roleKey` (ex. "coordination"). */
  key: string;
  /** Libellé d'affichage capitalisé (menus de l'éditeur). */
  label: string;
  /** Index de rôle (0..8) = position dans la liste = clé de vignette. */
  roleIndex: number;
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
