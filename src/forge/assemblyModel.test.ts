import { describe, it, expect } from "vitest";
import { buildAssemblyModel } from "./assemblyModel";
import type { FrameAssembly } from "./frame";

/**
 * Assemblage résolu minimal mais cohérent (frame iakaframe) : ids de team = ids du roster
 * canonique → le mariage roleKey→persona se résout exactement (fidèle à 03-assemblage.html).
 */
function assembly(over: Partial<FrameAssembly> = {}): FrameAssembly {
  return {
    frame: {
      id: "iakaframe",
      name: "iakaframe",
      version: "v1",
      methodId: "iakaframe",
      teamId: "iakaframe-8",
      default: true,
    },
    method: {
      id: "iakaframe",
      name: "Méthode iakaframe",
      workflowId: "iakaframe-3phases",
      principleIds: ["cadrage-avant-code", "mvp-first"],
      ritualIds: ["iakastart"],
      guardrailIds: ["identity", "perimeter"],
      roleKeys: ["cadrage", "dev", "qualite"],
      scaffoldIds: ["projet"],
    },
    team: {
      id: "iakaframe-8",
      name: "La compagnie",
      personas: ["gandalf", "gimli", "legolas"],
      coordinator: "aragorn",
      guardrails: [],
      vignetteTeam: "none",
    },
    binding: {
      id: "iakaframe-claude-default",
      methodId: "iakaframe",
      teamId: "iakaframe-8",
      assignments: [
        { personaId: "gandalf", runner: "claude", model: "opus", tools: [] },
        { personaId: "gimli", runner: "claude", model: "sonnet", tools: [] },
      ],
      personaIds: ["gandalf", "gimli"],
    },
    ...over,
  };
}

describe("buildAssemblyModel — le récit « frères » (méthode + team, jamais imbriqués)", () => {
  it("projette méthode et team comme deux frères de MÊME niveau (deux champs pairs)", () => {
    const m = buildAssemblyModel(assembly());
    expect(m.hasAssembly).toBe(true);
    // Deux frères pairs : la structure ne niche jamais la team dans la méthode.
    expect(m.method).not.toBeNull();
    expect(m.team).not.toBeNull();
    expect(m.method).not.toHaveProperty("team");
    expect(m.team).not.toHaveProperty("method");
    expect(m.method?.roleKeys).toEqual(["cadrage", "dev", "qualite"]);
    expect(m.team?.id).toBe("iakaframe-8");
  });

  it("résout chaque persona de la team (roster : name, roleKey, roleIndex, dégradé)", () => {
    const m = buildAssemblyModel(assembly());
    const gandalf = m.team?.members.find((p) => p.id === "gandalf");
    expect(gandalf?.name).toBe("Gandalf");
    expect(gandalf?.roleKey).toBe("cadrage");
    expect(gandalf?.initials).toBe("GA");
    // Dégradé déterministe issu du roleIndex (bleu cadrage = index 2).
    expect(gandalf?.gradient).toEqual(["#2b5f9e", "#1d4372"]);
  });

  it("marque le coordinateur de la team", () => {
    const m = buildAssemblyModel(
      assembly({
        team: {
          id: "t",
          name: "t",
          personas: ["aragorn", "gandalf"],
          coordinator: "aragorn",
          guardrails: [],
          vignetteTeam: "none",
        },
      }),
    );
    expect(m.team?.members.find((p) => p.id === "aragorn")?.isCoordinator).toBe(true);
    expect(m.team?.members.find((p) => p.id === "gandalf")?.isCoordinator).toBe(false);
  });

  it("rend le binding comme le mariage roleKey (méthode) → persona (team) + runner·model", () => {
    const m = buildAssemblyModel(assembly());
    expect(m.binding?.id).toBe("iakaframe-claude-default");
    const rowGandalf = m.binding?.rows.find((r) => r.persona.id === "gandalf");
    expect(rowGandalf?.roleKey).toBe("cadrage");
    expect(rowGandalf?.runner).toBe("claude");
    expect(rowGandalf?.model).toBe("opus");
  });

  it("signale un rôle non couvert par la team (orphelin du mariage)", () => {
    // La méthode demande `deploiement` ; aucune persona de la team ne le caste.
    const m = buildAssemblyModel(
      assembly({
        method: {
          id: "iakaframe",
          name: "M",
          workflowId: undefined,
          principleIds: [],
          ritualIds: [],
          guardrailIds: [],
          roleKeys: ["cadrage", "deploiement"],
          scaffoldIds: [],
        },
      }),
    );
    expect(m.uncoveredRoleKeys).toEqual(["deploiement"]);
  });

  it("ne signale aucun orphelin quand toutes les personas couvrent les roleKeys", () => {
    const m = buildAssemblyModel(assembly());
    // roleKeys = cadrage/dev/qualite ; team = gandalf(cadrage)/gimli(dev)/legolas(qualite).
    expect(m.uncoveredRoleKeys).toEqual([]);
  });

  it("retombe sur `roleKey = null` (affiché « — ») pour une persona hors roster (jamais deviné)", () => {
    const m = buildAssemblyModel(
      assembly({
        team: {
          id: "t",
          name: "t",
          personas: ["persona-maison"],
          coordinator: "persona-maison",
          guardrails: [],
          vignetteTeam: "none",
        },
      }),
    );
    const custom = m.team?.members[0];
    expect(custom?.roleKey).toBeNull();
    expect(custom?.name).toBe("persona-maison");
    expect(custom?.roleIndex).toBe(0);
  });

  it("défensif : un frère absent (null) ne lève jamais et `hasAssembly` suit le reste", () => {
    const empty = buildAssemblyModel({ frame: null, method: null, team: null, binding: null });
    expect(empty.hasAssembly).toBe(false);
    expect(empty.uncoveredRoleKeys).toEqual([]);
    const teamOnly = buildAssemblyModel(assembly({ method: null, binding: null, frame: null }));
    expect(teamOnly.hasAssembly).toBe(true);
    expect(teamOnly.method).toBeNull();
    expect(teamOnly.team).not.toBeNull();
  });
});
