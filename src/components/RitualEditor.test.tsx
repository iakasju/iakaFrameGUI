import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Ritual } from "@iakaframe/core";
import { RitualEditor } from "./RitualEditor";

describe("RitualEditor — créer / éditer un rituel (Lot 2)", () => {
  it("création : id dérivé du libellé (slug), triggers/actions par ligne, side remontés", () => {
    const onSubmit = vi.fn();
    render(<RitualEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Nouveau rituel" })).toBeTruthy();
    expect(screen.queryByText("id")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText(/iakastart \(bootstrap team\)/), {
      target: { value: "Purge cache" },
    });
    fireEvent.change(screen.getByPlaceholderText(/iakastart iakaframe odin/), {
      target: { value: "purge\nclean cache" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Afficher le banner/), {
      target: { value: "Vider le cache." },
    });
    fireEvent.change(screen.getByDisplayValue(/cockpit \(run\)/), { target: { value: "forge" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer le rituel" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const r = onSubmit.mock.calls[0][0] as Ritual;
    expect(r.id).toBe("purge-cache");
    expect(r.triggers).toEqual(["purge", "clean cache"]);
    expect(r.actions).toEqual(["Vider le cache."]);
    expect(r.side).toBe("forge");
  });

  it("création : libellé vide → bouton désactivé, aucun submit", () => {
    const onSubmit = vi.fn();
    render(<RitualEditor element={null} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    const btn = screen.getByRole("button", { name: "Créer le rituel" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("édition : id VERROUILLÉ (C-1), champs pré-remplis, enregistrement conserve l'id", () => {
    const onSubmit = vi.fn();
    const existing: Ritual = {
      id: "iakastart",
      label: "iakastart (bootstrap team)",
      triggers: ["iakastart", "odin"],
      actions: ["Afficher le banner."],
      side: "cockpit",
    };
    render(<RitualEditor element={existing} existingIds={[]} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("heading", { name: "Éditer le rituel" })).toBeTruthy();
    const idInput = screen.getByDisplayValue("iakastart") as HTMLInputElement;
    expect(idInput.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const r = onSubmit.mock.calls[0][0] as Ritual;
    expect(r.id).toBe("iakastart"); // jamais renommé
    expect(r.triggers).toEqual(["iakastart", "odin"]);
  });
});
