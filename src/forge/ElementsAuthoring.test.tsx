import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ElementsAuthoring } from "./ElementsAuthoring";

describe("ElementsAuthoring — l'entrée « éléments » authorable (Lot 1 pilote + Lot 2 + Lot 3 workflow)", () => {
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

  it("Lot 3 : « workflows » devient actif et ouvre le réservoir de workflows (plus de « À venir »)", () => {
    render(<ElementsAuthoring />);
    // Le workflow n'est plus « à venir » : c'est un bouton actif, aucun pool désactivé restant.
    const wf = screen.getByRole("button", { name: /workflows/ });
    expect(wf.className).toContain("ea-pool");
    expect(wf.closest(".ea-pool.disabled")).toBeNull();
    expect(screen.queryByText(/À venir/)).toBeNull();
    fireEvent.click(wf);
    expect(screen.getByText("Le réservoir de workflows")).toBeTruthy();
  });

  it("le réservoir workflow ouvre la fiche riche (Fëanor-en-tête + éditeur kind/phases) sur clic d'une fiche", () => {
    render(<ElementsAuthoring />);
    fireEvent.click(screen.getByRole("button", { name: /workflows/ }));
    // La fiche du canonique s'ouvre en édition → Fëanor-en-tête (agnostique) + l'éditeur WorkflowAtelier.
    fireEvent.click(screen.getByLabelText(/Ouvrir la fiche de/));
    expect(screen.getByText("Éditer le workflow")).toBeTruthy();
    // L'éditeur riche existant est bien monté : sélecteur de type (kind) + phases.
    expect(screen.getByRole("radiogroup", { name: /Type de workflow/ })).toBeTruthy();
    // FeanorHead en tête (hérité de l'hôte, agnostique).
    expect(screen.getByLabelText(/Fëanor en tête/)).toBeTruthy();
  });
});
