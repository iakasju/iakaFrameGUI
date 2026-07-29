import { describe, it, expect } from "vitest";
import {
  CATALOG_RITUALS,
  CATALOG_RITUAL_IDS,
  parseRitual,
  ritualById,
} from "../src/ritual";

describe("CATALOG_RITUALS (E2 §3.4)", () => {
  it("porte les 6 rituels canoniques, ids uniques", () => {
    expect(CATALOG_RITUALS).toHaveLength(6);
    expect(new Set(CATALOG_RITUAL_IDS).size).toBe(6);
  });

  it("tranche forge/cockpit : init = SEUL geste de fabrication (forge)", () => {
    expect(ritualById("init")!.side).toBe("forge");
    for (const id of ["iakastart", "update", "snapshot", "log-conversation"]) {
      expect(ritualById(id)!.side).toBe("cockpit");
    }
  });

  it("log-conversation modélisé [MVP] (Q-5)", () => {
    const r = ritualById("log-conversation");
    expect(r).toBeDefined();
    expect(r!.actions.length).toBeGreaterThan(0);
  });

  it("chaque rituel a des déclencheurs et actions non vides", () => {
    for (const r of CATALOG_RITUALS) {
      expect(r.triggers.length).toBeGreaterThan(0);
      expect(r.actions.length).toBeGreaterThan(0);
    }
  });
});

describe("parseRitual (défensif)", () => {
  it("rejette un record sans id", () => {
    expect(parseRitual({ label: "x" })).toBeNull();
    expect(parseRitual(null)).toBeNull();
  });

  it("side non reconnu → repli cockpit ; tableaux filtrés", () => {
    const r = parseRitual({ id: "g", side: "bogus", triggers: ["a", 3, ""], actions: [1, "ok"] });
    expect(r!.side).toBe("cockpit");
    expect(r!.triggers).toEqual(["a"]);
    expect(r!.actions).toEqual(["ok"]);
  });

  it("jamais d'exception sur entrée hostile", () => {
    for (const bad of [null, undefined, 42, "x", [], {}]) {
      expect(() => parseRitual(bad)).not.toThrow();
    }
  });

  it("round-trip : chaque rituel du catalogue re-parse à l'identique", () => {
    for (const r of CATALOG_RITUALS) {
      expect(parseRitual(JSON.parse(JSON.stringify(r)))).toEqual(r);
    }
  });
});
