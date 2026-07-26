import { describe, it, expect } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { parsePersona, type Persona } from "@iakaframe/core";
import { PersonaReservoir } from "./PersonaReservoir";

// Repli hors-ligne DÉTERMINISTE : aucune persona réelle → le composant garde le gabarit canonique.
// (Évite un appel réel à loadFrame en test ; prouve le chemin de repli des tests structurels du Lot 3.)
const offline = () => Promise.resolve<Persona[]>([]);

describe("PersonaReservoir — écran réservoir + fiche (Lot 3, A3)", () => {
  it("rend une grille de 9 fiches à vignettes (repli gabarit hors-ligne)", () => {
    render(<PersonaReservoir loadReservoir={offline} />);
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
    render(<PersonaReservoir loadReservoir={offline} />);
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de Gimli"));
    // La pastille de mode signale l'édition, cohérente avec le pattern du Lot 2.
    expect(screen.getByText("✎ édition")).toBeTruthy();
    // L'éditeur réutilisé est monté, pré-rempli avec la persona choisie.
    expect(screen.getByRole("heading", { name: "Éditer la persona" })).toBeTruthy();
    const nameInput = screen.getByPlaceholderText(/Aragorn, ou un nom choisi/) as HTMLInputElement;
    expect(nameInput.value).toBe("Gimli");
  });

  it("« Nouvelle persona » → mode CRÉATION (même composant, pastille ✚ création)", () => {
    render(<PersonaReservoir loadReservoir={offline} />);
    fireEvent.click(screen.getByRole("button", { name: /Nouvelle persona/ }));
    expect(screen.getByText("✚ création")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Nouvelle persona" })).toBeTruthy();
  });

  it("revenir au réservoir depuis la fiche (fil d'Ariane)", () => {
    render(<PersonaReservoir loadReservoir={offline} />);
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de Gandalf"));
    expect(screen.getByText("✎ édition")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "library" }));
    // De retour sur la grille : les 9 fiches sont là.
    const grid = document.querySelector(".persona-reservoir .pgrid") as HTMLElement;
    expect(grid.querySelectorAll(":scope > .pcard").length).toBe(9);
  });

  it("éditer puis enregistrer met à jour la fiche dans le réservoir (état de session)", () => {
    render(<PersonaReservoir loadReservoir={offline} />);
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de Loki"));
    const nameInput = screen.getByPlaceholderText(/Aragorn, ou un nom choisi/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Loki le Malin" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    // De retour sur la grille, la fiche reflète le nouveau nom (id stable → même carte).
    const card = screen.getByLabelText("Ouvrir la fiche de Loki le Malin");
    expect(within(card).getByText("Loki le Malin")).toBeTruthy();
  });

  it("consomme les personas RÉELLES du frame : royaume IAKAFRAME (pas DEV) + ligne de mission", async () => {
    const real: Persona[] = [
      parsePersona({
        id: "gimli",
        name: "Gimli",
        roleKey: "dev",
        royaume: "IAKAFRAME",
        pastille: "🔴",
        skills: ["iakaframe-fabrication"],
        guardrails: ["identity", "perimeter"],
        mission: "Implémente l'instruction validée, builde et commite, jusqu'au staging.",
      })!,
      parsePersona({
        id: "feanor",
        name: "Fëanor",
        roleKey: "frame",
        royaume: "FRAME",
        pastille: "🟠",
        skills: ["iakaframe-frame"],
        guardrails: ["identity", "perimeter"],
        mission: "Aide à forger une frame neuve, from scratch.",
      })!,
    ];
    render(<PersonaReservoir loadReservoir={() => Promise.resolve(real)} />);

    // Chargement asynchrone des personas réelles → la fiche Gimli remplace le gabarit.
    const gimli = await screen.findByLabelText("Ouvrir la fiche de Gimli");
    // La vraie cause du bug est corrigée : badge [IAKAFRAME][Gimli], jamais [DEV][Gimli].
    expect(within(gimli).getByText("[IAKAFRAME][Gimli]")).toBeTruthy();
    expect(within(gimli).queryByText("[DEV][Gimli]")).toBeNull();
    expect(within(gimli).getByText("IAKAFRAME")).toBeTruthy();
    // Ligne de mission surfacée, skill et garde réels.
    expect(
      within(gimli).getByText(/Implémente l'instruction validée, builde et commite/),
    ).toBeTruthy();
    expect(within(gimli).getByText("iakaframe-fabrication")).toBeTruthy();
    expect(within(gimli).getByText("⛨ perimeter")).toBeTruthy();
    // Royaume RÉEL hétérogène : Fëanor = FRAME (jamais roleKey.toUpperCase()).
    const feanor = screen.getByLabelText("Ouvrir la fiche de Fëanor");
    expect(within(feanor).getByText("[FRAME][Fëanor]")).toBeTruthy();
  });
});
