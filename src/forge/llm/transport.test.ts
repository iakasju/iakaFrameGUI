import { describe, it, expect } from "vitest";
import type { LlmRequest } from "@iakaframe/core";
import { fakeLlm, realLlm } from "./transport";

const req: LlmRequest = {
  provider: "ollama",
  model: "qwen2.5-coder",
  host: "http://localhost:11434",
  system: "sys",
  user: "usr",
  timeoutMs: 20000,
};

describe("transport — fakeLlm (zéro réseau) + realLlm (façade unique)", () => {
  it("fakeLlm(chaîne) résout la complétion scriptée et enregistre la requête", async () => {
    const t = fakeLlm('{"ok":true}');
    await expect(t.complete(req)).resolves.toBe('{"ok":true}');
    expect(t.calls).toHaveLength(1);
    expect(t.calls[0]).toEqual(req);
  });

  it("fakeLlm(Error) rejette (simule réseau KO / timeout / provider indispo)", async () => {
    const t = fakeLlm(new Error("boom réseau"));
    await expect(t.complete(req)).rejects.toThrow("boom réseau");
  });

  it("fakeLlm(fonction) permet un scénario dépendant de la requête", async () => {
    const t = fakeLlm((r) => (r.model === "qwen2.5-coder" ? '{"a":1}' : new Error("no")));
    await expect(t.complete(req)).resolves.toBe('{"a":1}');
  });

  it("realLlm délègue à backend.llmComplete (SEULE voie réseau, façade C-8)", async () => {
    let received: unknown = null;
    const t = realLlm({
      async llmComplete(args) {
        received = args;
        return '{"from":"backend"}';
      },
    });
    await expect(t.complete(req)).resolves.toBe('{"from":"backend"}');
    expect(received).toEqual({
      provider: "ollama",
      model: "qwen2.5-coder",
      host: "http://localhost:11434",
      system: "sys",
      user: "usr",
      timeoutMs: 20000,
    });
  });

  it("realLlm propage tel quel le rejet du backend (le résolveur le traduit en repli)", async () => {
    const t = realLlm({
      async llmComplete() {
        throw new Error("backend indisponible");
      },
    });
    await expect(t.complete(req)).rejects.toThrow("backend indisponible");
  });
});
