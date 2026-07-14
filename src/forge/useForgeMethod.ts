/**
 * useForgeMethod — **autorité locale de l'authoring d'une Méthode** (E2b, MVP).
 *
 * La Méthode éditée vit en **état local** (in-memory) : au MVP, l'authoring de méthode n'est pas
 * encore **persisté** (pas de façade `methodWrite` — **persistance différée**, cohérent avec §11).
 * Le seed est un **starter** volontairement partiel (8 principes / 4 rituels sur les catalogues
 * complets) pour que le geste `+` du rail **insère RÉELLEMENT** un composant manquant (retour
 * visible dans le MD). L'insertion est **idempotente** (ajout si absent) et **défensive** (id
 * inconnu ignoré côté résolveurs du cœur). Aucun runner/modèle (invariant E2).
 */
import { useCallback, useMemo, useState } from "react";
import {
  IAKAFRAME_CANONICAL_WORKFLOW,
  type Method,
} from "@iakaframe/core";

/** Les composants référençables d'une méthode (tableaux d'ids). */
export type MethodRef =
  | "scaffoldIds"
  | "principleIds"
  | "ritualIds"
  | "guardrailIds"
  | "roleKeys";

/**
 * **Starter** de la méthode iakaframe (partiel à dessein) : reflète la maquette (8 principes /
 * 4 rituels) et laisse de la place pour l'insertion via le rail.
 */
export const IAKAFRAME_STARTER_METHOD: Method = {
  id: "iakaframe",
  name: "Méthode iakaframe",
  scaffoldIds: ["portfolio", "project"],
  workflowId: IAKAFRAME_CANONICAL_WORKFLOW.id,
  principleIds: [
    "qualite",
    "gestion-backlog",
    "documentation",
    "commits-versionnement",
    "isolation-docker",
    "mvp-first",
    "identite-badges",
    "cadrage-avant-code",
  ],
  ritualIds: ["iakastart", "init", "update", "snapshot"],
  guardrailIds: ["identity-guard", "perimeter-guard", "delegation-guard"],
  roleKeys: [
    "portefeuille",
    "coordination",
    "architecture",
    "fabrication",
    "tests",
    "graphisme",
    "doc",
  ],
};

export interface UseForgeMethod {
  method: Method;
  /** Insère (idempotent) un id de composant dans la méthode éditée. */
  insert: (ref: MethodRef, id: string) => void;
  /** Retire un id de composant (utilitaire — non exposé au MVP dans l'UI). */
  remove: (ref: MethodRef, id: string) => void;
}

/** Clone défensif d'une méthode (tableaux indépendants). */
function cloneMethod(m: Method): Method {
  return {
    ...m,
    scaffoldIds: [...m.scaffoldIds],
    principleIds: [...m.principleIds],
    ritualIds: [...m.ritualIds],
    guardrailIds: [...m.guardrailIds],
    roleKeys: [...m.roleKeys],
  };
}

export function useForgeMethod(seed: Method = IAKAFRAME_STARTER_METHOD): UseForgeMethod {
  const [method, setMethod] = useState<Method>(() => cloneMethod(seed));

  const insert = useCallback((ref: MethodRef, id: string): void => {
    if (!id) return;
    setMethod((prev) => {
      if (prev[ref].includes(id)) return prev; // idempotent
      return { ...prev, [ref]: [...prev[ref], id] };
    });
  }, []);

  const remove = useCallback((ref: MethodRef, id: string): void => {
    setMethod((prev) => ({ ...prev, [ref]: prev[ref].filter((x) => x !== id) }));
  }, []);

  return useMemo(() => ({ method, insert, remove }), [method, insert, remove]);
}
