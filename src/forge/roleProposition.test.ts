/**
 * roleProposition.test.ts — parseur + résolveur du pool **rôle** (brique B). Champs éditables
 * `label/scope` ; C-1 : `key`, `id`, `roleIndex` jamais lus.
 */
import { describe, it, expect } from "vitest";
import { fakeLlm } from "./llm/transport";
import { resolveRoleProposition, parseRoleProposition } from "./roleProposition";
import type { FeanorContext } from "./llm/advise";

const ctx: FeanorContext = { mode: "create", entityType: "role", entityName: null, entityRole: null };

describe("parseRoleProposition — champs éditables + C-1", () => {
  it("retient label/scope", () => {
    expect(parseRoleProposition('{"label":"Coordination","scope":"team"}')).toEqual({
      label: "Coordination",
      scope: "team",
    });
  });
  it("C-1 : `key`, `id`, `roleIndex` jamais lus", () => {
    const p = parseRoleProposition('{"label":"L","key":"HACK","id":"HACK","roleIndex":99}');
    expect(p).toEqual({ label: "L" });
    expect(p).not.toHaveProperty("key");
    expect(p).not.toHaveProperty("roleIndex");
  });
  it("null sur objet sans champ retenu", () => {
    expect(parseRoleProposition('{"key":"x"}')).toBeNull();
  });
});

describe("resolveRoleProposition — live nominal (offline)", () => {
  it("live → champs structurés, source live", async () => {
    const r = await resolveRoleProposition("propose un rôle de coordination", ctx, {
      llm: fakeLlm('{"label":"Coordination","scope":"team"}'),
      model: "ollama:llama3",
    });
    expect(r.source).toBe("live");
    expect(r.proposition).toEqual({ label: "Coordination", scope: "team" });
  });
});
