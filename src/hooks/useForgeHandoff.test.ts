import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { buildTeamFromRoster, stableHash, type Team } from "@iakaframe/core";
import { useForgeHandoff } from "./useForgeHandoff";
import type { Backend } from "../api/backend";

const FIXED_MILLIS = Date.UTC(2026, 6, 7, 10, 0, 0);

/** Backend espion : capture l'appel `handoffDeliver`, fournit une horloge fixe. */
function spyBackend(opts?: { deliverImpl?: () => Promise<string> }): {
  api: Backend;
  deliverCalls: Array<{ teamId: string; teamJson: string; handoffJson: string }>;
} {
  const deliverCalls: Array<{ teamId: string; teamJson: string; handoffJson: string }> = [];
  const api = {
    call: async () => undefined as never,
    isTauri: () => false,
    teamList: async () => [],
    teamRead: async () => null,
    teamWrite: async () => {},
    teamDelete: async () => {},
    workspacePath: async () => "/tmp/ws",
    kitDeploy: async () => [],
    handoffDeliver: async (teamId: string, teamJson: string, handoffJson: string) => {
      deliverCalls.push({ teamId, teamJson, handoffJson });
      return opts?.deliverImpl ? opts.deliverImpl() : `/tmp/handoff/${teamId}`;
    },
    nowMillis: async () => FIXED_MILLIS,
    pickDirectory: async () => null,
  } as unknown as Backend;
  return { api, deliverCalls };
}

describe("useForgeHandoff", () => {
  let team: Team;
  beforeEach(() => {
    team = buildTeamFromRoster("Ma team", "ma-team");
  });

  it("livre un team.json PUR + un handoff.json de provenance forge", async () => {
    const { api, deliverCalls } = spyBackend();
    const { result } = renderHook(() => useForgeHandoff({ api }));

    await act(async () => {
      await result.current.deliver(team);
    });

    expect(deliverCalls).toHaveLength(1);
    const call = deliverCalls[0];
    expect(call.teamId).toBe("ma-team");
    // team.json PUR (AR-1)
    expect(call.teamJson).not.toContain("runner");
    expect(call.teamJson).not.toContain("model");
    // handoff.json = provenance forge + empreinte cohérente
    const manifest = JSON.parse(call.handoffJson);
    expect(manifest.source).toBe("forge");
    expect(manifest.teamId).toBe("ma-team");
    expect(manifest.originHash).toBe(stableHash(call.teamJson));
    expect(manifest.timestamp).toBe("2026-07-07T10:00:00.000Z");
  });

  it("expose le résultat de la livraison (dossier + empreinte)", async () => {
    const { api } = spyBackend();
    const { result } = renderHook(() => useForgeHandoff({ api }));

    await act(async () => {
      await result.current.deliver(team);
    });

    await waitFor(() => {
      expect(result.current.result?.dir).toBe("/tmp/handoff/ma-team");
      expect(result.current.result?.originHash).toMatch(/^[0-9a-f]{8}$/);
      expect(result.current.result?.error).toBeUndefined();
    });
  });

  it("remonte l'erreur sans casser le hook", async () => {
    const { api } = spyBackend({
      deliverImpl: async () => {
        throw new Error("disque plein");
      },
    });
    const { result } = renderHook(() => useForgeHandoff({ api }));

    await act(async () => {
      await result.current.deliver(team);
    });

    await waitFor(() => {
      expect(result.current.result?.error).toBe("disque plein");
    });
    expect(result.current.delivering).toBe(false);
  });
});
