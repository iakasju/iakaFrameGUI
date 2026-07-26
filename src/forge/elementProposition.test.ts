/**
 * elementProposition.test.ts — le **résolveur générique de proposition** (brique B, factorisation du
 * patron persona). Prouve OFFLINE (via `fakeLlm`, zéro réseau) la **discipline d'honnêteté commune**
 * héritée par les 7 pools : un repli **ne fabrique jamais de proposition** (`proposition: null` +
 * `reason`), le résolveur **ne lève jamais**, et le schéma/prompt du pool est bien acheminé au transport.
 *
 * Les spécificités de parsing (C-1, enums, filtres catalogue) sont prouvées par pool dans
 * `<pool>Proposition.test.ts`. Ici : la mécanique partagée, testée sur un `spec` factice minimal.
 */
import { describe, it, expect } from "vitest";
import { fakeLlm } from "./llm/transport";
import { NO_AUTHORING_MODEL_HINT } from "./mock/copilote";
import {
  FALLBACK_UNAVAILABLE,
  FALLBACK_UNREADABLE,
  FALLBACK_UNSUPPORTED,
} from "./llm/resolve";
import {
  resolveElementProposition,
  buildElementSystemPrompt,
  buildElementUserPrompt,
  str,
  strList,
  filterCatalogIds,
  parseJsonObject,
  type ElementPropositionSpec,
} from "./elementProposition";
import type { FeanorContext } from "./llm/advise";

interface Foo {
  a?: string;
}

const SPEC: ElementPropositionSpec<Foo> = {
  typeLabel: "bidule",
  schema: { type: "object", properties: { a: { type: "string" } } },
  contractFields: ["Champs autorisés (tous optionnels) : a (une valeur)."],
  parse: (raw) => {
    const r = parseJsonObject(raw);
    if (r === null) return null;
    const a = str(r.a);
    return a !== undefined ? { a } : null;
  },
};

const ctx: FeanorContext = { mode: "create", entityType: "bidule", entityName: null, entityRole: null };

describe("resolveElementProposition — mécanique live/repli partagée (offline via fakeLlm)", () => {
  it("live nominal → champs parsés, source live, aucune raison", async () => {
    const r = await resolveElementProposition(SPEC, "propose", ctx, {
      llm: fakeLlm('{"a":"ok"}'),
      model: "ollama:llama3",
    });
    expect(r.source).toBe("live");
    expect(r.reason).toBeUndefined();
    expect(r.proposition).toEqual({ a: "ok" });
  });

  it("modèle absent → null + hint (jamais fabriquée)", async () => {
    const r = await resolveElementProposition(SPEC, "x", ctx, { llm: fakeLlm('{"a":"y"}'), model: "" });
    expect(r.proposition).toBeNull();
    expect(r.source).toBe("mock");
    expect(r.reason).toBe(NO_AUTHORING_MODEL_HINT);
  });

  it("provider ≠ ollama → null + message", async () => {
    const r = await resolveElementProposition(SPEC, "x", ctx, {
      llm: fakeLlm('{"a":"y"}'),
      model: "openai:gpt-4o",
    });
    expect(r.proposition).toBeNull();
    expect(r.reason).toBe(FALLBACK_UNSUPPORTED);
  });

  it("transport REJETTE (réseau/timeout) → null + message, aucune stack remontée", async () => {
    const r = await resolveElementProposition(SPEC, "x", ctx, {
      llm: fakeLlm(new Error("ECONNREFUSED stacktrace…")),
      model: "ollama:llama3",
    });
    expect(r.proposition).toBeNull();
    expect(r.reason).toBe(FALLBACK_UNAVAILABLE);
    expect(r.reason).not.toContain("stacktrace");
  });

  it("réponse illisible → null + message", async () => {
    const r = await resolveElementProposition(SPEC, "x", ctx, {
      llm: fakeLlm("pas du json"),
      model: "ollama:llama3",
    });
    expect(r.proposition).toBeNull();
    expect(r.reason).toBe(FALLBACK_UNREADABLE);
  });

  it("le chemin live achemine le schéma et le prompt du pool au transport", async () => {
    const llm = fakeLlm('{"a":"x"}');
    await resolveElementProposition(SPEC, "propose", ctx, { llm, model: "ollama:llama3" });
    expect(llm.calls).toHaveLength(1);
    const req = llm.calls[0];
    expect(req.provider).toBe("ollama");
    expect(req.model).toBe("llama3");
    expect(req.format).toBe(SPEC.schema);
    expect(req.user).toContain("bidule");
  });
});

describe("buildElementSystemPrompt / buildElementUserPrompt — contrat générique + champs du pool", () => {
  it("système : consignes génériques + libellé du pool + champs spécifiques + JSON strict", () => {
    const sys = buildElementSystemPrompt(SPEC, null);
    expect(sys).toContain("bidule");
    expect(sys).toContain("Ne propose JAMAIS d'id");
    expect(sys).toContain("a (une valeur)");
    expect(sys).toContain("Réponds UNIQUEMENT par un objet JSON");
  });
  it("utilisateur : porte l'intention et le type du pool", () => {
    const user = buildElementUserPrompt(SPEC, "fais un truc", ctx);
    expect(user).toContain("fais un truc");
    expect(user).toContain("bidule");
  });
});

describe("helpers défensifs partagés", () => {
  it("str : chaîne trimmée non vide, sinon undefined", () => {
    expect(str("  x  ")).toBe("x");
    expect(str("   ")).toBeUndefined();
    expect(str(42)).toBeUndefined();
    expect(str(null)).toBeUndefined();
  });
  it("strList : chaînes non vides dédupliquées, [] sinon", () => {
    expect(strList(["a", " b ", "a", "", 3])).toEqual(["a", "b"]);
    expect(strList("pas un tableau")).toEqual([]);
  });
  it("filterCatalogIds : ne retient que les ids autorisés", () => {
    expect(filterCatalogIds(["a", "x", "b"], new Set(["a", "b"]))).toEqual(["a", "b"]);
    expect(filterCatalogIds(["x"], new Set(["a"]))).toEqual([]);
  });
  it("parseJsonObject : objet ou null (jamais d'exception), rejette tableau/scalaire", () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonObject("[]")).toBeNull();
    expect(parseJsonObject('"x"')).toBeNull();
    expect(parseJsonObject("pas json")).toBeNull();
    expect(parseJsonObject("")).toBeNull();
  });
});
