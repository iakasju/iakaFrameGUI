/**
 * personaProposition.test.ts — le **résolveur de PROPOSITION** du pilote persona (brique B),
 * prouvé OFFLINE via `fakeLlm`. Discipline calquée sur `advise.test.ts` : un repli **ne fabrique
 * jamais de proposition** (`proposition: null` + `reason`), jamais une proposition vide « réelle ».
 *
 * Couvre :
 *   AC-B1  proposition réelle (live) → champs structurés (prouvé via `fakeLlm`, zéro réseau).
 *   AC-B3  honnêteté : modèle absent / provider ≠ ollama / réseau KO / illisible → aucune proposition.
 *   C-1    `id`/`roleIndex` jamais lus/proposés ; `skills`/`guardrails` filtrés au catalogue ;
 *          `roleKey` non canonique écarté.
 */
import { describe, it, expect } from "vitest";
import { NO_AUTHORING_MODEL_HINT } from "./mock/copilote";
import { fakeLlm } from "./llm/transport";
import {
  resolvePersonaProposition,
  parsePersonaProposition,
  buildPropositionSystemPrompt,
  PERSONA_PROPOSITION_SCHEMA,
} from "./personaProposition";
import {
  FALLBACK_UNAVAILABLE,
  FALLBACK_UNREADABLE,
  FALLBACK_UNSUPPORTED,
} from "./llm/resolve";
import type { FeanorContext } from "./llm/advise";
import type { CopiloteIdentity } from "./llm/identity";
import { parsePersona } from "@iakaframe/core";

const ctx: FeanorContext = {
  mode: "create",
  entityType: "persona",
  entityName: null,
  entityRole: null,
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
  charter: "Compagnon de forge : propose des champs, n'écrit rien lui-même.",
};

describe("resolvePersonaProposition — orientation live / repli honnête (offline via fakeLlm)", () => {
  it("AC-B1 live nominal → proposition de champs structurés, source live, aucune raison", async () => {
    const live =
      '{"name":"Nain Forgeron","roleKey":"dev","mission":"forge le code","royaume":"khazad","pastille":"⚒️","skills":["iakaframe-cadrage"],"guardrails":["perimeter-guard"]}';
    const r = await resolvePersonaProposition("propose un dev", ctx, {
      llm: fakeLlm(live),
      model: "ollama:llama3",
    });
    expect(r.source).toBe("live");
    expect(r.reason).toBeUndefined();
    expect(r.proposition).toEqual({
      name: "Nain Forgeron",
      roleKey: "dev",
      mission: "forge le code",
      royaume: "KHAZAD", // MAJUSCULE forcée
      pastille: "⚒️",
      skills: ["iakaframe-cadrage"],
      guardrails: ["perimeter-guard"],
    });
  });

  it("AC-B3 modèle absent → repli honnête : proposition null + signalement (jamais fabriquée)", async () => {
    const r = await resolvePersonaProposition("aide", ctx, {
      llm: fakeLlm('{"name":"x"}'),
      model: "",
    });
    expect(r.proposition).toBeNull();
    expect(r.source).toBe("mock");
    expect(r.reason).toBe(NO_AUTHORING_MODEL_HINT);
  });

  it("AC-B3 provider non supporté (hors {ollama, openai}) → repli + message, aucune proposition", async () => {
    const r = await resolvePersonaProposition("aide", ctx, {
      llm: fakeLlm('{"name":"x"}'),
      model: "anthropic:claude-3-5-sonnet", // provider natif hors passerelle → non supporté
    });
    expect(r.proposition).toBeNull();
    expect(r.reason).toBe(FALLBACK_UNSUPPORTED);
  });

  it("Lot 2b : provider openai (LiteLLM) STRUCTURÉ honoré → proposition live parsée", async () => {
    const live = '{"name":"Nain","roleKey":"dev","mission":"forge"}';
    const llm = fakeLlm(live);
    const r = await resolvePersonaProposition("propose un dev", ctx, {
      llm,
      model: "openai:gpt-4o",
      endpoint: "http://localhost:4000",
      apiKey: "sk-secret-litellm",
    });
    expect(r.source).toBe("live");
    expect(r.proposition).toEqual({ name: "Nain", roleKey: "dev", mission: "forge" });
    // La requête porte le provider openai, le schéma structuré (déclenche response_format côté Rust)
    // ET la clé (header Bearer côté Rust) — jamais dans le corps/log (prouvé côté Rust).
    const req = llm.calls[0];
    expect(req.provider).toBe("openai");
    expect(req.host).toBe("http://localhost:4000");
    expect(req.apiKey).toBe("sk-secret-litellm");
    expect(req.format).toBeDefined();
  });

  it("Lot 2b : openai qui n'honore PAS response_format (texte non structuré) → AVEU, jamais de fausse persona", async () => {
    // Backend LiteLLM qui rend de la prose au lieu du JSON structuré demandé → parseur null → aveu.
    const r = await resolvePersonaProposition("propose", ctx, {
      llm: fakeLlm("Voici une persona sympa mais en texte libre, pas du JSON."),
      model: "openai:gpt-4o",
      endpoint: "http://localhost:4000",
    });
    expect(r.proposition).toBeNull();
    expect(r.source).toBe("mock");
    expect(r.reason).toBe(FALLBACK_UNREADABLE);
  });

  it("AC-B3 transport REJETTE (timeout/réseau) → repli + message, aucune exception ni stack", async () => {
    const r = await resolvePersonaProposition("aide", ctx, {
      llm: fakeLlm(new Error("ECONNREFUSED stacktrace…")),
      model: "ollama:llama3",
    });
    expect(r.proposition).toBeNull();
    expect(r.reason).toBe(FALLBACK_UNAVAILABLE);
    expect(r.reason).not.toContain("stacktrace");
  });

  it("AC-B3 réponse illisible (pas du JSON d'objet) → repli « illisible », aucune proposition", async () => {
    const r = await resolvePersonaProposition("aide", ctx, {
      llm: fakeLlm("pas du json du tout"),
      model: "ollama:llama3",
    });
    expect(r.proposition).toBeNull();
    expect(r.reason).toBe(FALLBACK_UNREADABLE);
  });

  it("AC-B3 objet sans AUCUN champ retenu → repli « illisible » (jamais une proposition vide réelle)", async () => {
    const r = await resolvePersonaProposition("aide", ctx, {
      llm: fakeLlm('{"inconnu":"x","id":"HACK","roleIndex":99}'),
      model: "ollama:llama3",
    });
    expect(r.proposition).toBeNull();
    expect(r.reason).toBe(FALLBACK_UNREADABLE);
  });

  it("le chemin live envoie le schéma de champs et le prompt de proposition au transport", async () => {
    const llm = fakeLlm('{"name":"X"}');
    await resolvePersonaProposition("propose", ctx, { llm, model: "ollama:llama3" });
    expect(llm.calls).toHaveLength(1);
    const req = llm.calls[0];
    expect(req.provider).toBe("ollama");
    expect(req.model).toBe("llama3");
    // Le format imposé est bien le schéma des CHAMPS persona (pas {reply}, pas les ops du copilote).
    const props = (req.format as { properties?: Record<string, unknown> }).properties ?? {};
    expect(Object.keys(props).sort()).toEqual(
      ["guardrails", "mission", "name", "pastille", "roleKey", "royaume", "skills"].sort(),
    );
    // C-1 : ni id ni roleIndex dans le schéma imposé.
    expect(props).not.toHaveProperty("id");
    expect(props).not.toHaveProperty("roleIndex");
    expect(req.user).toContain("persona");
  });
});

