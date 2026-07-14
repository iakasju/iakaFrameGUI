import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MethodeAtelier } from "./MethodeAtelier";
import { useForgeMethod } from "../useForgeMethod";

/** Harnais : branche le vrai état d'authoring de méthode (insertion RÉELLE) sur l'atelier. */
function MethodeHarness() {
  const { method, insert } = useForgeMethod();
  return (
    <div className="forge">
      <div className="workbench">
        <MethodeAtelier method={method} insert={insert} />
      </div>
    </div>
  );
}

describe("MethodeAtelier — rail à 6 catégories + insertion réelle de principe (E2b §5)", () => {
  it("affiche le diagramme de flux (graphe contextuel Méthode)", () => {
    render(<MethodeHarness />);
    expect(screen.getByRole("img", { name: /Flux du workflow/ })).toBeTruthy();
    expect(screen.getByText(/Diagramme de flux/)).toBeTruthy();
  });

  it("le `+` d'un principe du stock l'INSÈRE réellement dans le MD de la méthode", () => {
    const { container } = render(<MethodeHarness />);
    const md = container.querySelector(".mdpane") as HTMLElement;

    // « Self-hosted d'abord » n'est PAS dans le starter → absent du MD au départ.
    expect(md.textContent).not.toContain("Self-hosted d'abord");

    // Clic sur le + du principe (le bouton porte un aria-label ciblé).
    const addBtn = screen.getByRole("button", {
      name: /Assembler dans la Méthode : Self-hosted d'abord/,
    });
    fireEvent.click(addBtn);

    // Après insertion, le principe apparaît comme sous-élément dépliable du MD.
    expect(md.textContent).toContain("Self-hosted d'abord");
  });
});
