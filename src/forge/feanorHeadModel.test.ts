import { describe, it, expect } from "vitest";
import { parsePersona, type Persona } from "@iakaframe/core";
import { vignetteGradient } from "./casting";
import {
  buildFeanorVignette,
  buildEntityVignette,
  personaToAuthoredEntity,
  PERSONA_BLANK_ENTITY,
  FEANOR_ROLE_KEY,
  type AuthoredEntity,
} from "./feanorHeadModel";

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

  it("buildEntityVignette : persona réelle (via l'adaptateur) rend ses initiales / dégradé / pastille", () => {
    const gandalf = parsePersona({
      id: "gandalf",
      name: "Gandalf",
      roleKey: "cadrage",
      royaume: "IAKAFRAME",
      pastille: "🔵",
      roleIndex: 2,
    })!;
    const ent = buildEntityVignette(personaToAuthoredEntity(gandalf));
    expect(ent.name).toBe("Gandalf");
    expect(ent.initials).toBe("GA");
    expect(ent.pastille).toBe("🔵");
    expect(ent.typeLabel).toBe("persona");
    expect(ent.placeholder).toBe(false);
    expect(ent.gradient).toEqual(vignetteGradient(2));
  });

  it("personaToAuthoredEntity : la persona reste un cas de l'entité générique (role = roleKey)", () => {
    const gimli = parsePersona({
      id: "gimli",
      name: "Gimli",
      roleKey: "dev",
      royaume: "IAKAFRAME",
      roleIndex: 3,
    })!;
    const ent = personaToAuthoredEntity(gimli);
    expect(ent.type).toBe("persona");
    expect(ent.typeLabel).toBe("persona");
    expect(ent.name).toBe("Gimli");
    expect(ent.key).toBe("dev"); // clé secondaire = roleKey → contexte LLM `role` (non-régression #1)
    expect(ent.roleIndex).toBe(3);
  });

  it("buildEntityVignette : création vierge persona = placeholder honnête « Nouvelle persona »", () => {
    const ent = buildEntityVignette(PERSONA_BLANK_ENTITY);
    expect(ent.name).toBe("Nouvelle persona");
    expect(ent.initials).toBe("＋");
    expect(ent.pastille).toBeNull();
    expect(ent.typeLabel).toBe("persona");
    expect(ent.placeholder).toBe(true);
  });

  it("buildEntityVignette : AGNOSTIQUE — un autre type (principe) rend son typeLabel + son placeholder genré", () => {
    const principleBlank: AuthoredEntity = {
      type: "principle",
      typeLabel: "principe",
      newLabel: "Nouveau principe",
      name: "",
      key: null,
      roleIndex: 2,
      pastille: null,
    };
    const blank = buildEntityVignette(principleBlank);
    expect(blank.name).toBe("Nouveau principe"); // genre masculin respecté, jamais « Nouvelle persona »
    expect(blank.typeLabel).toBe("principe");
    expect(blank.placeholder).toBe(true);

    const named = buildEntityVignette({ ...principleBlank, name: "MVP d'abord" });
    expect(named.name).toBe("MVP d'abord");
    expect(named.initials).toBe("MD"); // 1ʳᵉ lettre des 2 premiers mots (MVP, d'abord)
    expect(named.typeLabel).toBe("principe");
    expect(named.placeholder).toBe(false);
  });

  it("buildEntityVignette : descripteur null (défensif) = placeholder générique « Nouvel élément »", () => {
    const ent = buildEntityVignette(null);
    expect(ent.name).toBe("Nouvel élément");
    expect(ent.typeLabel).toBe("élément");
    expect(ent.placeholder).toBe(true);
  });
});
