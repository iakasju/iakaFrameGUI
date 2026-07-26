/**
 * principleProposition.test.ts — parseur + résolveur du pool **principe** (brique B). La mécanique
 * live/repli commune est prouvée par `elementProposition.test.ts` ; ici : les champs éditables
 * (`label/policy/trigger`) et C-1 (`id` jamais lu).
 */
import { describe, it, expect } from "vitest";
import { fakeLlm } from "./llm/transport";
import { resolvePrincipleProposition, parsePrincipleProposition } from "./principleProposition";
import type { FeanorContext } from "./llm/advise";

const ctx: FeanorContext = { mode: "create", entityType: "principle", entityName: null, entityRole: null };

describe("parsePrincipleProposition — champs éditables + C-1", () => {
  it("retient label/policy/trigger validés", () => {
    expect(
      parsePrincipleProposition('{"label":"Qualité","policy":"tester avant de clore","trigger":"à chaque tâche"}'),
    ).toEqual({ label: "Qualité", policy: "tester avant de clore", trigger: "à chaque tâche" });
  });
  it("C-1 : `id` jamais lu (ignoré même si présent)", () => {
    expect(parsePrincipleProposition('{"label":"L","id":"HACK"}')).toEqual({ label: "L" });
    expect(parsePrincipleProposition('{"label":"L","id":"HACK"}')).not.toHaveProperty("id");
  });
  it("null sur non-JSON, objet vide, ou aucun champ retenu", () => {
    expect(parsePrincipleProposition("pas json")).toBeNull();
    expect(parsePrincipleProposition("{}")).toBeNull();
    expect(parsePrincipleProposition('{"id":"x","autre":1}')).toBeNull();
  });
});

describe("resolvePrincipleProposition — live nominal (offline)", () => {
  it("live → champs structurés, source live", async () => {
    const r = await resolvePrincipleProposition("propose un principe qualité", ctx, {
      llm: fakeLlm('{"label":"Qualité","policy":"p","trigger":"t"}'),
      model: "ollama:llama3",
    });
    expect(r.source).toBe("live");
    expect(r.proposition).toEqual({ label: "Qualité", policy: "p", trigger: "t" });
  });
});
