/**
 * methodEdit — édition PURE d'une `Method` pour l'onglet Méthode, branchée sur `useForgeDocument`
 * (remplace l'état local de `useForgeMethod`). `insertMethodRef` insère un id de composant de façon
 * **idempotente** (ajout si absent) — même sémantique que l'ancien `useForgeMethod.insert`.
 */
import type { Method } from "@iakaframe/core";

/** Les composants référençables d'une méthode (tableaux d'ids). */
export type MethodRef =
  | "scaffoldIds"
  | "principleIds"
  | "ritualIds"
  | "guardrailIds"
  | "roleKeys";

/** Retourne une copie de `method` avec `id` inséré dans `ref` (idempotent, défensif). */
export function insertMethodRef(method: Method, ref: MethodRef, id: string): Method {
  if (!id || method[ref].includes(id)) return method;
  return { ...method, [ref]: [...method[ref], id] };
}
