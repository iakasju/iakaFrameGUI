import { describe, it, expect } from "vitest";
import {
  CATALOG_PRINCIPLES,
  CATALOG_PRINCIPLE_IDS,
  parsePrinciple,
  principleById,
} from "../src/principle";

describe("CATALOG_PRINCIPLES (E2 §3.3)", () => {
  it("porte les 14 principes canoniques, ids uniques", () => {
    expect(CATALOG_PRINCIPLES).toHaveLength(14);
    expect(new Set(CATALOG_PRINCIPLE_IDS).size).toBe(14);
  });

  it("chaque principe a id/label/policy/trigger non vides", () => {
    for (const p of CATALOG_PRINCIPLES) {
      expect(p.id.length).toBeGreaterThan(0);
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.policy.length).toBeGreaterThan(0);
      expect(p.trigger.length).toBeGreaterThan(0);
    }
  });

  it("contient le principe-phare qualite", () => {
    const q = principleById("qualite");
    expect(q).toBeDefined();
    expect(q!.trigger).toMatch(/SemVer/);
    expect(principleById("inconnu")).toBeUndefined();
  });

  it("aucun principe ne pose de runner/model (AR-1)", () => {
    const json = JSON.stringify(CATALOG_PRINCIPLES);
    expect(json).not.toMatch(/\brunner\b/i);
    expect(json).not.toMatch(/\bmodel\b/i);
  });
});

describe("parsePrinciple (défensif)", () => {
  it("rejette un record sans id", () => {
    expect(parsePrinciple({ label: "x" })).toBeNull();
    expect(parsePrinciple(null)).toBeNull();
  });

  it("replie label sur id, tolère policy/trigger absents", () => {
    const p = parsePrinciple({ id: "x" });
    expect(p).toEqual({ id: "x", label: "x", policy: "", trigger: "" });
  });

  it("jamais d'exception sur entrée hostile", () => {
    for (const bad of [null, undefined, 42, "x", [], {}]) {
      expect(() => parsePrinciple(bad)).not.toThrow();
    }
  });

  it("round-trip : chaque principe du catalogue re-parse à l'identique", () => {
    for (const p of CATALOG_PRINCIPLES) {
      expect(parsePrinciple(JSON.parse(JSON.stringify(p)))).toEqual(p);
    }
  });
});
