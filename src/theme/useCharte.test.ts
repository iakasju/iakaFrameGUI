/**
 * Tests du mécanisme de charte (P5) — registre, persistance, application data-theme.
 * Couvre T-1 (défaut Cinabre), T-2 (commutation), T-3 (persistance).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  charteRegistry,
  DEFAULT_CHARTE,
  isKnownCharte,
} from "./charteRegistry";
import {
  useCharte,
  readStoredCharte,
  bootstrapCharte,
  CHARTE_STORAGE_KEY,
} from "./useCharte";

describe("charteRegistry", () => {
  it("expose au moins Cinabre + NaonEdge, Cinabre par défaut (T-1, T-2)", () => {
    expect(charteRegistry.length).toBeGreaterThanOrEqual(2);
    expect(charteRegistry.map((c) => c.id)).toContain("cinabre");
    expect(charteRegistry.map((c) => c.id)).toContain("naonedge");
    expect(DEFAULT_CHARTE).toBe("cinabre");
  });

  it("isKnownCharte filtre les ids inconnus", () => {
    expect(isKnownCharte("cinabre")).toBe(true);
    expect(isKnownCharte("naonedge")).toBe(true);
    expect(isKnownCharte("inexistante")).toBe(false);
    expect(isKnownCharte(null)).toBe(false);
  });

  it("connaît Studio clair et sa feuille définit les tokens clés", () => {
    expect(isKnownCharte("studio-clair")).toBe(true);
    const sheet = readFileSync(
      fileURLToPath(new URL("../themes/studio-clair.css", import.meta.url)),
      "utf8",
    );
    expect(sheet).toContain(':root[data-theme="studio-clair"]');
    expect(sheet).toMatch(/--accent-gold:/);
    expect(sheet).toMatch(/--bg-primary:/);
    expect(sheet).toMatch(/--text-primary:/);
  });
});

describe("useCharte — persistance + application data-theme", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("démarre en Cinabre sans préférence enregistrée (T-1)", () => {
    expect(readStoredCharte()).toBe("cinabre");
    const { result } = renderHook(() => useCharte());
    expect(result.current.charte).toBe("cinabre");
    expect(document.documentElement.dataset.theme).toBe("cinabre");
  });

  it("commute vers NaonEdge et persiste (T-2, T-3)", () => {
    const { result } = renderHook(() => useCharte());
    act(() => result.current.setCharte("naonedge"));
    expect(result.current.charte).toBe("naonedge");
    expect(document.documentElement.dataset.theme).toBe("naonedge");
    expect(localStorage.getItem(CHARTE_STORAGE_KEY)).toBe("naonedge");
  });

  it("réapplique la charte persistée au boot (T-3, anti-flash)", () => {
    localStorage.setItem(CHARTE_STORAGE_KEY, "naonedge");
    bootstrapCharte();
    expect(document.documentElement.dataset.theme).toBe("naonedge");
    const { result } = renderHook(() => useCharte());
    expect(result.current.charte).toBe("naonedge");
  });

  it("ignore une valeur stockée inconnue et retombe sur Cinabre", () => {
    localStorage.setItem(CHARTE_STORAGE_KEY, "inexistante");
    expect(readStoredCharte()).toBe("cinabre");
  });
});
