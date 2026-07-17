import { describe, it, expect } from "vitest";
import { parseBindingMd } from "../src";

// Reproduit le fichier réel `bindings/iakaframe-claude-default.md` de StefFrame2 (G2).
const SF2_BINDING = `---
id: iakaframe-claude-default
methodId: iakaframe
teamId: iakaframe-8
node: claude
origin: forge-default
assignments:
  - { personaId: odin,     runner: claude-code, model: "opus" }
  - { personaId: aragorn,  runner: claude-code, model: "opus" }
  - { personaId: helm,     runner: claude-code, model: "sonnet" }
---
# Binding iakaframe — défaut Claude Code
`;

describe("parseBindingMd (G2 — bindings à plat)", () => {
  it("parse le frontmatter d'un binding de frame (methodId, teamId, assignments)", () => {
    const b = parseBindingMd(SF2_BINDING);
    expect(b).not.toBeNull();
    expect(b!.id).toBe("iakaframe-claude-default");
    expect(b!.methodId).toBe("iakaframe");
    expect(b!.teamId).toBe("iakaframe-8");
    expect(b!.node).toBe("claude");
    expect(b!.origin).toBe("forge-default");
    expect(b!.assignments.map((a) => a.personaId)).toEqual(["odin", "aragorn", "helm"]);
    expect(b!.assignments[0]).toEqual({
      personaId: "odin",
      runner: "claude-code",
      model: "opus",
    });
  });

  it("null si id/methodId/teamId manquant (défensif) ; jamais d'exception", () => {
    expect(parseBindingMd("---\nmethodId: m\nteamId: t\n---\n")).toBeNull();
    expect(parseBindingMd("---\nid: b\nteamId: t\n---\n")).toBeNull();
    expect(parseBindingMd("---\nid: b\nmethodId: m\n---\n")).toBeNull();
    for (const bad of [undefined, null, "", "pas de frontmatter"]) {
      expect(() => parseBindingMd(bad)).not.toThrow();
      expect(parseBindingMd(bad)).toBeNull();
    }
  });

  it("assignments absent → [] ; repli node/origin par défaut", () => {
    const b = parseBindingMd("---\nid: b\nmethodId: m\nteamId: t\n---\n");
    expect(b!.assignments).toEqual([]);
    expect(b!.node).toBe("claude");
    expect(b!.origin).toBe("forge-default");
  });
});
