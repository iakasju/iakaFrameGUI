import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("sans onNameChange : span read-only, pas de textbox", () => {
    render(<DocTitle name="Team iakaframe" dirty={false} />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("heading")).toBeTruthy();
  });

  describe("variante éditable (onNameChange)", () => {
    it("rend un textbox labellisé de valeur name", () => {
      render(<DocTitle name="Team démo" dirty={false} onNameChange={vi.fn()} />);
      const input = screen.getByRole("textbox", { name: "Nom du document" }) as HTMLInputElement;
      expect(input.value).toBe("Team démo");
    });

    it("la frappe déclenche onNameChange avec la valeur verbatim (texte libre)", () => {
      const onNameChange = vi.fn();
      render(<DocTitle name="Team démo" dirty={false} onNameChange={onNameChange} />);
      fireEvent.change(screen.getByRole("textbox", { name: "Nom du document" }), {
        target: { value: "Équipe été 🚀" },
      });
      expect(onNameChange).toHaveBeenCalledWith("Équipe été 🚀");
    });

    it("• présent ssi dirty en mode éditable", () => {
      const { container, rerender } = render(
        <DocTitle name="X" dirty={false} onNameChange={vi.fn()} />,
      );
      expect(container.querySelector(".doc-dirty")).toBeNull();
      rerender(<DocTitle name="X" dirty={true} onNameChange={vi.fn()} />);
      expect(container.querySelector(".doc-dirty")).not.toBeNull();
    });

    it("disabled : retombe en read-only (pas de textbox)", () => {
      render(<DocTitle name="X" dirty={false} onNameChange={vi.fn()} disabled />);
      expect(screen.queryByRole("textbox")).toBeNull();
      expect(screen.getByRole("heading")).toBeTruthy();
    });
  });
});
