import { describe, it, expect } from "vitest";
import {
  WORKFLOW_CATALOG,
  IAKAFRAME_CANONICAL_WORKFLOW,
  DEFAULT_WORKFLOW_KIND,
  type Workflow,
} from "@iakaframe/core";
import { vignetteGradient } from "./casting";
import {
  buildWorkflowCard,
  buildWorkflowReservoir,
  cloneWorkflowCatalog,
  workflowTint,
  workflowToAuthoredEntity,
  WORKFLOW_BLANK_ENTITY,
  WORKFLOW_STARTER,
} from "./workflowCards";

describe("workflowCards — projection pure du pool workflow (Lot 3, cas riche)", () => {
  it("buildWorkflowReservoir : une fiche par workflow du catalogue, ordre conservé", () => {
    const cards = buildWorkflowReservoir(cloneWorkflowCatalog());
    const ids = Object.values(WORKFLOW_CATALOG).map((w) => w.id);
    expect(cards.length).toBe(ids.length);
    expect(cards.map((c) => c.id)).toEqual(ids);
  });

  it("buildWorkflowCard : nom = name, kind + compte de phases en résumé, phases en puces méta", () => {
    const wf = IAKAFRAME_CANONICAL_WORKFLOW;
    const card = buildWorkflowCard(wf);
    expect(card.name).toBe(wf.name);
    expect(card.ref).toBe(wf.id);
    expect(card.summary).toContain(wf.kind ?? DEFAULT_WORKFLOW_KIND);
    expect(card.summary).toContain(String(wf.phases.length));
    expect(card.chips.length).toBe(wf.phases.length);
    expect(card.chips.every((c) => c.kind === "meta")).toBe(true);
    expect(card.royaume).toBeNull();
    expect(card.roleLabel).toBeNull();
  });

  it("workflowTint : teinte castée par le kind réel (pipeline → 2, dans la palette 0..8)", () => {
    expect(workflowTint("pipeline")).toBe(2);
    expect(workflowTint(undefined)).toBe(workflowTint(DEFAULT_WORKFLOW_KIND));
    for (const k of ["pipeline", "cycle", "flow", "cycle-with-gate"] as const) {
      expect(workflowTint(k)).toBeGreaterThanOrEqual(0);
      expect(workflowTint(k)).toBeLessThanOrEqual(8);
    }
    const wf = IAKAFRAME_CANONICAL_WORKFLOW;
    expect(buildWorkflowCard(wf).gradient).toEqual(vignetteGradient(workflowTint(wf.kind)));
  });

  it("cloneWorkflowCatalog : deep-clone — muter la copie ne touche jamais le canonique gelé", () => {
    const copy = cloneWorkflowCatalog();
    const canon = copy.find((w) => w.id === IAKAFRAME_CANONICAL_WORKFLOW.id)!;
    canon.phases[0].name = "MUTATION";
    expect(IAKAFRAME_CANONICAL_WORKFLOW.phases[0].name).not.toBe("MUTATION");
  });

  it("workflowToAuthoredEntity : entité générique de type `workflow`, key = kind, name = name", () => {
    const e = workflowToAuthoredEntity(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(e.type).toBe("workflow");
    expect(e.typeLabel).toBe("workflow");
    expect(e.name).toBe(IAKAFRAME_CANONICAL_WORKFLOW.name);
    expect(e.key).toBe(IAKAFRAME_CANONICAL_WORKFLOW.kind);
    expect(e.pastille).toBeNull();
  });

  it("WORKFLOW_BLANK_ENTITY : placeholder honnête de création (name vide, newLabel genré)", () => {
    expect(WORKFLOW_BLANK_ENTITY.name).toBe("");
    expect(WORKFLOW_BLANK_ENTITY.newLabel).toBe("Nouveau workflow");
    expect(WORKFLOW_BLANK_ENTITY.type).toBe("workflow");
  });

  it("WORKFLOW_STARTER : amorce valide minimale (une phase, kind par défaut, id/name vides)", () => {
    const s: Workflow = WORKFLOW_STARTER;
    expect(s.id).toBe("");
    expect(s.name).toBe("");
    expect(s.phases.length).toBe(1);
    expect(s.kind).toBe(DEFAULT_WORKFLOW_KIND);
  });
});
