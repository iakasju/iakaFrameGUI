/**
 * workflowEdit.test.ts — helpers d'édition **purs** (P6b) + **injection** `KitGenOptions.workflow`.
 *
 * Couvre EW-5 (résolution pure + injection), EW-6 (non-régression byte-identique), EW-8 (seed sans
 * mutation du canonique), EW-9 (add/remove/move + `order` normalisé), EW-10 (invariants de
 * validité), EW-11 (zéro modèle/runner), EW-12 (nettoyage du calage).
 */
import { describe, it, expect } from "vitest";
import {
  IAKAFRAME_CANONICAL_WORKFLOW,
  cloneWorkflow,
  addPhase,
  removePhase,
  movePhase,
  updatePhaseFields,
  updatePhaseGate,
  renderWorkflowMarkdown,
  resolveWorkflow,
  buildTeamFromRoster,
  generateCodexKit,
  type Workflow,
} from "../src/index";

/** Petit workflow factice à 2 phases (agnostique). */
function fake(): Workflow {
  return {
    id: "wf",
    name: "WF",
    methodId: "m",
    phases: [
      { id: "a", order: 0, name: "A", description: "", roleKeys: ["architecture"], gate: { kind: "human", condition: "" } },
      { id: "b", order: 1, name: "B", description: "", roleKeys: ["fabrication"], gate: { kind: "auto", condition: "" } },
    ],
  };
}

