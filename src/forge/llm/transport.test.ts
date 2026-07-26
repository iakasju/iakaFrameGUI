import { describe, it, expect } from "vitest";
import type { LlmRequest } from "@iakaframe/core";
import type { LlmStreamChunk } from "../../api/backend";
import { fakeLlm, realLlm, realStreamLlm, fakeStreamLlm } from "./transport";

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

describe("transport STREAMING — fakeStreamLlm (zéro réseau) + realStreamLlm (façade unique)", () => {
  it("fakeStreamLlm rejoue les chunks, relaie chaque token et rend le texte accumulé sur `done`", async () => {
    const seen: LlmStreamChunk[] = [];
    const t = fakeStreamLlm([
      { kind: "token", text: "Bon" },
      { kind: "token", text: "jour" },
      { kind: "done" },
    ]);
    await expect(t.stream(req, (c) => seen.push(c))).resolves.toBe("Bonjour");
    expect(t.calls).toHaveLength(1);
    expect(seen).toEqual([
      { kind: "token", text: "Bon" },
      { kind: "token", text: "jour" },
      { kind: "done" },
    ]);
  });

  it("fakeStreamLlm REJETTE sur chunk `error` (le partiel n'est jamais passé pour complet)", async () => {
    const seen: LlmStreamChunk[] = [];
    const t = fakeStreamLlm([
      { kind: "token", text: "moitié" },
      { kind: "error", message: "flux interrompu" },
    ]);
    await expect(t.stream(req, (c) => seen.push(c))).rejects.toThrow("flux interrompu");
    // Le token partiel a bien été relayé à l'UI (mais la promesse rejette → repli).
    expect(seen).toContainEqual({ kind: "token", text: "moitié" });
  });

  it("fakeStreamLlm REJETTE si le flux se clôt sans `done` (interrompu)", async () => {
    const t = fakeStreamLlm([{ kind: "token", text: "x" }]);
    await expect(t.stream(req, () => {})).rejects.toThrow("interrompu avant la fin");
  });

  it("fakeStreamLlm(Error) rejette d'emblée + émet un aveu, aucun token fabriqué", async () => {
    const seen: LlmStreamChunk[] = [];
    const t = fakeStreamLlm(new Error("hote refuse"));
    await expect(t.stream(req, (c) => seen.push(c))).rejects.toThrow("hote refuse");
    expect(seen).toEqual([{ kind: "error", message: "hote refuse" }]);
  });

  it("realStreamLlm délègue à backend.llmCompleteStream (SEULE voie de streaming, façade C-8)", async () => {
    let received: unknown = null;
    const t = realStreamLlm({
      async llmCompleteStream(args, onEvent) {
        received = args;
        onEvent({ kind: "token", text: "Sa" });
        onEvent({ kind: "token", text: "lut" });
        onEvent({ kind: "done" });
      },
    });
    const seen: LlmStreamChunk[] = [];
    await expect(t.stream(req, (c) => seen.push(c))).resolves.toBe("Salut");
    expect(received).toMatchObject({ provider: "ollama", model: "qwen2.5-coder" });
    expect(seen[seen.length - 1]).toEqual({ kind: "done" });
  });

  it("realStreamLlm : rejet de la commande sans chunk `error` → fabrique l'aveu + rejette (jamais une stack muette)", async () => {
    const seen: LlmStreamChunk[] = [];
    const t = realStreamLlm({
      async llmCompleteStream() {
        throw new Error("backend indisponible");
      },
    });
    await expect(t.stream(req, (c) => seen.push(c))).rejects.toThrow("backend indisponible");
    expect(seen).toContainEqual({ kind: "error", message: "backend indisponible" });
  });
});
