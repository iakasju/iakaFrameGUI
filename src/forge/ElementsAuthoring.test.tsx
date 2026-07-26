import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ElementsAuthoring } from "./ElementsAuthoring";

describe("ElementsAuthoring — l'entrée « éléments » authorable (Lot 1 pilote + Lot 2 pools)", () => {
  it("le pilote « principes » est actif et ouvre son réservoir authorable par défaut", () => {
    render(<ElementsAuthoring />);
    const rail = screen.getByLabelText("Sélecteur de type d'élément");
    const principe = screen.getByRole("button", { name: /principes/ });
    expect(principe.getAttribute("aria-pressed")).toBe("true");
    // Le réservoir de principes (hôte générique) est monté par défaut.
    expect(screen.getByText("Le réservoir de principes")).toBeTruthy();
    expect(rail).toBeTruthy();
  });

  it("Lot 2 : les 5 pools de catalogue sont sélectionnables et ouvrent leur réservoir", () => {
    const pools: [RegExp, string][] = [
      [/skills/, "Le réservoir de skills"],
      [/rituels/, "Le réservoir de rituels"],
      [/gardes-fous/, "Le réservoir de gardes-fous"],
      [/rôles/, "Le réservoir de rôles"],
      [/scaffolds/, "Le réservoir de scaffolds"],
    ];
    for (const [name, title] of pools) {
      const { unmount } = render(<ElementsAuthoring />);
      fireEvent.click(screen.getByRole("button", { name }));
      expect(screen.getByText(title)).toBeTruthy();
      unmount();
    }
  });

  it("seul « workflows » reste à venir (Lot 3), non sélectionnable", () => {
    render(<ElementsAuthoring />);
    const wf = screen.getByText("workflows");
    expect(wf.closest(".ea-pool.disabled")).not.toBeNull();
    expect(screen.getByText(/À venir/)).toBeTruthy();
    // Les 5 pools du Lot 2 ne sont plus « à venir » : ils sont des boutons actifs.
    for (const label of ["skills", "rituels", "gardes-fous", "rôles", "scaffolds"]) {
      const btn = screen.getByRole("button", { name: new RegExp(label) });
      expect(btn.className).toContain("ea-pool");
    }
  });
});
