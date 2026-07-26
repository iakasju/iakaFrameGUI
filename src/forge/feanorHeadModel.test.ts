import { describe, it, expect } from "vitest";
import { parsePersona, type Persona } from "@iakaframe/core";
import { vignetteGradient } from "./casting";
import { buildFeanorVignette, buildEntityVignette, FEANOR_ROLE_KEY } from "./feanorHeadModel";

describe("feanorHead — dérivations pures (Lot 6, A6)", () => {
  it("buildFeanorVignette : dérive FË + flamme (index 8) + royaume FRAME du persona réel", () => {
    const real: Persona[] = [
      parsePersona({
        id: "feanor",
        name: "Fëanor",
        roleKey: "frame",
        royaume: "FRAME",
        pastille: "🟠",
        roleIndex: 8,
        skills: ["iakaframe-frame"],
      })!,
    ];
    const vg = buildFeanorVignette(real);
    expect(vg.name).toBe("Fëanor");
    expect(vg.initials).toBe("FË");
    expect(vg.royaume).toBe("FRAME");
    expect(vg.pastille).toBe("🟠");
    // Dégradé = flamme/braise (casting index 8), distinct de l'or (0) et de l'orange doc (7).
    expect(vg.gradient).toEqual(vignetteGradient(8));
    expect(FEANOR_ROLE_KEY).toBe("frame");
  });

  it("buildFeanorVignette : repli sur le roster canonique quand la source n'a pas Fëanor", () => {
    const vg = buildFeanorVignette([
      parsePersona({ id: "gimli", name: "Gimli", roleKey: "dev", royaume: "IAKAFRAME", roleIndex: 3 })!,
    ]);
    // Repli hors-ligne : le persona canonique du rôle `frame`.
    expect(vg.name).toBe("Fëanor");
    expect(vg.initials).toBe("FË");
    expect(vg.gradient).toEqual(vignetteGradient(8));
    // Le roster canonique ne déclare pas de pastille → jamais fabriquée.
    expect(vg.pastille).toBeNull();
  });

  it("buildFeanorVignette : défaut (aucune source) = roster canonique", () => {
    const vg = buildFeanorVignette();
    expect(vg.name).toBe("Fëanor");
    expect(vg.royaume).toBe("FRAME");
  });

  it("buildEntityVignette : persona réelle rend ses initiales / dégradé / pastille", () => {
    const gandalf = parsePersona({
      id: "gandalf",
      name: "Gandalf",
      roleKey: "cadrage",
      royaume: "IAKAFRAME",
      pastille: "🔵",
      roleIndex: 2,
    })!;
    const ent = buildEntityVignette(gandalf);
    expect(ent.name).toBe("Gandalf");
    expect(ent.initials).toBe("GA");
    expect(ent.pastille).toBe("🔵");
    expect(ent.placeholder).toBe(false);
    expect(ent.gradient).toEqual(vignetteGradient(2));
  });

  it("buildEntityVignette : entité null (création vierge) = placeholder honnête, jamais de fausse identité", () => {
    const ent = buildEntityVignette(null);
    expect(ent.name).toBe("Nouvelle persona");
    expect(ent.initials).toBe("＋");
    expect(ent.pastille).toBeNull();
    expect(ent.placeholder).toBe(true);
  });
});
