import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { SkillAtom } from "@iakaframe/core";
import { SkillEditor } from "./SkillEditor";

describe("SkillEditor — rebranché sur SkillAtom (Lot C)", () => {
  it("création : id dérivé du nom (slug), name == id ; description + subskills remontés", () => {
    const onSubmit = vi.fn();
    render(<SkillEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Nouvelle skill" })).toBeTruthy();
    // Pas de champ id/name affiché en création (ils naissent du nom saisi).
    expect(screen.queryByText("id")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("ex. iakaframe-revue-securite"), {
      target: { value: "Revue de sécurité" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Ce que fait la skill + quand l'invoquer (déclenchement du sous-agent)…"),
      { target: { value: "Auditer la sécurité — invoquer pour revoir un diff sensible." } },
    );
    // Ajoute une sous-skill via le socle <ListEditor>.
    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter une sous-skill" }));
    fireEvent.change(screen.getByPlaceholderText("ex. iakaframe-gestion-de-source"), {
      target: { value: "iakaframe-git" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer la skill" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const s = onSubmit.mock.calls[0][0] as SkillAtom;
    expect(s.id).toBe("revue-de-securite");
    expect(s.name).toBe("revue-de-securite"); // name == id au canon
    expect(s.description).toBe("Auditer la sécurité — invoquer pour revoir un diff sensible.");
    expect(s.subskills).toEqual(["iakaframe-git"]);
  });

  it("création : nom vide → bouton désactivé, aucun submit", () => {
    const onSubmit = vi.fn();
    render(<SkillEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    const btn = screen.getByRole("button", { name: "Créer la skill" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("édition : id ET name VERROUILLÉS (C-1) ; description éditable ; enregistrement conserve id/name", () => {
    const onSubmit = vi.fn();
    const existing: SkillAtom = {
      id: "iakaframe-cadrage",
      name: "iakaframe-cadrage",
      description: "Blurb initial",
      subskills: [],
    };
    render(<SkillEditor element={existing} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Éditer la skill" })).toBeTruthy();

    // id ET name partagent la valeur (name == id au canon) → 2 champs, tous deux verrouillés.
    const lockedInputs = screen.getAllByDisplayValue("iakaframe-cadrage") as HTMLInputElement[];
    expect(lockedInputs.length).toBe(2); // id + name
    expect(lockedInputs.every((i) => i.disabled)).toBe(true);

    // description éditable.
    fireEvent.change(screen.getByDisplayValue("Blurb initial"), {
      target: { value: "Blurb affûté" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const s = onSubmit.mock.calls[0][0] as SkillAtom;
    expect(s.id).toBe("iakaframe-cadrage"); // jamais renommé
    expect(s.name).toBe("iakaframe-cadrage"); // préservé verbatim
    expect(s.description).toBe("Blurb affûté");
  });

  it("honnêteté (AC1) : aucun contrôle fantôme label/roleKey (retirés au Lot C)", () => {
    const existing: SkillAtom = {
      id: "iakaframe-fabrication",
      name: "iakaframe-fabrication",
      description: "d",
      subskills: ["iakaframe-git"],
    };
    render(<SkillEditor element={existing} existingIds={[]} onSubmit={vi.fn()} onCancel={() => {}} />);
    // Plus de libellé « Libellé (libre) » ni « Rôle de rattachement » (les fantômes d'avant Lot C).
    expect(screen.queryByText("Libellé (libre)")).toBeNull();
    expect(screen.queryByText("Rôle de rattachement")).toBeNull();
    // La garde visible du champ load-bearing description est présente.
    expect(screen.getByText(/blurb pilote la/i)).toBeTruthy();
  });

  it("subskills : édition/suppression via <ListEditor>, lignes vides filtrées au submit", () => {
    const onSubmit = vi.fn();
    const existing: SkillAtom = {
      id: "iakaframe-git",
      name: "iakaframe-git",
      description: "d",
      subskills: ["iakaframe-forgejo"],
    };
    render(<SkillEditor element={existing} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    // Ajoute une 2e ligne mais la laisse vide → doit être filtrée.
    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter une sous-skill" }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const s = onSubmit.mock.calls[0][0] as SkillAtom;
    expect(s.subskills).toEqual(["iakaframe-forgejo"]); // ligne vide filtrée
  });
});
