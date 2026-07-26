/**
 * guardrailProposition.test.ts — parseur + résolveur du pool **garde-fou** (brique B). Champs
 * éditables `label/policy` ; C-1 / load-bearing : `id`, `kind`, `hook` jamais lus.
 */
import { describe, it, expect } from "vitest";
import { fakeLlm } from "./llm/transport";
import { resolveGuardrailProposition, parseGuardrailProposition } from "./guardrailProposition";
import type { FeanorContext } from "./llm/advise";

const ctx: FeanorContext = { mode: "edit", entityType: "guardrail", entityName: "x", entityRole: null };

describe("parseGuardrailProposition — champs éditables + verrous load-bearing", () => {
  it("retient label/policy", () => {
    expect(parseGuardrailProposition('{"label":"Identité","policy":"badge à chaque prise de parole"}')).toEqual(
      { label: "Identité", policy: "badge à chaque prise de parole" },
    );
  });
  it("C-1 / load-bearing : `id`, `kind`, `hook` jamais lus", () => {
    const p = parseGuardrailProposition('{"label":"L","id":"HACK","kind":"identity","hook":"Stop"}');
    expect(p).toEqual({ label: "L" });
    expect(p).not.toHaveProperty("kind");
    expect(p).not.toHaveProperty("hook");
  });
  it("null sur objet sans champ retenu", () => {
    expect(parseGuardrailProposition('{"kind":"identity"}')).toBeNull();
  });
});

describe("resolveGuardrailProposition — live nominal (offline)", () => {
  it("live → champs structurés, source live", async () => {
    const r = await resolveGuardrailProposition("propose une garde d'identité", ctx, {
      llm: fakeLlm('{"label":"Identité","policy":"p"}'),
      model: "ollama:llama3",
    });
    expect(r.source).toBe("live");
    expect(r.proposition).toEqual({ label: "Identité", policy: "p" });
  });
});
