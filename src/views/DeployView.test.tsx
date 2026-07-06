import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { buildTeamFromRoster, implementedNodes, type Team } from "@iakaframe/core";
import { DeployView } from "./DeployView";
import type { UseForgeTeams } from "../hooks/useForgeTeams";

// Le plugin dialog n'est pas monté hors Tauri : on le neutralise (renvoie null).
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(async () => null),
}));

const { kitDeploySpy } = vi.hoisted(() => ({ kitDeploySpy: vi.fn() }));

// Espionne la façade d'écriture : DeployView passe par le hook → backend.kitDeploy.
vi.mock("../api/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/backend")>();
  return {
    ...actual,
    backend: {
      ...actual.backend,
      kitDeploy: kitDeploySpy,
      pickDirectory: vi.fn(async () => "/tmp/picked"),
    },
  };
});

function fakeForge(teams: Team[]): UseForgeTeams {
  return {
    teams,
    loaded: true,
    teamById: (id: string) => teams.find((t) => t.id === id) ?? null,
    coordinatorOf: (t: Team) => t.personas[0] ?? null,
    upsertTeam: async () => {},
    removeTeam: async () => {},
    upsertPersona: async () => {},
    removePersona: async () => {},
    setCoordinator: async () => {},
    attachConnector: async () => {},
    detachConnector: async () => {},
    reload: async () => {},
  };
}

describe("DeployView (P4 — Générer & Déployer)", () => {
  let team: Team;

  beforeEach(() => {
    localStorage.clear();
    kitDeploySpy.mockReset();
    team = buildTeamFromRoster("Ma team", "ma-team");
  });

  it("U-1 — le NodeSelector liste exactement les nœuds de implementedNodes()", () => {
    render(<DeployView forge={fakeForge([team])} />);
    const select = screen.getByLabelText("Nœud cible") as HTMLSelectElement;
    // options = placeholder + les nœuds implémentés.
    const values = Array.from(select.options)
      .map((o) => o.value)
      .filter((v) => v !== "");
    expect(values).toEqual(implementedNodes());
    // 5 nœuds implémentés depuis P3c (openwebui apparaît automatiquement via implementedNodes()).
    expect(values).toHaveLength(5);
    expect(values).toContain("openwebui");
  });

  it("U-1 — ollama-lan révèle le champ host", () => {
    render(<DeployView forge={fakeForge([team])} />);
    expect(screen.queryByLabelText("Host LAN")).toBeNull();
    fireEvent.change(screen.getByLabelText("Nœud cible"), {
      target: { value: "ollama-lan" },
    });
    expect(screen.getByLabelText("Host LAN")).toBeTruthy();
  });

  it("U-2/U-3 — Générer affiche l'arbre du kit + un aperçu", () => {
    render(<DeployView forge={fakeForge([team])} />);
    fireEvent.change(screen.getByLabelText("Team"), {
      target: { value: "ma-team" },
    });
    fireEvent.change(screen.getByLabelText("Nœud cible"), {
      target: { value: "claude" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Générer" }));

    const tree = screen.getByLabelText("Arborescence du kit");
    expect(within(tree).getByText("CLAUDE.md")).toBeTruthy();
    // Aperçu non vide (1er fichier auto-sélectionné).
    const preview = screen.getByLabelText("Aperçu du fichier") as HTMLTextAreaElement;
    expect(preview.value.length).toBeGreaterThan(0);
    // Aucune écriture disque à ce stade (U-2).
    expect(kitDeploySpy).not.toHaveBeenCalled();
  });

  it("U-4 — Déployer déclenche la façade kitDeploy(destDir, files, force)", async () => {
    kitDeploySpy.mockImplementation(async (_d: string, files: Record<string, string>) =>
      Object.keys(files),
    );
    render(<DeployView forge={fakeForge([team])} />);
    fireEvent.change(screen.getByLabelText("Team"), {
      target: { value: "ma-team" },
    });
    fireEvent.change(screen.getByLabelText("Nœud cible"), {
      target: { value: "claude" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Générer" }));
    fireEvent.change(screen.getByLabelText("Dossier destination"), {
      target: { value: "/tmp/cible" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Déployer" }));

    await waitFor(() => expect(kitDeploySpy).toHaveBeenCalledTimes(1));
    const [destDir, files, force] = kitDeploySpy.mock.calls[0];
    expect(destDir).toBe("/tmp/cible");
    expect(typeof files).toBe("object");
    expect(force).toBe(false);
    await screen.findByLabelText("Résultat du déploiement");
  });

  it("états désactivés : Générer sans sélection, Déployer sans kit/destination", () => {
    render(<DeployView forge={fakeForge([team])} />);
    const gen = screen.getByRole("button", { name: "Générer" }) as HTMLButtonElement;
    const dep = screen.getByRole("button", { name: "Déployer" }) as HTMLButtonElement;
    expect(gen.disabled).toBe(true);
    expect(dep.disabled).toBe(true);
  });

  it("U-8 — changer de nœud après Générer efface l'arbre affiché", () => {
    render(<DeployView forge={fakeForge([team])} />);
    fireEvent.change(screen.getByLabelText("Team"), {
      target: { value: "ma-team" },
    });
    fireEvent.change(screen.getByLabelText("Nœud cible"), {
      target: { value: "claude" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Générer" }));
    expect(screen.queryByLabelText("Arborescence du kit")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Nœud cible"), {
      target: { value: "codex" },
    });
    expect(screen.queryByLabelText("Arborescence du kit")).toBeNull();
  });
});
