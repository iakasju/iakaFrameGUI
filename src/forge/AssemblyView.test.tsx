import { describe, it, expect } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { AssemblyView } from "./AssemblyView";
import type { Backend, PoolType } from "../api/backend";

// --- Fixtures SF2 minimales et cohérentes (méthode + team + binding résolus, roster canonique). ---
const gandalf = `---\nid: gandalf\nname: Gandalf\nroleKey: cadrage\n---\n# Gandalf\n`;
const gimli = `---\nid: gimli\nname: Gimli\nroleKey: dev\n---\n# Gimli\n`;
const roleCadrage = `---\nkey: cadrage\n---\n# cadrage\n`;
const roleDev = `---\nkey: dev\n---\n# dev\n`;
const principleAtom = `---\nid: cadrage-avant-code\n---\n# principe\n`;
const guardrailAtom = `---\nid: identity\n---\n# garde-fou\n`;
const methodMd = `---\nid: iakaframe\nname: Méthode iakaframe\nworkflowId: iakaframe-canonical\nprincipleIds: [cadrage-avant-code]\nritualIds: []\nguardrailIds: [identity]\nroleKeys: [cadrage, dev]\nscaffoldIds: []\n---\n# Méthode\n`;
const teamMd = `---\nid: iakaframe-8\nname: La compagnie\npersonas: [gandalf, gimli]\ncoordinator: gandalf\nguardrails: []\nvignetteTeam: none\n---\n# Team\n`;
const bindingMd = `---\nid: iakaframe-claude-default\nmethodId: iakaframe\nteamId: iakaframe-8\nassignments:\n  - { personaId: gandalf, runner: claude, model: "opus" }\n  - { personaId: gimli, runner: claude, model: "sonnet" }\n---\n# Binding\n`;
const frameMd = `---\nid: iakaframe\nname: iakaframe\nversion: v1\nmethodId: iakaframe\nteamId: iakaframe-8\ndefault: true\n---\n# Frame\n`;

function fakeApi(over: Partial<Backend> = {}): Backend {
  return {
    isTauri: () => false,
    iakaframeHome: async () => "/frame/iakaframe",
    setIakaframeHome: async () => {},
    setActiveFrameId: async () => {},
    activeFrameId: async () => null,
    poolReadAll: async (t: PoolType) => {
      if (t === "personas") return [gandalf, gimli];
      if (t === "roles") return [roleCadrage, roleDev];
      if (t === "principles") return [principleAtom];
      if (t === "guardrails") return [guardrailAtom];
      return [];
    },
    libraryList: async (c: string) => {
      if (c === "teams") return [teamMd];
      if (c === "methods") return [methodMd];
      if (c === "bindings") return [bindingMd];
      if (c === "frames") return [frameMd];
      return [];
    },
    ...over,
  } as unknown as Backend;
}

describe("AssemblyView — Lot 1 : le récit « frères » de 1er ordre (A1)", () => {
  it("rend méthode ET team au même niveau (deux frères, jamais imbriqués)", async () => {
    render(<AssemblyView api={fakeApi()} />);
    await waitFor(() => expect(screen.getByText("frère · méthode")).toBeTruthy());
    expect(screen.getByText("frère · team")).toBeTruthy();
    // Les deux boîtes sont des enfants SŒURS du même conteneur `.brothers` (même niveau DOM).
    const brothers = document.querySelector(".assembly-view .brothers");
    expect(brothers).not.toBeNull();
    const boxes = brothers!.querySelectorAll(":scope > .bcol > .box");
    expect(boxes.length).toBe(2);
    expect(within(brothers as HTMLElement).getByText("Méthode")).toBeTruthy();
    expect(within(brothers as HTMLElement).getByText("Team")).toBeTruthy();
  });

  it("rend le binding comme le mariage (roleKey → persona + runner·model)", async () => {
    render(<AssemblyView api={fakeApi()} />);
    await waitFor(() => expect(screen.getByText("Binding — le mariage")).toBeTruthy());
    const table = document.querySelector(".assembly-view .mtable") as HTMLElement;
    // La colonne roleKey (méthode) contient bien les rôles castés.
    expect(within(table).getByText("cadrage")).toBeTruthy();
    expect(within(table).getByText("dev")).toBeTruthy();
    // Le couple runner·model est rendu.
    expect(within(table).getByText("claude · opus")).toBeTruthy();
    expect(within(table).getByText("claude · sonnet")).toBeTruthy();
  });

  it("signale l'intégrité référentielle (orphelin d'intégrité) — ici au vert", async () => {
    render(<AssemblyView api={fakeApi()} />);
    await waitFor(() => expect(screen.getByText(/Intégrité référentielle/)).toBeTruthy());
    expect(screen.getByText(/0 référence cassée/)).toBeTruthy();
  });

  it("signale un rôle non couvert quand la méthode demande un rôle absent de la team", async () => {
    // Méthode avec `deploiement` mais team gandalf/gimli → orphelin du mariage.
    const methodOrphan = `---\nid: iakaframe\nname: M\nprincipleIds: []\nritualIds: []\nguardrailIds: []\nroleKeys: [cadrage, deploiement]\nscaffoldIds: []\n---\n# M\n`;
    const roleDeploiement = `---\nkey: deploiement\n---\n# deploiement\n`;
    render(
      <AssemblyView
        api={fakeApi({
          poolReadAll: async (t: PoolType) => {
            if (t === "personas") return [gandalf, gimli];
            if (t === "roles") return [roleCadrage, roleDev, roleDeploiement];
            return [];
          },
          libraryList: async (c: string) => {
            if (c === "teams") return [teamMd];
            if (c === "methods") return [methodOrphan];
            if (c === "bindings") return [bindingMd];
            if (c === "frames") return [frameMd];
            return [];
          },
        })}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Rôle\(s\) non couvert\(s\)/)).toBeTruthy());
    const orphan = document.querySelector(".assembly-view .note.orphan") as HTMLElement;
    expect(within(orphan).getByText(/deploiement/)).toBeTruthy();
  });

  it("est read-only : aucun champ de saisie, aucun bouton Save/Éditer", async () => {
    render(<AssemblyView api={fakeApi()} />);
    await waitFor(() => expect(screen.getByText("Binding — le mariage")).toBeTruthy());
    expect(screen.queryByRole("textbox")).toBeNull();
    const labels = screen.getAllByRole("button").map((b) => b.textContent ?? "");
    // Seuls des boutons de sélection de frame active existent (aucun Save/Enregistrer/Éditer).
    expect(labels.some((t) => /save|enregistrer|éditer|edit/i.test(t))).toBe(false);
  });
});
