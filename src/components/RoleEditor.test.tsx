import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Role } from "@iakaframe/core";
import { RoleEditor } from "./RoleEditor";

describe("RoleEditor — créer / éditer un rôle (Lot 2)", () => {
  it("création : clé dérivée du libellé (slug), roleIndex remonté ; pas de champ clé affiché", () => {
    const onSubmit = vi.fn();
    render(<RoleEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Nouveau rôle" })).toBeTruthy();
    expect(screen.queryByText("clé (id)")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("ex. Coordination"), {
      target: { value: "Sécurité" },
    });
    fireEvent.change(screen.getByDisplayValue("0"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer le rôle" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const r = onSubmit.mock.calls[0][0] as Role;
    expect(r.key).toBe("securite");
    expect(r.label).toBe("Sécurité");
    expect(r.roleIndex).toBe(4);
  });

  it("création : libellé vide → bouton désactivé, aucun submit", () => {
    const onSubmit = vi.fn();
    render(<RoleEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    const btn = screen.getByRole("button", { name: "Créer le rôle" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("édition : clé VERROUILLÉE (C-1), champs pré-remplis, enregistrement conserve la clé", () => {
    const onSubmit = vi.fn();
    const existing: Role = { key: "cadrage", label: "Cadrage", roleIndex: 2 };
    render(<RoleEditor element={existing} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Éditer le rôle" })).toBeTruthy();
    const keyInput = screen.getByDisplayValue("cadrage") as HTMLInputElement;
    expect(keyInput.disabled).toBe(true);

    fireEvent.change(screen.getByDisplayValue("Cadrage"), { target: { value: "Cadrage & archi" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const r = onSubmit.mock.calls[0][0] as Role;
    expect(r.key).toBe("cadrage"); // jamais renommée
    expect(r.label).toBe("Cadrage & archi");
  });
});
