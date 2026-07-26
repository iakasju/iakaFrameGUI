import { describe, it, expect } from "vitest";
import { CATALOG_PRINCIPLES } from "@iakaframe/core";
import { vignetteGradient } from "./casting";
import {
  buildPrincipleCard,
  buildPrincipleReservoir,
  clonePrincipleCatalog,
  principleTint,
  principleToAuthoredEntity,
  PRINCIPLE_BLANK_ENTITY,
} from "./principleCards";

describe("principleCards — projection pure du pool principe (Lot 1, § 4.3)", () => {
  it("buildPrincipleReservoir : une fiche par principe du catalogue canonique, ordre conservé", () => {
    const cards = buildPrincipleReservoir(clonePrincipleCatalog());
    expect(cards.length).toBe(CATALOG_PRINCIPLES.length);
    expect(cards.map((c) => c.id)).toEqual(CATALOG_PRINCIPLES.map((p) => p.id));
  });

  it("buildPrincipleCard : libellé, politique (résumé), déclencheur (puce méta), id (ref) — que du déclaré", () => {
    const mvp = CATALOG_PRINCIPLES.find((p) => p.id === "mvp-first")!;
    const card = buildPrincipleCard(mvp);
    expect(card.name).toBe(mvp.label);
    expect(card.ref).toBe(mvp.id);
    expect(card.summary).toBe(mvp.policy);
    // Le déclencheur devient une puce méta (jamais un rôle/royaume fabriqué).
    expect(card.chips).toHaveLength(1);
    expect(card.chips[0].kind).toBe("meta");
    expect(card.chips[0].text).toContain(mvp.trigger);
    // Un principe n'a pas de rôle ni de royaume → champs null (honnêteté).
    expect(card.roleLabel).toBeNull();
    expect(card.royaume).toBeNull();
    expect(card.pastille).toBeNull();
  });

  it("principleTint : teinte DÉTERMINISTE dérivée de l'id (couleur, pas rôle), bornée 0..8", () => {
    const t = principleTint("mvp-first");
    expect(t).toBe(principleTint("mvp-first")); // stable
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThanOrEqual(8);
    const card = buildPrincipleCard(CATALOG_PRINCIPLES.find((p) => p.id === "mvp-first")!);
    expect(card.gradient).toEqual(vignetteGradient(t));
  });

  it("principleToAuthoredEntity : entité générique de type `principle` (jamais `persona`)", () => {
    const p = CATALOG_PRINCIPLES[0];
    const ent = principleToAuthoredEntity(p);
    expect(ent.type).toBe("principle");
    expect(ent.typeLabel).toBe("principe");
    expect(ent.newLabel).toBe("Nouveau principe");
    expect(ent.name).toBe(p.label);
    expect(ent.key).toBeNull();
  });

  it("PRINCIPLE_BLANK_ENTITY : descripteur de création vierge (name vide → placeholder genré)", () => {
    expect(PRINCIPLE_BLANK_ENTITY.name).toBe("");
    expect(PRINCIPLE_BLANK_ENTITY.newLabel).toBe("Nouveau principe");
    expect(PRINCIPLE_BLANK_ENTITY.type).toBe("principle");
  });

  it("clonePrincipleCatalog : copie éditable (mutation locale n'altère pas le catalogue vendoré)", () => {
    const copy = clonePrincipleCatalog();
    copy[0].label = "MUTÉ EN SESSION";
    expect(CATALOG_PRINCIPLES[0].label).not.toBe("MUTÉ EN SESSION");
  });
});
