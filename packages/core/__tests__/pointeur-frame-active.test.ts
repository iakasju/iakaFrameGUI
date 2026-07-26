/**
 * pointeur-frame-active.test.ts — le **pointeur de frame active** pilote le pivot d'assemblage.
 *
 * Couvre les AC de `specs/instructions/pointeur-frame-active.md` :
 *   AC-1  sans pointeur → assemblage **strictement identique** à l'existant (non-régression).
 *   AC-2  pointeur valide → le pivot est **cette** frame (method/team/binding appariés).
 *   AC-3  pointeur mort → repli sur `default`, **signalé** par `activeFrameIsDangling`.
 *
 * Le pointeur lui-même vit dans `<projectDir>/iakaframe.json` (clé `frame`) — sa lecture/écriture
 * est testée côté Rust (`src-tauri/src/project_conf.rs`), là où elle a lieu.
 */
import { describe, it, expect } from "vitest";
import { buildFrame, activeFrameIsDangling, type FrameRaw } from "../src/frame";

const persona = (id: string, roleKey: string): string =>
  `---\nid: ${id}\nname: ${id}\nroleKey: ${roleKey}\n---\n# ${id}\n`;

/** Deux méthodes, deux teams, deux bindings, deux frames — dont une `default`. */
function raw(): FrameRaw {
  return {
    root: "/reservoir",
    pools: {
      personas: [persona("gandalf", "cadrage")],
      roles: [],
      principles: [],
      rituals: [],
      guardrails: [],
      scaffolds: [],
      workflows: [],
      skills: [],
    },
    methods: [
      `---\nid: m-iaka\nname: Iaka\n---\n# m\n`,
      `---\nid: m-scrum\nname: Scrum\n---\n# m\n`,
    ],
    teams: [
      `---\nid: t-iaka\nname: TeamIaka\n---\n# t\n`,
      `---\nid: t-scrum\nname: TeamScrum\n---\n# t\n`,
    ],
    bindings: [
      `---\nid: b-iaka\nmethodId: m-iaka\nteamId: t-iaka\nassignments: []\n---\n# b\n`,
      `---\nid: b-scrum\nmethodId: m-scrum\nteamId: t-scrum\nassignments: []\n---\n# b\n`,
    ],
    frames: [
      `---\nid: iakaframe\nname: Iakaframe\nversion: 1\nmethodId: m-iaka\nteamId: t-iaka\ndefault: true\n---\n# f\n`,
      `---\nid: scrum\nname: Scrum\nversion: 1\nmethodId: m-scrum\nteamId: t-scrum\ndefault: false\n---\n# f\n`,
    ],
  };
}

describe("pointeur de frame active — pilotage du pivot d'assemblage", () => {
  it("AC-1 : sans pointeur, l'assemblage est celui d'avant (la frame `default`)", () => {
    const sans = buildFrame(raw());
    expect(sans.assembly.frame?.id).toBe("iakaframe");
    expect(sans.assembly.method?.id).toBe("m-iaka");
    expect(sans.assembly.team?.id).toBe("t-iaka");
    expect(sans.assembly.binding?.id).toBe("b-iaka");

    // Non-régression PROUVÉE : passer explicitement `null`/`undefined` ne change rien.
    expect(buildFrame(raw(), null).assembly).toEqual(sans.assembly);
    expect(buildFrame(raw(), undefined).assembly).toEqual(sans.assembly);
  });

  it("AC-2 : un pointeur valide fait pivoter method, team ET binding", () => {
    const f = buildFrame(raw(), "scrum");
    expect(f.assembly.frame?.id).toBe("scrum");
    expect(f.assembly.method?.id).toBe("m-scrum");
    expect(f.assembly.team?.id).toBe("t-scrum");
    expect(f.assembly.binding?.id).toBe("b-scrum");
  });

  it("AC-2 : le pointeur PRIME sur le `default` du réservoir", () => {
    // `iakaframe` est la frame default ; le pointeur désigne l'autre → c'est l'autre qui gagne.
    expect(buildFrame(raw(), "scrum").assembly.frame?.default).toBe(false);
  });

  it("AC-3 : un pointeur mort retombe sur le `default` — sans exception", () => {
    const f = buildFrame(raw(), "frame-supprimee");
    expect(f.assembly.frame?.id).toBe("iakaframe");
    expect(f.assembly.method?.id).toBe("m-iaka");
  });

  it("AC-3 : le pointeur mort est SIGNALÉ (il ne bascule pas en silence)", () => {
    const frames = buildFrame(raw()).frames ?? [];
    expect(activeFrameIsDangling(frames, "frame-supprimee")).toBe(true);
    expect(activeFrameIsDangling(frames, "scrum")).toBe(false);
    // Cas nominal : aucun pointeur posé n'est PAS un pointeur mort.
    expect(activeFrameIsDangling(frames, null)).toBe(false);
    expect(activeFrameIsDangling(frames, "")).toBe(false);
  });

  it("I-3 : un réservoir SANS descripteur `frames` garde le repli legacy (1er binding)", () => {
    const sansFrames = { ...raw(), frames: [] };
    const f = buildFrame(sansFrames, "scrum"); // pointeur ignoré : rien à pointer
    expect(f.assembly.frame).toBeNull();
    expect(f.assembly.binding?.id).toBe("b-iaka");
  });
});
