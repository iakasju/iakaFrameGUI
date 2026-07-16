/**
 * refs — **intégrité référentielle I1** au Save (§8), miroir de `checkRefs` du CLI
 * (`iakaframe/cli/src/lib/library.js`). Construit les `validateRefs` de l'onglet Team et de
 * l'onglet Méthode : chaque id référencé doit **exister** dans le pool `<IAKAFRAME_HOME>/library/
 * <type>/` (scan via la façade `poolList`). Comportement gravé (Q-4) :
 *   - **pool présent + réf. cassée** → `ok:false` + ids manquants → le hook **refuse SANS écrire** ;
 *   - **pool absent** (`poolPresent()===false`) → `ok:true` + **warning NON bloquant** → Save autorisé.
 *
 * Défensif : jamais d'exception (une erreur de scan dégrade en warning non bloquant).
 */
import {
  parseWorkflowMd,
  workflowById,
  type Method,
  type Team,
} from "@iakaframe/core";
import { backend, type Backend, type PoolType } from "../api/backend";
import type { MissingRef, RefsReport } from "./useForgeDocument";

const POOL_ABSENT_WARNING =
  "pool library/ absent — intégrité référentielle (I1) non vérifiée (Q-4)";

/** Charge en Set les ids d'un type de pool (défensif : `[]` en cas d'erreur). */
async function idsOf(api: Backend, poolType: PoolType): Promise<Set<string>> {
  try {
    return new Set(await api.poolList(poolType));
  } catch {
    return new Set();
  }
}

/**
 * Ids des workflows de la **collection éditable** `<home>/workflows/` (P6b, EW-13) — **distincte**
 * du pool d'atomes `library/workflows/` (Q-9). Lit via `libraryList("workflows")` (même source que
 * la résolution EW-7, `resolveMethodWorkflow`) puis parse chaque `.md`. Défensif : `∅` en cas
 * d'erreur / collection absente.
 */
async function collectionWorkflowIds(api: Backend): Promise<Set<string>> {
  try {
    const raw = await api.libraryList("workflows");
    return new Set(
      raw
        .map((t) => parseWorkflowMd(t))
        .filter((w): w is NonNullable<typeof w> => w !== null)
        .map((w) => w.id),
    );
  } catch {
    return new Set();
  }
}

/** `validateRefs` de l'onglet **Team** (personas[] + coordinator ∈ personas). */
export function makeTeamValidateRefs(
  api: Backend = backend,
): (team: Team) => Promise<RefsReport> {
  return async (team: Team): Promise<RefsReport> => {
    let present = false;
    try {
      present = await api.poolPresent();
    } catch {
      present = false;
    }
    if (!present) return { ok: true, missing: [], warning: POOL_ABSENT_WARNING };

    const personas = await idsOf(api, "personas");
    const missing: MissingRef[] = [];
    for (const p of team.personas) {
      if (!personas.has(p.id)) {
        missing.push({ field: "personas", id: p.id, collection: "personas" });
      }
    }
    if (team.coordinator && !personas.has(team.coordinator)) {
      missing.push({ field: "coordinator", id: team.coordinator, collection: "personas" });
    }
    return { ok: missing.length === 0, missing };
  };
}

/**
 * `validateRefs` de l'onglet **Méthode**. Deux sources distinctes (Q-9) :
 *   - **`workflowId`** → validé contre la **collection éditable** `workflows/` (P6b, EW-13), en
 *     **miroir EXACT** de la résolution EW-7 (`resolveMethodWorkflow`) : valide si (aucune
 *     référence), OU présent dans la collection, OU présent au **catalogue du cœur** (ex.
 *     `iakaframe-canonical`, repli canonique par défaut). Cette vérif est **indépendante du pool**
 *     (une référence de collection ne doit jamais être jugée « cassée » parce que le pool d'atomes
 *     est absent) — sinon faux-négatif : Save refusé à tort sur un workflow réellement créé.
 *   - **principe/rituel/garde/rôle/scaffold** → scan du **pool d'atomes** `library/<type>/` (I1) ;
 *     pool absent → **warning NON bloquant** (Q-4).
 */
export function makeMethodValidateRefs(
  api: Backend = backend,
): (method: Method) => Promise<RefsReport> {
  return async (method: Method): Promise<RefsReport> => {
    const missing: MissingRef[] = [];

    // --- workflowId : collection `workflows/` (ou catalogue du cœur), indépendant du pool. ---
    const wfId = method.workflowId?.trim();
    if (wfId && workflowById(wfId) === undefined) {
      const collectionIds = await collectionWorkflowIds(api);
      if (!collectionIds.has(wfId)) {
        missing.push({ field: "workflowId", id: wfId, collection: "workflows" });
      }
    }

    // --- Autres références : pool d'atomes (I1). Pool absent → non bloquant (Q-4). ---
    let present = false;
    try {
      present = await api.poolPresent();
    } catch {
      present = false;
    }
    if (!present) {
      return { ok: missing.length === 0, missing, warning: POOL_ABSENT_WARNING };
    }

    const [principles, rituals, guardrails, roles, scaffolds] = await Promise.all([
      idsOf(api, "principles"),
      idsOf(api, "rituals"),
      idsOf(api, "guardrails"),
      idsOf(api, "roles"),
      idsOf(api, "scaffolds"),
    ]);

    const need = (field: string, id: string | undefined, set: Set<string>, collection: string) => {
      if (id && !set.has(id)) missing.push({ field, id, collection });
    };
    const needEach = (field: string, ids: string[], set: Set<string>, collection: string) => {
      for (const id of ids) need(field, id, set, collection);
    };

    needEach("principleIds", method.principleIds, principles, "principles");
    needEach("ritualIds", method.ritualIds, rituals, "rituals");
    needEach("guardrailIds", method.guardrailIds, guardrails, "guardrails");
    needEach("roleKeys", method.roleKeys, roles, "roles");
    needEach("scaffoldIds", method.scaffoldIds, scaffolds, "scaffolds");
    return { ok: missing.length === 0, missing };
  };
}
