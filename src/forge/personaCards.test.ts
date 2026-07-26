import { describe, it, expect } from "vitest";
import { CANONICAL_ROSTER, type Persona } from "@iakaframe/core";
import { buildPersonaCard, buildPersonaReservoir } from "./personaCards";

describe("personaReservoir — projection pure des fiches à vignettes (Lot 3, A3)", () => {
  it("projette les 9 personas vendorées du roster canonique (le casting du réservoir)", () => {
    const cards = buildPersonaReservoir(CANONICAL_ROSTER);
    expect(cards).toHaveLength(9);
    const names = cards.map((c) => c.name);
    // Les 9 attendus par l'instruction (ordre roleIndex).
    expect(names).toEqual([
      "Odin",
      "Aragorn",
      "Gandalf",
      "Gimli",
      "Legolas",
      "Helm",
      "Loki",
      "Nathalie",
      "Fëanor",
    ]);
  });

  it("dérive la vignette (initiales + dégradé casté) des champs EXISTANTS — aucun asset canon", () => {
    const cards = buildPersonaReservoir(CANONICAL_ROSTER);
    const gimli = cards.find((c) => c.id === "gimli")!;
    // Initiales dérivées du nom, dégradé casté par roleIndex (dev = 3 → rouge du casting).
    expect(gimli.initials).toBe("GI");
    expect(gimli.roleIndex).toBe(3);
    expect(gimli.gradient).toEqual(["#b3261e", "#7d1a15"]);
    // Fëanor (9ᵉ rôle, index 8) reçoit bien la flamme distincte, pas l'or du portefeuille.
    const feanor = cards.find((c) => c.id === "feanor")!;
    expect(feanor.roleIndex).toBe(8);
    expect(feanor.gradient).toEqual(["#c2410c", "#7c2d12"]);
  });

  it("dérive le badge [ROYAUME][Nom] et le libellé de rôle (jamais un nom de code)", () => {
    const gandalf = buildPersonaCard(CANONICAL_ROSTER.find((p) => p.id === "gandalf")!);
    expect(gandalf.badge).toBe("[CADRAGE][Gandalf]");
    expect(gandalf.roleLabel).toBe("Cadrage");
    expect(gandalf.roleKey).toBe("cadrage");
  });

  it("n'invente JAMAIS de pastille : absente du roster → null (pas de badge fabriqué)", () => {
    const cards = buildPersonaReservoir(CANONICAL_ROSTER);
    expect(cards.every((c) => c.pastille === null)).toBe(true);
    // …mais une pastille déclarée est reprise verbatim.
    const withPastille: Persona = { ...CANONICAL_ROSTER[3], pastille: "🔴" };
    expect(buildPersonaCard(withPastille).pastille).toBe("🔴");
  });

  it("conserve skills et guardrails déclarés (référence, jamais réécriture)", () => {
    const p: Persona = {
      id: "x",
      name: "Xavier",
      roleKey: "dev",
      royaume: "DEV",
      roleIndex: 3,
      skills: ["iakaframe-fabrication"],
      guardrails: ["identity", "perimeter"],
    };
    const card = buildPersonaCard(p);
    expect(card.skills).toEqual(["iakaframe-fabrication"]);
    expect(card.guardrails).toEqual(["identity", "perimeter"]);
  });
});
