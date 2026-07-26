import { describe, it, expect } from "vitest";
import { CATALOG_SCAFFOLDS } from "@iakaframe/core";
import { vignetteGradient } from "./casting";
import {
  buildScaffoldCard,
  buildScaffoldReservoir,
  cloneScaffoldCatalog,
  scaffoldTint,
  scaffoldToAuthoredEntity,
  SCAFFOLD_BLANK_ENTITY,
} from "./scaffoldCards";

describe("scaffoldCards — projection pure du pool scaffold (Lot 2)", () => {
  it("buildScaffoldReservoir : une fiche par scaffold du catalogue canonique, ordre conservé", () => {
    const cards = buildScaffoldReservoir(cloneScaffoldCatalog());
    expect(cards.length).toBe(CATALOG_SCAFFOLDS.length);
    expect(cards.map((c) => c.id)).toEqual(CATALOG_SCAFFOLDS.map((s) => s.id));
  });

  it("buildScaffoldCard : nom = id (pas de label), niveau + compte en résumé, entrées en puces méta", () => {
    const proj = CATALOG_SCAFFOLDS.find((s) => s.id === "project")!;
    const card = buildScaffoldCard(proj);
    // Un scaffold n'a pas de label → son nom affiché est son id.
    expect(card.name).toBe(proj.id);
    expect(card.ref).toBe(proj.id);
    expect(card.summary).toContain(proj.level);
    expect(card.chips.length).toBe(proj.entries.length);
    expect(card.chips.every((c) => c.kind === "meta")).toBe(true);
    expect(card.chips[0].text).toBe(proj.entries[0].path);
    expect(card.royaume).toBeNull();
  });

  it("scaffoldTint : teinte castée par le niveau réel (portfolio → 0, project → 2)", () => {
    expect(scaffoldTint("portfolio")).toBe(0);
    expect(scaffoldTint("project")).toBe(2);
    const proj = CATALOG_SCAFFOLDS.find((s) => s.id === "project")!;
    expect(buildScaffoldCard(proj).gradient).toEqual(vignetteGradient(scaffoldTint(proj.level)));
  });

  it("scaffoldToAuthoredEntity : entité générique de type `scaffold`, key = level, name = id", () => {
    const s = CATALOG_SCAFFOLDS[0];
    const ent = scaffoldToAuthoredEntity(s);
    expect(ent.type).toBe("scaffold");
    expect(ent.typeLabel).toBe("scaffold");
    expect(ent.newLabel).toBe("Nouveau scaffold");
    expect(ent.name).toBe(s.id);
    expect(ent.key).toBe(s.level);
  });

  it("SCAFFOLD_BLANK_ENTITY : descripteur de création vierge (name vide → placeholder genré)", () => {
    expect(SCAFFOLD_BLANK_ENTITY.name).toBe("");
    expect(SCAFFOLD_BLANK_ENTITY.newLabel).toBe("Nouveau scaffold");
    expect(SCAFFOLD_BLANK_ENTITY.type).toBe("scaffold");
  });

  it("cloneScaffoldCatalog : copie profonde éditable (mutation d'une entrée n'altère pas le catalogue)", () => {
    const copy = cloneScaffoldCatalog();
    copy[0].entries[0].path = "MUTÉ/";
    expect(CATALOG_SCAFFOLDS[0].entries[0].path).not.toBe("MUTÉ/");
  });
});
