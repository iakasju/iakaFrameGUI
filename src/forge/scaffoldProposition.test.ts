/**
 * scaffoldProposition.test.ts — parseur + résolveur du pool **scaffold** (brique B). Champs éditables
 * `level` (énum) + `entries[]` (`{path, role, createIfAbsent}`) ; C-1 / invariant : `id`,
 * `nonDestructive` jamais lus.
 */
import { describe, it, expect } from "vitest";
import { fakeLlm } from "./llm/transport";
import { resolveScaffoldProposition, parseScaffoldProposition } from "./scaffoldProposition";
import type { FeanorContext } from "./llm/advise";

const ctx: FeanorContext = { mode: "create", entityType: "scaffold", entityName: null, entityRole: null };

describe("parseScaffoldProposition — champs éditables + énum + entries + C-1", () => {
  it("retient level canonique + entries (path requis, createIfAbsent défaut true)", () => {
    expect(
      parseScaffoldProposition(
        '{"level":"portfolio","entries":[{"path":"specs/","role":"cadrage"},{"path":"docker/","role":"iso","createIfAbsent":false}]}',
      ),
    ).toEqual({
      level: "portfolio",
      entries: [
        { path: "specs/", role: "cadrage", createIfAbsent: true },
        { path: "docker/", role: "iso", createIfAbsent: false },
      ],
    });
  });
  it("level non canonique → écarté ; entrée sans path → ignorée", () => {
    expect(parseScaffoldProposition('{"level":"galaxie","entries":[{"role":"orphelin"}]}')).toBeNull();
  });
  it("C-1 / invariant : `id`, `nonDestructive` jamais lus", () => {
    const p = parseScaffoldProposition('{"level":"project","id":"HACK","nonDestructive":false}');
    expect(p).toEqual({ level: "project" });
    expect(p).not.toHaveProperty("id");
    expect(p).not.toHaveProperty("nonDestructive");
  });
});

describe("resolveScaffoldProposition — live nominal (offline)", () => {
  it("live → champs structurés, source live", async () => {
    const r = await resolveScaffoldProposition("propose un scaffold projet", ctx, {
      llm: fakeLlm('{"level":"project","entries":[{"path":"specs/","role":"cadrage"}]}'),
      model: "ollama:llama3",
    });
    expect(r.source).toBe("live");
    expect(r.proposition).toEqual({
      level: "project",
      entries: [{ path: "specs/", role: "cadrage", createIfAbsent: true }],
    });
  });
});
