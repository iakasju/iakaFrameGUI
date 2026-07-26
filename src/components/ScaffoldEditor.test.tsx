import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Scaffold } from "@iakaframe/core";
import { ScaffoldEditor } from "./ScaffoldEditor";

describe("ScaffoldEditor — créer / éditer un scaffold (Lot 2)", () => {
  it("création : id dérivé du nom saisi (slug), level remonté, nonDestructive forcé, entries vides (MVP)", () => {
    const onSubmit = vi.fn();
    render(<ScaffoldEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Nouveau scaffold" })).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("ex. project"), {
      target: { value: "Mono Repo" },
    });
    fireEvent.change(screen.getByDisplayValue("project"), { target: { value: "portfolio" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer le scaffold" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const s = onSubmit.mock.calls[0][0] as Scaffold;
    expect(s.id).toBe("mono-repo");
    expect(s.level).toBe("portfolio");
    expect(s.nonDestructive).toBe(true); // invariant forcé
    expect(s.entries).toEqual([]); // non éditables au MVP (simplification remontée)
  });

  it("création : nom vide → bouton désactivé, aucun submit", () => {
    const onSubmit = vi.fn();
    render(<ScaffoldEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    const btn = screen.getByRole("button", { name: "Créer le scaffold" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("édition : id VERROUILLÉ (C-1), entries PRÉSERVÉES, nonDestructive true, enregistrement conserve l'id", () => {
    const onSubmit = vi.fn();
    const existing: Scaffold = {
      id: "project",
      level: "portfolio", // distinct de l'id pour lever l'ambiguïté getByDisplayValue
      entries: [{ path: "specs/", role: "Décisions.", createIfAbsent: true }],
      nonDestructive: true,
    };
    render(<ScaffoldEditor element={existing} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Éditer le scaffold" })).toBeTruthy();
    const idInput = screen.getByDisplayValue("project") as HTMLInputElement;
    expect(idInput.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const s = onSubmit.mock.calls[0][0] as Scaffold;
    expect(s.id).toBe("project"); // jamais renommé
    expect(s.entries).toHaveLength(1); // entrées préservées (non éditables au MVP)
    expect(s.nonDestructive).toBe(true);
  });
});
