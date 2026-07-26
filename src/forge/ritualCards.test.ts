import { describe, it, expect } from "vitest";
import { CATALOG_RITUALS } from "@iakaframe/core";
import { vignetteGradient } from "./casting";
import {
  buildRitualCard,
  buildRitualReservoir,
  cloneRitualCatalog,
  ritualTint,
  ritualToAuthoredEntity,
  RITUAL_BLANK_ENTITY,
} from "./ritualCards";

describe("ritualCards — projection pure du pool rituel (Lot 2)", () => {
  it("buildRitualReservoir : une fiche par rituel du catalogue canonique, ordre conservé", () => {
    const cards = buildRitualReservoir(cloneRitualCatalog());
    expect(cards.length).toBe(CATALOG_RITUALS.length);
    expect(cards.map((c) => c.id)).toEqual(CATALOG_RITUALS.map((r) => r.id));
  });

  it("buildRitualCard : libellé, id (ref), déclencheurs (puces méta), tranche en résumé", () => {
    const init = CATALOG_RITUALS.find((r) => r.id === "init")!;
    const card = buildRitualCard(init);
    expect(card.name).toBe(init.label);
    expect(card.ref).toBe(init.id);
    expect(card.summary).toContain(init.side);
    // Chaque déclencheur devient une puce méta (jamais un rôle/royaume fabriqué).
    expect(card.chips.length).toBe(init.triggers.length);
    expect(card.chips.every((c) => c.kind === "meta")).toBe(true);
    expect(card.chips[0].text).toContain(init.triggers[0]);
    expect(card.roleLabel).toBeNull();
    expect(card.royaume).toBeNull();
  });

  it("ritualTint : teinte castée par la tranche réelle (forge → 8 flamme, cockpit → 1 vert)", () => {
    expect(ritualTint("forge")).toBe(8);
    expect(ritualTint("cockpit")).toBe(1);
    const init = CATALOG_RITUALS.find((r) => r.id === "init")!; // forge
    expect(buildRitualCard(init).gradient).toEqual(vignetteGradient(ritualTint(init.side)));
  });

  it("ritualToAuthoredEntity : entité générique de type `ritual`, key = side", () => {
    const r = CATALOG_RITUALS[0];
    const ent = ritualToAuthoredEntity(r);
    expect(ent.type).toBe("ritual");
    expect(ent.typeLabel).toBe("rituel");
    expect(ent.newLabel).toBe("Nouveau rituel");
    expect(ent.name).toBe(r.label);
    expect(ent.key).toBe(r.side);
  });

  it("RITUAL_BLANK_ENTITY : descripteur de création vierge (name vide → placeholder genré)", () => {
    expect(RITUAL_BLANK_ENTITY.name).toBe("");
    expect(RITUAL_BLANK_ENTITY.newLabel).toBe("Nouveau rituel");
    expect(RITUAL_BLANK_ENTITY.type).toBe("ritual");
  });

  it("cloneRitualCatalog : copie profonde éditable (mutation d'un tableau n'altère pas le catalogue)", () => {
    const copy = cloneRitualCatalog();
    copy[0].triggers.push("MUTÉ");
    expect(CATALOG_RITUALS[0].triggers).not.toContain("MUTÉ");
  });
});
