import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  IAKAFRAME_CANONICAL_WORKFLOW,
  WORKFLOW_KINDS,
  cloneWorkflow,
  parseWorkflowMd,
  serializeWorkflowMd,
  type Workflow,
} from "@iakaframe/core";
import { WorkflowAtelier } from "./WorkflowAtelier";

/**
 * Harnais : branche un vrai état local sur l'atelier — `onWorkflowChange` mute l'état, l'atelier
 * se re-rend (l'édition du `kind` est ainsi observable de bout en bout, comme dans la coquille).
 */
function WorkflowHarness({ seed }: { seed?: Workflow } = {}) {
  const [wf, setWf] = useState<Workflow>(seed ?? cloneWorkflow(IAKAFRAME_CANONICAL_WORKFLOW));
  return (
    <div className="forge">
      <div className="workbench">
        <WorkflowAtelier workflow={wf} onWorkflowChange={setWf} />
      </div>
    </div>
  );
}

describe("WorkflowAtelier — sélecteur de type (kind) de 1er ordre (Lot 5, workflow agnostique)", () => {
  it("expose les 4 kinds du contrat (pipeline · cycle · flow · cycle-with-gate)", () => {
    render(<WorkflowHarness />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(WORKFLOW_KINDS.length);
    expect(WORKFLOW_KINDS).toHaveLength(4);
    for (const k of WORKFLOW_KINDS) {
      // Le code `kind: <k>` figure au moins sur la carte du sélecteur (et sur le badge d'en-tête).
      expect(screen.getAllByText(`kind: ${k}`).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("le workflow canonique (pipeline) présente `pipeline` sélectionné au départ", () => {
    render(<WorkflowHarness />);
    const pipeline = screen.getByRole("radio", { name: /kind: pipeline/ });
    expect(pipeline.getAttribute("aria-checked")).toBe("true");
  });

  it("choisir un kind le pose sur le workflow (addition immuable — badge d'en-tête reflété)", () => {
    const { container } = render(<WorkflowHarness />);
    fireEvent.click(screen.getByRole("radio", { name: /kind: flow/ }));
    // Badge d'en-tête (classe dédiée) + radio cochée reflètent le nouveau kind.
    expect(container.querySelector(".wfkind-badge")?.textContent).toBe("kind: flow");
    const flow = screen.getByRole("radio", { name: /kind: flow/ });
    expect(flow.getAttribute("aria-checked")).toBe("true");
  });
});

describe("WorkflowAtelier — gates OPTIONNELS selon le kind (le modèle n'impose plus le pipeline)", () => {
  it("un kind gated (pipeline) montre l'éditeur de gate, sans mention « optionnel »", () => {
    render(<WorkflowHarness />);
    // Phase « cadrage » sélectionnée par défaut → éditeur de gate visible (Type humaine/auto).
    expect(screen.getByText("Gate de sortie")).toBeTruthy();
    expect(screen.queryByText(/Gate de sortie — optionnel/)).toBeNull();
    expect(screen.queryByLabelText(/Définir un gate de sortie/)).toBeNull();
  });

  it("un kind non-gated (cycle) rend le gate OPTIONNEL : off par défaut, activable", () => {
    render(<WorkflowHarness />);
    fireEvent.click(screen.getByRole("radio", { name: /kind: cycle$/ }));

    // Légende « optionnel » + étape libre (aucun gate) par défaut pour ce kind.
    expect(screen.getByText(/Gate de sortie — optionnel/)).toBeTruthy();
    expect(screen.getByText(/Aucun gate — étape libre/)).toBeTruthy();

    // Le décideur peut néanmoins poser un gate → l'éditeur (Type humaine/auto) réapparaît.
    fireEvent.click(screen.getByLabelText(/Définir un gate de sortie/));
    expect(screen.queryByText(/Aucun gate — étape libre/)).toBeNull();
    expect(screen.getByRole("combobox", { name: /Type/i })).toBeTruthy();
  });
});

describe("WorkflowAtelier — round-trip du kind (A5 : relu à l'identique, contrat inchangé)", () => {
  it("chacun des 4 kinds survit à serialize → parse (byte-neutre)", () => {
    for (const k of WORKFLOW_KINDS) {
      const wf: Workflow = { ...cloneWorkflow(IAKAFRAME_CANONICAL_WORKFLOW), kind: k };
      const relu = parseWorkflowMd(serializeWorkflowMd(wf, ""));
      expect(relu?.kind).toBe(k);
    }
  });
});
