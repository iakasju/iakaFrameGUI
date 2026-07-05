import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App (navigation minimale, C-2)", () => {
  it("expose les onglets Personas, Teams, Réglages", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "Personas" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Teams" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Réglages" })).toBeTruthy();
  });
});
