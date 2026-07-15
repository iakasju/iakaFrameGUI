import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parseKitMd,
  serializeKitMd,
  type KitMd,
} from "../src/frontmatter";
import goldenKit from "./fixtures/kit.iakaframe-claude.md?raw";

const k: KitMd = {
  id: "iakaframe-claude",
  methodId: "iakaframe",
  teamId: "iakaframe-8",
  bindingId: "iakaframe-claude-default",
  node: "claude",
  emits: [".claude/agents/*", ".claude/skills/*", ".claude/hooks/*", "CLAUDE.md"],
};

describe("kitMd — (dé)sérialisation frontmatter (§3.12)", () => {
  it("round-trip : parseKitMd(serializeKitMd(k)) ≡ k", () => {
    expect(parseKitMd(serializeKitMd(k))).toEqual(k);
  });

  it("bindingId/emits absents → omis (kit minimal)", () => {
    const min: KitMd = {
      id: "min",
      methodId: "iakaframe",
      teamId: "iakaframe-8",
      node: "claude",
    };
    const md = serializeKitMd(min);
    expect(md).not.toContain("bindingId");
    expect(md).not.toContain("emits");
    expect(parseKitMd(md)).toEqual(min);
  });

  it("byte-parité : reproduit exactement la golden fixture (emits quotés)", () => {
    const { body } = parseFrontmatter(goldenKit);
    const parsed = parseKitMd(goldenKit)!;
    expect(serializeKitMd(parsed, body)).toBe(goldenKit);
  });

  it("parse défensif : sans id/methodId/teamId → null", () => {
    expect(parseKitMd("---\nid: k\nteamId: t\n---\n")).toBeNull();
    expect(parseKitMd("---\nid: k\nmethodId: m\n---\n")).toBeNull();
    expect(parseKitMd(null)).toBeNull();
  });
});
