/**
 * advise.stream.test.ts — le **résolveur de conseil en STREAMING** de Fëanor-en-tête, prouvé OFFLINE
 * via `fakeStreamLlm` (ZÉRO réseau). Sœur streaming de `advise.test.ts` : même discipline honnête —
 * tokens progressifs (AC-S1), un partiel jamais passé pour complet, repli `null`+`reason` (AC-S2).
 */
import { describe, it, expect } from "vitest";
import { NO_AUTHORING_MODEL_HINT } from "../mock/copilote";
import { fakeStreamLlm } from "./transport";
import type { LlmStreamChunk } from "../../api/backend";
import {
  resolveAdviceStream,
  buildAdviceStreamSystemPrompt,
  type FeanorContext,
} from "./advise";
import { FALLBACK_UNAVAILABLE, FALLBACK_UNREADABLE, FALLBACK_UNSUPPORTED } from "./resolve";

const ctx: FeanorContext = {
  mode: "edit",
  entityType: "persona",
  entityName: "Gandalf",
  entityRole: "cadrage",
};

/** Collecte les chunks relayés à l'UI (pour prouver l'affichage progressif AC-S1). */
function sink(): { chunks: LlmStreamChunk[]; onChunk: (c: LlmStreamChunk) => void } {
  const chunks: LlmStreamChunk[] = [];
  return { chunks, onChunk: (c) => chunks.push(c) };
}

