import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useOpenFrame } from "./useOpenFrame";
import type { Backend } from "../api/backend";

/** Backend minimal : un frame réduit mais cohérent (intégrité verte). */
function fakeBackend(over: Partial<Record<string, unknown>> = {}): Backend {
  const method = `---\nid: m\nname: M\nprincipleIds: [p1]\nritualIds: []\nguardrailIds: []\nroleKeys: [r1]\nscaffoldIds: [s1]\n---\n`;
  const team = `---\nid: t\nname: T\npersonas: [odin]\ncoordinator: odin\nguardrails: []\nvignetteTeam: none\n---\n`;
  const binding = `---\nid: b\nmethodId: m\nteamId: t\nnode: claude\norigin: forge-default\nassignments:\n  - { personaId: odin, runner: claude-code, model: "opus" }\n---\n`;
  const pools: Record<string, string[]> = {
    personas: [`---\nid: odin\nname: Odin\nroleKey: portefeuille\n---\n`],
    roles: [`---\nid: r1\nkey: r1\n---\n`],
    principles: [`---\nid: p1\n---\n`],
    rituals: [],
    guardrails: [],
    scaffolds: [`---\nid: s1\nlevel: portfolio\n---\n`],
    workflows: [],
    skills: [],
  };
  const collections: Record<string, string[]> = { methods: [method], teams: [team], bindings: [binding] };
  return {
    iakaframeHome: async () => "/frame",
    setIakaframeHome: async () => undefined,
    pickDirectory: async () => "/frame",
    poolReadAll: async (t: string) => pools[t] ?? [],
    libraryList: async (c: string) => collections[c] ?? [],
    ...over,
  } as unknown as Backend;
}

describe("useOpenFrame (G3)", () => {
  it("openFrame : pick → setHome → charge le frame et expose l'intégrité", async () => {
    const setHome = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useOpenFrame(fakeBackend({ setIakaframeHome: setHome })),
    );
    await act(async () => {
      await result.current.openFrame();
    });
    await waitFor(() => expect(result.current.frame).not.toBeNull());
    expect(setHome).toHaveBeenCalledWith("/frame");
    expect(result.current.frame!.refs.ok).toBe(true);
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sélection annulée (pickDirectory null) → aucun frame, pas d'erreur", async () => {
    const { result } = renderHook(() =>
      useOpenFrame(fakeBackend({ pickDirectory: async () => null })),
    );
    await act(async () => {
      await result.current.openFrame();
    });
    expect(result.current.frame).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("reload : racine absente → message d'erreur explicite", async () => {
    const { result } = renderHook(() =>
      useOpenFrame(fakeBackend({ iakaframeHome: async () => null })),
    );
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.frame).toBeNull();
    expect(result.current.error).toMatch(/[Rr]acine/);
  });
});
