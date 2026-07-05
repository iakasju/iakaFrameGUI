import { describe, it, expect } from "vitest";
import { parsePersona, personaBadge, slugify } from "../src/persona";

describe("parsePersona (défensif, invariant AR-1)", () => {
  it("rejette un non-objet et un objet sans nom", () => {
    expect(parsePersona(null)).toBeNull();
    expect(parsePersona(42)).toBeNull();
    expect(parsePersona({})).toBeNull();
    expect(parsePersona({ name: "   " })).toBeNull();
  });

  it("dérive id/royaume/roleIndex depuis nom et rôle si absents", () => {
    const p = parsePersona({ name: "Aragorn", roleKey: "coordination" });
    expect(p).not.toBeNull();
    expect(p!.id).toBe("aragorn");
    expect(p!.royaume).toBe("COORDINATION");
    expect(p!.roleIndex).toBe(1);
    expect(p!.skills).toEqual([]);
    expect(p!.guardrails).toEqual([]);
  });

  it("IGNORE toute clé runner/model présente en entrée (AR-1)", () => {
    const p = parsePersona({
      name: "Gimli",
      roleKey: "fabrication",
      runner: "claude-code",
      model: "claude-sonnet-4-5",
    });
    expect(p).not.toBeNull();
    expect(p).not.toHaveProperty("runner");
    expect(p).not.toHaveProperty("model");
    expect(JSON.stringify(p)).not.toMatch(/runner|model/);
  });

  it("filtre les skills/guardrails non-string", () => {
    const p = parsePersona({
      name: "X",
      skills: ["a", 1, null, "b"],
      guardrails: ["identity-guard", 2],
    });
    expect(p!.skills).toEqual(["a", "b"]);
    expect(p!.guardrails).toEqual(["identity-guard"]);
  });

  it("personaBadge force le royaume en MAJUSCULE", () => {
    expect(personaBadge({ royaume: "coordination", name: "Aragorn" })).toBe(
      "[COORDINATION][Aragorn]",
    );
  });

  it("slugify produit un id stable (accents, espaces, casse)", () => {
    expect(slugify("Épée de Légolas")).toBe("epee-de-legolas");
    expect(slugify("  Gandalf  ")).toBe("gandalf");
  });
});
