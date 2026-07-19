import { describe, it, expect } from "vitest";
import {
  buildFrameInventory,
  loadFrame,
  FRAME_TYPES,
  POOL_FRAME_TYPES,
  type FrameRaw,
} from "./frame";
import type { Backend, PoolType } from "../api/backend";

// --- Fixtures : reproduisent le schéma SF2 (frontmatter `.md`), référentiellement cohérentes. ---

const persona = (id: string): string =>
  `---\nid: ${id}\nname: ${id}\nroleKey: cadrage\n---\n# ${id}\n`;
const role = (key: string): string =>
  `---\nid: ${key}\nkey: ${key}\nlabel: ${key}\nroleIndex: 0\n---\n# ${key}\n`;
const principle = (id: string): string =>
  `---\nid: ${id}\nlabel: ${id}\npolicy: "x"\ntrigger: "y"\n---\n# ${id}\n`;
const ritual = (id: string): string =>
  `---\nid: ${id}\nlabel: ${id}\ntriggers: [${id}]\n---\n# ${id}\n`;
const guardrail = (id: string): string =>
  `---\nid: ${id}\nlabel: ${id}\nkind: ${id}\n---\n# ${id}\n`;
const scaffold = (id: string): string =>
  `---\nid: ${id}\nlevel: portfolio\n---\n# ${id}\n`;
const workflow = (id: string): string =>
  `---\nid: ${id}\nname: ${id}\nphases:\n  - { id: p1, label: P1, agentsRoleKeys: [cadrage], input: x, output: y }\n---\n# ${id}\n`;
const skill = (id: string): string =>
  `---\nid: ${id}\nname: ${id}\ndescription: d\n---\n# ${id}\n`;

const methodMd = `---
id: iakaframe
name: Méthode iakaframe
workflowId: iakaframe-3phases
principleIds: [qualite]
ritualIds: [iakastart]
guardrailIds: [identity]
roleKeys: [cadrage, coordination]
scaffoldIds: [portefeuille]
---
# Méthode
`;

const teamMd = `---
id: iakaframe-8
name: La compagnie
personas: [odin, aragorn]
coordinator: aragorn
guardrails: []
vignetteTeam: none
---
# Team
`;

const bindingMd = `---
id: iakaframe-claude-default
methodId: iakaframe
teamId: iakaframe-8
node: claude
origin: forge-default
assignments:
  - { personaId: odin,    runner: claude-code, model: "opus" }
  - { personaId: aragorn, runner: claude-code, model: "opus" }
---
# Binding
`;

/** Un frame minimal cohérent (2 personas, 2 rôles, 1 de chaque atome, 1 de chaque assemblage). */
function coherentRaw(): FrameRaw {
  return {
    root: "/frame/StefFrame2",
    pools: {
      personas: [persona("odin"), persona("aragorn")],
      roles: [role("cadrage"), role("coordination")],
      principles: [principle("qualite")],
      rituals: [ritual("iakastart")],
      guardrails: [guardrail("identity")],
      scaffolds: [scaffold("portefeuille")],
      workflows: [workflow("iakaframe-3phases")],
      skills: [skill("iakaframe-odin")],
    },
    teams: [teamMd],
    methods: [methodMd],
    bindings: [bindingMd],
  };
}

