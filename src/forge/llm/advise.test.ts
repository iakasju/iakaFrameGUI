/**
 * advise.test.ts — le **résolveur de conseil** de Fëanor-en-tête, prouvé OFFLINE via `fakeLlm`.
 *
 * Discipline calquée sur `resolve.test.ts`, adaptée au registre CONSEIL : un repli **ne fabrique
 * jamais de réponse** (`reply: null` + `reason`), là où le copilote rend une Proposition mock.
 */
import { describe, it, expect } from "vitest";
import { NO_AUTHORING_MODEL_HINT } from "../mock/copilote";
import { fakeLlm } from "./transport";
import {
  resolveAdvice,
  parseAdviceReply,
  buildAdviceSystemPrompt,
  type FeanorContext,
} from "./advise";
import {
  FALLBACK_UNAVAILABLE,
  FALLBACK_UNREADABLE,
  FALLBACK_UNSUPPORTED,
} from "./resolve";
import type { CopiloteIdentity } from "./identity";
import { parsePersona } from "@iakaframe/core";

const ctx: FeanorContext = {
  mode: "edit",
  entityType: "persona",
  entityName: "Gandalf",
  entityRole: "cadrage",
};

const feanorIdentity: CopiloteIdentity = {
  persona: parsePersona({
    id: "feanor",
    name: "Fëanor",
    roleKey: "frame",
    royaume: "FRAME",
    pastille: "🟠",
    roleIndex: 8,
  })!,
  charter: "Compagnon de forge : conseille, n'écrit rien lui-même.",
};

describe("resolveAdvice — orientation live / repli honnête (offline via fakeLlm)", () => {
  it("live nominal → reply texte du modèle, source live, aucune raison", async () => {
    const r = await resolveAdvice("raccourcis la mission", ctx, {
      llm: fakeLlm('{"reply":"Rends la mission plus courte."}'),
      model: "ollama:llama3",
    });
    expect(r.source).toBe("live");
    expect(r.reply).toBe("Rends la mission plus courte.");
    expect(r.reason).toBeUndefined();
  });

  it("modèle absent → repli honnête : reply null + signalement (jamais une fausse réponse)", async () => {
    const r = await resolveAdvice("aide", ctx, { llm: fakeLlm('{"reply":"x"}'), model: "" });
    expect(r.reply).toBeNull();
    expect(r.source).toBe("mock");
    expect(r.reason).toBe(NO_AUTHORING_MODEL_HINT);
  });

  it("provider non supporté (≠ ollama) → repli + message, aucune réponse", async () => {
    const r = await resolveAdvice("aide", ctx, {
      llm: fakeLlm('{"reply":"x"}'),
      model: "openai:gpt-4o",
    });
    expect(r.reply).toBeNull();
    expect(r.reason).toBe(FALLBACK_UNSUPPORTED);
  });

  it("transport REJETTE (timeout/réseau) → repli + message, aucune exception ni stack", async () => {
    const r = await resolveAdvice("aide", ctx, {
      llm: fakeLlm(new Error("ECONNREFUSED stacktrace…")),
      model: "ollama:llama3",
    });
    expect(r.reply).toBeNull();
    expect(r.reason).toBe(FALLBACK_UNAVAILABLE);
    expect(r.reason).not.toContain("stacktrace");
  });

  it("réponse illisible (pas du JSON {reply}) → repli « illisible », aucune réponse", async () => {
    const r = await resolveAdvice("aide", ctx, {
      llm: fakeLlm("pas du json du tout"),
      model: "ollama:llama3",
    });
    expect(r.reply).toBeNull();
    expect(r.reason).toBe(FALLBACK_UNREADABLE);
  });

  it("le chemin live envoie le schéma {reply} et le prompt de conseil au transport", async () => {
    const llm = fakeLlm('{"reply":"ok"}');
    await resolveAdvice("conseille", ctx, { llm, model: "ollama:llama3" });
    expect(llm.calls).toHaveLength(1);
    const req = llm.calls[0];
    expect(req.provider).toBe("ollama");
    expect(req.model).toBe("llama3");
    // Le format imposé est bien le schéma {reply} (sorties structurées Ollama).
    expect((req.format as { required?: string[] }).required).toEqual(["reply"]);
    // Le prompt utilisateur porte le contexte de l'élément conseillé.
    expect(req.user).toContain("Gandalf");
    expect(req.user).toContain("persona");
  });
});

describe("parseAdviceReply — défensif, ne lève jamais", () => {
  it("extrait `reply` d'un JSON valide", () => {
    expect(parseAdviceReply('{"reply":"salut"}')).toBe("salut");
  });
  it("null sur JSON sans `reply`, vide, ou non-JSON", () => {
    expect(parseAdviceReply('{"autre":"x"}')).toBeNull();
    expect(parseAdviceReply('{"reply":"   "}')).toBeNull();
    expect(parseAdviceReply("pas du json")).toBeNull();
    expect(parseAdviceReply("")).toBeNull();
  });
});

describe("buildAdviceSystemPrompt — identité dérivée ou anonyme", () => {
  it("avec identité : le nom + la charte verbatim du canon sont injectés", () => {
    const sys = buildAdviceSystemPrompt(feanorIdentity);
    expect(sys).toContain("Fëanor");
    expect(sys).toContain("conseille, n'écrit rien lui-même");
    expect(sys).toContain("CONSEIL");
  });
  it("sans identité : en-tête anonyme, aucune identité fabriquée", () => {
    const sys = buildAdviceSystemPrompt(null);
    expect(sys).not.toContain("Fëanor");
    expect(sys).toContain("compagnon de forge");
  });
});
