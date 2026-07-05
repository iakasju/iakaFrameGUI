import { describe, it, expect } from "vitest";
import {
  NODE_KINDS,
  KIT_FORMATS,
  isNodeKind,
  normalizeLegacyTarget,
  kitFormatForNode,
  contractFileForNode,
  kitNameForNode,
} from "../src/node";

describe("NodeKind — nœuds de 1er rang (AR-4)", () => {
  it("inclut ollama-localhost ET ollama-lan, distincts", () => {
    expect(NODE_KINDS).toEqual([
      "claude",
      "codex",
      "ollama-localhost",
      "ollama-lan",
    ]);
    expect(NODE_KINDS).toContain("ollama-localhost");
    expect(NODE_KINDS).toContain("ollama-lan");
  });

  it("isNodeKind reconnaît les canoniques, rejette le legacy ollama nu", () => {
    expect(isNodeKind("claude")).toBe(true);
    expect(isNodeKind("ollama-lan")).toBe(true);
    expect(isNodeKind("ollama")).toBe(false);
  });
});

describe("normalizeLegacyTarget — ollama → ollama-localhost (Q-2)", () => {
  it("normalise ollama nu vers ollama-localhost par défaut", () => {
    expect(normalizeLegacyTarget("ollama")).toBe("ollama-localhost");
  });

  it("conserve les valeurs déjà canoniques", () => {
    expect(normalizeLegacyTarget("claude")).toBe("claude");
    expect(normalizeLegacyTarget("codex")).toBe("codex");
    expect(normalizeLegacyTarget("ollama-lan")).toBe("ollama-lan");
    expect(normalizeLegacyTarget("ollama-localhost")).toBe("ollama-localhost");
  });

  it("renvoie null pour l'inconnu", () => {
    expect(normalizeLegacyTarget("foo")).toBeNull();
    expect(normalizeLegacyTarget(123)).toBeNull();
  });
});

describe("Format et nœud sont deux champs distincts (A-4)", () => {
  it("KitFormat = claude-md | agents-md", () => {
    expect(KIT_FORMATS).toEqual(["claude-md", "agents-md"]);
  });

  it("claude → claude-md → CLAUDE.md", () => {
    expect(kitFormatForNode("claude")).toBe("claude-md");
    expect(contractFileForNode("claude")).toBe("CLAUDE.md");
  });

  it("codex / ollama-localhost / ollama-lan → agents-md → AGENTS.md", () => {
    for (const n of ["codex", "ollama-localhost", "ollama-lan"] as const) {
      expect(kitFormatForNode(n)).toBe("agents-md");
      expect(contractFileForNode(n)).toBe("AGENTS.md");
    }
  });
});

describe("kitNameForNode — nom du dossier de kit par nœud", () => {
  it("mappe claude→kit-claude, codex→kit-codex, ollama-*→kit-ollama", () => {
    expect(kitNameForNode("claude")).toBe("kit-claude");
    expect(kitNameForNode("codex")).toBe("kit-codex");
    expect(kitNameForNode("ollama-localhost")).toBe("kit-ollama");
    expect(kitNameForNode("ollama-lan")).toBe("kit-ollama");
  });
});
