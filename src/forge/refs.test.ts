import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  buildTeamFromRoster,
  serializeTeamMd,
  serializeWorkflowMd,
  parseTeamMd,
  type Method,
  type Team,
  type Workflow,
} from "@iakaframe/core";
import { makeTeamValidateRefs, makeMethodValidateRefs } from "./refs";
import { useForgeDocument, type DocConfig } from "./useForgeDocument";
import type { Backend } from "../api/backend";

/** Workflow minimal valide pour peupler la COLLECTION `workflows/` du backend mock. */
function mkWorkflow(id: string): Workflow {
  return {
    id,
    name: id,
    methodId: "iakaframe",
    phases: [
      { id: "p", order: 0, name: "P", description: "", roleKeys: [], gate: { kind: "human", condition: "" } },
    ],
  };
}

/** Méthode de test (surchargée par `over`). */
function method(over: Partial<Method> = {}): Method {
  return {
    id: "m",
    name: "M",
    scaffoldIds: [],
    principleIds: [],
    ritualIds: [],
    guardrailIds: [],
    roleKeys: [],
    ...over,
  };
}

/**
 * Backend mock : pool d'atomes paramétrable (présence + ids par type) + les workflows du **pool**
 * `library/workflows/` (Lot 5c, Option A — servis par `poolReadAll("workflows")`, plus par la
 * collection) + capture des écritures.
 */
function fakeBackend(opts: {
  poolPresent: boolean;
  pool?: Partial<Record<string, string[]>>;
  /** Ids des workflows du **pool** `library/workflows/` — servis par `poolReadAll("workflows")`. */
  workflows?: string[];
}): { api: Backend; writes: string[] } {
  const writes: string[] = [];
  const api = {
    isTauri: () => false,
    poolPresent: async () => opts.poolPresent,
    poolList: async (t: string) => opts.pool?.[t] ?? [],
    poolReadAll: async (p: string) =>
      p === "workflows" ? (opts.workflows ?? []).map((id) => serializeWorkflowMd(mkWorkflow(id))) : [],
    libraryList: async () => [],
    libraryExists: async () => false,
    libraryWrite: async (c: string, id: string) => {
      writes.push(`${c}/${id}.md`);
    },
  } as unknown as Backend;
  return { api, writes };
}

function teamConfig(api: Backend): DocConfig<Team> {
  return {
    collection: "teams",
    blank: () => buildTeamFromRoster("Team", "team"),
    serialize: (t) => serializeTeamMd(
      { id: t.id, name: t.name, personas: t.personas.map((p) => p.id), coordinator: t.coordinator, guardrails: [], vignetteTeam: "none" },
    ),
    parse: (txt) => {
      const md = parseTeamMd(txt);
      return md ? buildTeamFromRoster(md.name, md.id) : null;
    },
    idOf: (t) => t.id,
    nameOf: (t) => t.name,
    validateRefs: makeTeamValidateRefs(api),
    api,
  };
}

describe("refs — I1 câblé au Save (chemin réel : refs.ts + useForgeDocument)", () => {
  it("pool présent + persona absente ⇒ refus, AUCUNE écriture, ids manquants", async () => {
    // Pool présent mais ne contient PAS les personas de la team semée.
    const { api, writes } = fakeBackend({ poolPresent: true, pool: { personas: [] } });
    const { result } = renderHook(() => useForgeDocument(teamConfig(api)));
    act(() => result.current.requestNew());
    let outcome!: Awaited<ReturnType<typeof result.current.saveAs>>;
    await act(async () => {
      outcome = await result.current.saveAs("team", "Team");
    });
    expect(outcome.ok).toBe(false);
    expect(writes).toHaveLength(0);
    expect(result.current.lastError).toMatch(/aragorn|gimli|personas/);
  });

  it("pool présent + personas toutes valides ⇒ écriture effectuée", async () => {
    const seeded = buildTeamFromRoster("Team", "team");
    const allIds = seeded.personas.map((p) => p.id);
    const { api, writes } = fakeBackend({ poolPresent: true, pool: { personas: allIds } });
    const { result } = renderHook(() => useForgeDocument(teamConfig(api)));
    act(() => result.current.requestNew());
    await act(async () => {
      await result.current.saveAs("team", "Team");
    });
    expect(writes).toEqual(["teams/team.md"]);
    expect(result.current.lastError).toBeNull();
  });

  it("pool ABSENT ⇒ warning NON bloquant + écriture autorisée (Q-4)", async () => {
    const { api, writes } = fakeBackend({ poolPresent: false });
    const { result } = renderHook(() => useForgeDocument(teamConfig(api)));
    act(() => result.current.requestNew());
    await act(async () => {
      await result.current.saveAs("team", "Team");
    });
    expect(writes).toEqual(["teams/team.md"]);
    expect(result.current.lastWarning).toMatch(/pool library\/ absent/);
  });
});

