/**
 * mappers — fidélité du pont types riches ↔ records `.md`. Ciblé sur les champs qui **se perdaient
 * en silence** au round-trip (défauts 2+3, doctrine `GUI ← frame`) : ici `emits` du kit, qui doit
 * survivre `mdToKit` → `kitToMd` (sinon le round-trip kit ne peut être byte-identique — cf. AC-2).
 */
import { describe, it, expect } from "vitest";
import { parseKitMd, type KitMd } from "@iakaframe/core";
import { kitToMd, mdToKit } from "./mappers";

describe("mappers — préservation des champs frontmatter au round-trip", () => {
  it("emits survit mdToKit → kitToMd (transport, byte-parité kit)", () => {
    const md: KitMd = {
      id: "iakaframe-claude",
      methodId: "iakaframe",
      teamId: "iakaframe-8",
      bindingId: "iakaframe-claude-default",
      node: "claude",
      emits: [".claude/agents/*", ".claude/skills/*", ".claude/hooks/*", "CLAUDE.md"],
    };
    const kit = mdToKit(md);
    expect(kit.emits).toEqual(md.emits);
    expect(kitToMd(kit).emits).toEqual(md.emits);
  });

  it("emits absent → omis (kit sans emits, non régressif)", () => {
    const md = parseKitMd("---\nid: k\nmethodId: m\nteamId: t\nnode: claude\n---\n")!;
    expect(md.emits).toBeUndefined();
    const kit = mdToKit(md);
    expect(kit.emits).toBeUndefined();
    expect("emits" in kitToMd(kit)).toBe(false);
  });
});
