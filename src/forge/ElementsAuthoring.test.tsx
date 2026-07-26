import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ElementsAuthoring } from "./ElementsAuthoring";

describe("ElementsAuthoring — l'entrée « éléments » authorable (Lot 1, FORK A)", () => {
  it("MVP : le pilote « principes » est actif et ouvre son réservoir authorable", () => {
    render(<ElementsAuthoring />);
    const rail = screen.getByLabelText("Sélecteur de type d'élément");
    const principe = screen.getByRole("button", { name: /principes/ });
    expect(principe.getAttribute("aria-pressed")).toBe("true");
    // Le réservoir de principes (hôte générique) est monté par défaut.
    expect(screen.getByText("Le réservoir de principes")).toBeTruthy();
    expect(rail).toBeTruthy();
  });

  it("les pools à venir (Lots 2–4) sont listés en repère honnête, non sélectionnables", () => {
    render(<ElementsAuthoring />);
    for (const label of ["skills", "rituels", "gardes-fous", "rôles", "scaffolds", "workflows"]) {
      const el = screen.getByText(label);
      expect(el.closest(".ea-pool.disabled")).not.toBeNull();
    }
    expect(screen.getByText(/À venir/)).toBeTruthy();
  });
});