describe("makeMethodValidateRefs — miroir checkRefs (méthode)", () => {
  it("pool présent : id de principe absent ⇒ manquant listé", async () => {
    // `workflowId` désormais validé contre la COLLECTION `workflows/` (P6b) — on l'y déclare valide
    // pour isoler l'assertion sur `principleIds` (le pool ne porte plus la vérité du workflowId).
    const { api } = fakeBackend({
      poolPresent: true,
      workflows: ["wf"],
      pool: { principles: ["p1"], rituals: [], guardrails: [], roles: [], scaffolds: [] },
    });
    const report = await makeMethodValidateRefs(api)(
      method({ workflowId: "wf", principleIds: ["p1", "absent"] }),
    );
    expect(report.ok).toBe(false);
    expect(report.missing).toEqual([
      { field: "principleIds", id: "absent", collection: "principles" },
    ]);
  });

  it("pool absent ⇒ ok + warning", async () => {
    const { api } = fakeBackend({ poolPresent: false });
    const report = await makeMethodValidateRefs(api)(method({ principleIds: ["x"] }));
    expect(report.ok).toBe(true);
    expect(report.warning).toMatch(/pool/);
  });
});

describe("EW-13 — workflowId validé contre la COLLECTION workflows/ (P6b, Q-9)", () => {
  it("workflowId présent dans la collection (ABSENT du pool) ⇒ ACCEPTÉ", async () => {
    // Reproduit le flux nominal P6b : workflow créé dans `<home>/workflows/`, pas dans le pool.
    const { api } = fakeBackend({ poolPresent: true, workflows: ["mon-wf"], pool: {} });
    const report = await makeMethodValidateRefs(api)(method({ workflowId: "mon-wf" }));
    expect(report.ok).toBe(true);
    expect(report.missing).toEqual([]);
  });

  it("workflowId absent de la collection ET du catalogue ⇒ REFUSÉ", async () => {
    const { api } = fakeBackend({ poolPresent: true, workflows: [], pool: {} });
    const report = await makeMethodValidateRefs(api)(method({ workflowId: "pendante" }));
    expect(report.ok).toBe(false);
    expect(report.missing).toEqual([
      { field: "workflowId", id: "pendante", collection: "workflows" },
    ]);
  });

  it("workflowId = id du catalogue du cœur (canonique) ⇒ ACCEPTÉ même collection vide", async () => {
    const { api } = fakeBackend({ poolPresent: true, workflows: [], pool: {} });
    const report = await makeMethodValidateRefs(api)(
      method({ workflowId: "iakaframe-canonical" }),
    );
    expect(report.ok).toBe(true);
  });

  it("workflowId de collection cassé ⇒ REFUSÉ même si le pool d'atomes est absent", async () => {
    // La référence de collection est indépendante du pool : pas de faux-positif « pool absent ».
    const { api } = fakeBackend({ poolPresent: false, workflows: [] });
    const report = await makeMethodValidateRefs(api)(method({ workflowId: "pendante" }));
    expect(report.ok).toBe(false);
    expect(report.missing.some((m) => m.field === "workflowId")).toBe(true);
  });

  it("aucun workflowId ⇒ pas de refus (repli canonique à la génération, Q-7)", async () => {
    const { api } = fakeBackend({ poolPresent: true, workflows: [], pool: {} });
    const report = await makeMethodValidateRefs(api)(method());
    expect(report.ok).toBe(true);
  });
});
