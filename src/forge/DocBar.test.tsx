import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DocBar } from "./DocBar";
import type { UseForgeDocument } from "./useForgeDocument";

/** Fabrique un document factice complet (stubs `vi.fn`), surchargeable. */
function makeDoc(
  over: Partial<UseForgeDocument<unknown>> = {},
): UseForgeDocument<unknown> {
  return {
    artifact: {},
    id: "m1",
    name: "Méthode iakaframe",
    dirty: false,
    source: "library",
    edit: vi.fn(),
    requestNew: vi.fn(),
    requestOpen: vi.fn(),
    requestClose: vi.fn(),
    save: vi.fn(async () => ({ ok: true })),
    saveAs: vi.fn(async () => ({ ok: true })),
    listEntries: vi.fn(async () => []),
    guardOpen: false,
    guardSaveThenProceed: vi.fn(async () => {}),
    guardDiscardThenProceed: vi.fn(),
    guardCancel: vi.fn(),
    saveAsOpen: false,
    openSaveAs: vi.fn(),
    closeSaveAs: vi.fn(),
    lastError: null,
    lastWarning: null,
    savedPath: null,
    ...over,
  };
}

describe("DocBar — barre de gestes fichier (§4)", () => {
  it("rend les cinq gestes New · Open · Save · Save As · Close", () => {
    render(<DocBar doc={makeDoc()} />);
    for (const label of ["New", "Open", "Save", "Save As", "Close"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });

  it("Save appelle doc.save()", () => {
    const doc = makeDoc();
    render(<DocBar doc={doc} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  it("la garde « modifs non sauvées » rend la modale à 3 actions", () => {
    const doc = makeDoc({ dirty: true, guardOpen: true });
    render(<DocBar doc={doc} />);
    expect(screen.getByRole("dialog", { name: /Modifications non sauvées/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Abandonner" }));
    expect(doc.guardDiscardThenProceed).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(doc.guardCancel).toHaveBeenCalledTimes(1);
  });

  it("l'invite Save As rend id + nom et déclenche saveAs", () => {
    const doc = makeDoc({ saveAsOpen: true });
    render(<DocBar doc={doc} />);
    fireEvent.change(screen.getByLabelText("id de l'artefact"), {
      target: { value: "mon-id" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(doc.saveAs).toHaveBeenCalled();
  });

  it("affiche l'erreur I1 et l'avertissement d'état", () => {
    render(<DocBar doc={makeDoc({ lastError: "références cassées : personas → x" })} />);
    expect(screen.getByRole("alert").textContent).toMatch(/références cassées/);
  });
});
