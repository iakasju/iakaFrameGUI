/**
 * casting.test.tsx — garde du casting visuel (CH-A, critères C14/C15/C16/C19/C20).
 *
 * POURQUOI CETTE GARDE. `vignetteGradient` est bornée par `% CASTING_GRADIENTS.length` : un
 * rôle ajouté SANS sa teinte ne casse pas, il **collisionne silencieusement** avec un rôle
 * existant. Dans une méthode où la couleur porte le sens (la pastille est un invariant
 * d'identité, vérifié par un hook), deux rôles partageant une identité visuelle est une
 * incohérence de fond, pas une broutille cosmétique. C20 transforme ce silence en rouge.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CANONICAL_ROLES } from "@iakaframe/core";
import { CASTING_GRADIENTS, vignetteGradient, initialsOf } from "./casting";
import { Vignette } from "./Vignette";

describe("vignetteGradient — déterminisme et bornes", () => {
  it("C14 : vignetteGradient(7) rend un tuple valide de 2 chaînes", () => {
    const g = vignetteGradient(7);
    expect(Array.isArray(g)).toBe(true);
    expect(g).toHaveLength(2);
    for (const c of g) {
      expect(typeof c).toBe("string");
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("C15 : reste borné pour tout n (0, 7, 99, -1, NaN, Infinity, fractionnaire)", () => {
    for (const n of [0, 7, 99, -1, NaN, Infinity, -Infinity, 3.7]) {
      const g = vignetteGradient(n);
      expect(g).toBeDefined();
      expect(g).toHaveLength(2);
      expect(typeof g[0]).toBe("string");
      expect(typeof g[1]).toBe("string");
    }
  });

  it("C19 : aucune collision Helm (7) <-> Odin (0) — preuve que la 8ᵉ paire existe", () => {
    expect(vignetteGradient(7)).not.toEqual(vignetteGradient(0));
  });

  it("C19-bis : les teintes de deploiement sont distinctes de graphisme (violet) et portefeuille (or)", () => {
    expect(vignetteGradient(7)).not.toEqual(vignetteGradient(5));
    expect(vignetteGradient(7)).not.toEqual(vignetteGradient(0));
  });

  it("C20 : CASTING_GRADIENTS couvre au moins tous les rôles canoniques", () => {
    // Garde générique : c'est elle qui protège un 9ᵉ rôle, pas C19.
    expect(CASTING_GRADIENTS.length).toBeGreaterThanOrEqual(CANONICAL_ROLES.length);
  });

  it("C20-bis : chaque rôle canonique reçoit une teinte UNIQUE (aucun repli par modulo)", () => {
    const used = CANONICAL_ROLES.map((r) => vignetteGradient(r.roleIndex).join("/"));
    expect(new Set(used).size).toBe(CANONICAL_ROLES.length);
  });
});

describe("Vignette — rendu d'une persona du 8ᵉ rôle", () => {
  it("C16 : rendre roleIndex 7 n'émet ni erreur ni warning console", () => {
    const errors: unknown[] = [];
    const warns: unknown[] = [];
    const origError = console.error;
    const origWarn = console.warn;
    console.error = (...a: unknown[]) => errors.push(a);
    console.warn = (...a: unknown[]) => warns.push(a);
    try {
      const { container } = render(<Vignette label={initialsOf("Helm")} roleIndex={7} />);
      expect(container.querySelector(".vig")).not.toBeNull();
      expect(container.textContent).toContain("HE");
    } finally {
      console.error = origError;
      console.warn = origWarn;
    }
    expect(errors).toEqual([]);
    expect(warns).toEqual([]);
  });
});
