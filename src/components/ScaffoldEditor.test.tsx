import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
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
    expect(s.entries).toHaveLength(1); // entrées préservées (aucune édition ici)
    expect(s.nonDestructive).toBe(true);
  });
});

describe("ScaffoldEditor — entries éditables via <ListEditor> (chantier #4 Lot A)", () => {
  const existing: Scaffold = {
    id: "projet",
    level: "project",
    entries: [
      { path: "specs/", role: "cadrage", createIfAbsent: true },
      { path: "CLAUDE.md", role: "contrat", createIfAbsent: true },
    ],
    nonDestructive: true,
  };

  it("édition d'un chemin d'entrée → remonté dans onSubmit", () => {
    const onSubmit = vi.fn();
    render(<ScaffoldEditor element={existing} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    const row1 = screen.getByRole("group", { name: "entrée specs/" });
    fireEvent.change(within(row1).getByLabelText("chemin"), { target: { value: "specs/instructions/" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const s = onSubmit.mock.calls[0][0] as Scaffold;
    expect(s.entries[0].path).toBe("specs/instructions/");
    expect(s.entries).toHaveLength(2);
  });

  it("ajout d'une entrée (path + rôle + createIfAbsent) → remontée", () => {
    const onSubmit = vi.fn();
    render(<ScaffoldEditor element={existing} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter une entrée" }));
    const row3 = screen.getByRole("group", { name: "entrée 3" });
    fireEvent.change(within(row3).getByLabelText("chemin"), { target: { value: "docker/" } });
    fireEvent.change(within(row3).getByLabelText("rôle"), { target: { value: "isolation" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const s = onSubmit.mock.calls[0][0] as Scaffold;
    expect(s.entries).toHaveLength(3);
    expect(s.entries[2]).toEqual({ path: "docker/", role: "isolation", createIfAbsent: true });
  });

  it("suppression / réordonnancement d'une entrée", () => {
    const onSubmit = vi.fn();
    render(<ScaffoldEditor element={existing} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "descendre entrée specs/" }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const s = onSubmit.mock.calls[0][0] as Scaffold;
    expect(s.entries.map((e) => e.path)).toEqual(["CLAUDE.md", "specs/"]);
  });

  it("HONNÊTETÉ : une entrée à path vide (ligne incomplète) est filtrée, non persistée", () => {
    const onSubmit = vi.fn();
    render(<ScaffoldEditor element={existing} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter une entrée" })); // ligne vierge, path vide
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const s = onSubmit.mock.calls[0][0] as Scaffold;
    expect(s.entries).toHaveLength(2); // la ligne vide n'est PAS persistée
  });

  it("createIfAbsent : la checkbox est éditable et remontée", () => {
    const onSubmit = vi.fn();
    render(<ScaffoldEditor element={existing} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    const row1 = screen.getByRole("group", { name: "entrée specs/" });
    fireEvent.click(within(row1).getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const s = onSubmit.mock.calls[0][0] as Scaffold;
    expect(s.entries[0].createIfAbsent).toBe(false);
  });
});
