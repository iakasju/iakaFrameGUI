import { describe, it, expect } from "vitest";
import {
  RUNNER_KINDS,
  RUNNER_ALIASES,
  DEPRECATED_RUNNER_ALIASES,
  LEGACY_RUNNER_LAUNCHERS,
  isRunnerKind,
  parseRunnerKind,
} from "../src/runner";

describe("RunnerKind — enum canonique (AR-2)", () => {
  it("est exactement claude-code | ollama | litellm | codex, dans l'ordre", () => {
    expect(RUNNER_KINDS).toEqual(["claude-code", "ollama", "litellm", "codex"]);
  });

  it("isRunnerKind reconnaît les canoniques (insensible à la casse), rejette le reste", () => {
    expect(isRunnerKind("claude-code")).toBe(true);
    expect(isRunnerKind("CODEX")).toBe(true);
    expect(isRunnerKind("ps")).toBe(false);
    expect(isRunnerKind("aider")).toBe(false);
    expect(isRunnerKind(42)).toBe(false);
  });
});

describe("parseRunnerKind — alias legacy → canonique (Q-3)", () => {
  it("résout ps/iakaide → claude-code", () => {
    expect(parseRunnerKind("ps")).toBe("claude-code");
    expect(parseRunnerKind("iakaide")).toBe("claude-code");
  });

  it("laisse passer les valeurs canoniques", () => {
    expect(parseRunnerKind("claude-code")).toBe("claude-code");
    expect(parseRunnerKind("ollama")).toBe("ollama");
    expect(parseRunnerKind("codex")).toBe("codex");
  });

  it("renvoie null pour un launcher legacy (aider) et pour l'inconnu", () => {
    expect(parseRunnerKind("aider")).toBeNull();
    expect(parseRunnerKind("xxx")).toBeNull();
    expect(parseRunnerKind(null)).toBeNull();
  });

  it("ps et iakaide sont marqués dépréciés ; aider est un launcher legacy hors enum", () => {
    expect(DEPRECATED_RUNNER_ALIASES).toEqual(["ps", "iakaide"]);
    expect(LEGACY_RUNNER_LAUNCHERS).toEqual(["aider"]);
    expect(RUNNER_KINDS).not.toContain("aider");
  });

  it("la table d'alias couvre toutes les valeurs canoniques (fidélité)", () => {
    for (const k of RUNNER_KINDS) expect(RUNNER_ALIASES[k]).toBe(k);
  });
});
