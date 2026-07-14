import { describe, it, expect } from "vitest";
import {
  parseTeam,
  parseTeams,
  parseTeamText,
  serializeTeam,
  DEFAULT_VIGNETTE_TEAM,
  type Team,
} from "../src/team";

const validTeam: Team = {
  id: "iakaframe",
  name: "iakaframe",
  vignetteTeam: "none",
  coordinator: "aragorn",
  personas: [
    {
      id: "aragorn",
      name: "Aragorn",
      roleKey: "coordination",
      royaume: "COORDINATION",
      roleIndex: 1,
      skills: [],
      guardrails: [],
    },
  ],
  connectors: [],
};

describe("parseTeam (défensif)", () => {
  it("rejette un objet sans id", () => {
    expect(parseTeam({ name: "x" })).toBeNull();
    expect(parseTeam(null)).toBeNull();
  });

  it("applique le défaut vignetteTeam", () => {
    const t = parseTeam({ id: "t1", personas: [] });
    expect(t!.vignetteTeam).toBe(DEFAULT_VIGNETTE_TEAM);
    expect(t!.name).toBe("t1");
  });

  it("E2 : la Team est method-agnostic — plus de methodId ni de workflowId", () => {
    // Même si le JSON d'entrée porte ces clés legacy, elles ne sont PAS propagées.
    const t = parseTeam({
      id: "t",
      personas: [],
      methodId: "sparc",
      workflowId: "wf-x",
    });
    expect(t).not.toBeNull();
    expect(t).not.toHaveProperty("methodId");
    expect(t).not.toHaveProperty("workflowId");
    expect(serializeTeam(t!)).not.toMatch(/methodId|workflowId/);
  });

  it("replie un coordinator invalide sur personas[0]", () => {
    const t = parseTeam({
      id: "t",
      coordinator: "inconnu",
      personas: [{ id: "gimli", name: "Gimli", roleKey: "fabrication" }],
    });
    expect(t!.coordinator).toBe("gimli");
  });

  it("ignore les personas invalides", () => {
    const t = parseTeam({
      id: "t",
      personas: [{ name: "Ok" }, {}, 3, { nope: true }],
    });
    expect(t!.personas).toHaveLength(1);
    expect(t!.personas[0].name).toBe("Ok");
  });

  it("INVARIANT AR-1 : le JSON sérialisé ne contient ni runner ni model", () => {
    const polluted = {
      ...validTeam,
      personas: [
        {
          ...validTeam.personas[0],
          runner: "claude-code",
          model: "gpt-4",
        },
      ],
    };
    const json = serializeTeam(polluted as unknown as Team);
    expect(json).not.toMatch(/runner/);
    expect(json).not.toMatch(/model/);
    // Round-trip conservant l'invariant.
    const back = parseTeamText(json);
    expect(back).not.toBeNull();
    expect(JSON.stringify(back)).not.toMatch(/runner|model/);
  });
});

describe("parseTeams / parseTeamText", () => {
  it("renvoie [] pour un JSON absent/illisible/non-tableau", () => {
    expect(parseTeams(undefined)).toEqual([]);
    expect(parseTeams("")).toEqual([]);
    expect(parseTeams("{pas du json")).toEqual([]);
    expect(parseTeams('{"id":"x"}')).toEqual([]);
  });

  it("parse un tableau et filtre les entrées invalides", () => {
    const arr = JSON.stringify([validTeam, { name: "sans-id" }, 5]);
    const teams = parseTeams(arr);
    expect(teams).toHaveLength(1);
    expect(teams[0].id).toBe("iakaframe");
  });

  it("parseTeamText renvoie null pour un fichier vide/illisible", () => {
    expect(parseTeamText("")).toBeNull();
    expect(parseTeamText("nope")).toBeNull();
    expect(parseTeamText(JSON.stringify(validTeam))!.id).toBe("iakaframe");
  });
});
