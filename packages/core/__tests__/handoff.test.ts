import { describe, it, expect } from "vitest";
import {
  buildHandoffPackage,
  stableHash,
  HANDOFF_FILES,
  type HandoffManifest,
} from "../src/handoff";
import { parseTeam, type Team } from "../src/team";

const team: Team = {
  id: "iakaframe",
  name: "iakaframe",
  methodId: "iakaframe",
  vignetteTeam: "none",
  coordinator: "aragorn",
  personas: [
    {
      id: "aragorn",
      name: "Aragorn",
      roleKey: "coordination",
      royaume: "COORDINATION",
      roleIndex: 1,
      skills: ["iakaframe-cadrage"],
      guardrails: ["identity-badge"],
    },
    {
      id: "gimli",
      name: "Gimli",
      roleKey: "fabrication",
      royaume: "FABRICATION",
      roleIndex: 3,
      skills: [],
      guardrails: [],
    },
  ],
  connectors: [],
};

const T0 = Date.UTC(2026, 6, 7, 10, 0, 0); // horodatage FOURNI (jamais Date.now)

describe("stableHash", () => {
  it("est déterministe (même contenu → même empreinte)", () => {
    expect(stableHash("hello")).toBe(stableHash("hello"));
  });

  it("change si le contenu change", () => {
    expect(stableHash("hello")).not.toBe(stableHash("hell0"));
  });

  it("produit un hex de 8 caractères", () => {
    expect(stableHash("x")).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("buildHandoffPackage", () => {
  it("produit un team.json PUR (aucun runner/model — AR-1)", () => {
    // Team polluée en mémoire : serializeTeam doit purger runner/model.
    const dirty = {
      ...team,
      personas: [{ ...team.personas[0], runner: "claude-code", model: "opus" }],
    } as unknown as Team;
    const pkg = buildHandoffPackage(dirty, T0);
    expect(pkg.teamJson).not.toContain("runner");
    expect(pkg.teamJson).not.toContain("model");
  });

  it("le team.json fait un round-trip propre (parseTeam ∘ serializeTeam)", () => {
    const pkg = buildHandoffPackage(team, T0);
    const back = parseTeam(JSON.parse(pkg.teamJson));
    expect(back).toEqual(team);
  });

  it("le manifeste porte la provenance forge + empreinte du team.json", () => {
    const pkg = buildHandoffPackage(team, T0);
    const m: HandoffManifest = pkg.manifest;
    expect(m.source).toBe("forge");
    expect(m.teamId).toBe("iakaframe");
    expect(m.teamName).toBe("iakaframe");
    expect(m.originHash).toBe(stableHash(pkg.teamJson));
    expect(m.version).toBe(m.originHash);
    expect(m.timestamp).toBe("2026-07-07T10:00:00.000Z");
  });

  it("est reproductible : même team + même horloge → paquet identique", () => {
    const a = buildHandoffPackage(team, T0);
    const b = buildHandoffPackage(team, T0);
    expect(a.teamJson).toBe(b.teamJson);
    expect(a.handoffJson).toBe(b.handoffJson);
  });

  it("l'empreinte change quand la team change (détection de dérive)", () => {
    const a = buildHandoffPackage(team, T0);
    const mutated: Team = { ...team, name: "iakaframe-2" };
    const b = buildHandoffPackage(mutated, T0);
    expect(a.manifest.originHash).not.toBe(b.manifest.originHash);
  });

  it("expose les noms de fichiers canoniques", () => {
    expect(HANDOFF_FILES.team).toBe("team.json");
    expect(HANDOFF_FILES.manifest).toBe("handoff.json");
  });
});
