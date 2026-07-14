import { describe, it, expect } from "vitest";
import {
  IAKAFRAME_CANONICAL_METHOD,
  METHOD_CATALOG,
  DEFAULT_METHOD_ID,
  methodById,
  parseMethod,
  parseMethods,
  parseMethodText,
  serializeMethod,
  resolveWorkflow,
  principlesForMethod,
  ritualsForMethod,
  scaffoldsForMethod,
  type Method,
} from "../src/method";
import { IAKAFRAME_CANONICAL_WORKFLOW } from "../src/workflow";
import { CATALOG_PRINCIPLE_IDS } from "../src/principle";
import { CATALOG_RITUAL_IDS } from "../src/ritual";
import { CATALOG_SCAFFOLD_IDS } from "../src/scaffold";
import { CANONICAL_ROLE_KEYS } from "../src/roles";

describe("IAKAFRAME_CANONICAL_METHOD (E2 §3)", () => {
  const m = IAKAFRAME_CANONICAL_METHOD;

  it("référence l'intégralité des catalogues du cœur (par id)", () => {
    expect(m.id).toBe(DEFAULT_METHOD_ID);
    expect(m.workflowId).toBe(IAKAFRAME_CANONICAL_WORKFLOW.id);
    expect(m.principleIds).toEqual([...CATALOG_PRINCIPLE_IDS]);
    expect(m.ritualIds).toEqual([...CATALOG_RITUAL_IDS]);
    expect(m.scaffoldIds).toEqual([...CATALOG_SCAFFOLD_IDS]);
    expect(m.roleKeys).toEqual([...CANONICAL_ROLE_KEYS]);
    expect(m.guardrailIds.length).toBeGreaterThan(0);
  });

  it("ne nomme aucun agent, ne pose ni runner ni model (AR-1 renforcé)", () => {
    const json = JSON.stringify(m);
    expect(json).not.toMatch(/\brunner\b/i);
    expect(json).not.toMatch(/\bmodel\b/i);
    // La méthode ne porte que des références (ids), pas de personas nommées.
    expect(json).not.toMatch(/persona/i);
  });

  it("est dans le catalogue", () => {
    expect(METHOD_CATALOG[DEFAULT_METHOD_ID]).toBe(m);
    expect(methodById(DEFAULT_METHOD_ID)).toBe(m);
    expect(methodById("inconnue")).toBeUndefined();
  });
});

describe("resolveWorkflow (déménagé, Q-3)", () => {
  it("sans méthode → canonique (rétro-compat)", () => {
    expect(resolveWorkflow()).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(resolveWorkflow(null)).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
  });

  it("méthode canonique → workflow canonique", () => {
    expect(resolveWorkflow(IAKAFRAME_CANONICAL_METHOD)).toBe(
      IAKAFRAME_CANONICAL_WORKFLOW,
    );
  });

  it("méthode à workflowId inconnu → canonique (défensif)", () => {
    expect(resolveWorkflow({ workflowId: "n-existe-pas" })).toBe(
      IAKAFRAME_CANONICAL_WORKFLOW,
    );
  });
});

describe("résolveurs de composants (ids inconnus filtrés à la résolution)", () => {
  it("résout principes/rituels/scaffolds du canonique", () => {
    expect(principlesForMethod(IAKAFRAME_CANONICAL_METHOD)).toHaveLength(14);
    expect(ritualsForMethod(IAKAFRAME_CANONICAL_METHOD)).toHaveLength(5);
    expect(scaffoldsForMethod(IAKAFRAME_CANONICAL_METHOD)).toHaveLength(2);
  });

  it("filtre les ids inconnus sans lever (agnosticisme AR-9 préservé au parse)", () => {
    const m = parseMethod({
      id: "x",
      principleIds: ["qualite", "inconnu-42"],
      ritualIds: ["fantome"],
    })!;
    // Le parse CONSERVE les ids (agnosticisme) ...
    expect(m.principleIds).toEqual(["qualite", "inconnu-42"]);
    // ... la résolution FILTRE les inconnus.
    expect(principlesForMethod(m)).toHaveLength(1);
    expect(ritualsForMethod(m)).toHaveLength(0);
  });
});

describe("parseMethod / parseMethods / round-trip (défensif)", () => {
  it("rejette un record sans id", () => {
    expect(parseMethod({ name: "x" })).toBeNull();
    expect(parseMethod(null)).toBeNull();
  });

  it("applique les défauts et filtre les références en string[]", () => {
    const m = parseMethod({ id: "min" })!;
    expect(m.name).toBe("min");
    expect(m.principleIds).toEqual([]);
    expect(m.workflowId).toBeUndefined();
  });

  it("workflowId vide → omis (repli canonique via resolveWorkflow)", () => {
    const m = parseMethod({ id: "m", workflowId: "  " })!;
    expect(m).not.toHaveProperty("workflowId");
    expect(resolveWorkflow(m)).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
  });

  it("jamais d'exception sur entrée hostile", () => {
    for (const bad of [null, undefined, 42, "x", [], {}]) {
      expect(() => parseMethod(bad)).not.toThrow();
    }
  });

  it("round-trip du canonique (structure préservée)", () => {
    const round = parseMethodText(serializeMethod(IAKAFRAME_CANONICAL_METHOD));
    expect(round).toEqual(IAKAFRAME_CANONICAL_METHOD);
  });

  it("parseMethods : [] si illisible/non-tableau ; filtre les invalides", () => {
    expect(parseMethods(undefined)).toEqual([]);
    expect(parseMethods("{pas du json")).toEqual([]);
    expect(parseMethods('{"id":"x"}')).toEqual([]);
    const arr = JSON.stringify([IAKAFRAME_CANONICAL_METHOD, { name: "sans-id" }, 5]);
    const methods: Method[] = parseMethods(arr);
    expect(methods).toHaveLength(1);
    expect(methods[0].id).toBe(DEFAULT_METHOD_ID);
  });
});
