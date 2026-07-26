import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFrameSwitch, FRAME_SWITCH_ERROR } from "./useFrameSwitch";
import type { Backend } from "../api/backend";

const frameMd = (id: string, name: string, def = false): string =>
  `---\nid: ${id}\nname: ${name}\nversion: 0.1.0\nmethodId: ${id}\nteamId: ${id}\n${
    def ? "default: true\n" : ""
  }---\n# ${name}\n`;

const FRAMES = [frameMd("iakaframe", "iakaframe", true), frameMd("scrum", "Scrum")];

function fakeApi(over: Partial<Backend> = {}, initialPointer: string | null = null) {
  let pointer = initialPointer;
  const setSpy = vi.fn(async (id: string) => {
    pointer = id;
  });
  const api = {
    iakaframeHome: async () => "/frame/StefFrame2",
    poolReadAll: async () => [],
    libraryList: async (c: string) => (c === "frames" ? FRAMES : []),
    activeFrameId: async () => pointer,
    setActiveFrameId: setSpy,
    pickDirectory: async () => "/frame/StefFrame2",
    setIakaframeHome: async () => {},
    ...over,
  } as unknown as Backend;
  return { api, setSpy };
}

describe("useFrameSwitch — geste de bascule PARTAGÉ (D-2)", () => {
  it("autoLoad charge frame + pointeur au montage", async () => {
    const { api } = fakeApi({}, "scrum");
    const { result } = renderHook(() => useFrameSwitch(api, { autoLoad: true }));
    await waitFor(() => expect(result.current.frame).not.toBeNull());
    expect(result.current.pointer).toBe("scrum");
    expect(result.current.frame!.assembly.frame?.id).toBe("scrum");
    expect(result.current.dangling).toBe(false);
  });

  it("switchTo pose le pointeur puis recharge-depuis-disque (jamais d'optimisme)", async () => {
    const { api, setSpy } = fakeApi({}, "iakaframe");
    const { result } = renderHook(() => useFrameSwitch(api, { autoLoad: true }));
    await waitFor(() => expect(result.current.frame).not.toBeNull());
    await act(async () => {
      await result.current.switchTo("scrum");
    });
    expect(setSpy).toHaveBeenCalledWith("scrum");
    expect(result.current.pointer).toBe("scrum"); // relu depuis le backend (source de vérité)
    expect(result.current.frame!.assembly.frame?.id).toBe("scrum");
  });

  it("pointeur mort → dangling=true, repli default (I-4)", async () => {
    const { api } = fakeApi({}, "fantome");
    const { result } = renderHook(() => useFrameSwitch(api, { autoLoad: true }));
    await waitFor(() => expect(result.current.frame).not.toBeNull());
    expect(result.current.dangling).toBe(true);
    expect(result.current.frame!.assembly.frame?.id).toBe("iakaframe"); // repli default
  });

  it("switchTo qui échoue → error inline, aucune exception", async () => {
    const { api } = fakeApi(
      {
        setActiveFrameId: async () => {
          throw new Error("illisible");
        },
      },
      "iakaframe",
    );
    const { result } = renderHook(() => useFrameSwitch(api, { autoLoad: true }));
    await waitFor(() => expect(result.current.frame).not.toBeNull());
    await act(async () => {
      await result.current.switchTo("scrum");
    });
    expect(result.current.error).toBe(FRAME_SWITCH_ERROR);
    expect(result.current.pointer).toBe("iakaframe"); // inchangé (pas d'optimisme)
  });

  it("reload rappelle la lecture backend (racine courante, sans re-choisir de dossier)", async () => {
    const home = vi.fn(async () => "/frame/StefFrame2");
    const { api } = fakeApi({ iakaframeHome: home }, "iakaframe");
    const { result } = renderHook(() => useFrameSwitch(api, { autoLoad: true }));
    await waitFor(() => expect(result.current.frame).not.toBeNull());
    const before = home.mock.calls.length;
    await act(async () => {
      await result.current.reload();
    });
    expect(home.mock.calls.length).toBeGreaterThan(before);
  });
});
