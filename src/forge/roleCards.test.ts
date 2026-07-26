import { describe, it, expect } from "vitest";
import { CANONICAL_ROLES } from "@iakaframe/core";
import { vignetteGradient } from "./casting";
import {
  buildRoleCard,
  buildRoleReservoir,
  cloneRoleCatalog,
  roleToAuthoredEntity,
  ROLE_BLANK_ENTITY,
} from "./roleCards";

describe("roleCards — projection pure du pool rôle (Lot 2)", () => {
  it("buildRoleReservoir : une fiche par rôle canonique, ordre roleIndex conservé, id = key", () => {
    const cards = buildRoleReservoir(cloneRoleCatalog());
    expect(cards.length).toBe(CANONICAL_ROLES.length);
    // La clé stable d'un rôle est `key` → l'id de fiche est la key (pas un `id`).
    expect(cards.map((c) => c.id)).toEqual(CANONICAL_ROLES.map((r) => r.key));
  });

  it("buildRoleCard : libellé, key (ref), teinte castée par le roleIndex réel, index en puce méta", () => {
    const r = CANONICAL_ROLES.find((x) => x.key === "cadrage")!;
    const card = buildRoleCard(r);
    expect(card.name).toBe(r.label);
    expect(card.ref).toBe(r.key);
    expect(card.gradient).toEqual(vignetteGradient(r.roleIndex));
    expect(card.roleIndex).toBe(r.roleIndex);
    expect(card.chips[0].kind).toBe("meta");
    expect(card.chips[0].text).toContain(String(r.roleIndex));
    expect(card.royaume).toBeNull();
  });

  it("roleToAuthoredEntity : entité générique de type `role`, roleIndex = index canon", () => {
    const r = CANONICAL_ROLES[2];
    const ent = roleToAuthoredEntity(r);
    expect(ent.type).toBe("role");
    expect(ent.typeLabel).toBe("rôle");
    expect(ent.newLabel).toBe("Nouveau rôle");
    expect(ent.name).toBe(r.label);
    expect(ent.roleIndex).toBe(r.roleIndex);
  });

  it("ROLE_BLANK_ENTITY : descripteur de création vierge (name vide → placeholder genré)", () => {
    expect(ROLE_BLANK_ENTITY.name).toBe("");
    expect(ROLE_BLANK_ENTITY.newLabel).toBe("Nouveau rôle");
    expect(ROLE_BLANK_ENTITY.type).toBe("role");
  });

  it("cloneRoleCatalog : copie éditable (mutation locale n'altère pas la liste vendorée)", () => {
    const copy = cloneRoleCatalog();
    copy[0].label = "MUTÉ EN SESSION";
    expect(CANONICAL_ROLES[0].label).not.toBe("MUTÉ EN SESSION");
  });
});
