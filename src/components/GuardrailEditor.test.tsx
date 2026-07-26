import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Guardrail } from "@iakaframe/core";
import { GuardrailEditor } from "./GuardrailEditor";

describe("GuardrailEditor — créer / éditer un garde-fou (Lot 2 + Lot B)", () => {
  it("création : id dérivé du libellé (slug), policy remontée ; kind verrouillé (custom), rendering vide", () => {
    const onSubmit = vi.fn();
    render(<GuardrailEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Nouveau garde-fou" })).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/Canal d'identité/), {
      target: { value: "Garde de budget" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Prose de la garde/), {
      target: { value: "Ne jamais dépasser le budget." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer le garde-fou" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const g = onSubmit.mock.calls[0][0] as Guardrail;
    expect(g.id).toBe("garde-de-budget");
    expect(g.kind).toBe("custom"); // verrouillé (load-bearing) — jamais réattribué à la création
    expect(g.policy).toBe("Ne jamais dépasser le budget.");
    expect(g.rendering).toEqual({}); // non éditable au MVP
  });

  it("HONNÊTETÉ : kind affiché VERROUILLÉ, plus AUCUN contrôle scope fantôme", () => {
    const existing: Guardrail = {
      id: "identity-guard",
      kind: "identity",
      label: "Canal d'identité",
      scope: "persona",
      rendering: {},
      policy: "…",
    };
    render(<GuardrailEditor element={existing} existingIds={[]} onSubmit={vi.fn()} onCancel={() => {}} />);
    // kind rendu, mais verrouillé.
    const kindInput = screen.getByDisplayValue("identity") as HTMLInputElement;
    expect(kindInput.disabled).toBe(true);
    expect(kindInput.className).toContain("locked");
    // le contrôle `scope` fantôme (ancien <select> "persona") n'existe plus.
    expect(screen.queryByDisplayValue("persona")).toBeNull();
  });

  it("création : libellé vide → bouton désactivé, aucun submit", () => {
    const onSubmit = vi.fn();
    render(<GuardrailEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    const btn = screen.getByRole("button", { name: "Créer le garde-fou" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("édition : id VERROUILLÉ (C-1), policy éditable, kind/rendering préservés", () => {
    const onSubmit = vi.fn();
    const existing: Guardrail = {
      id: "identity-guard",
      kind: "identity",
      label: "Canal d'identité",
      scope: "persona",
      rendering: { hook: { event: "Stop", matcher: "*", script: "identity-guard.mjs" } },
      policy: "Politique d'origine.",
    };
    render(<GuardrailEditor element={existing} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Éditer le garde-fou" })).toBeTruthy();
    const idInput = screen.getByDisplayValue("identity-guard") as HTMLInputElement;
    expect(idInput.disabled).toBe(true);

    fireEvent.change(screen.getByDisplayValue("Politique d'origine."), {
      target: { value: "Politique révisée." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const g = onSubmit.mock.calls[0][0] as Guardrail;
    expect(g.id).toBe("identity-guard"); // jamais renommé
    expect(g.kind).toBe("identity"); // load-bearing, préservé
    expect(g.policy).toBe("Politique révisée."); // éditable et remontée
    // rendering préservé (non éditable au MVP).
    expect(g.rendering.hook?.script).toBe("identity-guard.mjs");
  });
});
