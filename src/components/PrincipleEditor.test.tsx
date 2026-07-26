import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Principle } from "@iakaframe/core";
import { PrincipleEditor } from "./PrincipleEditor";

describe("PrincipleEditor — créer / éditer un principe (Lot 1, § 4.3)", () => {
  it("création : id dérivé du libellé (slug), remonté à onSubmit ; pas de champ id affiché", () => {
    const onSubmit = vi.fn();
    render(<PrincipleEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Nouveau principe" })).toBeTruthy();
    // Pas de champ id en création (l'id naît du libellé).
    expect(screen.queryByText("id")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("ex. MVP d'abord"), {
      target: { value: "Zéro dette" },
    });
    fireEvent.change(screen.getByPlaceholderText(/MVP d'abord, puis itérer/), {
      target: { value: "Payer la dette au fil de l'eau." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer le principe" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const p = onSubmit.mock.calls[0][0] as Principle;
    expect(p.id).toBe("zero-dette");
    expect(p.label).toBe("Zéro dette");
    expect(p.policy).toBe("Payer la dette au fil de l'eau.");
  });

  it("création : libellé vide → bouton désactivé, aucun submit", () => {
    const onSubmit = vi.fn();
    render(<PrincipleEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    const btn = screen.getByRole("button", { name: "Créer le principe" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("création : id en collision → suffixe -2 (unicité)", () => {
    const onSubmit = vi.fn();
    render(<PrincipleEditor element={null} existingIds={["zero-dette"]} onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("ex. MVP d'abord"), {
      target: { value: "Zéro dette" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer le principe" }));
    expect((onSubmit.mock.calls[0][0] as Principle).id).toBe("zero-dette-2");
  });

  it("édition : id VERROUILLÉ (C-1), champs pré-remplis, enregistrement conserve l'id", () => {
    const onSubmit = vi.fn();
    const existing: Principle = {
      id: "mvp-first",
      label: "MVP d'abord",
      policy: "MVP d'abord, puis itérer.",
      trigger: "cadrage d'une feature",
    };
    render(<PrincipleEditor element={existing} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Éditer le principe" })).toBeTruthy();
    const idInput = screen.getByDisplayValue("mvp-first") as HTMLInputElement;
    expect(idInput.disabled).toBe(true);

    fireEvent.change(screen.getByDisplayValue("cadrage d'une feature"), {
      target: { value: "cadrage d'une feature (révisé)" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const p = onSubmit.mock.calls[0][0] as Principle;
    expect(p.id).toBe("mvp-first"); // jamais renommé
    expect(p.trigger).toBe("cadrage d'une feature (révisé)");
  });
});
