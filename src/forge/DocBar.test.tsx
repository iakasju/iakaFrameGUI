import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    setName: vi.fn(),
    canRename: true,
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

  it("préremplit l'invite Save As depuis le nom courant (Q-4)", () => {
    const doc = makeDoc({ saveAsOpen: true, name: "Ma team" });
    render(<DocBar doc={doc} />);
    const nameInput = screen.getByLabelText("nom de l'artefact") as HTMLInputElement;
    const idInput = screen.getByLabelText("id de l'artefact") as HTMLInputElement;
    expect(nameInput.value).toBe("Ma team");
    expect(idInput.value).toBe("ma-team");
  });

  it("Save As sur un vierge « sans-titre » : champs vides (pas de préremplissage)", () => {
    const doc = makeDoc({ saveAsOpen: true, name: "sans-titre" });
    render(<DocBar doc={doc} />);
    expect((screen.getByLabelText("nom de l'artefact") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("id de l'artefact") as HTMLInputElement).value).toBe("");
  });

  it("affiche l'erreur I1 et l'avertissement d'état", () => {
    render(<DocBar doc={makeDoc({ lastError: "références cassées : personas → x" })} />);
    expect(screen.getByRole("alert").textContent).toMatch(/références cassées/);
  });
});

describe("DocBar — dismiss des menus (correctif recette #2 : clic-away + Escape)", () => {
  it("la liste Open se ferme au clic EXTÉRIEUR", async () => {
    const doc = makeDoc({ listEntries: vi.fn(async () => [{ id: "a", name: "Alpha" }]) });
    render(
      <div>
        <button type="button">dehors</button>
        <DocBar doc={doc} />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("listbox", { name: "Ouvrir un artefact" })).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole("button", { name: "dehors" }));
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  });

  it("la liste Open se ferme sur Escape", async () => {
    const doc = makeDoc({ listEntries: vi.fn(async () => []) });
    render(<DocBar doc={doc} />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  });

  it("un clic DANS la liste Open ne la ferme pas", async () => {
    const doc = makeDoc({ listEntries: vi.fn(async () => [{ id: "a", name: "Alpha" }]) });
    render(<DocBar doc={doc} />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const list = await screen.findByRole("listbox");
    fireEvent.mouseDown(list);
    expect(screen.getByRole("listbox")).toBeTruthy();
  });

  it("l'invite Save As se ferme au clic EXTÉRIEUR (appelle closeSaveAs)", () => {
    const doc = makeDoc({ saveAsOpen: true });
    render(
      <div>
        <button type="button">dehors</button>
        <DocBar doc={doc} />
      </div>,
    );
    expect(screen.getByRole("dialog", { name: "Enregistrer sous" })).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole("button", { name: "dehors" }));
    expect(doc.closeSaveAs).toHaveBeenCalledTimes(1);
  });

  it("l'invite Save As se ferme sur Escape (appelle closeSaveAs)", () => {
    const doc = makeDoc({ saveAsOpen: true });
    render(<DocBar doc={doc} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(doc.closeSaveAs).toHaveBeenCalledTimes(1);
  });

  it("un clic DANS l'invite Save As ne la ferme pas (closeSaveAs non appelé)", () => {
    const doc = makeDoc({ saveAsOpen: true });
    render(<DocBar doc={doc} />);
    fireEvent.mouseDown(screen.getByLabelText("id de l'artefact"));
    expect(doc.closeSaveAs).not.toHaveBeenCalled();
  });
});