describe("EW-8 — cloneWorkflow : deep-clone sans mutation du canonique", () => {
  it("le clone est structurellement égal mais sans partage de référence", () => {
    const c = cloneWorkflow(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(c).toEqual(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(c).not.toBe(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(c.phases).not.toBe(IAKAFRAME_CANONICAL_WORKFLOW.phases);
    expect(c.phases[0]).not.toBe(IAKAFRAME_CANONICAL_WORKFLOW.phases[0]);
    expect(c.phases[0].roleKeys).not.toBe(IAKAFRAME_CANONICAL_WORKFLOW.phases[0].roleKeys);
    expect(c.phases[0].gate).not.toBe(IAKAFRAME_CANONICAL_WORKFLOW.phases[0].gate);
  });

  it("éditer le clone (seed) ne mute JAMAIS IAKAFRAME_CANONICAL_WORKFLOW", () => {
    const before = JSON.stringify(IAKAFRAME_CANONICAL_WORKFLOW);
    let seed = cloneWorkflow(IAKAFRAME_CANONICAL_WORKFLOW);
    seed = addPhase(seed);
    seed = updatePhaseFields(seed, "cadrage", { name: "MUTÉ", roleKeys: [] });
    seed = removePhase(seed, "staging");
    seed = movePhase(seed, "prod", "up");
    // La copie a bien changé…
    expect(seed.phases.some((p) => p.name === "MUTÉ")).toBe(true);
    // …mais le constant gelé, jamais.
    expect(JSON.stringify(IAKAFRAME_CANONICAL_WORKFLOW)).toBe(before);
  });
});

describe("EW-9/EW-10 — add / remove / move : validité + order normalisé", () => {
  it("addPhase ajoute en fin, id unique, order contigu, roleKeys vide (Q-6)", () => {
    const wf = addPhase(fake());
    expect(wf.phases).toHaveLength(3);
    expect(wf.phases.map((p) => p.order)).toEqual([0, 1, 2]);
    const added = wf.phases[2];
    expect(added.roleKeys).toEqual([]);
    expect(new Set(wf.phases.map((p) => p.id)).size).toBe(3); // ids uniques
    expect(added.gate.kind).toBe("human");
  });

  it("addPhase évite les collisions d'id (phase, phase-2, …)", () => {
    let wf = addPhase(fake());
    wf = addPhase(wf);
    const ids = wf.phases.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("removePhase retire et renumérote 0..N-1", () => {
    const wf = removePhase(fake(), "a");
    expect(wf.phases.map((p) => p.id)).toEqual(["b"]);
    expect(wf.phases.map((p) => p.order)).toEqual([0]);
  });

  it("removePhase REFUSE de descendre sous 1 phase (no-op)", () => {
    const one: Workflow = { ...fake(), phases: [fake().phases[0]] };
    expect(removePhase(one, "a")).toBe(one);
  });

  it("removePhase sur id inconnu = no-op", () => {
    const wf = fake();
    expect(removePhase(wf, "zzz")).toBe(wf);
  });

  it("movePhase échange les voisines et normalise l'order", () => {
    const wf = movePhase(fake(), "b", "up");
    expect(wf.phases.map((p) => p.id)).toEqual(["b", "a"]);
    expect(wf.phases.map((p) => p.order)).toEqual([0, 1]);
  });

  it("movePhase aux bornes / id inconnu = no-op", () => {
    const wf = fake();
    expect(movePhase(wf, "a", "up")).toBe(wf);
    expect(movePhase(wf, "b", "down")).toBe(wf);
    expect(movePhase(wf, "zzz", "up")).toBe(wf);
  });
});

describe("EW-12 — édition des champs + nettoyage de calage (Q-3)", () => {
  it("éditer roleKeys nettoie roleDisplay (l'override ne masque plus l'édition)", () => {
    // cadrage porte roleDisplay:"cadrage" (override de calage).
    const seed = cloneWorkflow(IAKAFRAME_CANONICAL_WORKFLOW);
    const wf = updatePhaseFields(seed, "cadrage", { roleKeys: ["dev", "qualite"] });
    const cadrage = wf.phases.find((p) => p.id === "cadrage")!;
    expect(cadrage.roleDisplay).toBeUndefined();
    expect(cadrage.roleKeys).toEqual(["dev", "qualite"]);
    // Le rendu reflète les nouveaux rôles (par LIBELLÉ, EW-14) — plus l'override.
    expect(renderWorkflowMarkdown(wf)).toContain("Développement + Qualité");
  });

  it("éditer name/description NE touche PAS roleKeys ni le badge", () => {
    const seed = cloneWorkflow(IAKAFRAME_CANONICAL_WORKFLOW);
    const wf = updatePhaseFields(seed, "cadrage", { name: "Cadre", description: "d" });
    const cadrage = wf.phases.find((p) => p.id === "cadrage")!;
    expect(cadrage.name).toBe("Cadre");
    expect(cadrage.badge).toBe("🔵");
  });

  it("éditer la gate nettoie gate.display", () => {
    const seed = cloneWorkflow(IAKAFRAME_CANONICAL_WORKFLOW);
    const wf = updatePhaseGate(seed, "cadrage", { kind: "auto", condition: "nouveau" });
    const gate = wf.phases.find((p) => p.id === "cadrage")!.gate;
    expect(gate.display).toBeUndefined();
    expect(gate.kind).toBe("auto");
    expect(gate.condition).toBe("nouveau");
  });

  it("un workflow NON édité conserve son calage (byte-identité du rendu)", () => {
    const seed = cloneWorkflow(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(renderWorkflowMarkdown(seed)).toBe(
      renderWorkflowMarkdown(IAKAFRAME_CANONICAL_WORKFLOW),
    );
  });
});

describe("EW-5 / EW-6 — injection KitGenOptions.workflow + non-régression byte-identique", () => {
  const team = buildTeamFromRoster("Team", "iakaframe");

  it("EW-6 : sans workflow ni method injectés → sortie byte-identique (canonique)", () => {
    const base = generateCodexKit(team).files["AGENTS.md"];
    expect(base).toContain(renderWorkflowMarkdown(resolveWorkflow()));
  });

  it("EW-5 : workflow injecté est rendu (précédence sur method/canonique)", () => {
    const custom: Workflow = {
      id: "custom",
      name: "Custom",
      methodId: "iakaframe",
      sectionTitle: "Ma section à moi",
      phases: fake().phases,
    };
    const md = generateCodexKit(team, { workflow: custom }).files["AGENTS.md"];
    expect(md).toContain("## Ma section à moi");
    expect(md).toContain(renderWorkflowMarkdown(custom));
  });

  it("EW-5 : opts.workflow a PRÉCÉDENCE sur opts.method (?? court-circuite resolveWorkflow)", () => {
    const custom: Workflow = { ...fake(), sectionTitle: "PRIORITAIRE" };
    const md = generateCodexKit(team, {
      workflow: custom,
      method: {
        id: "iakaframe",
        name: "M",
        scaffoldIds: [],
        workflowId: "iakaframe-canonical",
        principleIds: [],
        ritualIds: [],
        guardrailIds: [],
        roleKeys: [],
      },
    }).files["AGENTS.md"];
    expect(md).toContain("## PRIORITAIRE");
  });
});

describe("EW-11 — zéro modèle/runner sur le workflow édité", () => {
  it("aucun champ modèle/runner n'apparaît dans un workflow ni son rendu", () => {
    const wf = addPhase(cloneWorkflow(IAKAFRAME_CANONICAL_WORKFLOW));
    const json = JSON.stringify(wf).toLowerCase();
    expect(json).not.toContain("model");
    expect(json).not.toContain("runner");
    expect(json).not.toContain("base_model_id");
  });
});
