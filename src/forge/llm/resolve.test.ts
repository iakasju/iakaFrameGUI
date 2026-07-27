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
  MOCK_DEMO_LABEL,
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

describe("resolveProposition — honnête par défaut : aveu / démo mock opt-in / live (offline via fakeLlm)", () => {
  // CA1 — Live nominal (inchangé).
  it("CA1 live nominal → Proposition LIVE ; diff = buildDiff(ops, context) ; ops matérialisables", async () => {
    const ctx = { ...methodeCtx, model: "ollama:qwen2.5-coder" };
    const r = await resolveProposition("un rapport qualité", ctx, { llm: fakeLlm(liveRaw) });
    expect(r.source).toBe("live");
    expect(r.proposition).not.toBeNull();
    expect(r.proposition!.ops).toEqual([
      { target: "method-principle", id: "qualite", label: "Qualité (live)" },
    ]);
    expect(r.proposition!.intro).toContain("principe qualité");
    // Diff recalculé par NOTRE code, jamais dicté par le LLM.
    expect(r.proposition!.diff).toEqual(buildDiff(r.proposition!.ops, ctx));
    // model/hint posés par nous.
    expect(r.proposition!.model).toBe("ollama:qwen2.5-coder");
    expect(r.proposition!.hint).toContain("LLM live");
  });

  // CA2 — Modèle vide → AVEU honnête (aucune proposition fabriquée), transport jamais appelé.
  it("CA2 modèle vide → aveu (null, none, NO_AUTHORING_MODEL_HINT) ; transport jamais appelé", async () => {
    const llm = fakeLlm(liveRaw);
    const r = await resolveProposition("un rapport qualité", methodeCtx, { llm });
    expect(r.proposition).toBeNull();
    expect(r.source).toBe("none");
    expect(r.reason).toBe(NO_AUTHORING_MODEL_HINT);
    expect(llm.calls).toHaveLength(0);
  });

  // CA3 — JSON illisible → AVEU honnête, plus jamais une proposition mockée.
  it("CA3 JSON illisible → aveu (null, none, FALLBACK_UNREADABLE)", async () => {
    const ctx = { ...methodeCtx, model: "ollama:qwen2.5-coder" };
    const r = await resolveProposition("un rapport qualité", ctx, { llm: fakeLlm("{pas du json") });
    expect(r.proposition).toBeNull();
    expect(r.source).toBe("none");
    expect(r.reason).toBe(FALLBACK_UNREADABLE);
  });

  // CA4 — Rejet transport (timeout/réseau) → AVEU, sans exception ni stack.
  it("CA4 transport REJETTE → aveu (null, none, FALLBACK_UNAVAILABLE) ; aucune stack, aucune exception", async () => {
    const ctx = { ...methodeCtx, model: "ollama:qwen2.5-coder" };
    const r = await resolveProposition("un rapport qualité", ctx, {
      llm: fakeLlm(new Error("ECONNREFUSED stacktrace…")),
    });
    expect(r.proposition).toBeNull();
    expect(r.source).toBe("none");
    expect(r.reason).toBe(FALLBACK_UNAVAILABLE);
    expect(r.reason).not.toContain("stacktrace"); // message propre, jamais la stack du transport
  });

  // CA5 — Provider non supporté → AVEU, transport jamais sollicité.
  it("CA5 provider non supporté (litellm) → aveu (null, none, FALLBACK_UNSUPPORTED) ; transport jamais appelé", async () => {
    const ctx = { ...methodeCtx, model: "litellm:gpt-4o" };
    const llm = fakeLlm(liveRaw);
    const r = await resolveProposition("un rapport qualité", ctx, { llm });
    expect(r.proposition).toBeNull();
    expect(r.source).toBe("none");
    expect(r.reason).toBe(FALLBACK_UNSUPPORTED);
    expect(llm.calls).toHaveLength(0);
  });

  // CA-DÉMO — Mode démo OPT-IN (`authoringModel = "mock"`) → proposition ÉTIQUETÉE (== propose).
  it("CA-démo mode démo opt-in (model = mock) → proposition mock étiquetée (== propose) ; transport jamais appelé", async () => {
    const ctx = { ...methodeCtx, model: "mock" };
    const llm = fakeLlm(liveRaw);
    const r = await resolveProposition("un rapport qualité", ctx, { llm });
    expect(r.source).toBe("mock");
    expect(r.reason).toBe(MOCK_DEMO_LABEL); // TOUJOURS étiqueté (H-2)
    expect(r.proposition).not.toBeNull();
    expect(r.proposition).toEqual(propose("un rapport qualité", ctx)); // déterminisme du mock intact
    expect(llm.calls).toHaveLength(0); // aucun réseau : le démo passe AVANT le provider
  });

  it("CA-démo insensible à la casse + `mock:<libellé>` → toujours la démo étiquetée (jamais provider ollama)", async () => {
    const llmA = fakeLlm(liveRaw);
    const rA = await resolveProposition("x", { ...methodeCtx, model: "MOCK" }, { llm: llmA });
    expect(rA.source).toBe("mock");
    expect(llmA.calls).toHaveLength(0);
    const llmB = fakeLlm(liveRaw);
    const rB = await resolveProposition("x", { ...methodeCtx, model: "mock:démo" }, { llm: llmB });
    expect(rB.source).toBe("mock");
    expect(rB.reason).toBe(MOCK_DEMO_LABEL);
    expect(llmB.calls).toHaveLength(0);
  });

  // CA6 — Déterminisme du mode démo (le mock reste pur/injectable ; seul le déclenchement est opt-in).
  it("CA6 déterminisme de la démo : même entrée (model = mock) → MÊME Proposition mock", async () => {
    const ctx = { ...methodeCtx, model: "mock" };
    const a = await resolveProposition("x", ctx, { llm: fakeLlm("{bad") });
    const b = await resolveProposition("x", ctx, { llm: fakeLlm("{bad") });
    expect(a.proposition).toEqual(b.proposition);
    expect(a.proposition).toEqual(propose("x", ctx));
  });

  // CA7 — Frontière Binding : une réponse malveillante (cible d'exécution + id hors réservoir) → AVEU.
  it("CA7 frontière : réponse tentant une cible d'exécution / id hors réservoir → aveu (aucune op fabriquée)", async () => {
    const ctx = { ...methodeCtx, model: "ollama:qwen2.5-coder" };
    const malicious = JSON.stringify({
      intro: "x",
      artefacts: [],
      ops: [
        { target: "runner-exec", id: "gimli", label: "règle le runner ollama sur gimli" },
        { target: "method-principle", id: "id-inexistant", label: "hors réservoir" },
      ],
    });
    const r = await resolveProposition("règle le runner d'exécution", ctx, { llm: fakeLlm(malicious) });
    // Aucune op valide → aveu honnête : rien n'est matérialisé, encore moins un runner d'exécution.
    expect(r.proposition).toBeNull();
    expect(r.source).toBe("none");
    expect(r.reason).toBe(FALLBACK_UNREADABLE);
    // Garde de type conservée : le type de cible n'admet aucun runner d'exécution (RUNNER_KINDS).
    expect(RUNNER_KINDS.length).toBeGreaterThan(0);
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
