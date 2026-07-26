import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { parsePersona, type Persona } from "@iakaframe/core";
import { FeanorHead, FEANOR_STUB_NOTICE, FEANOR_INERT_HINT } from "./FeanorHead";

const gandalf: Persona = parsePersona({
  id: "gandalf",
  name: "Gandalf",
  roleKey: "cadrage",
  royaume: "IAKAFRAME",
  pastille: "🔵",
  roleIndex: 2,
})!;

const feanorReal: Persona = parsePersona({
  id: "feanor",
  name: "Fëanor",
  roleKey: "frame",
  royaume: "FRAME",
  pastille: "🟠",
  roleIndex: 8,
  skills: ["iakaframe-frame"],
})!;

describe("FeanorHead — Fëanor-en-tête, COQUILLE inerte (Lot 6, A6, Fork C)", () => {
  it("mode ÉDITION : monte l'entité éditée + la vignette Fëanor (badge FË, flamme)", () => {
    render(<FeanorHead mode="edit" entity={gandalf} feanorSource={[feanorReal, gandalf]} />);
    const head = document.querySelector(".feanor-head") as HTMLElement;
    expect(head).not.toBeNull();
    // Vignette de l'entité éditée (initiales + nom + type « en édition »).
    expect(head.querySelector(".fh-vg")?.textContent).toBe("GA");
    expect(screen.getByText(/Gandalf/)).toBeTruthy();
    expect(screen.getByText(/persona · en édition/)).toBeTruthy();
    // Vignette de Fëanor : badge flamme « FË » + libellé « Fëanor édite cet élément ».
    expect(head.querySelector(".fh-badge")?.textContent).toBe("FË");
    expect(screen.getByText(/Fëanor édite cet élément/)).toBeTruthy();
    expect(screen.getByText("🔥 édition")).toBeTruthy();
  });

  it("mode CRÉATION : même composant, placeholder honnête + « façonne » (✚)", () => {
    render(<FeanorHead mode="create" entity={null} feanorSource={[feanorReal]} />);
    const head = document.querySelector(".feanor-head") as HTMLElement;
    expect(head).not.toBeNull();
    // Entité vierge → placeholder, jamais une fausse identité.
    expect(head.querySelector(".fh-vg")?.textContent).toBe("＋");
    expect(screen.getByText("Nouvelle persona")).toBeTruthy();
    expect(screen.getByText(/persona · en création/)).toBeTruthy();
    expect(screen.getByText(/Fëanor façonne cet élément/)).toBeTruthy();
    expect(screen.getByText("🔥 création")).toBeTruthy();
  });

  it("INERTIE honnête : la note d'inertie est visible par défaut (aucune IA branchée)", () => {
    render(<FeanorHead mode="edit" entity={gandalf} feanorSource={[feanorReal]} />);
    expect(screen.getByText(FEANOR_INERT_HINT)).toBeTruthy();
  });

  it("INERTIE honnête : « envoyer » ne produit AUCUNE réponse d'IA — seulement l'aveu de coquille", () => {
    render(<FeanorHead mode="edit" entity={gandalf} feanorSource={[feanorReal]} />);
    const send = screen.getByLabelText(/Envoyer à Fëanor/);
    fireEvent.click(send);
    // L'état stub honnête apparaît (statut), sans jamais fabriquer de réponse trompeuse.
    const notice = screen.getByText(FEANOR_STUB_NOTICE);
    expect(notice).toBeTruthy();
    expect(notice.textContent).toMatch(/n'a pas été envoyée à un modèle/);
    // Aucune zone de « réponse » de Fëanor n'existe (pas de faux message d'assistant).
    expect(document.querySelector(".fh-answer")).toBeNull();
    expect(document.querySelector(".amsg")).toBeNull();
  });

  it("la vignette Fëanor dérive du persona réel (pastille 🟠 quand déclarée)", () => {
    render(<FeanorHead mode="edit" entity={gandalf} feanorSource={[feanorReal]} />);
    expect(screen.getByText(/🟠 Fëanor édite cet élément/)).toBeTruthy();
  });
});
