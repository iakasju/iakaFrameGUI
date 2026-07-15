import { describe, it, expect } from "vitest";
import { RUNNER_KINDS } from "@iakaframe/core";
import {
  AUTHORING_RUNNERS,
  propose,
  type CopiloteContext,
} from "./copilote";

/** Contexte méthode minimal (aucun id présent → tout ajout est un vrai « + » du diff). */
const methodeCtx: CopiloteContext = {
  surface: "methode",
  diffFile: "methode.md",
  present: {},
};

const teamCtx: CopiloteContext = {
  surface: "team",
  diffFile: "gimli.md",
  present: { "persona-guardrail": ["perimeter-guard"] },
};

const kitCtx: CopiloteContext = {
  surface: "kit",
  diffFile: "kit.json",
  present: {},
};

describe("copilote mocké — déterministe & sans réseau (E2c §8)", () => {
  it("est DÉTERMINISTE : même intention + même contexte → même sortie", () => {
    const a = propose("un principe qualité complet", methodeCtx);
    const b = propose("un principe qualité complet", methodeCtx);
    expect(a).toEqual(b);
  });

  it("pattern « qualité » → propose le principe `qualite` (op method-principle)", () => {
    const p = propose("dès qu'on passe une version mineure, un rapport qualité", methodeCtx);
    expect(p.ops).toEqual([
      { target: "method-principle", id: "qualite", label: "Qualité" },
    ]);
    // Le continuum §3.7 est montré : principe + rituel + garde (3 artefacts).
    expect(p.artefacts.length).toBeGreaterThanOrEqual(3);
    expect(p.artefacts.some((a) => a.icon === "prin")).toBe(true);
  });

  it("pattern « badge » (persona) → 1 skill + 2 hooks, op garde `identity-guard`", () => {
    const p = propose("un skill qui garantit qu'il badge son ouverture et sa clôture", teamCtx);
    expect(p.ops).toEqual([
      { target: "persona-guardrail", id: "identity-guard", label: "Canal d'identité (badges)" },
    ]);
    const tags = p.artefacts.map((a) => a.tag);
    expect(tags.filter((t) => t === "HOOK").length).toBe(2); // Stop + UserPromptSubmit
    expect(tags).toContain("SKILL");
  });

  it("pattern « rituel snapshot » → op method-ritual `snapshot`", () => {
    const p = propose("un rituel snapshot d'état des lieux", methodeCtx);
    expect(p.ops).toEqual([{ target: "method-ritual", id: "snapshot", label: "snapshot" }]);
  });

  it("pattern « docker » → principe `isolation-docker`", () => {
    const p = propose("chaque projet dans sa propre stack docker", methodeCtx);
    expect(p.ops[0]).toMatchObject({ target: "method-principle", id: "isolation-docker" });
  });

  it("repli générique (méthode) → principe `mvp-first` quand aucun motif ne matche", () => {
    const p = propose("blablabla sans mot-clé reconnu", methodeCtx);
    expect(p.ops).toEqual([{ target: "method-principle", id: "mvp-first", label: "MVP d'abord" }]);
  });

  it("diff avant→après : id déjà présent → ligne `same` (aucune écriture), sinon add+del", () => {
    // perimeter-guard est déjà présent dans teamCtx → idempotent.
    const same = propose("pose la garde de périmètre", teamCtx);
    expect(same.diff.some((d) => d.kind === "same")).toBe(true);
    // qualite absent → del(avant) + add(après).
    const fresh = propose("un rapport qualité", methodeCtx);
    expect(fresh.diff.some((d) => d.kind === "add")).toBe(true);
  });
});

describe("copilote mocké — FRONTIÈRE authoring ≠ exécution (E2c §8)", () => {
  it("les runners d'AUTHORING sont distincts des RunnerKind d'EXÉCUTION du cœur", () => {
    for (const a of AUTHORING_RUNNERS) {
      expect(RUNNER_KINDS).not.toContain(a as unknown as string);
    }
    // Et ils sont marqués « mock » (LLM réel différé).
    expect(AUTHORING_RUNNERS.every((r) => r.includes("mock"))).toBe(true);
  });

  it("le mock ne produit JAMAIS d'assignation de runner d'exécution par persona", () => {
    const intentions = [
      "assemble le kit et prépare le binding défaut suggéré pour le cockpit",
      "règle le runner d'exécution ollama sur gimli",
      "un binding local-first",
    ];
    for (const it of intentions) {
      const p = propose(it, kitCtx);
      // Aucune op ne cible un RunnerKind d'exécution : seul le binding STRUCTUREL est touché.
      for (const op of p.ops) {
        expect(op.target).not.toMatch(/exec|runner-exec/);
        // La seule cible kit permise est le binding structurel (id de preset, pas un RunnerKind).
        if (op.target === "kit-binding") {
          expect(RUNNER_KINDS).not.toContain(op.id as (typeof RUNNER_KINDS)[number]);
        }
      }
    }
  });
});
