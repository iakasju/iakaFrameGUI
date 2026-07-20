import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { buildTeamFromRoster, CANONICAL_ROLES } from "@iakaframe/core";
import { useForgeTeams } from "./useForgeTeams";
import type { Backend } from "../api/backend";

/** Backend en mémoire (un fichier JSON = une entrée de la Map). */
function fakeBackend(seed: Record<string, string> = {}): {
  api: Backend;
  files: Map<string, string>;
} {
  const files = new Map<string, string>(Object.entries(seed));
  const api = {
    call: async () => undefined as never,
    isTauri: () => false,
    teamList: async () => Array.from(files.values()),
    teamRead: async (id: string) => files.get(id) ?? null,
    teamWrite: async (id: string, json: string) => {
      files.set(id, json);
    },
    teamDelete: async (id: string) => {
      files.delete(id);
    },
    workspacePath: async () => "/tmp/iakaframegui-workspace/teams",
  } as unknown as Backend;
  return { api, files };
}

describe("useForgeTeams", () => {
  let backend: ReturnType<typeof fakeBackend>;

  beforeEach(() => {
    backend = fakeBackend();
  });

  it("charge un workspace vide (loaded, 0 team)", async () => {
    const { result } = renderHook(() => useForgeTeams({ api: backend.api }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.teams).toEqual([]);
  });

  it("persiste une team (C-5) — écrite dans le workspace, rechargeable intacte", async () => {
    const { result } = renderHook(() => useForgeTeams({ api: backend.api }));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    const team = buildTeamFromRoster("Ma team", "ma-team");
    await act(async () => {
      await result.current.upsertTeam(team);
    });
    expect(result.current.teams).toHaveLength(1);
    expect(backend.files.has("ma-team")).toBe(true);

    // Recharge à froid : nouveau hook sur le MÊME workspace → team retrouvée intacte.
    const { result: r2 } = renderHook(() => useForgeTeams({ api: backend.api }));
    await waitFor(() => expect(r2.current.loaded).toBe(true));
    expect(r2.current.teams).toHaveLength(1);
    // Compte DERIVE du roster canonique (une persona par rôle) : robuste à un rôle ajouté.
    expect(r2.current.teamById("ma-team")?.personas).toHaveLength(
      CANONICAL_ROLES.length,
    );
  });

  it("INVARIANT AR-1 (C-6) — le JSON persisté ne contient ni runner ni model", async () => {
    const { result } = renderHook(() => useForgeTeams({ api: backend.api }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await result.current.upsertTeam(buildTeamFromRoster("T", "t"));
    });
    const json = backend.files.get("t")!;
    expect(json).not.toMatch(/runner/);
    expect(json).not.toMatch(/model/);
  });

  it("garde de coordinateur — ne retire pas le coordinateur courant s'il reste d'autres personas", async () => {
    const { result } = renderHook(() => useForgeTeams({ api: backend.api }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const team = buildTeamFromRoster("T", "t");
    await act(async () => {
      await result.current.upsertTeam(team);
    });
    const coord = result.current.teamById("t")!.coordinator;
    await act(async () => {
      await result.current.removePersona("t", coord);
    });
    // Refusé : le coordinateur est toujours là.
    expect(result.current.teamById("t")!.personas.some((p) => p.id === coord)).toBe(true);
  });

  it("upsertPersona ajoute une persona nommée librement (C-3)", async () => {
    const { result } = renderHook(() => useForgeTeams({ api: backend.api }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await result.current.upsertTeam(buildTeamFromRoster("T", "t"));
    });
    await act(async () => {
      await result.current.upsertPersona("t", {
        id: "zorglub",
        name: "Zorglub",
        roleKey: "fabrication",
        royaume: "FABRICATION",
        roleIndex: 3,
        skills: [],
        guardrails: [],
      });
    });
    const found = result.current
      .teamById("t")!
      .personas.find((p) => p.name === "Zorglub");
    expect(found).toBeTruthy();
  });
});
