import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CANONICAL_ROLES, type Persona } from "@iakaframe/core";
import { PersonaEditor } from "./PersonaEditor";

const base: Persona = {
  id: "aragorn",
  name: "Aragorn",
  roleKey: CANONICAL_ROLES[0].key,
  royaume: "GONDOR",
  roleIndex: 3,
  skills: [],
  guardrails: [],
};

describe("PersonaEditor — mission/pastille éditables + persistés, roleIndex verrouillé (Lot A)", () => {
  it("mission : éditée → présente dans la persona remontée (persistée par le patch)", () => {
    const onSubmit = vi.fn();
    render(<PersonaEditor persona={base} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText(/Coordonne la compagnie/), {
      target: { value: "Dispatche les instructions" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const p = onSubmit.mock.calls[0][0] as Persona;
    expect(p.mission).toBe("Dispatche les instructions");
  });

  it("pastille : éditée → présente dans la persona remontée", () => {
    const onSubmit = vi.fn();
    render(<PersonaEditor persona={base} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText("🟠"), { target: { value: "🔴" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const p = onSubmit.mock.calls[0][0] as Persona;
    expect(p.pastille).toBe("🔴");
  });

  it("mission/pastille vides → clés ABSENTES (jamais de clé vide qui casserait un round-trip)", () => {
    const onSubmit = vi.fn();
    render(<PersonaEditor persona={base} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const p = onSubmit.mock.calls[0][0] as Persona;
    expect("mission" in p).toBe(false);
    expect("pastille" in p).toBe(false);
  });

  it("HONNÊTETÉ (AC1) : roleIndex est VERROUILLÉ (disabled), pas un champ éditable trompeur", () => {
    const onSubmit = vi.fn();
    render(<PersonaEditor persona={base} onSubmit={onSubmit} />);
    const roleIndexInput = screen.getByDisplayValue("3") as HTMLInputElement;
    expect(roleIndexInput.disabled).toBe(true);
    expect(roleIndexInput.className).toContain("locked");
    expect(screen.getByText(/index de casting/)).toBeTruthy();
  });

  it("roleIndex verrouillé : sa valeur (dérivée) traverse le save inchangée (jamais recalculée à la main)", () => {
    const onSubmit = vi.fn();
    render(<PersonaEditor persona={base} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const p = onSubmit.mock.calls[0][0] as Persona;
    expect(p.roleIndex).toBe(3); // valeur d'origine préservée
  });

  it("édition : mission pré-remplie depuis la persona existante", () => {
    const onSubmit = vi.fn();
    render(<PersonaEditor persona={{ ...base, mission: "Garde le cap" }} onSubmit={onSubmit} />);
    expect(screen.getByDisplayValue("Garde le cap")).toBeTruthy();
  });
});
