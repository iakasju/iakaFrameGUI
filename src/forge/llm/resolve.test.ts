import { describe, it, expect } from "vitest";
import { RUNNER_KINDS } from "@iakaframe/core";
import {
  buildDiff,
  NO_AUTHORING_MODEL_HINT,
  propose,
  type CopiloteContext,
} from "../mock/copilote";
import { fakeLlm } from "./transport";
import {
  resolveProposition,
  FALLBACK_UNAVAILABLE,
  FALLBACK_UNREADABLE,
  FALLBACK_UNSUPPORTED,
  DEFAULT_AUTHORING_HOST,
} from "./resolve";

const methodeCtx: CopiloteContext = {
  surface: "methode",
  diffFile: "methode.md",
  present: {},
};

/** JSON live valide (ops sur des ids RÉELS du réservoir méthode). */
const liveRaw = JSON.stringify({
  intro: "Le modèle propose un principe qualité.",
  artefacts: [{ icon: "prin", tag: "PRIN", title: "Qualité", detail: "gate qualité" }],
  ops: [{ target: "method-principle", id: "qualite", label: "Qualité (live)" }],
});

describe("resolveProposition — orientation live / mock (CA offline via fakeLlm)", () => {
  // CA1 — Live nominal.
  it("CA1 live nominal → Proposition LIVE ; diff = buildDiff(ops, context) ; ops matérialisables", async () => {
    const ctx = { ...methodeCtx, model: "ollama:qwen2.5-coder" };
    const r = await resolveProposition("un rapport qualité", ctx, { llm: fakeLlm(liveRaw) });
    expect(r.source).toBe("live");
    expect(r.proposition.ops).toEqual([
      { target: "method-principle", id: "qualite", label: "Qualité (live)" },
    ]);
    expect(r.proposition.intro).toContain("principe qualité");
    // Diff recalculé par NOTRE code, jamais dicté par le LLM.
    expect(r.proposition.diff).toEqual(buildDiff(r.proposition.ops, ctx));
    // model/hint posés par nous.
    expect(r.proposition.model).toBe("ollama:qwen2.5-coder");
    expect(r.proposition.hint).toContain("LLM live");
  });

  // CA2 — JSON invalide → repli mock + message.
  it("CA2 JSON illisible → repli mock (== propose) + message illisible", async () => {
    const ctx = { ...methodeCtx, model: "ollama:qwen2.5-coder" };
    const r = await resolveProposition("un rapport qualité", ctx, { llm: fakeLlm("{pas du json") });
    expect(r.source).toBe("mock");
    expect(r.reason).toBe(FALLBACK_UNREADABLE);
    expect(r.proposition).toEqual(propose("un rapport qualité", ctx));
  });

  // CA3 — Provider indisponible (rejet) → repli + message, sans exception ni stack.
  it("CA3 transport REJETTE (timeout/réseau) → repli mock + message ; aucune exception remontée", async () => {
    const ctx = { ...methodeCtx, model: "ollama:qwen2.5-coder" };
    const r = await resolveProposition("un rapport qualité", ctx, {
      llm: fakeLlm(new Error("ECONNREFUSED stacktrace…")),
    });
    expect(r.source).toBe("mock");
    expect(r.reason).toBe(FALLBACK_UNAVAILABLE);
    // Le message est propre — jamais la stack du transport.
    expect(r.reason).not.toContain("stacktrace");
    expect(r.proposition).toEqual(propose("un rapport qualité", ctx));
  });

  // CA4 — Provider non supporté.
  it("CA4 provider non supporté (litellm) → repli mock + message (sans appel au transport)", async () => {
    const ctx = { ...methodeCtx, model: "litellm:gpt-4o" };
    const llm = fakeLlm(liveRaw);
    const r = await resolveProposition("un rapport qualité", ctx, { llm });
    expect(r.source).toBe("mock");
    expect(r.reason).toBe(FALLBACK_UNSUPPORTED);
    expect(llm.calls).toHaveLength(0); // le transport n'est jamais sollicité
    expect(r.proposition).toEqual(propose("un rapport qualité", ctx));
  });

  // CA5 — Modèle vide → mock direct inchangé (aucune raison, hint = NO_AUTHORING_MODEL_HINT).
  it("CA5 modèle vide → mock direct (hint NO_AUTHORING_MODEL_HINT), transport jamais appelé", async () => {
    const llm = fakeLlm(liveRaw);
    const r = await resolveProposition("un rapport qualité", methodeCtx, { llm });
    expect(r.source).toBe("mock");
    expect(r.reason).toBeUndefined();
    expect(llm.calls).toHaveLength(0);
    expect(r.proposition.hint).toContain(NO_AUTHORING_MODEL_HINT);
    expect(r.proposition).toEqual(propose("un rapport qualité", methodeCtx));
  });

  // CA6 — Déterminisme du fallback.
  it("CA6 déterminisme du repli : même entrée → MÊME Proposition mock (cas 2/3/4/5)", async () => {
    const ctx = { ...methodeCtx, model: "ollama:qwen2.5-coder" };
    const a = await resolveProposition("x", ctx, { llm: fakeLlm("{bad") });
    const b = await resolveProposition("x", ctx, { llm: fakeLlm("{bad") });
    expect(a.proposition).toEqual(b.proposition);
    expect(a.proposition).toEqual(propose("x", ctx));
  });

  // CA7 — Frontière Binding : toute op ∈ MaterializeTarget, aucun RunnerKind d'exécution.
  it("CA7 frontière : toute op (live ou mock) cible une matérialisation, jamais un runner d'exécution", async () => {
    const ctx = { ...methodeCtx, model: "ollama:qwen2.5-coder" };
    // Le LLM tente d'injecter une cible d'exécution + un id hors réservoir → tout est rejeté → repli.
    const malicious = JSON.stringify({
      intro: "x",
      artefacts: [],
      ops: [
        { target: "runner-exec", id: "gimli", label: "règle le runner ollama sur gimli" },
        { target: "method-principle", id: "id-inexistant", label: "hors réservoir" },
      ],
    });
    const r = await resolveProposition("règle le runner d'exécution", ctx, { llm: fakeLlm(malicious) });
    expect(r.source).toBe("mock"); // aucune op valide → repli
    for (const op of r.proposition.ops) {
      expect(op.target).not.toMatch(/exec|runner/);
      if (op.target === "kit-binding") {
        expect(RUNNER_KINDS).not.toContain(op.id as (typeof RUNNER_KINDS)[number]);
      }
    }
  });

  it("host : endpoint réglé (LAN) surcharge le défaut localhost dans la requête transport", async () => {
    const ctx = { ...methodeCtx, model: "ollama:qwen2.5-coder" };
    const llm = fakeLlm(liveRaw);
    await resolveProposition("un rapport qualité", ctx, {
      llm,
      endpoint: "http://192.168.2.11:11434",
    });
    expect(llm.calls[0].host).toBe("http://192.168.2.11:11434");
    // Sans endpoint → défaut localhost.
    const llm2 = fakeLlm(liveRaw);
    await resolveProposition("un rapport qualité", ctx, { llm: llm2 });
    expect(llm2.calls[0].host).toBe(DEFAULT_AUTHORING_HOST);
  });

  it("provider avec modèle contenant des `:` → split sur le PREMIER `:` (model = reste)", async () => {
    const ctx = { ...methodeCtx, model: "ollama:qwen2.5-coder:7b" };
    const llm = fakeLlm(liveRaw);
    await resolveProposition("un rapport qualité", ctx, { llm });
    expect(llm.calls[0].provider).toBe("ollama");
    expect(llm.calls[0].model).toBe("qwen2.5-coder:7b");
  });
});
