import { describe, it, expect } from "vitest";
import type { Frame, FrameDescriptor } from "@iakaframe/core";
import { buildFrameCard, buildFramesGallery, galleryFromFrame } from "./frameCards";

const descriptor = (over: Partial<FrameDescriptor> = {}): FrameDescriptor => ({
  id: "iakaframe",
  name: "iakaframe",
  version: "0.1.0",
  methodId: "iakaframe",
  teamId: "iakaframe",
  default: false,
  ...over,
});

describe("frameCards — projection pure des cartes de la galerie models (Lot 4, A4)", () => {
  it("projette un descripteur en carte (champs canon + vignette dérivée)", () => {
    const c = buildFrameCard(descriptor({ id: "scrum", name: "Scrum", version: "1.2.0" }), 0, null);
    expect(c.id).toBe("scrum");
    expect(c.name).toBe("Scrum");
    expect(c.version).toBe("1.2.0");
    expect(c.methodId).toBe("iakaframe");
    expect(c.teamId).toBe("iakaframe");
    expect(c.initials).toBe("SC"); // dérivé du nom, jamais un asset canon
    expect(c.gradient).toHaveLength(2);
    expect(c.isActive).toBe(false);
  });

  it("marque la carte ACTIVE quand l'id vaut l'id actif fourni (et elle seule)", () => {
    const frames = [
      descriptor({ id: "iakaframe", name: "iakaframe", default: true }),
      descriptor({ id: "kanban", name: "Kanban" }),
    ];
    const cards = buildFramesGallery(frames, "kanban");
    expect(cards.find((c) => c.id === "iakaframe")!.isActive).toBe(false);
    expect(cards.find((c) => c.id === "kanban")!.isActive).toBe(true);
    // Exactement une carte active.
    expect(cards.filter((c) => c.isActive)).toHaveLength(1);
  });

  it("propage le drapeau `default` sans le confondre avec l'actif", () => {
    const cards = buildFramesGallery([descriptor({ default: true })], "iakaframe");
    expect(cards[0].isDefault).toBe(true);
    expect(cards[0].isActive).toBe(true);
  });

  it("aucun id actif → aucune carte active (galerie sans pivot résolu)", () => {
    const cards = buildFramesGallery([descriptor(), descriptor({ id: "gtd", name: "GTD" })], null);
    expect(cards.some((c) => c.isActive)).toBe(false);
  });

  it("conserve l'ordre de chargement du réservoir", () => {
    const ids = ["iakaframe", "scrum", "kanban", "shapeup"];
    const cards = buildFramesGallery(ids.map((id) => descriptor({ id, name: id })), "scrum");
    expect(cards.map((c) => c.id)).toEqual(ids);
  });

  it("galleryFromFrame dérive frames + activeId de l'assemblage résolu", () => {
    const active = descriptor({ id: "waterfall", name: "Waterfall" });
    const frame = {
      frames: [descriptor(), active],
      assembly: { frame: active, binding: null, method: null, team: null },
    } as unknown as Frame;
    const src = galleryFromFrame(frame);
    expect(src.frames).toHaveLength(2);
    expect(src.activeId).toBe("waterfall");
  });

  it("galleryFromFrame : aucune frame active résolue → activeId null", () => {
    const frame = {
      frames: [],
      assembly: { frame: null, binding: null, method: null, team: null },
    } as unknown as Frame;
    expect(galleryFromFrame(frame).activeId).toBeNull();
  });
});
