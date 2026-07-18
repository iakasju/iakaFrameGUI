import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { buildTeamFromRoster, getAdapter, type Team } from "@iakaframe/core";
import { useForgeDeploy } from "./useForgeDeploy";
import type { Backend } from "../api/backend";

/** Backend espion : compte les appels d'écriture (`kitDeploy`) et de dialog. */
function spyBackend(opts?: {
  deployImpl?: (
    destDir: string,
    files: Record<string, string>,
    force: boolean,
  ) => Promise<string[]>;
}): {
  api: Backend;
  deployCalls: Array<{
    destDir: string;
    files: Record<string, string>;
    force: boolean;
  }>;
} {
  const deployCalls: Array<{
    destDir: string;
    files: Record<string, string>;
    force: boolean;
  }> = [];
  const api = {
    call: async () => undefined as never,
    isTauri: () => false,
    teamList: async () => [],
    teamRead: async () => null,
    teamWrite: async () => {},
    teamDelete: async () => {},
    workspacePath: async () => "/tmp/ws",
    kitDeploy: async (
      destDir: string,
      files: Record<string, string>,
      force = false,
    ) => {
      deployCalls.push({ destDir, files, force });
      return opts?.deployImpl
        ? opts.deployImpl(destDir, files, force)
        : Object.keys(files);
    },
    pickDirectory: async () => "/tmp/picked",
  } as unknown as Backend;
  return { api, deployCalls };
}

function makeTeamById(team: Team): (id: string) => Team | null {
  return (id: string) => (id === team.id ? team : null);
}

