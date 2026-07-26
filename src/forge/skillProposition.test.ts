/**
 * skillProposition.test.ts — parseur + résolveur du pool **skill** (brique B). Champs éditables
 * `description/subskills` (subskills filtrés au catalogue) ; C-1 / différé : `id`, `name`, corps jamais lus.
 */
import { describe, it, expect } from "vitest";
import { CATALOG_SKILLS } from "@iakaframe/core";
import { fakeLlm } from "./llm/transport";
import { resolveSkillProposition, parseSkillProposition } from "./skillProposition";
import type { FeanorContext } from "./llm/advise";

const ctx: FeanorContext = { mode: "edit", entityType: "skill", entityName: "x", entityRole: null };
const A_REAL_SUBSKILL = CATALOG_SKILLS[0].id;

describe("parseSkillProposition — champs éditables + filtre catalogue + C-1", () => {
  it("retient description + subskills filtrés au catalogue (id halluciné écarté)", () => {
    const p = parseSkillProposition(
      `{"description":"Audite la sécurité","subskills":["${A_REAL_SUBSKILL}","INVENTE"]}`,
    );
    expect(p).toEqual({ description: "Audite la sécurité", subskills: [A_REAL_SUBSKILL] });
  });
  it("C-1 / différé : `id`, `name`, corps jamais lus", () => {
    const p = parseSkillProposition('{"description":"d","id":"HACK","name":"HACK","body":"corps"}');
    expect(p).toEqual({ description: "d" });
    expect(p).not.toHaveProperty("name");
  });
  it("subskills tous hallucinés → omis ; null si aucun champ retenu", () => {
    expect(parseSkillProposition('{"description":"d","subskills":["FAUX"]}')).toEqual({ description: "d" });
    expect(parseSkillProposition('{"subskills":["FAUX"]}')).toBeNull();
  });
});

describe("resolveSkillProposition — live nominal (offline)", () => {
  it("live → champs structurés, source live", async () => {
    const r = await resolveSkillProposition("propose une skill", ctx, {
      llm: fakeLlm(`{"description":"Audite","subskills":["${A_REAL_SUBSKILL}"]}`),
      model: "ollama:llama3",
    });
    expect(r.source).toBe("live");
    expect(r.proposition).toEqual({ description: "Audite", subskills: [A_REAL_SUBSKILL] });
  });
});
