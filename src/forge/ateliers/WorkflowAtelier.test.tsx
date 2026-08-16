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
import frameWorkflow from "../../../packages/core/__tests__/fixtures/workflow.iakaframe-3phases.md?raw";

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

// ---------------------------------------------------------------------------
// GATE-DE-PHASE-OPTIONNEL — la case « Poser un gate » est DÉRIVÉE DE LA DONNÉE et AGIT dessus.
//
// Ces deux tests mesuraient une APPARENCE : ils reposaient sur l'état d'UI local `showGate`, dont
// le commentaire d'origine avouait qu'« aucune donnée sans gate n'est fabriquée — le contrat porte
// toujours une gate par phase ». L'interface affichait « ◇ Aucun gate » pendant que le fichier en
// écrivait un. Ils sont donc RE-CADRÉS sur la donnée, et non ajustés : c'est le test qui rattrape
// le contrat, pas l'inverse.
// ---------------------------------------------------------------------------
describe("WorkflowAtelier — la case à cocher agit sur la DONNÉE, plus sur une apparence", () => {
  /** Workflow canon (`kind: pipeline`) dont la 5e étape `surveillance` n'a AUCUN gate. */
  const canonSeed = (): Workflow => parseWorkflowMd(frameWorkflow)!;

  it("une phase QUI PORTE une gate montre la case COCHÉE et son éditeur", () => {
    render(<WorkflowHarness />);
    // Phase « cadrage » sélectionnée par défaut : elle porte une gate.
    expect(screen.getByText("Gate de sortie")).toBeTruthy();
    const chk = screen.getByLabelText(/Définir un gate de sortie/) as HTMLInputElement;
    expect(chk.checked).toBe(true);
    expect(screen.queryByText(/Aucun gate — étape libre/)).toBeNull();
  });

  it("AC-7 (a) — sélectionner l'étape `surveillance` du canon NE LÈVE PAS et rend « ◇ aucun gate »", () => {
    // Régression exacte du défaut : `kind: pipeline` ⇒ l'ancien `showGate` valait `true`, donc
    // l'éditeur lisait `selected.gate.kind` sur `undefined` — l'atelier ne plantait pas seulement
    // parce que le modèle inventait la gate.
    render(<WorkflowHarness seed={canonSeed()} />);
    // Deux boutons portent ce nom (liste des phases + rail) : on prend le premier — c'est un
    // ajustement de SÉLECTEUR, jamais d'attendu.
    fireEvent.click(screen.getAllByRole("button", { name: /Veille de production/ })[0]);
    expect(screen.getByText(/Aucun gate — étape libre/)).toBeTruthy();
    const chk = screen.getByLabelText(/Définir un gate de sortie/) as HTMLInputElement;
    expect(chk.checked).toBe(false);
  });

  it("AC-7 (c/d) — décocher RETIRE la gate de la donnée, recocher en repose une", () => {
    let seen: Workflow | null = null;
    function Spy() {
      const [wf, setWf] = useState<Workflow>(canonSeed());
      seen = wf;
      return (
        <div className="forge">
          <div className="workbench">
            <WorkflowAtelier
              workflow={wf}
              onWorkflowChange={(next) => {
                seen = next;
                setWf(next);
              }}
            />
          </div>
        </div>
      );
    }
    render(<Spy />);

    // Phase `p1` (sélectionnée par défaut) : elle PORTE une gate.
    expect("gate" in seen!.phases[0]).toBe(true);

    // Décocher ⇒ la clé `gate` DISPARAÎT de la donnée (pas mise à `undefined` — R-4).
    fireEvent.click(screen.getByLabelText(/Définir un gate de sortie/));
    expect("gate" in seen!.phases[0]).toBe(false);
    expect(screen.getByText(/Aucun gate — étape libre/)).toBeTruthy();

    // Recocher ⇒ une gate est reposée sur la donnée.
    fireEvent.click(screen.getByLabelText(/Définir un gate de sortie/));
    expect(seen!.phases[0].gate).toEqual({ kind: "human", condition: "" });
  });

  it("un kind non-gated (cycle) annonce « optionnel » en légende (métadonnée d'UI, pas doctrine)", () => {
    render(<WorkflowHarness />);
    fireEvent.click(screen.getByRole("radio", { name: /kind: cycle$/ }));
    expect(screen.getByText(/Gate de sortie — optionnel/)).toBeTruthy();
    // La case reste offerte QUEL QUE SOIT le kind : le canon est un `pipeline` dont une étape n'a
    // pas de gate — la subordonner à `gatesOptional` rendrait ce cas inexprimable dans l'éditeur.
    expect(screen.getByLabelText(/Définir un gate de sortie/)).toBeTruthy();
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
