import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  buildTeamFromRoster,
  serializeTeamMd,
  parseTeamMd,
  type Team,
} from "@iakaframe/core";
import { makeTeamValidateRefs, makeMethodValidateRefs } from "./refs";
import { useForgeDocument, type DocConfig } from "./useForgeDocument";
import type { Backend } from "../api/backend";

/** Backend avec pool paramétrable (présence + ids par type) + capture des écritures. */
function fakeBackend(opts: {
  poolPresent: boolean;
  pool?: Partial<Record<string, string[]>>;
}): { api: Backend; writes: string[] } {
  const writes: string[] = [];
  const api = {
    isTauri: () => false,
    poolPresent: async () => opts.poolPresent,
    poolList: async (t: string) => opts.pool?.[t] ?? [],
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
    const { api } = fakeBackend({
      poolPresent: true,
      pool: { workflows: ["wf"], principles: ["p1"], rituals: [], guardrails: [], roles: [], scaffolds: [] },
    });
    const report = await makeMethodValidateRefs(api)({
      id: "m",
      name: "M",
      workflowId: "wf",
      principleIds: ["p1", "absent"],
      ritualIds: [],
      guardrailIds: [],
      roleKeys: [],
      scaffoldIds: [],
    });
    expect(report.ok).toBe(false);
    expect(report.missing).toEqual([
      { field: "principleIds", id: "absent", collection: "principles" },
    ]);
  });

  it("pool absent ⇒ ok + warning", async () => {
    const { api } = fakeBackend({ poolPresent: false });
    const report = await makeMethodValidateRefs(api)({
      id: "m",
      name: "M",
      principleIds: ["x"],
      ritualIds: [],
      guardrailIds: [],
      roleKeys: [],
      scaffoldIds: [],
    });
    expect(report.ok).toBe(true);
    expect(report.warning).toMatch(/pool/);
  });
});
