/**
 * FrameActiveSelector.test.tsx — le **sélecteur de frame active** dans `OpenFramePanel`.
 *
 * Couvre le volet UI de `specs/instructions/pointeur-frame-active.md` :
 *   AC-2  basculer écrit le pointeur **puis recharge** — l'écran reflète le disque, pas un espoir.
 *   AC-3  pointeur mort → repli sur `default` **et alerte visible**.
 *   AC-5  backend sans pointeur (hors Tauri) → aucun plantage, sélecteur inerte mais présent.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { OpenFramePanel, DANGLING_FRAME_HINT } from "./OpenFramePanel";
import type { Backend, PoolType } from "../api/backend";

const odin = `---\nid: odin\nname: Odin\nroleKey: portefeuille\n---\n# Odin\n`;
const scaffoldPortfolio = `---\nid: portefeuille\nlevel: portfolio\n---\n# portefeuille\n`;
const methodIaka = `---\nid: m-iaka\nname: Iaka\nprincipleIds: []\nritualIds: []\nguardrailIds: []\nroleKeys: [portefeuille]\nscaffoldIds: [portefeuille]\n---\n# m\n`;
const methodScrum = `---\nid: m-scrum\nname: Scrum\nprincipleIds: []\nritualIds: []\nguardrailIds: []\nroleKeys: [portefeuille]\nscaffoldIds: [portefeuille]\n---\n# m\n`;
const teamIaka = `---\nid: t-iaka\nname: TeamIaka\npersonas: [odin]\ncoordinator: odin\nguardrails: []\nvignetteTeam: none\n---\n# t\n`;
const teamScrum = `---\nid: t-scrum\nname: TeamScrum\npersonas: [odin]\ncoordinator: odin\nguardrails: []\nvignetteTeam: none\n---\n# t\n`;
const bindIaka = `---\nid: b-iaka\nmethodId: m-iaka\nteamId: t-iaka\nnode: claude\norigin: forge-default\nassignments: []\n---\n# b\n`;
const bindScrum = `---\nid: b-scrum\nmethodId: m-scrum\nteamId: t-scrum\nnode: claude\norigin: forge-default\nassignments: []\n---\n# b\n`;
const frameIaka = `---\nid: iakaframe\nname: Iakaframe\nversion: 1\nmethodId: m-iaka\nteamId: t-iaka\ndefault: true\n---\n# f\n`;
const frameScrum = `---\nid: scrum\nname: Scrum\nversion: 1\nmethodId: m-scrum\nteamId: t-scrum\ndefault: false\n---\n# f\n`;

function fakeApi(over: Partial<Backend> = {}): Backend {
  return {
    isTauri: () => false,
    iakaframeHome: async () => "/reservoir",
    setIakaframeHome: async () => {},
    pickDirectory: async () => "/reservoir",
    poolReadAll: async (t: PoolType) => {
      if (t === "personas") return [odin];
      if (t === "scaffolds") return [scaffoldPortfolio];
      return [];
    },
    libraryList: async (c: string) => {
      if (c === "teams") return [teamIaka, teamScrum];
      if (c === "methods") return [methodIaka, methodScrum];
      if (c === "bindings") return [bindIaka, bindScrum];
      if (c === "frames") return [frameIaka, frameScrum];
      return [];
    },
    ...over,
  } as unknown as Backend;
}

/** Ouvre le panneau et attend que le frame soit chargé. */
async function ouvrir(api: Backend) {
  const r = render(<OpenFramePanel api={api} />);
  fireEvent.click(screen.getByRole("button", { name: /Ouvrir un frame/i }));
  await waitFor(() => expect(screen.getByLabelText(/Frame active du réservoir/)).toBeTruthy());
  return r;
}

describe("sélecteur de frame active", () => {
  it("liste les frames du réservoir, la `default` marquée et active", async () => {
    await ouvrir(fakeApi({ activeFrameId: async () => null } as Partial<Backend>));
    const zone = screen.getByLabelText(/Frame active du réservoir/);
    const actif = within(zone).getByRole("button", { name: /Iakaframe ★/ });
    expect(actif.getAttribute("aria-pressed")).toBe("true");
    // L'autre frame est proposable (non pressée, non désactivée).
    expect(within(zone).getByRole("button", { name: "Scrum" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("AC-2 : basculer ÉCRIT le pointeur puis RECHARGE (l'écran reflète le disque)", async () => {
    let pointeur: string | null = null;
    const setActiveFrameId = vi.fn(async (frameId: string) => {
      pointeur = frameId;
    });
    const api = fakeApi({
      activeFrameId: async () => pointeur,
      setActiveFrameId,
    } as Partial<Backend>);

    await ouvrir(api);
    const zone = screen.getByLabelText(/Frame active du réservoir/);
    fireEvent.click(within(zone).getByRole("button", { name: "Scrum" }));

    await waitFor(() => expect(setActiveFrameId).toHaveBeenCalledWith("scrum"));
    // Rechargé : l'assemblage affiché suit le pointeur (méthode et team ont pivoté).
    await waitFor(() =>
      expect(screen.getByText(/Assemblage résolu/).textContent).toContain("m-scrum"),
    );
    expect(screen.getByText(/Assemblage résolu/).textContent).toContain("t-scrum");
  });

  it("AC-3 : un pointeur mort alerte ET retombe sur `default`", async () => {
    const api = fakeApi({ activeFrameId: async () => "frame-supprimee" } as Partial<Backend>);
    await ouvrir(api);
    expect(screen.getByText(DANGLING_FRAME_HINT)).toBeTruthy();
    // Repli : l'assemblage est celui de la frame `default`.
    expect(screen.getByText(/Assemblage résolu/).textContent).toContain("m-iaka");
  });

  it("AC-5 : un backend SANS pointeur (hors Tauri) ne casse rien", async () => {
    // `activeFrameId` absent du backend : le panneau doit se monter et lister quand même.
    await ouvrir(fakeApi());
    const zone = screen.getByLabelText(/Frame active du réservoir/);
    expect(within(zone).getByRole("button", { name: /Iakaframe ★/ })).toBeTruthy();
    expect(screen.queryByText(DANGLING_FRAME_HINT)).toBeNull();
  });
});
