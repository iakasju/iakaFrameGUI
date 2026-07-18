import { describe, it, expect } from "vitest";
import {
  buildPortfolio,
  checkPortfolioRefs,
  emptyInventory,
  frameCounts,
  frameTotal,
  parsePortfolio,
  FRAME_ELEMENT_TYPES,
  type Binding,
  type FrameAtom,
  type MethodMd,
  type Persona,
  type PortfolioSources,
  type Scaffold,
  type TeamMd,
} from "../src";

// --- Fixture « type StefFrame2 » : comptes réels 8/8/14/5/3/2/1/16/1/1/1 -------

const persona = (id: string, roleKey: string): Persona => ({
  id,
  name: id,
  roleKey,
  royaume: roleKey.toUpperCase(),
  roleIndex: 0,
  skills: [],
  guardrails: [],
});

const atomIds = (ids: string[]): FrameAtom[] => ids.map((id) => ({ id }));

const PERSONAS: Persona[] = [
  persona("odin", "portefeuille"),
  persona("aragorn", "coordination"),
  persona("gandalf", "cadrage"),
  persona("gimli", "dev"),
  persona("legolas", "qualite"),
  persona("loki", "design"),
  persona("nathalie", "documentation"),
  persona("helm", "deploiement"),
];

const ROLE_KEYS = [
  "portefeuille",
  "coordination",
  "cadrage",
  "dev",
  "qualite",
  "deploiement",
  "design",
  "documentation",
];

const PRINCIPLE_IDS = [
  "qualite",
  "gestion-backlog",
  "documentation",
  "commits-versionnement",
  "isolation-docker",
  "self-hosted-first",
  "reutilisation-existant",
  "mvp-first",
  "identite-badges",
  "perimetres-etanches",
  "langue",
  "mock-en-dev",
  "cadrage-avant-code",
  "confirmation-actes-destructifs",
];

const RITUAL_IDS = ["iakastart", "init", "update", "snapshot", "log-conversation"];
const GUARDRAIL_IDS = ["identity", "perimeter", "delegation"];
const SKILL_IDS = [
  "iakaframe-aragorn",
  "iakaframe-cadrage",
  "iakaframe-deploiement",
  "iakaframe-design",
  "iakaframe-docker",
  "iakaframe-etat-des-lieux",
  "iakaframe-git",
  "iakaframe-humandoc",
  "iakaframe-init",
  "iakaframe-learning",
  "iakaframe-log-conversation",
  "iakaframe-nathalie",
  "iakaframe-odin",
  "iakaframe-qualite",
  "iakaframe-update",
  "iakastart",
];

const SCAFFOLDS: Scaffold[] = [
  {
    id: "portefeuille",
    level: "portfolio",
    nonDestructive: true,
    entries: [{ path: "BACKLOG.md", role: "backlog transverse", createIfAbsent: true }],
  },
  { id: "projet", level: "project", nonDestructive: true, entries: [] },
];

const METHOD: MethodMd = {
  id: "iakaframe",
  name: "Méthode iakaframe",
  workflowId: "iakaframe-3phases",
  principleIds: PRINCIPLE_IDS,
  ritualIds: RITUAL_IDS,
  guardrailIds: GUARDRAIL_IDS,
  roleKeys: ROLE_KEYS,
  scaffoldIds: ["portefeuille", "projet"],
};

const TEAM: TeamMd = {
  id: "iakaframe-8",
  name: "La compagnie iakaframe",
  personas: ["odin", "aragorn", "gandalf", "gimli", "legolas", "loki", "nathalie"],
  coordinator: "aragorn",
  guardrails: [],
  vignetteTeam: "none",
};

// Les 8 assignations RÉELLES du frame StefFrame2 (§8.5 : chaque personaId doit résoudre dans
// l'inventaire personas). opus → {odin, aragorn, gandalf}, sonnet → {gimli, legolas, helm, loki,
// nathalie}, runner `claude-code` pour toutes.
const BINDING: Binding = {
  id: "iakaframe-claude-default",
  methodId: "iakaframe",
  teamId: "iakaframe-8",
  node: "claude",
  origin: "forge-default",
  assignments: [
    { personaId: "odin", runner: "claude-code", model: "opus" },
    { personaId: "aragorn", runner: "claude-code", model: "opus" },
    { personaId: "gandalf", runner: "claude-code", model: "opus" },
    { personaId: "gimli", runner: "claude-code", model: "sonnet" },
    { personaId: "legolas", runner: "claude-code", model: "sonnet" },
    { personaId: "helm", runner: "claude-code", model: "sonnet" },
    { personaId: "loki", runner: "claude-code", model: "sonnet" },
    { personaId: "nathalie", runner: "claude-code", model: "sonnet" },
  ],
};

const SF2_SOURCES: PortfolioSources = {
  root: "/frames/releases/StefFrame2",
  personas: PERSONAS,
  roles: atomIds(ROLE_KEYS),
  principles: atomIds(PRINCIPLE_IDS),
  rituals: atomIds(RITUAL_IDS),
  guardrails: atomIds(GUARDRAIL_IDS),
  scaffolds: SCAFFOLDS,
  workflows: atomIds(["iakaframe-3phases"]),
  skills: atomIds(SKILL_IDS),
  methods: [METHOD],
  teams: [TEAM],
  bindings: [BINDING],
};

