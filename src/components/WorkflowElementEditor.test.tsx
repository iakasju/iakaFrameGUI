import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IAKAFRAME_CANONICAL_WORKFLOW, type Workflow } from "@iakaframe/core";
import { WorkflowElementEditor } from "./WorkflowElementEditor";

describe("WorkflowElementEditor — l'adaptateur qui réutilise WorkflowAtelier dans l'hôte (Lot 3)", () => {
  it("édition : monte l'éditeur riche existant (kind + phases) et l'id est verrouillé (C-1)", () => {
    const onSubmit = vi.fn();
    render(
      <WorkflowElementEditor
        element={IAKAFRAME_CANONICAL_WORKFLOW}
        existingIds={[]}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Éditer le workflow")).toBeTruthy();
    // L'éditeur riche existant est réutilisé (jamais réimplémenté) : radiogroup du kind + phases.
    expect(screen.getByRole("radiogroup", { name: /Type de workflow/ })).toBeTruthy();
    // id verrouillé en édition.
    const idInput = screen.getByDisplayValue(IAKAFRAME_CANONICAL_WORKFLOW.id) as HTMLInputElement;
    expect(idInput.disabled).toBe(true);
  });

  it("édition : Enregistrer remonte le workflow (id/name préservés) via onSubmit", () => {
    const onSubmit = vi.fn<(w: Workflow) => void>();
    render(
      <WorkflowElementEditor
        element={IAKAFRAME_CANONICAL_WORKFLOW}
        existingIds={[]}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.id).toBe(IAKAFRAME_CANONICAL_WORKFLOW.id);
    expect(submitted.name).toBe(IAKAFRAME_CANONICAL_WORKFLOW.name);
  });

  it("création : nom vide → soumission bloquée ; nom saisi → id dérivé (slug unique) et verrouillé", () => {
    const onSubmit = vi.fn<(w: Workflow) => void>();
    render(
      <WorkflowElementEditor
        element={null}
        existingIds={["mon-workflow"]}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    const createBtn = screen.getByRole("button", { name: "Créer le workflow" }) as HTMLButtonElement;
    // Nom vide → bouton désactivé (aucune fausse soumission).
    expect(createBtn.disabled).toBe(true);
    // Nom saisi via le champ propre à l'adaptateur (WorkflowAtelier n'édite pas le nom).
    fireEvent.change(screen.getByPlaceholderText(/Workflow canonique/), {
      target: { value: "Mon workflow" },
    });
    expect(createBtn.disabled).toBe(false);
    fireEvent.click(createBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.name).toBe("Mon workflow");
    // id dérivé du nom (slug) et rendu unique face à l'id déjà pris "mon-workflow".
    expect(submitted.id).not.toBe("");
    expect(submitted.id).not.toBe("mon-workflow");
  });

  it("création : édite le kind via l'éditeur réutilisé, puis le remonte à la soumission", () => {
    const onSubmit = vi.fn<(w: Workflow) => void>();
    render(
      <WorkflowElementEditor
        element={null}
        existingIds={[]}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText(/Workflow canonique/), {
      target: { value: "Flow libre" },
    });
    // Changer le kind dans l'éditeur riche existant (radio "Flow").
    fireEvent.click(screen.getByRole("radio", { name: /Flow/ }));
    fireEvent.click(screen.getByRole("button", { name: "Créer le workflow" }));
    expect(onSubmit.mock.calls[0][0].kind).toBe("flow");
  });
});
