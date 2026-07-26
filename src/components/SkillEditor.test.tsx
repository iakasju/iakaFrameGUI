import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Skill } from "@iakaframe/core";
import { SkillEditor } from "./SkillEditor";

describe("SkillEditor — créer / éditer une skill (Lot 2)", () => {
  it("création : id dérivé du libellé (slug), roleKey remonté ; pas de champ id affiché", () => {
    const onSubmit = vi.fn();
    render(<SkillEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Nouvelle skill" })).toBeTruthy();
    expect(screen.queryByText("id")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("ex. Cadrage / architecture"), {
      target: { value: "Revue de sécurité" },
    });
    fireEvent.change(screen.getByPlaceholderText("ex. cadrage"), {
      target: { value: "qualite" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer la skill" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const s = onSubmit.mock.calls[0][0] as Skill;
    expect(s.id).toBe("revue-de-securite");
    expect(s.label).toBe("Revue de sécurité");
    expect(s.roleKey).toBe("qualite");
  });

  it("création : libellé vide → bouton désactivé, aucun submit", () => {
    const onSubmit = vi.fn();
    render(<SkillEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    const btn = screen.getByRole("button", { name: "Créer la skill" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("édition : id VERROUILLÉ (C-1), champs pré-remplis, enregistrement conserve l'id", () => {
    const onSubmit = vi.fn();
    const existing: Skill = { id: "iakaframe-cadrage", roleKey: "cadrage", label: "Cadrage / architecture" };
    render(<SkillEditor element={existing} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Éditer la skill" })).toBeTruthy();
    const idInput = screen.getByDisplayValue("iakaframe-cadrage") as HTMLInputElement;
    expect(idInput.disabled).toBe(true);

    fireEvent.change(screen.getByDisplayValue("cadrage"), { target: { value: "qualite" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const s = onSubmit.mock.calls[0][0] as Skill;
    expect(s.id).toBe("iakaframe-cadrage"); // jamais renommé
    expect(s.roleKey).toBe("qualite");
  });
});
