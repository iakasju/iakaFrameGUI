import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Guardrail } from "@iakaframe/core";
import { GuardrailEditor } from "./GuardrailEditor";

describe("GuardrailEditor — créer / éditer un garde-fou (Lot 2)", () => {
  it("création : id dérivé du libellé (slug), kind/scope remontés ; rendering vide (MVP)", () => {
    const onSubmit = vi.fn();
    render(<GuardrailEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Nouveau garde-fou" })).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/Canal d'identité/), {
      target: { value: "Garde de budget" },
    });
    fireEvent.change(screen.getByDisplayValue("custom"), { target: { value: "permission" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer le garde-fou" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const g = onSubmit.mock.calls[0][0] as Guardrail;
    expect(g.id).toBe("garde-de-budget");
    expect(g.kind).toBe("permission");
    expect(g.rendering).toEqual({}); // non éditable au MVP (simplification remontée)
  });

  it("création : libellé vide → bouton désactivé, aucun submit", () => {
    const onSubmit = vi.fn();
    render(<GuardrailEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    const btn = screen.getByRole("button", { name: "Créer le garde-fou" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("édition : id VERROUILLÉ (C-1), rendering PRÉSERVÉ tel quel, enregistrement conserve l'id", () => {
    const onSubmit = vi.fn();
    const existing: Guardrail = {
      id: "identity-guard",
      kind: "identity",
      label: "Canal d'identité",
      scope: "persona",
      rendering: { hook: { event: "Stop", matcher: "*", script: "identity-guard.mjs" } },
    };
    render(<GuardrailEditor element={existing} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Éditer le garde-fou" })).toBeTruthy();
    const idInput = screen.getByDisplayValue("identity-guard") as HTMLInputElement;
    expect(idInput.disabled).toBe(true);

    fireEvent.change(screen.getByDisplayValue("persona"), { target: { value: "team" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const g = onSubmit.mock.calls[0][0] as Guardrail;
    expect(g.id).toBe("identity-guard"); // jamais renommé
    expect(g.scope).toBe("team");
    // rendering préservé (non éditable au MVP).
    expect(g.rendering.hook?.script).toBe("identity-guard.mjs");
  });
});
