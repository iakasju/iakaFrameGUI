import { describe, it, expect } from "vitest";
import {
  CATALOG_SCAFFOLDS,
  CATALOG_SCAFFOLD_IDS,
  PORTFOLIO_SCAFFOLD,
  PROJECT_SCAFFOLD,
  parseScaffold,
  scaffoldById,
} from "../src/scaffold";

describe("CATALOG_SCAFFOLDS (E2 §3.1)", () => {
  it("porte 2 scaffolds : portefeuille + projet", () => {
    expect(CATALOG_SCAFFOLDS).toHaveLength(2);
    expect(CATALOG_SCAFFOLD_IDS).toEqual(["portfolio", "project"]);
  });

  it("les deux niveaux sont non destructifs (invariant onboarding)", () => {
    expect(PORTFOLIO_SCAFFOLD.nonDestructive).toBe(true);
    expect(PROJECT_SCAFFOLD.nonDestructive).toBe(true);
    expect(PORTFOLIO_SCAFFOLD.level).toBe("portfolio");
    expect(PROJECT_SCAFFOLD.level).toBe("project");
  });

  it("le scaffold projet couvre specs/instructions + CLAUDE.md + .iakaframe", () => {
    const paths = PROJECT_SCAFFOLD.entries.map((e) => e.path);
    expect(paths).toContain("specs/instructions/");
    expect(paths).toContain("CLAUDE.md");
    expect(paths).toContain(".iakaframe");
    expect(scaffoldById("project")).toBe(PROJECT_SCAFFOLD);
    expect(scaffoldById("nope")).toBeUndefined();
  });
});

describe("parseScaffold (défensif)", () => {
  it("rejette un record sans id", () => {
    expect(parseScaffold({ level: "project" })).toBeNull();
    expect(parseScaffold(null)).toBeNull();
  });

  it("nonDestructive FORCÉ à true, level non reconnu → project, entrées filtrées", () => {
    const s = parseScaffold({
      id: "s",
      level: "bogus",
      nonDestructive: false,
      entries: [{ path: "a/" }, {}, 3, { role: "sans path" }],
    });
    expect(s!.nonDestructive).toBe(true);
    expect(s!.level).toBe("project");
    expect(s!.entries).toHaveLength(1);
    expect(s!.entries[0].path).toBe("a/");
    expect(s!.entries[0].createIfAbsent).toBe(true);
  });

  it("jamais d'exception sur entrée hostile", () => {
    for (const bad of [null, undefined, 42, "x", [], {}]) {
      expect(() => parseScaffold(bad)).not.toThrow();
    }
  });
});
