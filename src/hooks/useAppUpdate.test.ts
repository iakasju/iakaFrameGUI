/**
 * Tests du contrôle de version (auto-update.md, étape 7). Le plugin est **mocké** : aucun accès
 * réseau, aucune dépendance à la box — ces tests doivent tourner sur un clone isolé, hors LAN.
 *
 * Ce qui est verrouillé ici est le **comportement de discrétion** autant que la mécanique : un
 * échec au démarrage ne doit rien montrer (une box éteinte est invisible), un échec demandé doit
 * parler, et l'installation ne doit jamais partir deux fois.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { act, render, renderHook, waitFor } from "@testing-library/react";

vi.mock("@tauri-apps/plugin-updater", () => ({ check: vi.fn() }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: vi.fn() }));

import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useAppUpdate } from "./useAppUpdate";
import { UpdateBanner } from "../components/UpdateBanner";

const checkMock = vi.mocked(check);
const relaunchMock = vi.mocked(relaunch);

/** Fabrique une mise à jour factice (surface minimale réellement consommée par le hook). */
function fakeUpdate(version: string, onInstall?: (cb?: unknown) => Promise<void>) {
  return {
    version,
    downloadAndInstall: vi.fn(async (cb?: unknown) => {
      if (onInstall) await onInstall(cb);
    }),
  };
}

describe("useAppUpdate — machine à états du contrôle de version", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    checkMock.mockReset();
    relaunchMock.mockReset();
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("check() renvoie null → état up-to-date, aucun bandeau", async () => {
    checkMock.mockResolvedValue(null);
    const { result } = renderHook(() => useAppUpdate({ autoCheck: false }));

    await act(async () => {
      await result.current.check();
    });

    expect(result.current.status).toBe("up-to-date");
    expect(result.current.version).toBeNull();
    const { container } = render(createElement(UpdateBanner, { update: result.current }));
    expect(container.innerHTML).toBe("");
  });

  it("check() renvoie une version supérieure → état available, version exposée telle quelle", async () => {
    checkMock.mockResolvedValue(fakeUpdate("0.1.9") as never);
    const { result } = renderHook(() => useAppUpdate({ autoCheck: false }));

    await act(async () => {
      await result.current.check();
    });

    expect(result.current.status).toBe("available");
    // Telle quelle : aucune normalisation du client, le manifeste fait foi.
    expect(result.current.version).toBe("0.1.9");
    const { getByText } = render(createElement(UpdateBanner, { update: result.current }));
    expect(getByText("Version 0.1.9 disponible")).toBeTruthy();
  });

  it("check() rejette au démarrage → error SILENCIEUX, rien à l'écran, une seule trace", async () => {
    checkMock.mockRejectedValue(new Error("box injoignable"));
    const { result } = renderHook(() => useAppUpdate({ autoCheck: false }));

    await act(async () => {
      await result.current.check(false);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toContain("box injoignable");
    // La règle de discrétion : l'erreur existe, mais elle ne se montre pas.
    expect(result.current.errorVisible).toBe(false);
    const { container } = render(createElement(UpdateBanner, { update: result.current }));
    expect(container.innerHTML).toBe("");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("un LAN durablement coupé ne trace qu'une fois, même après plusieurs contrôles", async () => {
    checkMock.mockRejectedValue(new Error("box injoignable"));
    const { result } = renderHook(() => useAppUpdate({ autoCheck: false }));

    await act(async () => {
      await result.current.check(false);
    });
    await act(async () => {
      await result.current.check(false);
    });

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("check() rejette en mode manuel (verbose) → error AFFICHÉ", async () => {
    checkMock.mockRejectedValue(new Error("box injoignable"));
    const { result } = renderHook(() => useAppUpdate({ autoCheck: false }));

    await act(async () => {
      await result.current.check(true);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorVisible).toBe(true);
    const { getByRole } = render(createElement(UpdateBanner, { update: result.current }));
    expect(getByRole("alert").textContent).toContain("box injoignable");
  });

  it("installation → downloadAndInstall puis relaunch, dans cet ordre, une seule fois", async () => {
    const order: string[] = [];
    const upd = fakeUpdate("0.1.9", async (cb) => {
      order.push("download");
      const emit = cb as (e: unknown) => void;
      emit({ event: "Started", data: { contentLength: 100 } });
      emit({ event: "Progress", data: { chunkLength: 50 } });
      emit({ event: "Finished", data: {} });
    });
    checkMock.mockResolvedValue(upd as never);
    relaunchMock.mockImplementation(async () => {
      order.push("relaunch");
    });

    const { result } = renderHook(() => useAppUpdate({ autoCheck: false }));
    await act(async () => {
      await result.current.check();
    });
    await act(async () => {
      await result.current.install();
    });

    expect(order).toEqual(["download", "relaunch"]);
    expect(upd.downloadAndInstall).toHaveBeenCalledTimes(1);
    expect(relaunchMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.status).toBe("ready"));
  });

  it("double clic sur « Installer » → downloadAndInstall appelé UNE SEULE fois", async () => {
    const upd = fakeUpdate("0.1.9", async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    checkMock.mockResolvedValue(upd as never);
    relaunchMock.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useAppUpdate({ autoCheck: false }));
    await act(async () => {
      await result.current.check();
    });
    await act(async () => {
      // Deux clics rapprochés : la garde est un `ref` posé AVANT tout `await` — un `disabled`
      // d'UI arriverait un rendu trop tard.
      await Promise.all([result.current.install(), result.current.install()]);
    });

    expect(upd.downloadAndInstall).toHaveBeenCalledTimes(1);
    expect(relaunchMock).toHaveBeenCalledTimes(1);
  });

  it("le contrôle au démarrage est DIFFÉRÉ (rien n'est appelé au montage)", async () => {
    checkMock.mockResolvedValue(null);
    renderHook(() => useAppUpdate({ startupDelayMs: 20 }));

    // Au montage : aucun appel — l'appli doit d'abord s'afficher.
    expect(checkMock).not.toHaveBeenCalled();
    await waitFor(() => expect(checkMock).toHaveBeenCalledTimes(1), { timeout: 500 });
  });

  it("dismiss() referme le bandeau sans rien annuler côté serveur", async () => {
    checkMock.mockResolvedValue(fakeUpdate("0.1.9") as never);
    const { result } = renderHook(() => useAppUpdate({ autoCheck: false }));
    await act(async () => {
      await result.current.check();
    });
    act(() => {
      result.current.dismiss();
    });

    expect(result.current.status).toBe("idle");
    const { container } = render(createElement(UpdateBanner, { update: result.current }));
    expect(container.innerHTML).toBe("");
  });
});
