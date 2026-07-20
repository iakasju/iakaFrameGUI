import { describe, it, expect } from "vitest";
import { CANONICAL_ROLES } from "../src/roles";
import {
  CANONICAL_ROSTER,
  buildTeamFromRoster,
  emptyTeam,
} from "../src/roster";
import { serializeTeam } from "../src/team";

describe("CANONICAL_ROSTER (gabarit AR-5)", () => {
  it("compte une persona par rôle canonique, dans l'ordre roleIndex", () => {
    // Compte DERIVE de CANONICAL_ROLES : un rôle ajouté ne doit pas exiger de retoucher
    // ce test, seulement la palette de casting (garde dédiée côté app).
    expect(CANONICAL_ROSTER).toHaveLength(CANONICAL_ROLES.length);
    expect(CANONICAL_ROSTER.map((p) => p.roleKey)).toEqual(
      CANONICAL_ROLES.map((r) => r.key),
    );
    CANONICAL_ROSTER.forEach((p, i) => {
      expect(p.roleIndex).toBe(i);
      expect(p.royaume).toBe(p.roleKey.toUpperCase());
    });
  });

  it("aucune persona du gabarit ne porte runner/model (AR-1)", () => {
    for (const p of CANONICAL_ROSTER) {
      expect(p).not.toHaveProperty("runner");
      expect(p).not.toHaveProperty("model");
    }
  });
});

describe("buildTeamFromRoster / emptyTeam", () => {
  it("construit une team d'une persona par rôle, coordinateur = coordination", () => {
    const t = buildTeamFromRoster("Ma team");
    expect(t.personas).toHaveLength(CANONICAL_ROLES.length);
    const coord = t.personas.find((p) => p.id === t.coordinator);
    expect(coord?.roleKey).toBe("coordination");
    // E2 : la team ne porte plus de méthode (casting pur).
    expect(t).not.toHaveProperty("methodId");
    // Le JSON persistable reste pur.
    expect(serializeTeam(t)).not.toMatch(/runner|model/);
  });

  it("emptyTeam est vide et sans coordinateur", () => {
    const t = emptyTeam("Vide");
    expect(t.personas).toEqual([]);
    expect(t.coordinator).toBe("");
  });

  it("les personas du gabarit sont des copies indépendantes (éditables)", () => {
    const a = buildTeamFromRoster("A");
    const b = buildTeamFromRoster("B");
    a.personas[0].name = "Changé";
    expect(b.personas[0].name).not.toBe("Changé");
  });
});
