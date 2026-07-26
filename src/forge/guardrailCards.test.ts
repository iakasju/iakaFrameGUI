import { describe, it, expect } from "vitest";
import { CATALOG_GUARDRAILS } from "@iakaframe/core";
import { vignetteGradient } from "./casting";
import {
  buildGuardrailCard,
  buildGuardrailReservoir,
  cloneGuardrailCatalog,
  guardrailTint,
  guardrailToAuthoredEntity,
  GUARDRAIL_BLANK_ENTITY,
} from "./guardrailCards";

describe("guardrailCards — projection pure du pool garde-fou (Lot 2)", () => {
  it("buildGuardrailReservoir : une fiche par garde-fou du catalogue canonique, ordre conservé", () => {
    const cards = buildGuardrailReservoir(cloneGuardrailCatalog());
    expect(cards.length).toBe(CATALOG_GUARDRAILS.length);
    expect(cards.map((c) => c.id)).toEqual(CATALOG_GUARDRAILS.map((g) => g.id));
  });

  it("buildGuardrailCard : libellé, id (ref), nature + portée + rendus en puces méta", () => {
    const g = CATALOG_GUARDRAILS.find((x) => x.id === "identity-guard")!;
    const card = buildGuardrailCard(g);
    expect(card.name).toBe(g.label);
    expect(card.ref).toBe(g.id);
    expect(card.chips.every((c) => c.kind === "meta")).toBe(true);
    expect(card.chips.some((c) => c.text.includes(g.kind))).toBe(true);
    expect(card.chips.some((c) => c.text.includes(g.scope))).toBe(true);
    // identity-guard porte hook + prose → puce de rendus.
    expect(card.chips.some((c) => c.text.includes("hook"))).toBe(true);
    expect(card.roleLabel).toBeNull();
    expect(card.royaume).toBeNull();
  });

  it("guardrailTint : teinte castée par la nature réelle (déterministe, bornée)", () => {
    expect(guardrailTint("identity")).toBe(2);
    expect(guardrailTint("perimeter")).toBe(3);
    const g = CATALOG_GUARDRAILS[0];
    expect(buildGuardrailCard(g).gradient).toEqual(vignetteGradient(guardrailTint(g.kind)));
  });

  it("guardrailToAuthoredEntity : entité générique de type `guardrail`, key = kind", () => {
    const g = CATALOG_GUARDRAILS[0];
    const ent = guardrailToAuthoredEntity(g);
    expect(ent.type).toBe("guardrail");
    expect(ent.typeLabel).toBe("garde-fou");
    expect(ent.newLabel).toBe("Nouveau garde-fou");
    expect(ent.name).toBe(g.label);
    expect(ent.key).toBe(g.kind);
  });

  it("GUARDRAIL_BLANK_ENTITY : descripteur de création vierge (name vide → placeholder genré)", () => {
    expect(GUARDRAIL_BLANK_ENTITY.name).toBe("");
    expect(GUARDRAIL_BLANK_ENTITY.newLabel).toBe("Nouveau garde-fou");
    expect(GUARDRAIL_BLANK_ENTITY.type).toBe("guardrail");
  });

  it("cloneGuardrailCatalog : copie profonde éditable (mutation du rendering n'altère pas le catalogue)", () => {
    const copy = cloneGuardrailCatalog();
    if (copy[0].rendering.hook) copy[0].rendering.hook.script = "MUTÉ.mjs";
    expect(CATALOG_GUARDRAILS[0].rendering.hook?.script).not.toBe("MUTÉ.mjs");
  });
});
