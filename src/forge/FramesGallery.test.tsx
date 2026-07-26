import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import { FramesGallery } from "./FramesGallery";
import { DANGLING_FRAME_HINT } from "./useFrameSwitch";
import type { Backend } from "../api/backend";

// --- Fixtures : descripteurs de frames du réservoir (schéma `frames/<id>.md`, AR-1). ---
const frameMd = (id: string, name: string, opts: { default?: boolean } = {}): string =>
  `---\nid: ${id}\nname: ${name}\nversion: 0.1.0\nmethodId: ${id}\nteamId: ${id}\n${
    opts.default ? "default: true\n" : ""
  }---\n# ${name}\n`;

// Les 8 frames du réservoir (Fork D), telles qu'exposées par `libraryList("frames")`.
const EIGHT: string[] = [
  frameMd("iakaframe", "iakaframe", { default: true }),
  frameMd("scrum", "Scrum"),
  frameMd("kanban", "Kanban"),
  frameMd("shapeup", "Shape Up"),
  frameMd("design-thinking", "Design Thinking"),
  frameMd("lean-startup", "Lean Startup"),
  frameMd("waterfall", "Waterfall"),
  frameMd("gtd", "GTD"),
];

/**
 * Backend factice STATEFUL : `setActiveFrameId` mute un pointeur que `activeFrameId` relit — ce qui
 * reproduit fidèlement le « recharge-depuis-disque » (la bascule ne ment pas). `frames` injectable
 * pour éprouver le réservoir vide et le pointeur mort.
 */
function fakeApi(
  opts: { frames?: string[]; initialPointer?: string | null; over?: Partial<Backend> } = {},
): { api: Backend; setSpy: ReturnType<typeof vi.fn>; getPointer: () => string | null } {
  let pointer: string | null = opts.initialPointer ?? null;
  const frames = opts.frames ?? EIGHT;
  const setSpy = vi.fn(async (frameId: string) => {
    pointer = frameId;
  });
  const api = {
    isTauri: () => false,
    iakaframeHome: async () => "/frame/StefFrame2",
    setIakaframeHome: async () => {},
    pickDirectory: async () => "/frame/StefFrame2",
    poolReadAll: async () => [],
    libraryList: async (c: string) => (c === "frames" ? frames : []),
    activeFrameId: async () => pointer,
    setActiveFrameId: setSpy,
    ...opts.over,
  } as unknown as Backend;
  return { api, setSpy, getPointer: () => pointer };
}

describe("FramesGallery — galerie models ACTIONNABLE (Lot 1, A1..A4)", () => {
  it("liste les 8 frames du réservoir en cartes cliquables (A-CONF)", async () => {
    const { api } = fakeApi({ initialPointer: "iakaframe" });
    render(<FramesGallery api={api} />);
    const grid = (await screen.findByText("Le catalogue des frames"))
      .closest(".models-gallery")!
      .querySelector(".pgrid") as HTMLElement;
    await waitFor(() =>
      expect(grid.querySelectorAll(":scope > .fcard")).toHaveLength(8),
    );
    // Chaque carte est un <button> (contrôle cliquable, pas un <article> inerte).
    for (const card of grid.querySelectorAll(":scope > .fcard")) {
      expect(card.tagName).toBe("BUTTON");
    }
    for (const name of ["iakaframe", "Scrum", "Kanban", "GTD"]) {
      expect(screen.getByLabelText(new RegExp(`^Frame ${name}`))).toBeTruthy();
    }
  });

  it("distingue la carte ACTIVE, la DÉSACTIVE (no-op) — les autres restent cliquables (A2)", async () => {
    const { api, setSpy } = fakeApi({ initialPointer: "kanban" });
    render(<FramesGallery api={api} />);
    const kanban = (await screen.findByLabelText("Frame Kanban (active)")) as HTMLButtonElement;
    expect(kanban.className).toContain("active");
    expect(kanban.disabled).toBe(true); // no-op : la carte active n'écrit rien
    expect(kanban.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelectorAll(".models-gallery .fcard.active")).toHaveLength(1);
    // Cliquer l'active ne déclenche AUCUNE écriture.
    fireEvent.click(kanban);
    expect(setSpy).not.toHaveBeenCalled();
    // Une carte non active est cliquable (bouton activé).
    const scrum = screen.getByLabelText("Frame Scrum") as HTMLButtonElement;
    expect(scrum.className).not.toContain("active");
    expect(scrum.disabled).toBe(false);
  });

  it("cliquer une carte non active POSE la frame (setActiveFrameId) et recharge → l'active bascule (A1)", async () => {
    const { api, setSpy, getPointer } = fakeApi({ initialPointer: "iakaframe" });
    render(<FramesGallery api={api} />);
    const scrum = await screen.findByLabelText("Frame Scrum");
    fireEvent.click(scrum);
    // L'écrivain est appelé avec l'id cliqué…
    await waitFor(() => expect(setSpy).toHaveBeenCalledWith("scrum"));
    expect(getPointer()).toBe("scrum");
    // …et après recharge-depuis-disque, la carte active a basculé sur Scrum (jamais un optimisme).
    await waitFor(() =>
      expect(screen.getByLabelText("Frame Scrum (active)")).toBeTruthy(),
    );
    expect(screen.getByLabelText("Frame iakaframe")).toBeTruthy(); // l'ancienne active ne l'est plus
    // La notice inline reflète le changement.
    expect(screen.getByText(/Frame active :/)).toBeTruthy();
  });

  it("pointeur MORT (frame absente du réservoir) → hint dangling, repli default (A3, I-4)", async () => {
    const { api } = fakeApi({ initialPointer: "fantome" });
    render(<FramesGallery api={api} />);
    expect(await screen.findByText(DANGLING_FRAME_HINT)).toBeTruthy();
    // Repli sur la frame default (iakaframe) : c'est elle qui porte le marqueur actif.
    expect(screen.getByLabelText("Frame iakaframe (active)")).toBeTruthy();
  });

  it("écriture refusée (setActiveFrameId jette) → message inline, aucune exception (A4)", async () => {
    const { api } = fakeApi({
      initialPointer: "iakaframe",
      over: {
        setActiveFrameId: async () => {
          throw new Error("aucun projet réglé / iakaframe.json illisible");
        },
      },
    });
    render(<FramesGallery api={api} />);
    const scrum = await screen.findByLabelText("Frame Scrum");
    fireEvent.click(scrum);
    await waitFor(() =>
      expect(screen.getByText(/Bascule impossible/)).toBeTruthy(),
    );
    // L'active n'a pas bougé (aucun optimisme sur un échec d'écriture — R5).
    expect(screen.getByLabelText("Frame iakaframe (active)")).toBeTruthy();
  });

  it("réservoir vide (hors-ligne) → état vide explicite, aucune frame inventée", async () => {
    const { api } = fakeApi({ frames: [], initialPointer: null });
    render(<FramesGallery api={api} />);
    expect(await screen.findByText(/Aucune frame chargée/)).toBeTruthy();
    expect(document.querySelector(".models-gallery .pgrid")).toBeNull();
  });

  it("montre la méthode, la team (frères) + l'étoile de la frame défaut", async () => {
    const { api } = fakeApi({ initialPointer: "iakaframe" });
    render(<FramesGallery api={api} />);
    const iaka = await screen.findByLabelText("Frame iakaframe (active)");
    expect(within(iaka).getByText("méthode · iakaframe")).toBeTruthy();
    expect(within(iaka).getByText("team · iakaframe")).toBeTruthy();
    expect(within(iaka).getByText("★")).toBeTruthy(); // default
  });
});
