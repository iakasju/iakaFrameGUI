import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App (console à nav 9 entrées, Lot 2)", () => {
  it("expose les entrées de nav frame · méthode · team · … · kit", () => {
    render(<App />);
    expect(screen.getByRole("tab", { name: "frame" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "méthode" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "team" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "kit" })).toBeTruthy();
  });

  it("expose le bouton « Livrer au Cockpit »", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /Livrer au Cockpit/ })).toBeTruthy();
  });
});