describe("parsePersonaProposition — défensif + C-1 + filtres catalogue", () => {
  it("C-1 : `id` et `roleIndex` de la réponse du modèle sont IGNORÉS (jamais proposés)", () => {
    const p = parsePersonaProposition('{"name":"Neuf","id":"HACK","roleIndex":42}');
    expect(p).toEqual({ name: "Neuf" });
    expect(p).not.toHaveProperty("id");
    expect(p).not.toHaveProperty("roleIndex");
  });

  it("skills/guardrails : filtrés au catalogue (ids hallucinés écartés)", () => {
    const p = parsePersonaProposition(
      '{"name":"N","skills":["iakaframe-cadrage","INVENTE"],"guardrails":["identity-guard","FAUX"]}',
    );
    expect(p?.skills).toEqual(["iakaframe-cadrage"]);
    expect(p?.guardrails).toEqual(["identity-guard"]);
  });

  it("roleKey non canonique → écarté (jamais un rôle inventé) ; canonique → normalisé à la clé", () => {
    expect(parsePersonaProposition('{"name":"N","roleKey":"licorne"}')).toEqual({ name: "N" });
    expect(parsePersonaProposition('{"name":"N","roleKey":"DEV"}')).toEqual({
      name: "N",
      roleKey: "dev",
    });
  });

  it("null sur non-JSON, vide, non-objet, ou objet sans champ retenu", () => {
    expect(parsePersonaProposition("pas du json")).toBeNull();
    expect(parsePersonaProposition("")).toBeNull();
    expect(parsePersonaProposition('"une chaine"')).toBeNull();
    expect(parsePersonaProposition('{"autre":"x"}')).toBeNull();
    expect(parsePersonaProposition("{}")).toBeNull();
  });
});

describe("buildPropositionSystemPrompt — identité dérivée ou anonyme, contrat structuré", () => {
  it("avec identité : nom + charte verbatim du canon, et contrat « ne propose jamais d'id »", () => {
    const sys = buildPropositionSystemPrompt(feanorIdentity);
    expect(sys).toContain("Fëanor");
    expect(sys).toContain("propose des champs, n'écrit rien lui-même");
    expect(sys).toContain("Ne propose JAMAIS d'id ni de roleIndex");
  });
  it("sans identité : en-tête anonyme, aucune identité fabriquée", () => {
    const sys = buildPropositionSystemPrompt(null);
    expect(sys).not.toContain("Fëanor");
    expect(sys).toContain("compagnon de forge");
  });
  it("le schéma exporté est un objet de champs sans required (proposition partielle permise)", () => {
    expect(PERSONA_PROPOSITION_SCHEMA.type).toBe("object");
    expect(PERSONA_PROPOSITION_SCHEMA).not.toHaveProperty("required");
  });
});
