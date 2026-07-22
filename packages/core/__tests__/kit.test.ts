import { describe, it, expect } from "vitest";
import {
  DEFAULT_KIT_NODE,
  parseKit,
  parseKitText,
  serializeKit,
  type Kit,
} from "../src/kit";

const validKit: Kit = {
  id: "iakaframe-kit",
  methodId: "iakaframe",
  teamId: "iakaframe",
  node: "claude",
};

describe("parseKit (E2 §5 — manifeste par références)", () => {
  it("exige id + methodId + teamId (Binding structurel)", () => {
    expect(parseKit({ id: "k", teamId: "t" })).toBeNull(); // pas de methodId
    expect(parseKit({ id: "k", methodId: "m" })).toBeNull(); // pas de teamId
    expect(parseKit({ methodId: "m", teamId: "t" })).toBeNull(); // pas d'id
    expect(parseKit(null)).toBeNull();
  });

  it("node non reconnu → repli DEFAULT_KIT_NODE (claude)", () => {
    const k = parseKit({ id: "k", methodId: "m", teamId: "t", node: "bogus" })!;
    expect(k.node).toBe(DEFAULT_KIT_NODE);
    expect(k.node).toBe("claude");
  });

  it("runnerBindingId optionnel : conservé si non vide, omis sinon", () => {
    const withBinding = parseKit({ ...validKit, runnerBindingId: "b1" })!;
    expect(withBinding.runnerBindingId).toBe("b1");
    const withoutBinding = parseKit({ ...validKit, runnerBindingId: "  " })!;
    expect(withoutBinding).not.toHaveProperty("runnerBindingId");
  });

  it("emits optionnel : lu défensivement (chaînes non vides), round-trip JSON conservé", () => {
    const withEmits = parseKit({
      ...validKit,
      emits: [".claude/agents/*", "CLAUDE.md", "", 42],
    })!;
    // Défensif : non-string / vides filtrés.
    expect(withEmits.emits).toEqual([".claude/agents/*", "CLAUDE.md"]);
    expect(parseKitText(serializeKit(withEmits))).toEqual(withEmits);
    // Absent → non posé.
    expect(parseKit(validKit)).not.toHaveProperty("emits");
  });

  it("ne pose ni runner ni model (manifeste de références seulement)", () => {
    const json = serializeKit(validKit);
    expect(json).not.toMatch(/\bmodel\b/i);
    // 'runnerBindingId' est une RÉFÉRENCE d'id (E1), pas un runner posé — absent ici.
    expect(JSON.parse(json)).toEqual(validKit);
  });

  it("jamais d'exception sur entrée hostile", () => {
    for (const bad of [null, undefined, 42, "x", [], {}]) {
      expect(() => parseKit(bad)).not.toThrow();
    }
  });

  it("round-trip via parseKitText/serializeKit", () => {
    expect(parseKitText(serializeKit(validKit))).toEqual(validKit);
    expect(parseKitText("")).toBeNull();
    expect(parseKitText("nope")).toBeNull();
  });
});
