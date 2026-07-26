import { describe, it, expect } from "vitest";
import { CATALOG_SKILLS, roleIndexOf } from "@iakaframe/core";
import { vignetteGradient } from "./casting";
import {
  buildSkillCard,
  buildSkillReservoir,
  cloneSkillCatalog,
  skillToAuthoredEntity,
  SKILL_BLANK_ENTITY,
} from "./skillCards";

describe("skillCards — projection pure du pool skill (Lot 2)", () => {
  it("buildSkillReservoir : une fiche par skill du catalogue canonique, ordre conservé", () => {
    const cards = buildSkillReservoir(cloneSkillCatalog());
    expect(cards.length).toBe(CATALOG_SKILLS.length);
    expect(cards.map((c) => c.id)).toEqual(CATALOG_SKILLS.map((s) => s.id));
  });

  it("buildSkillCard : libellé, id (ref), rôle de rattachement (roleLabel) + teinte castée par le rôle réel", () => {
    const s = CATALOG_SKILLS.find((x) => x.id === "iakaframe-cadrage")!;
    const card = buildSkillCard(s);
    expect(card.name).toBe(s.label);
    expect(card.ref).toBe(s.id);
    // La skill se rattache à un rôle réel → teinte castée par le roleIndex canon.
    expect(card.gradient).toEqual(vignetteGradient(roleIndexOf(s.roleKey)));
    expect(card.roleLabel).not.toBeNull();
    // Le roleKey réel figure en puce méta (jamais un royaume/pastille fabriqué).
    expect(card.chips[0].kind).toBe("meta");
    expect(card.chips[0].text).toContain(s.roleKey);
    expect(card.royaume).toBeNull();
    expect(card.pastille).toBeNull();
  });

  it("skillToAuthoredEntity : entité générique de type `skill` (jamais `persona`), key = roleKey", () => {
    const s = CATALOG_SKILLS[0];
    const ent = skillToAuthoredEntity(s);
    expect(ent.type).toBe("skill");
    expect(ent.typeLabel).toBe("skill");
    expect(ent.newLabel).toBe("Nouvelle skill");
    expect(ent.name).toBe(s.label);
    expect(ent.key).toBe(s.roleKey);
  });

  it("SKILL_BLANK_ENTITY : descripteur de création vierge (name vide → placeholder genré)", () => {
    expect(SKILL_BLANK_ENTITY.name).toBe("");
    expect(SKILL_BLANK_ENTITY.newLabel).toBe("Nouvelle skill");
    expect(SKILL_BLANK_ENTITY.type).toBe("skill");
  });

  it("cloneSkillCatalog : copie éditable (mutation locale n'altère pas le catalogue vendoré)", () => {
    const copy = cloneSkillCatalog();
    copy[0].label = "MUTÉ EN SESSION";
    expect(CATALOG_SKILLS[0].label).not.toBe("MUTÉ EN SESSION");
  });
});
