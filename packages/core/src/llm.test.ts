import { describe, it, expect } from "vitest";
import { parseLiveProposition, LIVE_ARTEFACT_ICONS } from "./llm";

/** Element pool minimal de test : deux cibles, quelques ids disponibles. */
const opts = {
  allowedTargets: ["method-principle", "method-ritual", "persona-skill"],
  elementPool: {
    "method-principle": ["qualite", "mvp-first"],
    "method-ritual": ["snapshot"],
    "persona-skill": ["iakaframe-cadrage"],
  },
} as const;

describe("parseLiveProposition — défensif, jamais d'exception (cœur)", () => {
  it("JSON valide + ops sur ids réels → LiveProposition (intro/artefacts/ops)", () => {
    const raw = JSON.stringify({
      intro: "Voici ma proposition.",
      artefacts: [{ icon: "prin", tag: "PRIN", title: "Qualité", detail: "gate" }],
      ops: [{ target: "method-principle", id: "qualite", label: "Qualité" }],
    });
    const p = parseLiveProposition(raw, opts);
    expect(p).not.toBeNull();
    expect(p!.intro).toBe("Voici ma proposition.");
    expect(p!.ops).toEqual([{ target: "method-principle", id: "qualite", label: "Qualité" }]);
    expect(p!.artefacts).toHaveLength(1);
  });

  it("JSON illisible → null (aucune exception)", () => {
    expect(parseLiveProposition("{pas du json", opts)).toBeNull();
    expect(parseLiveProposition("", opts)).toBeNull();
    expect(parseLiveProposition("[]", opts)).toBeNull();
  });

  it("cible hors liste → op rejetée → si aucune valide → null (frontière)", () => {
    const raw = JSON.stringify({
      intro: "x",
      artefacts: [],
      ops: [
        { target: "runner-exec", id: "qualite", label: "exec" },
        { target: "kit-binding", id: "qualite", label: "binding non permis ici" },
      ],
    });
    expect(parseLiveProposition(raw, opts)).toBeNull();
  });

  it("id hors element pool → op rejetée", () => {
    const raw = JSON.stringify({
      intro: "x",
      artefacts: [],
      ops: [
        { target: "method-principle", id: "id-inexistant", label: "nope" },
        { target: "method-ritual", id: "snapshot", label: "OK" },
      ],
    });
    const p = parseLiveProposition(raw, opts);
    expect(p).not.toBeNull();
    expect(p!.ops).toEqual([{ target: "method-ritual", id: "snapshot", label: "OK" }]);
  });

  it("artefact à icône inconnue → filtré, mais l'op valide survit", () => {
    const raw = JSON.stringify({
      intro: "x",
      artefacts: [
        { icon: "bind-exec", tag: "X", title: "t", detail: "d" }, // icône hors liste
        { icon: "prin", tag: "PRIN", title: "ok", detail: "d" },
      ],
      ops: [{ target: "persona-skill", id: "iakaframe-cadrage", label: "c" }],
    });
    const p = parseLiveProposition(raw, opts);
    expect(p!.artefacts).toEqual([{ icon: "prin", tag: "PRIN", title: "ok", detail: "d" }]);
  });

  it("label manquant → repli sur l'id ; champs non-chaîne → op rejetée", () => {
    const raw = JSON.stringify({
      intro: 42, // intro non-chaîne → tolérée (vide)
      ops: [
        { target: "method-principle", id: "mvp-first" }, // label absent → id
        { target: "method-principle", id: 999, label: "bad-id" }, // id non-chaîne → rejeté
      ],
    });
    const p = parseLiveProposition(raw, opts);
    expect(p!.intro).toBe("");
    expect(p!.ops).toEqual([{ target: "method-principle", id: "mvp-first", label: "mvp-first" }]);
  });

  it("zéro op valide → null (rien à matérialiser → repli)", () => {
    const raw = JSON.stringify({ intro: "x", artefacts: [], ops: [] });
    expect(parseLiveProposition(raw, opts)).toBeNull();
  });

  it("les icônes autorisées ne contiennent aucune notion d'exécution", () => {
    for (const icon of LIVE_ARTEFACT_ICONS) {
      expect(icon).not.toMatch(/exec|runner/);
    }
  });
});