describe("useForgeDeploy", () => {
  let team: Team;

  beforeEach(() => {
    localStorage.clear();
    team = buildTeamFromRoster("Ma team", "ma-team");
  });

  it("generate produit le KitFileTree attendu SANS aucune I/O disque (espion façade = 0)", () => {
    const { api, deployCalls } = spyBackend();
    const { result } = renderHook(() =>
      useForgeDeploy({ api, teamById: makeTeamById(team) }),
    );

    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("claude"));
    act(() => result.current.generate());

    // Kit conforme à l'adaptateur claude (pur), SANS écriture.
    const expected = getAdapter("claude").generate(team);
    expect(result.current.kit).not.toBeNull();
    expect(Object.keys(result.current.kit!.files).sort()).toEqual(
      Object.keys(expected.files).sort(),
    );
    expect(deployCalls).toHaveLength(0); // AUCUN kitDeploy à la génération (U-2).
    expect(result.current.kit!.files["CLAUDE.md"]).toBeTruthy();
  });

  it("deploy appelle la façade avec { destDir, files, force }", async () => {
    const { api, deployCalls } = spyBackend();
    const { result } = renderHook(() =>
      useForgeDeploy({ api, teamById: makeTeamById(team) }),
    );

    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("claude"));
    act(() => result.current.generate());
    act(() => result.current.setDestDir("/tmp/cible"));
    act(() => result.current.setForce(true));
    await act(async () => {
      await result.current.deploy();
    });

    expect(deployCalls).toHaveLength(1);
    expect(deployCalls[0].destDir).toBe("/tmp/cible");
    expect(deployCalls[0].force).toBe(true);
    expect(deployCalls[0].files).toEqual(result.current.kit!.files);
    expect(result.current.result?.written.length).toBeGreaterThan(0);
    expect(result.current.result?.skipped).toEqual([]);
  });

  it("non destructif sans force : les fichiers non écrits sont listés en skipped (conflit)", async () => {
    // La façade n'écrit qu'un fichier : le reste est en conflit (skipped).
    const { api } = spyBackend({
      deployImpl: async () => ["CLAUDE.md"],
    });
    const { result } = renderHook(() =>
      useForgeDeploy({ api, teamById: makeTeamById(team) }),
    );

    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("claude"));
    act(() => result.current.generate());
    act(() => result.current.setDestDir("/tmp/cible"));
    await act(async () => {
      await result.current.deploy();
    });

    expect(result.current.result?.written).toEqual(["CLAUDE.md"]);
    expect(result.current.result!.skipped.length).toBeGreaterThan(0);
    expect(result.current.result!.skipped).not.toContain("CLAUDE.md");
  });

  it("invalide le kit au changement de nœud (U-8)", () => {
    const { api } = spyBackend();
    const { result } = renderHook(() =>
      useForgeDeploy({ api, teamById: makeTeamById(team) }),
    );

    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("claude"));
    act(() => result.current.generate());
    expect(result.current.kit).not.toBeNull();

    act(() => result.current.selectNode("codex"));
    expect(result.current.kit).toBeNull(); // kit périmé effacé.
    expect(result.current.selectedPath).toBeNull();
  });

  it("invalide le kit au changement de team (U-8)", () => {
    const other = buildTeamFromRoster("Autre", "autre");
    const byId = (id: string) =>
      id === "ma-team" ? team : id === "autre" ? other : null;
    const { api } = spyBackend();
    const { result } = renderHook(() => useForgeDeploy({ api, teamById: byId }));

    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("claude"));
    act(() => result.current.generate());
    expect(result.current.kit).not.toBeNull();

    act(() => result.current.selectTeam("autre"));
    expect(result.current.kit).toBeNull();
  });

  it("canGenerate exige team + nœud, et host non vide pour ollama-lan", () => {
    const { api } = spyBackend();
    const { result } = renderHook(() =>
      useForgeDeploy({ api, teamById: makeTeamById(team) }),
    );

    expect(result.current.canGenerate).toBe(false);
    act(() => result.current.selectTeam("ma-team"));
    expect(result.current.canGenerate).toBe(false);
    act(() => result.current.selectNode("ollama-lan"));
    expect(result.current.canGenerate).toBe(false); // host vide.
    act(() => result.current.setLanHost("192.168.2.11"));
    expect(result.current.canGenerate).toBe(true);
  });

  it("canDeploy exige un kit généré ET une destination", () => {
    const { api } = spyBackend();
    const { result } = renderHook(() =>
      useForgeDeploy({ api, teamById: makeTeamById(team) }),
    );

    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("claude"));
    expect(result.current.canDeploy).toBe(false); // pas de kit.
    act(() => result.current.generate());
    expect(result.current.canDeploy).toBe(false); // pas de destination.
    act(() => result.current.setDestDir("/tmp/cible"));
    expect(result.current.canDeploy).toBe(true);
  });

  it("ollama-lan : le host est injecté à la génération (option lanHost)", () => {
    const { api } = spyBackend();
    const spy = vi.spyOn(getAdapter("ollama-lan"), "generate");
    const { result } = renderHook(() =>
      useForgeDeploy({ api, teamById: makeTeamById(team) }),
    );

    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("ollama-lan"));
    act(() => result.current.setLanHost("10.0.0.5"));
    act(() => result.current.generate());

    expect(spy).toHaveBeenCalledWith(team, { lanHost: "10.0.0.5" });
    spy.mockRestore();
  });

  it("browseDestDir remplit la destination via le dialog (façade pickDirectory)", async () => {
    const { api } = spyBackend();
    const { result } = renderHook(() =>
      useForgeDeploy({ api, teamById: makeTeamById(team) }),
    );

    await act(async () => {
      await result.current.browseDestDir();
    });
    expect(result.current.destDir).toBe("/tmp/picked");
  });

  // --- P7 : liaison optionnelle (Binding) ---

  it("enableBinding initialise un binding par défaut du (team, nœud) ; clearBinding revient au pur", () => {
    const { api } = spyBackend();
    const { result } = renderHook(() =>
      useForgeDeploy({ api, teamById: makeTeamById(team) }),
    );

    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("openwebui"));
    expect(result.current.binding).toBeNull(); // pur par défaut.

    act(() => result.current.enableBinding());
    expect(result.current.binding).not.toBeNull();
    expect(result.current.binding!.node).toBe("openwebui");
    expect(result.current.binding!.teamId).toBe("ma-team");
    expect(result.current.binding!.origin).toBe("forge-default");
    expect(result.current.binding!.assignments).toHaveLength(team.personas.length);

    act(() => result.current.clearBinding());
    expect(result.current.binding).toBeNull();
  });

  it("changer de nœud ou de team réinitialise le binding (E1 Q-2)", () => {
    const other = buildTeamFromRoster("Autre", "autre");
    const byId = (id: string) =>
      id === "ma-team" ? team : id === "autre" ? other : null;
    const { api } = spyBackend();
    const { result } = renderHook(() => useForgeDeploy({ api, teamById: byId }));

    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("openwebui"));
    act(() => result.current.enableBinding());
    expect(result.current.binding).not.toBeNull();

    act(() => result.current.selectNode("codex"));
    expect(result.current.binding).toBeNull(); // réinitialisé au changement de nœud.

    act(() => result.current.enableBinding());
    expect(result.current.binding).not.toBeNull();
    act(() => result.current.selectTeam("autre"));
    expect(result.current.binding).toBeNull(); // réinitialisé au changement de team.
  });

  it("setPersonaModel met à jour le binding et invalide le kit affiché", () => {
    const { api } = spyBackend();
    const { result } = renderHook(() =>
      useForgeDeploy({ api, teamById: makeTeamById(team) }),
    );
    const pid = team.personas[0].id;

    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("openwebui"));
    act(() => result.current.enableBinding());
    act(() => result.current.generate());
    expect(result.current.kit).not.toBeNull();

    act(() => result.current.setPersonaModel(pid, "qwen2.5-coder:14b"));
    expect(result.current.kit).toBeNull(); // kit invalidé au changement de binding.
    const entry = result.current.binding!.assignments.find((b) => b.personaId === pid);
    expect(entry!.model).toBe("qwen2.5-coder:14b");
  });

  it("generate passe le binding à l'adaptateur ; le modèle apparaît dans le kit", () => {
    const { api } = spyBackend();
    const { result } = renderHook(() =>
      useForgeDeploy({ api, teamById: makeTeamById(team) }),
    );
    const pid = team.personas[0].id;

    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("openwebui"));
    act(() => result.current.enableBinding());
    act(() => result.current.setPersonaModel(pid, "qwen2.5"));
    act(() => result.current.generate());

    const content = result.current.kit!.files[`models/${pid}.json`];
    expect(JSON.parse(content).base_model_id).toBe("qwen2.5");
  });

  it("B-6 — deploy ajoute binding.json (racine) au KitFileTree quand un binding est posé", async () => {
    const { api, deployCalls } = spyBackend();
    const { result } = renderHook(() =>
      useForgeDeploy({ api, teamById: makeTeamById(team) }),
    );
    const pid = team.personas[0].id;

    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("openwebui"));
    act(() => result.current.enableBinding());
    act(() => result.current.setPersonaModel(pid, "qwen2.5"));
    act(() => result.current.generate());
    act(() => result.current.setDestDir("/tmp/cible"));
    await act(async () => {
      await result.current.deploy();
    });

    expect(deployCalls).toHaveLength(1);
    const files = deployCalls[0].files;
    expect(files["binding.json"]).toBeDefined();
    const parsed = JSON.parse(files["binding.json"]);
    expect(parsed.origin).toBe("forge-default");
    expect(parsed.node).toBe("openwebui");
    // Aucun credential dans l'artefact déployé.
    expect(files["binding.json"]).not.toMatch(/token|apiKey|password/i);
  });

  it("B-6 — sans binding, deploy n'ajoute PAS de binding.json (arbre inchangé)", async () => {
    const { api, deployCalls } = spyBackend();
    const { result } = renderHook(() =>
      useForgeDeploy({ api, teamById: makeTeamById(team) }),
    );

    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("claude"));
    act(() => result.current.generate());
    act(() => result.current.setDestDir("/tmp/cible"));
    await act(async () => {
      await result.current.deploy();
    });

    expect(deployCalls[0].files["binding.json"]).toBeUndefined();
    expect(deployCalls[0].files).toEqual(result.current.kit!.files);
  });
});
