/**
 * viewMode.test — le contrat PARTAGÉ des modes de présentation (lot « modes de présentation »,
 * GUI-only). Prouve :
 *   1. le hook `useViewMode` : défaut « tuiles », persistance `localStorage` best-effort, relecture ;
 *   2. le sélecteur `<ViewModeToggle>` : radiogroup accessible (3 radios, `aria-checked`), commutation.
 * Les intégrations dans les deux hôtes (ElementReservoir, FramesGallery) sont couvertes par leurs
 * propres suites (rendu des 3 modes + persistance + clic→fiche non régressé).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import {
  useViewMode,
  readViewMode,
  DEFAULT_VIEW_MODE,
  VIEW_MODES,
} from "./viewMode";
import { ViewModeToggle } from "./ViewModeToggle";

beforeEach(() => {
  window.localStorage.clear();
});

describe("useViewMode — persistance best-effort", () => {
  it("démarre sur « tuiles » (défaut) quand rien n'est stocké", () => {
    const { result } = renderHook(() => useViewMode("k.empty"));
    expect(result.current[0]).toBe("grid");
    expect(DEFAULT_VIEW_MODE).toBe("grid");
  });

  it("persiste le mode choisi dans localStorage et le relit", () => {
    const { result } = renderHook(() => useViewMode("k.persist"));
    act(() => result.current[1]("rows"));
    expect(result.current[0]).toBe("rows");
    expect(window.localStorage.getItem("k.persist")).toBe("rows");
    // Un nouveau montage relit la préférence persistée (pas de retour au défaut).
    expect(readViewMode("k.persist")).toBe("rows");
    const remount = renderHook(() => useViewMode("k.persist"));
    expect(remount.result.current[0]).toBe("rows");
  });

  it("ignore une valeur corrompue et retombe sur le défaut", () => {
    window.localStorage.setItem("k.bad", "banana");
    expect(readViewMode("k.bad")).toBe("grid");
  });

  it("isole les préférences par clé (par-page)", () => {
    const a = renderHook(() => useViewMode("page.a"));
    const b = renderHook(() => useViewMode("page.b"));
    act(() => a.result.current[1]("list"));
    expect(a.result.current[0]).toBe("list");
    expect(b.result.current[0]).toBe("grid");
  });
});

describe("ViewModeToggle — segment control accessible", () => {
  it("rend un radiogroup avec les 3 modes et marque l'actif", () => {
    render(<ViewModeToggle value="grid" onChange={() => {}} />);
    const group = screen.getByRole("radiogroup", { name: /présentation/i });
    expect(group).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(VIEW_MODES.length);
    const grid = screen.getByRole("radio", { name: "Tuiles" });
    expect(grid.getAttribute("aria-checked")).toBe("true");
    expect(
      screen.getByRole("radio", { name: "Lignes" }).getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("remonte le mode cliqué", () => {
    const seen: string[] = [];
    render(<ViewModeToggle value="grid" onChange={(m) => seen.push(m)} />);
    fireEvent.click(screen.getByRole("radio", { name: "Liste détaillée" }));
    fireEvent.click(screen.getByRole("radio", { name: "Lignes" }));
    expect(seen).toEqual(["list", "rows"]);
  });
});
