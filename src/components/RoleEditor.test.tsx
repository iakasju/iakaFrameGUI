import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Role } from "@iakaframe/core";
import { RoleEditor } from "./RoleEditor";

describe("RoleEditor — créer / éditer un rôle (Lot 2 + Lot B)", () => {
  it("création : clé dérivée du libellé (slug), scope remonté ; pas de champ clé affiché", () => {
    const onSubmit = vi.fn();
    render(<RoleEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Nouveau rôle" })).toBeTruthy();
    expect(screen.queryByText("clé (id)")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("ex. Coordination"), {
      target: { value: "Sécurité" },
    });
    fireEvent.change(screen.getByPlaceholderText("ex. team"), { target: { value: "persona" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer le rôle" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const r = onSubmit.mock.calls[0][0] as Role;
    expect(r.key).toBe("securite");
    expect(r.label).toBe("Sécurité");
    expect(r.scope).toBe("persona");
  });

  it("HONNÊTETÉ : roleIndex affiché VERROUILLÉ (jamais un contrôle éditable)", () => {
    render(<RoleEditor element={null} existingIds={[]} onSubmit={vi.fn()} onCancel={() => {}} />);
    const roleIndexInput = screen.getByDisplayValue("0") as HTMLInputElement;
    expect(roleIndexInput.disabled).toBe(true);
    expect(roleIndexInput.className).toContain("locked");
  });

  it("création : libellé vide → bouton désactivé, aucun submit", () => {
    const onSubmit = vi.fn();
    render(<RoleEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    const btn = screen.getByRole("button", { name: "Créer le rôle" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("édition : clé VERROUILLÉE (C-1), scope éditable, roleIndex préservé et verrouillé", () => {
    const onSubmit = vi.fn();
    const existing: Role = { id: "cadrage", key: "cadrage", label: "Cadrage", roleIndex: 2, scope: "team" };
    render(<RoleEditor element={existing} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Éditer le rôle" })).toBeTruthy();
    const keyInput = screen.getByDisplayValue("cadrage") as HTMLInputElement;
    expect(keyInput.disabled).toBe(true);
    // roleIndex verrouillé (préservé, jamais recalculé).
    const roleIndexInput = screen.getByDisplayValue("2") as HTMLInputElement;
    expect(roleIndexInput.disabled).toBe(true);

    fireEvent.change(screen.getByDisplayValue("Cadrage"), { target: { value: "Cadrage & archi" } });
    fireEvent.change(screen.getByDisplayValue("team"), { target: { value: "role" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const r = onSubmit.mock.calls[0][0] as Role;
    expect(r.key).toBe("cadrage"); // jamais renommée
    expect(r.label).toBe("Cadrage & archi");
    expect(r.scope).toBe("role"); // éditable et remonté
    expect(r.roleIndex).toBe(2); // préservé tel quel
  });
});
