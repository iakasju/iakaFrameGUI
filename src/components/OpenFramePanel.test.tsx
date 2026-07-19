import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OpenFramePanel } from "./OpenFramePanel";
import type { Backend, PoolType } from "../api/backend";

// --- Fixtures SF2 minimales mais cohérentes (facette + assemblage résolus). ---

const odin = `---\nid: odin\nname: Odin\nroleKey: portefeuille\n---\n# Odin\n`;
const scaffoldPortfolio = `---\nid: portefeuille\nlevel: portfolio\n---\n# portefeuille\n`;
const methodMd = `---\nid: iakaframe\nname: Méthode iakaframe\nprincipleIds: []\nritualIds: []\nguardrailIds: []\nroleKeys: [portefeuille]\nscaffoldIds: [portefeuille]\n---\n# Méthode\n`;
const teamMd = `---\nid: iakaframe-8\nname: La compagnie\npersonas: [odin]\ncoordinator: odin\nguardrails: []\nvignetteTeam: none\n---\n# Team\n`;
const bindingMd = `---\nid: iakaframe-claude-default\nmethodId: iakaframe\nteamId: iakaframe-8\nnode: claude\norigin: forge-default\nassignments:\n  - { personaId: odin, runner: claude-code, model: "opus" }\n---\n# Binding\n`;

function fakeApi(over: Partial<Backend> = {}): Backend {
  return {
    isTauri: () => false,
    iakaframeHome: async () => "/frame/StefFrame2",
    setIakaframeHome: async () => {},
    pickDirectory: async () => "/frame/StefFrame2",
    poolReadAll: async (t: PoolType) => {
      if (t === "personas") return [odin];
      if (t === "scaffolds") return [scaffoldPortfolio];
      return [];
    },
    libraryList: async (c: string) => {
      if (c === "teams") return [teamMd];
      if (c === "methods") return [methodMd];
      if (c === "bindings") return [bindingMd];
      return [];
    },
    ...over,
  } as unknown as Backend;
}

describe("OpenFramePanel — G6 : facette portefeuille + assemblage résolu (AC-9)", () => {
  it("affiche la facette (scaffold portfolio / persona rôle portefeuille / backlog)", async () => {
    render(<OpenFramePanel api={fakeApi()} />);
    fireEvent.click(screen.getByRole("button", { name: /Ouvrir un frame/ }));

    await waitFor(() =>
      expect(screen.getByText("Portefeuille (étage Odin)")).toBeTruthy(),
    );
    expect(screen.getByText(/Scaffold portefeuille/)).toBeTruthy();
    expect(screen.getByText(/Persona portefeuille/)).toBeTruthy();
    expect(screen.getByText("BACKLOG.md")).toBeTruthy();
    // Les valeurs résolues de la facette apparaissent (scaffold « portefeuille », persona « odin »).
    expect(screen.getAllByText("portefeuille").length).toBeGreaterThan(0);
    expect(screen.getByText("odin")).toBeTruthy();
  });

  it("affiche l'assemblage résolu (méthode · team · binding)", async () => {
    render(<OpenFramePanel api={fakeApi()} />);
    fireEvent.click(screen.getByRole("button", { name: /Ouvrir un frame/ }));

    await waitFor(() => expect(screen.getByText(/Assemblage résolu/)).toBeTruthy());
    expect(screen.getByText("iakaframe")).toBeTruthy();
    expect(screen.getByText("iakaframe-8")).toBeTruthy();
    expect(screen.getByText("iakaframe-claude-default")).toBeTruthy();
  });

  it("ne présente AUCUN contrôle d'édition (read-only)", async () => {
    render(<OpenFramePanel api={fakeApi()} />);
    fireEvent.click(screen.getByRole("button", { name: /Ouvrir un frame/ }));
    await waitFor(() => expect(screen.getByText(/Assemblage résolu/)).toBeTruthy());
    // Seuls les 2 boutons de chargement existent (Ouvrir + Recharger) — aucun Save/Éditer.
    const buttons = screen.getAllByRole("button").map((b) => b.textContent);
    expect(buttons).toEqual(["Ouvrir un frame…", "Recharger"]);
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
