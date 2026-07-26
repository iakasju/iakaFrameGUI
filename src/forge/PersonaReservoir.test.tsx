import { describe, it, expect } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { PersonaReservoir } from "./PersonaReservoir";

describe("PersonaReservoir — écran réservoir + fiche (Lot 3, A3)", () => {
  it("rend une grille de 9 fiches à vignettes (les 9 personas vendorées)", () => {
    render(<PersonaReservoir />);
    const grid = document.querySelector(".persona-reservoir .pgrid") as HTMLElement;
    expect(grid).not.toBeNull();
    const cards = grid.querySelectorAll(":scope > .pcard");
    expect(cards.length).toBe(9);
    // Chaque fiche porte une vignette (initiales) et un badge dérivés — GUI-only.
    for (const name of ["Odin", "Gimli", "Fëanor"]) {
      expect(screen.getByLabelText(`Ouvrir la fiche de ${name}`)).toBeTruthy();
    }
  });

  it("sélectionner une fiche → mode ÉDITION (l'éditeur de persona, pastille ✎ édition)", () => {
    render(<PersonaReservoir />);
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de Gimli"));
    // La pastille de mode signale l'édition, cohérente avec le pattern du Lot 2.
    expect(screen.getByText("✎ édition")).toBeTruthy();
    // L'éditeur réutilisé est monté, pré-rempli avec la persona choisie.
    expect(screen.getByRole("heading", { name: "Éditer la persona" })).toBeTruthy();
    const nameInput = screen.getByPlaceholderText(/Aragorn, ou un nom choisi/) as HTMLInputElement;
    expect(nameInput.value).toBe("Gimli");
  });

  it("« Nouvelle persona » → mode CRÉATION (même composant, pastille ✚ création)", () => {
    render(<PersonaReservoir />);
    fireEvent.click(screen.getByRole("button", { name: /Nouvelle persona/ }));
    expect(screen.getByText("✚ création")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Nouvelle persona" })).toBeTruthy();
  });

  it("revenir au réservoir depuis la fiche (fil d'Ariane)", () => {
    render(<PersonaReservoir />);
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de Gandalf"));
    expect(screen.getByText("✎ édition")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "library" }));
    // De retour sur la grille : les 9 fiches sont là.
    const grid = document.querySelector(".persona-reservoir .pgrid") as HTMLElement;
    expect(grid.querySelectorAll(":scope > .pcard").length).toBe(9);
  });

  it("éditer puis enregistrer met à jour la fiche dans le réservoir (état de session)", () => {
    render(<PersonaReservoir />);
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de Loki"));
    const nameInput = screen.getByPlaceholderText(/Aragorn, ou un nom choisi/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Loki le Malin" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    // De retour sur la grille, la fiche reflète le nouveau nom (id stable → même carte).
    const card = screen.getByLabelText("Ouvrir la fiche de Loki le Malin");
    expect(within(card).getByText("Loki le Malin")).toBeTruthy();
  });
});
