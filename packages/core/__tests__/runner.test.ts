import { describe, it, expect } from "vitest";
import {
  RUNNER_KINDS,
  RUNNER_ALIASES,
  DEPRECATED_RUNNER_ALIASES,
  LEGACY_RUNNER_LAUNCHERS,
  isRunnerKind,
  parseRunnerKind,
} from "../src/runner";

describe("RunnerKind — enum canonique (modèle persona § 5.2/6.1)", () => {
  it("est exactement claude | chatgpt | ollama-local | ollama-distant | litellm, dans l'ordre", () => {
    expect(RUNNER_KINDS).toEqual([
      "claude",
      "chatgpt",
      "ollama-local",
      "ollama-distant",
      "litellm",
    ]);
  });

  it("litellm = runner de plein droit ; le runner OpenAI-compatible s'appelle chatgpt (pas openai)", () => {
    expect(RUNNER_KINDS).toContain("litellm");
    expect(RUNNER_KINDS).toContain("chatgpt");
    expect(RUNNER_KINDS).not.toContain("openai");
  });

  it("isRunnerKind reconnaît les canoniques (insensible à la casse), rejette les alias legacy et le reste", () => {
    expect(isRunnerKind("claude")).toBe(true);
    expect(isRunnerKind("CHATGPT")).toBe(true);
    expect(isRunnerKind("claude-code")).toBe(false); // alias legacy, pas canonique
    expect(isRunnerKind("codex")).toBe(false); // host, pas un runner canonique
    expect(isRunnerKind("ps")).toBe(false);
    expect(isRunnerKind("aider")).toBe(false);
    expect(isRunnerKind(42)).toBe(false);
  });
});

describe("parseRunnerKind — renommages + alias legacy → canonique (§ 6.1)", () => {
  it("résout les renommages legacy : claude-code→claude, ollama-localhost→ollama-local, ollama-lan→ollama-distant", () => {
    expect(parseRunnerKind("claude-code")).toBe("claude");
    expect(parseRunnerKind("ollama-localhost")).toBe("ollama-local");
    expect(parseRunnerKind("ollama-lan")).toBe("ollama-distant");
    expect(parseRunnerKind("ollama")).toBe("ollama-local"); // legacy indistinct → local
  });

  it("résout ps/iakaide → claude", () => {
    expect(parseRunnerKind("ps")).toBe("claude");
    expect(parseRunnerKind("iakaide")).toBe("claude");
  });

  it("laisse passer les valeurs canoniques", () => {
    expect(parseRunnerKind("claude")).toBe("claude");
    expect(parseRunnerKind("chatgpt")).toBe("chatgpt");
    expect(parseRunnerKind("ollama-distant")).toBe("ollama-distant");
    expect(parseRunnerKind("litellm")).toBe("litellm");
  });

  it("codex reste résolvable en alias legacy (host dans le modèle ; rétro-compat, aucun binding cassé)", () => {
    expect(parseRunnerKind("codex")).toBe("codex");
  });

  it("renvoie null pour un launcher legacy (aider) et pour l'inconnu", () => {
    expect(parseRunnerKind("aider")).toBeNull();
    expect(parseRunnerKind("openai")).toBeNull(); // 'openai' n'est PAS un runner (norme d'API)
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
