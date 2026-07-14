import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App (forge à trois ateliers, E2b)", () => {
  it("expose les onglets de 1er étage Team, Méthode, Kit", () => {
    render(<App />);
    expect(screen.getByRole("tab", { name: /Team/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Méthode/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Kit/ })).toBeTruthy();
  });

  it("expose le bouton « Livrer au Cockpit »", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /Livrer au Cockpit/ })).toBeTruthy();
  });
});
