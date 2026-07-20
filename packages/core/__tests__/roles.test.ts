/**
 * roles.test.ts — invariants de la LISTE CANONIQUE des rôles (CH-A, critères C13/C18).
 *
 * Le rôle `deploiement` a été promu 8ᵉ rôle canonique : le squad prod était auparavant rangé
 * en `coordination` faute de case disponible côté CLI, ce qui faisait partager un rôle
 * canonique à deux personas et imposait une exception codée (`SKILL_OVERRIDE_OF`, supprimée).
 */
import { describe, it, expect } from "vitest";
import {
  CANONICAL_ROLES,
  CANONICAL_ROLE_KEYS,
  isCanonicalRole,
  roleByKey,
  roleIndexOf,
  roleLabel,
} from "../src/roles";

describe("CANONICAL_ROLES — invariants de la liste fermée", () => {
  it("C18 : roleIndex contigus 0..n-1, sans trou ni doublon", () => {
    const indexes = CANONICAL_ROLES.map((r) => r.roleIndex);
    expect(indexes).toEqual(CANONICAL_ROLES.map((_, i) => i));
    expect(new Set(indexes).size).toBe(CANONICAL_ROLES.length);
  });

  it("C18 : les clés sont uniques et non vides", () => {
    const keys = CANONICAL_ROLES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k.length).toBeGreaterThan(0);
  });

  it("CANONICAL_ROLE_KEYS reflète CANONICAL_ROLES dans l'ordre", () => {
    expect([...CANONICAL_ROLE_KEYS]).toEqual(CANONICAL_ROLES.map((r) => r.key));
  });

  it("C13 : `deploiement` est un rôle canonique de plein droit, en dernière position", () => {
    expect(isCanonicalRole("deploiement")).toBe(true);
    expect(roleIndexOf("deploiement")).toBe(CANONICAL_ROLES.length - 1);
    expect(roleIndexOf("deploiement")).toBe(7);
    expect(roleByKey("deploiement")?.label).toBe("Déploiement");
  });

  it("`deploiement` ne partage pas son index avec `coordination`", () => {
    // L'ancien rangement par défaut faisait porter le même rôle à deux personas.
    expect(roleIndexOf("deploiement")).not.toBe(roleIndexOf("coordination"));
  });

  it("roleIndexOf replie sur 0 pour une clé hors liste (tolérance autre méthode)", () => {
    expect(roleIndexOf("role-inexistant")).toBe(0);
    expect(roleLabel("role-inexistant")).toBe("role-inexistant");
  });
});