describe("buildPortfolio — inventaire des 11 types (critère A / F)", () => {
  it("porte les comptes exacts d'un frame type StefFrame2", () => {
    const p = buildPortfolio(SF2_SOURCES);
    const c = frameCounts(p);
    expect(c.personas).toBe(8);
    expect(c.roles).toBe(8);
    expect(c.principles).toBe(14);
    expect(c.rituals).toBe(5);
    expect(c.guardrails).toBe(3);
    expect(c.scaffolds).toBe(2);
    expect(c.workflows).toBe(1);
    expect(c.skills).toBe(16);
    expect(c.methods).toBe(1);
    expect(c.teams).toBe(1);
    expect(c.bindings).toBe(1);
    expect(frameTotal(p)).toBe(8 + 8 + 14 + 5 + 3 + 2 + 1 + 16 + 1 + 1 + 1);
  });

  it("résout l'assemblage method + team + binding via le binding", () => {
    const p = buildPortfolio(SF2_SOURCES);
    expect(p.assembly.method?.id).toBe("iakaframe");
    expect(p.assembly.team?.id).toBe("iakaframe-8");
    expect(p.assembly.binding?.id).toBe("iakaframe-claude-default");
  });

  it("identifie la facette portefeuille (scaffold portfolio, persona odin, backlog)", () => {
    const p = buildPortfolio(SF2_SOURCES);
    expect(p.facet.portfolioScaffoldId).toBe("portefeuille");
    expect(p.facet.odinPersonaId).toBe("odin");
    expect(p.facet.backlogPath).toBe("BACKLOG.md");
  });
});

describe("checkPortfolioRefs — intégrité dans le périmètre du frame (critère B)", () => {
  it("zéro erreur sur le frame type StefFrame2", () => {
    const report = checkPortfolioRefs(buildPortfolio(SF2_SOURCES));
    expect(report.ok).toBe(true);
    expect(report.missing).toHaveLength(0);
  });

  it("détecte un principe référencé mais absent du pool", () => {
    const broken: PortfolioSources = {
      ...SF2_SOURCES,
      principles: atomIds(PRINCIPLE_IDS.slice(1)), // retire "qualite"
    };
    const report = checkPortfolioRefs(buildPortfolio(broken));
    expect(report.ok).toBe(false);
    expect(report.missing).toEqual([
      { scope: "method", field: "principleIds", id: "qualite", type: "principles" },
    ]);
  });

  it("détecte un coordinateur / une persona de binding absents", () => {
    const broken: PortfolioSources = {
      ...SF2_SOURCES,
      personas: PERSONAS.filter((p) => p.id !== "helm" && p.id !== "aragorn"),
    };
    const report = checkPortfolioRefs(buildPortfolio(broken));
    expect(report.ok).toBe(false);
    const ids = report.missing.map((m) => `${m.scope}:${m.field}:${m.id}`);
    expect(ids).toContain("team:personas:aragorn");
    expect(ids).toContain("team:coordinator:aragorn");
    expect(ids).toContain("binding:assignments:helm");
  });
});

describe("parsePortfolio — défensif (critère F)", () => {
  it("record invalide → null, jamais d'exception", () => {
    for (const bad of [null, undefined, 42, "x", [], {}, { inventory: {} }]) {
      expect(() => parsePortfolio(bad)).not.toThrow();
      expect(parsePortfolio(bad)).toBeNull();
    }
  });

  it("normalise l'inventaire sur les 11 clés et coerce l'assemblage", () => {
    const p = parsePortfolio({
      root: "/x",
      inventory: { personas: ["odin", 3, "", "aragorn"], bogus: ["ignore"] },
      assembly: {
        method: { id: "iakaframe", principleIds: ["qualite"] },
        team: { id: "iakaframe-8", personas: ["odin"], coordinator: "odin" },
        binding: { id: "b", methodId: "iakaframe", teamId: "iakaframe-8" },
      },
      facet: { odinPersonaId: "odin" },
    });
    expect(p).not.toBeNull();
    expect(p!.root).toBe("/x");
    expect(p!.inventory.personas).toEqual(["odin", "aragorn"]);
    // Les 11 clés existent toujours (les absentes → []).
    for (const t of FRAME_ELEMENT_TYPES) expect(Array.isArray(p!.inventory[t])).toBe(true);
    expect(p!.assembly.method?.id).toBe("iakaframe");
    expect(p!.assembly.binding?.methodId).toBe("iakaframe");
    expect(p!.facet.odinPersonaId).toBe("odin");
    expect(p!.facet.portfolioScaffoldId).toBeNull();
  });

  it("assemblage à sous-record illisible → null pour ce membre (pas d'exception)", () => {
    const p = parsePortfolio({
      root: "/x",
      assembly: { method: { name: "sans id" }, team: 3, binding: null },
    });
    expect(p!.assembly.method).toBeNull();
    expect(p!.assembly.team).toBeNull();
    expect(p!.assembly.binding).toBeNull();
  });
});

describe("emptyInventory", () => {
  it("porte les 11 clés vides", () => {
    const inv = emptyInventory();
    expect(Object.keys(inv).sort()).toEqual([...FRAME_ELEMENT_TYPES].sort());
    for (const t of FRAME_ELEMENT_TYPES) expect(inv[t]).toEqual([]);
  });
});
