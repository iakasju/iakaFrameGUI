/**
 * ritualProposition.test.ts — parseur + résolveur du pool **rituel** (brique B). Champs éditables
 * `label/side/triggers/actions` ; `side` validé à l'énum (`forge`|`cockpit`) ; C-1 : `id` jamais lu.
 */
import { describe, it, expect } from "vitest";
import { fakeLlm } from "./llm/transport";
import { resolveRitualProposition, parseRitualProposition } from "./ritualProposition";
import type { FeanorContext } from "./llm/advise";

const ctx: FeanorContext = { mode: "create", entityType: "ritual", entityName: null, entityRole: null };

describe("parseRitualProposition — champs éditables + énum + C-1", () => {
  it("retient label/side/triggers/actions", () => {
    expect(
      parseRitualProposition(
        '{"label":"Bootstrap","side":"forge","triggers":["iakastart","odin"],"actions":["banner","roster"]}',
      ),
    ).toEqual({
      label: "Bootstrap",
      side: "forge",
      triggers: ["iakastart", "odin"],
      actions: ["banner", "roster"],
    });
  });
  it("side non canonique → écarté (jamais une tranche inventée)", () => {
    expect(parseRitualProposition('{"label":"L","side":"licorne"}')).toEqual({ label: "L" });
    expect(parseRitualProposition('{"label":"L","side":"cockpit"}')).toEqual({ label: "L", side: "cockpit" });
  });
  it("triggers/actions vides ou non-tableau → omis", () => {
    expect(parseRitualProposition('{"label":"L","triggers":[],"actions":"pas un tableau"}')).toEqual({ label: "L" });
  });
  it("C-1 : `id` jamais lu ; null si aucun champ retenu", () => {
    expect(parseRitualProposition('{"id":"HACK"}')).toBeNull();
  });
});

describe("resolveRitualProposition — live nominal (offline)", () => {
  it("live → champs structurés, source live", async () => {
    const r = await resolveRitualProposition("propose un rituel de forge", ctx, {
      llm: fakeLlm('{"label":"Bootstrap","side":"forge","triggers":["x"],"actions":["y"]}'),
      model: "ollama:llama3",
    });
    expect(r.source).toBe("live");
    expect(r.proposition).toEqual({
      label: "Bootstrap",
      side: "forge",
      triggers: ["x"],
      actions: ["y"],
    });
  });
});
