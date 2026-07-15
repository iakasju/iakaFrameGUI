import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocTitle } from "./DocTitle";

describe("DocTitle — titre de document (§6)", () => {
  it("affiche le nom courant, sans `•` quand non modifié", () => {
    const { container } = render(<DocTitle name="Méthode iakaframe" dirty={false} />);
    expect(screen.getByText("Méthode iakaframe")).toBeTruthy();
    expect(container.querySelector(".doc-dirty")).toBeNull();
  });

  it("préfixe `•` quand le document est modifié", () => {
    const { container } = render(<DocTitle name="Méthode iakaframe" dirty={true} />);
    expect(container.querySelector(".doc-dirty")).not.toBeNull();
  });

  it("vierge → « sans-titre »", () => {
    render(<DocTitle name="" dirty={false} />);
    expect(screen.getByText("sans-titre")).toBeTruthy();
  });
});