describe("resolveAdviceStream — conseil en tokens progressifs (offline via fakeStreamLlm)", () => {
  it("AC-S1 live nominal → tokens relayés au fil de l'eau, réponse finale = texte accumulé", async () => {
    const s = sink();
    const r = await resolveAdviceStream(
      "raccourcis la mission",
      ctx,
      {
        llm: fakeStreamLlm([
          { kind: "token", text: "Rends " },
          { kind: "token", text: "la mission " },
          { kind: "token", text: "plus courte." },
          { kind: "done" },
        ]),
        model: "ollama:llama3",
      },
      s.onChunk,
    );
    // Progressif : chaque token est passé à l'UI dans l'ordre, puis la fin propre.
    expect(s.chunks.filter((c) => c.kind === "token")).toHaveLength(3);
    expect(s.chunks[s.chunks.length - 1]).toEqual({ kind: "done" });
    // Réponse finale complète = accumulation.
    expect(r.source).toBe("live");
    expect(r.reply).toBe("Rends la mission plus courte.");
    expect(r.reason).toBeUndefined();
  });

  it("AC-S2 flux coupé en milieu (erreur mid-stream) → repli honnête, partiel NON passé pour complet", async () => {
    const s = sink();
    const r = await resolveAdviceStream(
      "aide",
      ctx,
      {
        llm: fakeStreamLlm([
          { kind: "token", text: "Début de rép" },
          { kind: "error", message: "flux interrompu : connection reset" },
        ]),
        model: "ollama:llama3",
      },
      s.onChunk,
    );
    // L'UI a bien reçu le partiel + l'aveu d'erreur.
    expect(s.chunks).toContainEqual({ kind: "token", text: "Début de rép" });
    expect(s.chunks.some((c) => c.kind === "error")).toBe(true);
    // Mais le RÉSULTAT est un repli honnête : aucune réponse fabriquée, pas de partiel « complet ».
    expect(r.reply).toBeNull();
    expect(r.source).toBe("mock");
    expect(r.reason).toBe(FALLBACK_UNAVAILABLE);
  });

  it("AC-S2 flux clos SANS `done` (interrompu) → repli, jamais un partiel présenté comme abouti", async () => {
    const s = sink();
    const r = await resolveAdviceStream(
      "aide",
      ctx,
      { llm: fakeStreamLlm([{ kind: "token", text: "moitié" }]), model: "ollama:llama3" },
      s.onChunk,
    );
    expect(r.reply).toBeNull();
    expect(r.reason).toBe(FALLBACK_UNAVAILABLE);
  });

  it("modèle absent → repli honnête AVANT tout flux (aucun token émis)", async () => {
    const s = sink();
    const r = await resolveAdviceStream(
      "aide",
      ctx,
      { llm: fakeStreamLlm([{ kind: "token", text: "x" }, { kind: "done" }]), model: "" },
      s.onChunk,
    );
    expect(r.reply).toBeNull();
    expect(r.reason).toBe(NO_AUTHORING_MODEL_HINT);
    // Aucun flux ouvert : le transport n'a pas été appelé, zéro token relayé.
    expect(s.chunks).toHaveLength(0);
  });

  it("provider non supporté (hors {ollama, openai}) → repli, aucun flux", async () => {
    const s = sink();
    const r = await resolveAdviceStream(
      "aide",
      ctx,
      { llm: fakeStreamLlm([{ kind: "done" }]), model: "anthropic:claude-3-5-sonnet" },
      s.onChunk,
    );
    expect(r.reply).toBeNull();
    expect(r.reason).toBe(FALLBACK_UNSUPPORTED);
    expect(s.chunks).toHaveLength(0);
  });

  it("provider openai (LiteLLM) → live en streaming, clé transmise au transport (Lot 2)", async () => {
    const s = sink();
    const llm = fakeStreamLlm([
      { kind: "token", text: "Via " },
      { kind: "token", text: "LiteLLM." },
      { kind: "done" },
    ]);
    const r = await resolveAdviceStream(
      "aide",
      ctx,
      { llm, model: "openai:gpt-4o", endpoint: "http://localhost:4000", apiKey: "sk-secret" },
      s.onChunk,
    );
    expect(r.source).toBe("live");
    expect(r.reply).toBe("Via LiteLLM.");
    expect(llm.calls[0].provider).toBe("openai");
    expect(llm.calls[0].host).toBe("http://localhost:4000");
    expect(llm.calls[0].apiKey).toBe("sk-secret");
  });

  it("commande qui REJETTE d'emblée (hôte refusé/réseau) → repli, aucune stack ni fausse réponse", async () => {
    const s = sink();
    const r = await resolveAdviceStream(
      "aide",
      ctx,
      { llm: fakeStreamLlm(new Error("hote refuse stacktrace…")), model: "ollama:llama3" },
      s.onChunk,
    );
    expect(r.reply).toBeNull();
    expect(r.reason).toBe(FALLBACK_UNAVAILABLE);
    expect(r.reason).not.toContain("stacktrace");
  });

  it("flux clos proprement mais VIDE → aveu « illisible », aucune réponse fabriquée", async () => {
    const s = sink();
    const r = await resolveAdviceStream(
      "aide",
      ctx,
      { llm: fakeStreamLlm([{ kind: "done" }]), model: "ollama:llama3" },
      s.onChunk,
    );
    expect(r.reply).toBeNull();
    expect(r.reason).toBe(FALLBACK_UNREADABLE);
  });

  it("le chemin live envoie le prompt de conseil SANS schéma JSON (prose libre streamée)", async () => {
    const llm = fakeStreamLlm([{ kind: "token", text: "ok" }, { kind: "done" }]);
    await resolveAdviceStream("conseille", ctx, { llm, model: "ollama:llama3" }, () => {});
    expect(llm.calls).toHaveLength(1);
    const req = llm.calls[0];
    expect(req.provider).toBe("ollama");
    expect(req.model).toBe("llama3");
    // Streaming du conseil = prose : PAS de `format` imposé (sinon on streamerait du JSON brut).
    expect(req.format).toBeUndefined();
    expect(req.user).toContain("Gandalf");
    expect(req.user).toContain("persona");
  });
});

describe("buildAdviceStreamSystemPrompt — texte libre (pas de JSON), identité dérivée ou anonyme", () => {
  it("contrat streaming : consigne de prose directe, jamais de JSON imposé", () => {
    const sys = buildAdviceStreamSystemPrompt(null);
    expect(sys).toContain("texte libre");
    expect(sys).not.toContain("objet JSON");
    expect(sys).toContain("compagnon de forge");
  });
});