describe("buildFrameInventory — comptage des 11 types (G3/G5)", () => {
  it("compte chaque type et expose les 11 clés", () => {
    const inv = buildFrameInventory(coherentRaw());
    expect(Object.keys(inv.counts).sort()).toEqual([...FRAME_TYPES].sort());
    expect(inv.counts.personas).toBe(2);
    expect(inv.counts.roles).toBe(2);
    expect(inv.counts.principles).toBe(1);
    expect(inv.counts.rituals).toBe(1);
    expect(inv.counts.guardrails).toBe(1);
    expect(inv.counts.scaffolds).toBe(1);
    expect(inv.counts.workflows).toBe(1);
    expect(inv.counts.skills).toBe(1);
    expect(inv.counts.teams).toBe(1);
    expect(inv.counts.methods).toBe(1);
    expect(inv.counts.bindings).toBe(1);
    expect(inv.root).toBe("/frame/StefFrame2");
  });

  it("scanne les ids par pool (roles via `key`)", () => {
    const inv = buildFrameInventory(coherentRaw());
    expect(inv.poolIds.personas.sort()).toEqual(["aragorn", "odin"]);
    expect(inv.poolIds.roles.sort()).toEqual(["cadrage", "coordination"]);
    expect(inv.poolIds.workflows).toEqual(["iakaframe-3phases"]);
  });
});

describe("checkFrameRefs — intégrité référentielle (G4, critère B)", () => {
  it("0 référence cassée sur un frame cohérent", () => {
    const inv = buildFrameInventory(coherentRaw());
    expect(inv.integrity.ok).toBe(true);
    expect(inv.integrity.missing).toEqual([]);
  });

  it("détecte une référence method cassée (principe absent du pool)", () => {
    const raw = coherentRaw();
    raw.pools.principles = []; // le pool ne contient plus `qualite`
    const inv = buildFrameInventory(raw);
    expect(inv.integrity.ok).toBe(false);
    expect(inv.integrity.missing).toContainEqual({
      source: "method:iakaframe",
      field: "principleIds",
      id: "qualite",
    });
  });

  it("détecte un coordinator team et un personaId binding hors personas", () => {
    const raw = coherentRaw();
    raw.pools.personas = [persona("odin")]; // aragorn n'existe plus
    const inv = buildFrameInventory(raw);
    expect(inv.integrity.ok).toBe(false);
    expect(inv.integrity.missing).toContainEqual({
      source: "team:iakaframe-8",
      field: "coordinator",
      id: "aragorn",
    });
    expect(inv.integrity.missing).toContainEqual({
      source: "binding:iakaframe-claude-default",
      field: "personaId",
      id: "aragorn",
    });
  });
});

describe("loadFrame — lecture backend + G5 (workflows compté une fois)", () => {
  it("lit les 8 pools via poolReadAll + 3 collections via libraryList, sans la collection workflows/", () => {
    const raw = coherentRaw();
    const libraryListCalls: string[] = [];
    const api = {
      iakaframeHome: async () => raw.root,
      poolReadAll: async (t: PoolType) => raw.pools[t as keyof typeof raw.pools] ?? [],
      libraryList: async (c: string) => {
        libraryListCalls.push(c);
        if (c === "teams") return raw.teams;
        if (c === "methods") return raw.methods;
        if (c === "bindings") return raw.bindings;
        return [];
      },
    } as unknown as Backend;

    return loadFrame(api).then((inv) => {
      // G5 : `workflows/` (collection éditable) N'EST PAS chargée — workflow compté 1 fois (le pool).
      expect(libraryListCalls.sort()).toEqual(["bindings", "methods", "teams"]);
      expect(inv.counts.workflows).toBe(1);
      expect(inv.counts.bindings).toBe(1);
      expect(inv.integrity.ok).toBe(true);
      // Les 8 pools ont bien été demandés en CONTENU (G1).
      expect(POOL_FRAME_TYPES.every((t) => inv.counts[t] >= 0)).toBe(true);
    });
  });

  it("dégrade en inventaire vide si le backend échoue (défensif)", () => {
    const api = {
      iakaframeHome: async () => null,
      poolReadAll: async () => {
        throw new Error("hors Tauri");
      },
      libraryList: async () => {
        throw new Error("hors Tauri");
      },
    } as unknown as Backend;
    return loadFrame(api).then((inv) => {
      expect(inv.root).toBeNull();
      for (const t of FRAME_TYPES) expect(inv.counts[t]).toBe(0);
      expect(inv.integrity.ok).toBe(true);
    });
  });
});
