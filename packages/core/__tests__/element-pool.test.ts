import { describe, it, expect } from "vitest";
import {
  buildReservoir,
  RESERVOIR_COMPOSITION,
  type ReservoirElement,
} from "../src/reservoir";
import { buildFrame, FRAME_TYPES, FRAME_TYPE_LABELS, type FrameRaw } from "../src/frame";

// --- Fixtures `.md` minimales (frontmatter), calquées sur frame.test.ts. ---
const persona = (id: string, roleKey: string): string =>
  `---\nid: ${id}\nname: ${id}\nroleKey: ${roleKey}\n---\n# ${id}\n`;
const role = (key: string): string =>
  `---\nid: ${key}\nkey: ${key}\nlabel: ${key}\nroleIndex: 0\n---\n# ${key}\n`;
const named = (id: string): string => `---\nid: ${id}\nlabel: ${id}\n---\n# ${id}\n`;
const scaffold = (id: string): string => `---\nid: ${id}\nlevel: project\n---\n# ${id}\n`;
const workflow = (id: string): string =>
  `---\nid: ${id}\nname: ${id}\nphases:\n  - { id: p1, label: P1, agentsRoleKeys: [cadrage], input: x, output: y }\n---\n# ${id}\n`;

/** Frame de test : 2 personas, 3 principes, 2 rituels, 1 garde, 2 rôles, 1 scaffold, 1 workflow, 1 skill. */
function makeFrame() {
  const raw: FrameRaw = {
    root: "/lib",
    pools: {
      personas: [persona("odin", "portefeuille"), persona("gimli", "dev")],
      roles: [role("portefeuille"), role("dev")],
      principles: [named("mvp-first"), named("qualite"), named("docker")],
      rituals: [named("snapshot"), named("update")],
      guardrails: [named("identity-guard")],
      scaffolds: [scaffold("project")],
      workflows: [workflow("iakaframe")],
      skills: [named("iakaframe-cadrage")],
    },
    teams: [
      `---\nid: t1\nname: T1\npersonas: [odin, gimli]\ncoordinator: odin\n---\n# T1\n`,
    ],
    methods: [`---\nid: m1\nname: M1\nprincipleIds: [qualite]\n---\n# M1\n`],
    bindings: [],
  };
  return buildFrame(raw);
}

describe("réservoir de sous-éléments — buildReservoir (Volet A)", () => {
  it("Team ← personas UNIQUEMENT (bonne liste par type)", () => {
    const r = buildReservoir("team", makeFrame());
    expect(r.groups.map((g) => g.type)).toEqual(["personas"]);
    const personas = r.groups[0];
    expect(personas.ids).toEqual(["odin", "gimli"]);
    expect(personas.count).toBe(2);
    expect(personas.label).toBe(FRAME_TYPE_LABELS.personas);
    expect(r.total).toBe(2);
  });

  it("Méthode ← principes + rituels + gardes + rôles + scaffolds + workflow (6 types)", () => {
    const r = buildReservoir("method", makeFrame());
    expect(r.groups.map((g) => g.type)).toEqual([
      "principles",
      "rituals",
      "guardrails",
      "roles",
      "scaffolds",
      "workflows",
    ]);
    const byType = Object.fromEntries(r.groups.map((g) => [g.type, g]));
    expect(byType.principles.ids).toEqual(["mvp-first", "qualite", "docker"]);
    expect(byType.rituals.ids).toEqual(["snapshot", "update"]);
    expect(byType.guardrails.ids).toEqual(["identity-guard"]);
    expect(byType.roles.ids).toEqual(["portefeuille", "dev"]);
    expect(byType.scaffolds.ids).toEqual(["project"]);
    expect(byType.workflows.ids).toEqual(["iakaframe"]);
    // 3 + 2 + 1 + 2 + 1 + 1 = 10 sous-éléments disponibles.
    expect(r.total).toBe(10);
    // La Méthode ne référence NI personas NI skills.
    expect(r.groups.some((g) => g.type === "personas")).toBe(false);
    expect(r.groups.some((g) => g.type === "skills")).toBe(false);
  });

  it("Skill ← skills UNIQUEMENT (miroir exact de team ← personas)", () => {
    const r = buildReservoir("skill", makeFrame());
    expect(r.groups.map((g) => g.type)).toEqual(["skills"]);
    const skills = r.groups[0];
    expect(skills.ids).toEqual(["iakaframe-cadrage"]);
    expect(skills.count).toBe(1);
    expect(skills.label).toBe(FRAME_TYPE_LABELS.skills);
    expect(r.total).toBe(1);
    // Une skill n'expose QUE des sous-skills (pas de personas ni autres types).
    expect(r.groups.every((g) => g.type === "skills")).toBe(true);
  });

  it("Kit ← l'assemblage total (les 11 types de FRAME_TYPES)", () => {
    const r = buildReservoir("kit", makeFrame());
    expect(r.groups.map((g) => g.type)).toEqual([...FRAME_TYPES]);
  });

  it("Frame ← les 11 types ; collections (teams/methods/bindings) : compte sans ids", () => {
    const r = buildReservoir("frame", makeFrame());
    expect(r.groups.map((g) => g.type)).toEqual([...FRAME_TYPES]);
    const byType = Object.fromEntries(r.groups.map((g) => [g.type, g]));
    // Collections : le frame ne garde que les comptes (ids vides), mais le compte est exact.
    expect(byType.teams.count).toBe(1);
    expect(byType.teams.ids).toEqual([]);
    expect(byType.methods.count).toBe(1);
    expect(byType.bindings.count).toBe(0);
  });

  it("frame vide → groupes présents, ids vides, total 0 (défensif, jamais d'exception)", () => {
    const empty = buildFrame({
      root: null,
      pools: {
        personas: [],
        roles: [],
        principles: [],
        rituals: [],
        guardrails: [],
        scaffolds: [],
        workflows: [],
        skills: [],
      },
      teams: [],
      methods: [],
      bindings: [],
    });
    for (const el of ["team", "method", "skill", "kit", "frame"] as ReservoirElement[]) {
      const r = buildReservoir(el, empty);
      expect(r.total).toBe(0);
      expect(r.groups.every((g) => g.ids.length === 0 && g.count === 0)).toBe(true);
      expect(r.groups.map((g) => g.type)).toEqual([...RESERVOIR_COMPOSITION[el]]);
    }
  });
});
