import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ForgeShell } from "./ForgeShell";

describe("ForgeShell — onglets de 1er étage Team · Méthode · Kit (E2b §9)", () => {
  it("bascule vers l'atelier Méthode puis Kit", async () => {
    render(<ForgeShell />);

    // Atelier Team par défaut (après semis de la team de départ).
    expect(await screen.findByText(/Stock — atelier Team · casting pur/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Méthode/ }));
    expect(await screen.findByText(/Stock — atelier Méthode · la discipline/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Kit/ }));
    expect(await screen.findByText(/Stock — atelier Kit · assemblage total/)).toBeTruthy();
  });

  it("le bouton « Livrer au Cockpit » est présent dans la barre", async () => {
    render(<ForgeShell />);
    expect(await screen.findByRole("button", { name: /Livrer au Cockpit/ })).toBeTruthy();
  });
});
