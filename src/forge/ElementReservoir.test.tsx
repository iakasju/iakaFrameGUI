/**
 * ElementReservoir.test.tsx — l'**hôte générique** (Lot 1, § 4.2). Prouve :
 *   1b — un hôte réutilisable (grille + fiche + ✚/✎ + Fëanor-en-tête monté UNE fois) qui sert
 *        N'IMPORTE quel `ElementKind` (ici : un pool factice minimal ET le pilote `principe`).
 *   1c — le pilote `principe` authorable de bout en bout (réservoir + New + sélection→édition +
 *        FeanorHead en tête), édition locale de session, source catalogue canonique.
 * La non-régression persona du même hôte est prouvée par `PersonaReservoir.test.tsx`.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { CATALOG_PRINCIPLES } from "@iakaframe/core";
import { ElementReservoir } from "./ElementReservoir";
import { principleKind } from "./principleKind";
import type { ElementKind } from "./elementKind";

// ---- Un pool FACTICE minimal : prouve que l'hôte ne connaît aucun type concret. ----
interface Widget {
  ref: string;
  title: string;
}
const widgetKind: ElementKind<Widget> = {
  type: "widget",
  typeLabel: "widget",
  scopeClass: "widget-reservoir",
  crumbCollection: "widgets",
  crumb: "LIBRARY / WIDGETS",
  title: "Le réservoir de widgets",
  subtitle: "des widgets de test",
  sectionLabel: "Widgets",
  sectionMeta: (n) => `— ${n}`,
  newButtonLabel: "Nouveau widget",
  idOf: (w) => w.ref,
  buildCards: (ws) =>
    ws.map((w) => ({
      id: w.ref,
      name: w.title,
      initials: w.title.slice(0, 2).toUpperCase(),
      gradient: ["#111", "#222"] as [string, string],
      pastille: null,
      royaume: null,
      ref: w.ref,
      roleLabel: null,
      roleIndex: 0,
      summary: null,
      chips: [],
      emptyChipsLabel: "aucune donnée",
    })),
  toAuthoredEntity: (w) => ({
    type: "widget",
    typeLabel: "widget",
    newLabel: "Nouveau widget",
    name: w.title,
    key: null,
    roleIndex: 0,
    pastille: null,
  }),
  blankEntity: {
    type: "widget",
    typeLabel: "widget",
    newLabel: "Nouveau widget",
    name: "",
    key: null,
    roleIndex: 0,
    pastille: null,
  },
  fallback: () => [{ ref: "w1", title: "Widget Un" }],
  Editor: ({ element, onSubmit, onCancel }) => (
    <div className="panel">
      <h3>{element ? "Éditer le widget" : "Nouveau widget"}</h3>
      <button type="button" onClick={() => onSubmit({ ref: "w1", title: "Widget Un" })}>
        Enregistrer widget
      </button>
      <button type="button" onClick={onCancel}>
        Annuler widget
      </button>
    </div>
  ),
};

describe("ElementReservoir — hôte générique (1b)", () => {
  it("sert un pool FACTICE sans connaître son type (grille + titre + New)", () => {
    render(<ElementReservoir kind={widgetKind} />);
    expect(screen.getByText("Le réservoir de widgets")).toBeTruthy();
    expect(screen.getByLabelText("Ouvrir la fiche de Widget Un")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Nouveau widget/ })).toBeTruthy();
    // Pas de Fëanor sur la grille (jamais en lecture seule).
    expect(document.querySelector(".feanor-head")).toBeNull();
  });

  it("New → création : Fëanor-en-tête monté (le même composant, écrit une seule fois)", () => {
    render(<ElementReservoir kind={widgetKind} />);
    fireEvent.click(screen.getByRole("button", { name: /Nouveau widget/ }));
    expect(screen.getByText("✚ création")).toBeTruthy();
    const head = document.querySelector(".feanor-head") as HTMLElement;
    expect(head).not.toBeNull();
    expect(within(head).getByText(/Fëanor façonne cet élément/)).toBeTruthy();
    expect(within(head).getByText("Nouveau widget")).toBeTruthy();
    expect(within(head).getByText(/widget · en création/)).toBeTruthy();
  });
});

describe("ElementReservoir — pilote PRINCIPE (1c)", () => {
  it("réservoir : une fiche par principe du catalogue canonique, Fëanor absent de la grille", () => {
    render(<ElementReservoir kind={principleKind} />);
    expect(screen.getByText("Le réservoir de principes")).toBeTruthy();
    const grid = document.querySelector(".element-reservoir .pgrid") as HTMLElement;
    expect(grid.querySelectorAll(":scope > .pcard").length).toBe(CATALOG_PRINCIPLES.length);
    expect(document.querySelector(".feanor-head")).toBeNull();
    // Une fiche connue est présente, avec sa politique et son déclencheur (que du déclaré).
    const mvp = screen.getByLabelText("Ouvrir la fiche de MVP d'abord");
    expect(within(mvp).getByText(/MVP d'abord, puis itérer/)).toBeTruthy();
    expect(within(mvp).getByText(/cadrage d'une feature/)).toBeTruthy();
  });

  it("New → création : mode ✚, PrincipleEditor + Fëanor-en-tête (« Nouveau principe »)", () => {
    render(<ElementReservoir kind={principleKind} />);
    fireEvent.click(screen.getByRole("button", { name: /Nouveau principe/ }));
    expect(screen.getByText("✚ création")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Nouveau principe" })).toBeTruthy();
    const head = document.querySelector(".feanor-head") as HTMLElement;
    expect(within(head).getByText(/Fëanor façonne cet élément/)).toBeTruthy();
    expect(within(head).getByText(/principe · en création/)).toBeTruthy();
  });

  it("sélection d'une fiche → ✎ édition : éditeur pré-rempli + Fëanor-en-tête sur ce principe", () => {
    render(<ElementReservoir kind={principleKind} />);
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de MVP d'abord"));
    expect(screen.getByText("✎ édition")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Éditer le principe" })).toBeTruthy();
    // Champs pré-remplis depuis le catalogue (label éditable, id verrouillé).
    expect(screen.getByDisplayValue("MVP d'abord")).toBeTruthy();
    const idInput = screen.getByDisplayValue("mvp-first") as HTMLInputElement;
    expect(idInput.disabled).toBe(true);
    // Fëanor conseille sur CE principe (agnostique) — jamais « persona ».
    const head = document.querySelector(".feanor-head") as HTMLElement;
    expect(within(head).getByText(/Fëanor édite cet élément/)).toBeTruthy();
    expect(within(head).getByText(/principe · en édition/)).toBeTruthy();
  });

  it("éditer puis enregistrer met à jour la fiche dans le réservoir (état local de session)", () => {
    render(<ElementReservoir kind={principleKind} />);
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de MVP d'abord"));
    const labelInput = screen.getByDisplayValue("MVP d'abord");
    fireEvent.change(labelInput, { target: { value: "MVP d'abord (session)" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    // De retour sur la grille, la fiche reflète le nouveau libellé (id stable → même carte).
    expect(screen.getByLabelText("Ouvrir la fiche de MVP d'abord (session)")).toBeTruthy();
  });

  it("revenir au réservoir depuis la fiche (fil d'Ariane)", () => {
    render(<ElementReservoir kind={principleKind} />);
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de MVP d'abord"));
    expect(screen.getByText("✎ édition")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "library" }));
    const grid = document.querySelector(".element-reservoir .pgrid") as HTMLElement;
    expect(grid.querySelectorAll(":scope > .pcard").length).toBe(CATALOG_PRINCIPLES.length);
  });
});

describe("ElementReservoir — modes de présentation (tuiles / lignes / liste)", () => {
  beforeEach(() => window.localStorage.clear());

  it("défaut = tuiles ; le sélecteur commute le layout via data-view (mêmes cartes)", () => {
    render(<ElementReservoir kind={principleKind} />);
    const grid = document.querySelector(".element-reservoir .pgrid") as HTMLElement;
    const count = grid.querySelectorAll(":scope > .pcard").length;
    // Défaut tuiles.
    expect(grid.getAttribute("data-view")).toBe("grid");
    // Lignes minces : même nombre de cartes, seul le mode change.
    fireEvent.click(screen.getByRole("radio", { name: "Lignes" }));
    expect(grid.getAttribute("data-view")).toBe("rows");
    expect(grid.querySelectorAll(":scope > .pcard").length).toBe(count);
    // Liste détaillée.
    fireEvent.click(screen.getByRole("radio", { name: "Liste détaillée" }));
    expect(grid.getAttribute("data-view")).toBe("list");
    expect(grid.querySelectorAll(":scope > .pcard").length).toBe(count);
    // La colonne id (champ détaillé) est présente dans le DOM des cartes.
    expect(grid.querySelector(".pcard .lid")).not.toBeNull();
  });

  it("persiste le choix (localStorage) et le restaure au remontage", () => {
    const { unmount } = render(<ElementReservoir kind={principleKind} />);
    fireEvent.click(screen.getByRole("radio", { name: "Liste détaillée" }));
    expect(window.localStorage.getItem("iakaframe.viewMode.reservoir")).toBe("list");
    unmount();
    render(<ElementReservoir kind={principleKind} />);
    const grid = document.querySelector(".element-reservoir .pgrid") as HTMLElement;
    expect(grid.getAttribute("data-view")).toBe("list");
  });

  it("le clic → fiche reste fonctionnel en mode lignes (non-régression)", () => {
    render(<ElementReservoir kind={principleKind} />);
    fireEvent.click(screen.getByRole("radio", { name: "Lignes" }));
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de MVP d'abord"));
    expect(screen.getByText("✎ édition")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Éditer le principe" })).toBeTruthy();
  });
});
