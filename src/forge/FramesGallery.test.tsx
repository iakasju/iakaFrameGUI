import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { FrameDescriptor } from "@iakaframe/core";
import { FramesGallery, type GallerySource } from "./FramesGallery";

const descriptor = (over: Partial<FrameDescriptor> = {}): FrameDescriptor => ({
  id: "iakaframe",
  name: "iakaframe",
  version: "0.1.0",
  methodId: "iakaframe",
  teamId: "iakaframe",
  default: false,
  ...over,
});

// Les 8 frames du réservoir (Fork D), telles qu'exposées par frame.frames.
const EIGHT: FrameDescriptor[] = [
  descriptor({ id: "iakaframe", name: "iakaframe", default: true }),
  descriptor({ id: "scrum", name: "Scrum", methodId: "scrum", teamId: "scrum" }),
  descriptor({ id: "kanban", name: "Kanban", methodId: "kanban", teamId: "kanban" }),
  descriptor({ id: "shapeup", name: "Shape Up", methodId: "shapeup", teamId: "shapeup" }),
  descriptor({ id: "design-thinking", name: "Design Thinking", methodId: "dt", teamId: "dt" }),
  descriptor({ id: "lean-startup", name: "Lean Startup", methodId: "lean", teamId: "lean" }),
  descriptor({ id: "waterfall", name: "Waterfall", methodId: "waterfall", teamId: "waterfall" }),
  descriptor({ id: "gtd", name: "GTD", methodId: "gtd", teamId: "gtd" }),
];

const source =
  (src: GallerySource) => () => Promise.resolve(src);

describe("FramesGallery — écran galerie models (Lot 4, A4)", () => {
  it("liste les 8 frames du réservoir en cartes à vignettes", async () => {
    render(<FramesGallery loadGallery={source({ frames: EIGHT, activeId: "iakaframe" })} />);
    const grid = (await screen.findByText("Le catalogue des frames"))
      .closest(".models-gallery")!
      .querySelector(".pgrid") as HTMLElement;
    expect(grid).not.toBeNull();
    expect(grid.querySelectorAll(":scope > .fcard")).toHaveLength(8);
    for (const name of ["iakaframe", "Scrum", "Kanban", "GTD"]) {
      expect(screen.getByLabelText(new RegExp(`^Frame ${name}`))).toBeTruthy();
    }
  });

  it("distingue la carte de la frame ACTIVE (marqueur « actif »)", async () => {
    render(<FramesGallery loadGallery={source({ frames: EIGHT, activeId: "kanban" })} />);
    const kanban = await screen.findByLabelText("Frame Kanban (active)");
    expect(kanban.className).toContain("active");
    expect(within(kanban).getByText(/actif/)).toBeTruthy();
    // Une seule carte active dans la galerie.
    expect(document.querySelectorAll(".models-gallery .fcard.active")).toHaveLength(1);
    // Une frame non active ne porte ni le marqueur ni la classe.
    const scrum = screen.getByLabelText("Frame Scrum");
    expect(scrum.className).not.toContain("active");
  });

  it("montre la méthode et la team (frères) + l'étoile de la frame défaut", async () => {
    render(<FramesGallery loadGallery={source({ frames: EIGHT, activeId: "iakaframe" })} />);
    const iaka = await screen.findByLabelText("Frame iakaframe (active)");
    expect(within(iaka).getByText("méthode · iakaframe")).toBeTruthy();
    expect(within(iaka).getByText("team · iakaframe")).toBeTruthy();
    expect(within(iaka).getByText("★")).toBeTruthy(); // default
  });

  it("réservoir vide (hors-ligne) → état vide explicite, aucune frame inventée", async () => {
    render(<FramesGallery loadGallery={source({ frames: [], activeId: null })} />);
    expect(await screen.findByText(/Aucune frame chargée/)).toBeTruthy();
    expect(document.querySelector(".models-gallery .pgrid")).toBeNull();
  });
});
