import { describe, it, expect } from "vitest";
import { CATALOG_SKILLS, roleIndexOf, type SkillAtom } from "@iakaframe/core";
import { vignetteGradient } from "./casting";
import {
  buildSkillCard,
  buildSkillReservoir,
  cloneSkillCatalog,
  skillToAuthoredEntity,
  SKILL_BLANK_ENTITY,
} from "./skillCards";

const ATOM = (over: Partial<SkillAtom> = {}): SkillAtom => ({
  id: "iakaframe-cadrage",
  name: "iakaframe-cadrage",
  description: "Cadrer une feature avant tout code.",
  subskills: [],
  ...over,
});

describe("skillCards — projection pure depuis l'atome disque SkillAtom (Lot C)", () => {
  it("buildSkillReservoir : une fiche par atome, ordre conservé", () => {
    const atoms = [ATOM({ id: "a", name: "a" }), ATOM({ id: "b", name: "b" })];
    const cards = buildSkillReservoir(atoms);
    expect(cards.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("buildSkillCard : name, id (ref), description en résumé, subskills en puces", () => {
    const a = ATOM({ subskills: ["iakaframe-git", "iakaframe-jalon"] });
    const card = buildSkillCard(a);
    expect(card.name).toBe(a.name);
    expect(card.ref).toBe(a.id);
    expect(card.summary).toBe(a.description); // le blurb réel est le résumé
    // Les subskills réelles sont les puces (jamais fabriquées).
    expect(card.chips.map((c) => c.text)).toEqual(["iakaframe-git", "iakaframe-jalon"]);
    expect(card.chips.every((c) => c.kind === "sk")).toBe(true);
    expect(card.royaume).toBeNull();
    expect(card.pastille).toBeNull();
  });

  it("buildSkillCard : rôle d'affichage dérivé du catalogue par id (méta), teinte castée", () => {
    // iakaframe-cadrage EST au catalogue → roleLabel + teinte castées par son roleKey canon.
    const card = buildSkillCard(ATOM());
    const cat = CATALOG_SKILLS.find((s) => s.id === "iakaframe-cadrage")!;
    expect(card.gradient).toEqual(vignetteGradient(roleIndexOf(cat.roleKey)));
    expect(card.roleLabel).not.toBeNull();
  });

  it("buildSkillCard : skill hors-catalogue → roleLabel null, teinte neutre (jamais inventée)", () => {
    const card = buildSkillCard(ATOM({ id: "skill-inconnue", name: "skill-inconnue" }));
    expect(card.roleLabel).toBeNull();
    expect(card.gradient).toEqual(vignetteGradient(2)); // index neutre
  });

  it("buildSkillCard : skill atomique (aucune subskill) → puces vides + libellé muté", () => {
    const card = buildSkillCard(ATOM({ subskills: [] }));
    expect(card.chips).toEqual([]);
    expect(card.emptyChipsLabel).toContain("atomique");
  });

  it("skillToAuthoredEntity : entité de type `skill`, name de l'atome, key = rôle catalogue si connu", () => {
    const ent = skillToAuthoredEntity(ATOM());
    expect(ent.type).toBe("skill");
    expect(ent.typeLabel).toBe("skill");
    expect(ent.name).toBe("iakaframe-cadrage");
    expect(ent.key).not.toBeNull(); // cadrage est au catalogue
  });

  it("SKILL_BLANK_ENTITY : descripteur de création vierge (name vide)", () => {
    expect(SKILL_BLANK_ENTITY.name).toBe("");
    expect(SKILL_BLANK_ENTITY.newLabel).toBe("Nouvelle skill");
    expect(SKILL_BLANK_ENTITY.type).toBe("skill");
  });

  it("cloneSkillCatalog : repli d'atomes (name == id, description/subskills vides)", () => {
    const copy = cloneSkillCatalog();
    expect(copy.length).toBe(CATALOG_SKILLS.length);
    expect(copy[0].id).toBe(copy[0].name);
    expect(copy[0].description).toBe("");
    expect(copy[0].subskills).toEqual([]);
  });
});
