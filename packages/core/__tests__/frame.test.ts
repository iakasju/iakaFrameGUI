import { describe, it, expect } from "vitest";
import {
  buildFrame,
  parseFrame,
  parseFrameBinding,
  checkFrameRefs,
  FRAME_TYPES,
  POOL_FRAME_TYPES,
  PORTFOLIO_BACKLOG_ENTRY,
  type Frame,
  type FrameRaw,
  type FrameMissingRef,
  type FrameIntegrityReport,
} from "../src/frame";

// --- AC-1 : l'entité est bien exportée par @iakaframe/core (import ci-dessus = preuve). ---
// (types + fonctions résolus à la compilation ; on vérifie aussi les valeurs runtime ci-dessous)

// --- Fixtures SF2 (frontmatter `.md`), référentiellement cohérentes. ---

const persona = (id: string, roleKey: string, name = id): string =>
  `---\nid: ${id}\nname: ${name}\nroleKey: ${roleKey}\n---\n# ${name}\n`;
const role = (key: string): string =>
  `---\nid: ${key}\nkey: ${key}\nlabel: ${key}\nroleIndex: 0\n---\n# ${key}\n`;
const principle = (id: string): string =>
  `---\nid: ${id}\nlabel: ${id}\n---\n# ${id}\n`;
const ritual = (id: string): string => `---\nid: ${id}\nlabel: ${id}\n---\n# ${id}\n`;
const guardrail = (id: string): string => `---\nid: ${id}\nlabel: ${id}\n---\n# ${id}\n`;
const scaffold = (id: string, level: "portfolio" | "project"): string =>
  `---\nid: ${id}\nlevel: ${level}\n---\n# ${id}\n`;
const workflow = (id: string): string =>
  `---\nid: ${id}\nname: ${id}\nphases:\n  - { id: p1, label: P1, agentsRoleKeys: [cadrage], input: x, output: y }\n---\n# ${id}\n`;
const skill = (id: string): string =>
  `---\nid: ${id}\nname: ${id}\ndescription: d\n---\n# ${id}\n`;

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

const PERSONAS: [string, string][] = [
  ["odin", "portefeuille"],
  ["aragorn", "coordination"],
  ["gandalf", "cadrage"],
  ["gimli", "dev"],
  ["legolas", "qualite"],
  ["helm", "deploiement"],
  ["loki", "design"],
  ["nathalie", "documentation"],
];

// 16 principes (dont `qualite`, référencé par la méthode → sert l'AC-5).
const PRINCIPLE_IDS = ["qualite", ...Array.from({ length: 15 }, (_, i) => `p${i + 1}`)];
const RITUAL_IDS = ["iakastart", "init", "update", "snapshot", "log"];
const GUARDRAIL_IDS = ["identity", "perimeter", "delegation"];
const SKILL_IDS = Array.from({ length: 17 }, (_, i) => `s${i + 1}`);

const methodMd = `---
id: iakaframe
name: Méthode iakaframe
workflowId: iakaframe-3phases
principleIds: [qualite]
ritualIds: [iakastart]
guardrailIds: [identity]
roleKeys: [portefeuille, coordination, cadrage, dev, qualite, deploiement, design, documentation]
scaffoldIds: [portefeuille, projet]
---
# Méthode
`;

const teamMd = `---
id: iakaframe-8
name: La compagnie iakaframe
personas: [odin, aragorn, gandalf, gimli, legolas, helm, loki, nathalie]
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
  - { personaId: odin,     runner: claude-code, model: "opus" }
  - { personaId: aragorn,  runner: claude-code, model: "opus" }
  - { personaId: gandalf,  runner: claude-code, model: "opus" }
  - { personaId: gimli,    runner: claude-code, model: "sonnet" }
  - { personaId: legolas,  runner: claude-code, model: "sonnet" }
  - { personaId: helm,     runner: claude-code, model: "sonnet" }
  - { personaId: loki,     runner: claude-code, model: "sonnet" }
  - { personaId: nathalie, runner: claude-code, model: "sonnet" }
---
# Binding
`;

/** Un frame SF2 cohérent (comptes 8/8/16/5/3/2/1/17/1/1/1, référentiellement clos). */
function sf2Raw(): FrameRaw {
  return {
    root: "/frame/StefFrame2",
    pools: {
      personas: PERSONAS.map(([id, rk]) => persona(id, rk)),
      roles: ROLE_KEYS.map(role),
      principles: PRINCIPLE_IDS.map(principle),
      rituals: RITUAL_IDS.map(ritual),
      guardrails: GUARDRAIL_IDS.map(guardrail),
      scaffolds: [scaffold("portefeuille", "portfolio"), scaffold("projet", "project")],
      workflows: [workflow("iakaframe-3phases")],
      skills: SKILL_IDS.map(skill),
    },
    teams: [teamMd],
    methods: [methodMd],
    bindings: [bindingMd],
  };
}

describe("AC-1 — l'entité Frame est de 1er ordre (@iakaframe/core)", () => {
  it("exporte les symboles runtime de l'entité", () => {
    expect(typeof buildFrame).toBe("function");
    expect(typeof parseFrame).toBe("function");
    expect(typeof checkFrameRefs).toBe("function");
    expect(typeof parseFrameBinding).toBe("function");
    expect(FRAME_TYPES).toHaveLength(11);
    expect(PORTFOLIO_BACKLOG_ENTRY).toBe("BACKLOG.md");
  });
});

describe("AC-2 — inventaire des 11 (critère A)", () => {
  it("porte 11 clés aux comptes SF2 (workflows compté une fois, G5)", () => {
    const f = buildFrame(sf2Raw());
    expect(Object.keys(f.counts).sort()).toEqual([...FRAME_TYPES].sort());
    expect(f.counts.personas).toBe(8);
    expect(f.counts.roles).toBe(8);
    expect(f.counts.principles).toBe(16);
    expect(f.counts.rituals).toBe(5);
    expect(f.counts.guardrails).toBe(3);
    expect(f.counts.scaffolds).toBe(2);
    expect(f.counts.workflows).toBe(1);
    expect(f.counts.skills).toBe(17);
    expect(f.counts.teams).toBe(1);
    expect(f.counts.methods).toBe(1);
    expect(f.counts.bindings).toBe(1);
    expect(f.root).toBe("/frame/StefFrame2");
  });
});

describe("AC-3 — facette portefeuille (par level / par rôle)", () => {
  it("résout scaffold portfolio + persona rôle portefeuille + backlog", () => {
    const f = buildFrame(sf2Raw());
    expect(f.portfolio).toEqual({
      scaffoldId: "portefeuille",
      personaId: "odin",
      backlog: "BACKLOG.md",
    });
  });

  it("détecte une persona RENOMMÉE (nom ≠ « odin ») mais de rôle portefeuille", () => {
    const raw = sf2Raw();
    // La persona portefeuille est renommée « Wotan » (id « wotan »), rôle inchangé.
    raw.pools.personas = [
      persona("wotan", "portefeuille", "Wotan"),
      ...PERSONAS.slice(1).map(([id, rk]) => persona(id, rk)),
    ];
    const f = buildFrame(raw);
    expect(f.portfolio.personaId).toBe("wotan"); // par RÔLE, jamais par le nom en dur
  });

  it("frame SANS scaffold portfolio → scaffoldId null ET backlog null (jamais d'exception)", () => {
    const raw = sf2Raw();
    raw.pools.scaffolds = [scaffold("projet", "project")]; // aucun niveau portfolio
    const f = buildFrame(raw);
    expect(f.portfolio.scaffoldId).toBeNull();
    expect(f.portfolio.backlog).toBeNull();
    expect(f.portfolio.personaId).toBe("odin"); // la persona reste détectée
  });
});

describe("AC-4 — assemblage résolu (method/team résolus par le binding)", () => {
  it("résout method.id/team.id/binding.id via binding.methodId/teamId", () => {
    const f = buildFrame(sf2Raw());
    expect(f.assembly.binding?.id).toBe("iakaframe-claude-default");
    expect(f.assembly.method?.id).toBe("iakaframe");
    expect(f.assembly.team?.id).toBe("iakaframe-8");
  });
});

describe("AC-5 — intégrité dans le périmètre (critère B)", () => {
  it("0 référence cassée sur le fixture cohérent", () => {
    const f = buildFrame(sf2Raw());
    expect(f.integrity.ok).toBe(true);
    expect(f.integrity.missing).toEqual([]);
  });

  it("retrait d'un principe référencé → ok:false + entrée manquante précise", () => {
    const raw = sf2Raw();
    raw.pools.principles = PRINCIPLE_IDS.filter((id) => id !== "qualite").map(principle);
    const f = buildFrame(raw);
    expect(f.integrity.ok).toBe(false);
    expect(f.integrity.missing).toContainEqual({
      source: "method:iakaframe",
      field: "principleIds",
      id: "qualite",
    });
  });
});

describe("AC-6 / AC-F — parseFrame défensif (jamais d'exception)", () => {
  it("record invalide / aléatoire → null, jamais d'exception", () => {
    for (const bad of [null, undefined, 42, "x", [], {}, true, NaN]) {
      expect(() => parseFrame(bad)).not.toThrow();
      expect(parseFrame(bad)).toBeNull();
    }
  });

  it("record plausible (avec counts) → Frame aux 11 clés + coercition sûre", () => {
    const f = parseFrame({
      root: "/x",
      counts: { personas: 8, bindings: 1, bogus: 99 },
      poolIds: { personas: ["odin", 3, ""], nope: 1 },
      portfolio: { scaffoldId: "portefeuille", personaId: "odin", backlog: "BACKLOG.md" },
      integrity: { ok: false, missing: [{ source: "s", field: "f", id: "i" }, 42] },
    });
    expect(f).not.toBeNull();
    const frame = f as Frame;
    expect(Object.keys(frame.counts).sort()).toEqual([...FRAME_TYPES].sort());
    expect(frame.counts.personas).toBe(8);
    expect(frame.counts.roles).toBe(0); // absent → 0
    expect(frame.poolIds.personas).toEqual(["odin"]); // non-string / vides filtrés
    expect(frame.portfolio.scaffoldId).toBe("portefeuille");
    expect(frame.integrity.ok).toBe(false);
    expect(frame.integrity.missing).toEqual([{ source: "s", field: "f", id: "i" }]);
    expect(frame.assembly).toEqual({ binding: null, method: null, team: null });
  });

  it("record plausible sans facette/intégrité → replis sûrs", () => {
    const frame = parseFrame({ counts: {} }) as Frame;
    expect(frame).not.toBeNull();
    expect(frame.root).toBeNull();
    expect(frame.portfolio).toEqual({ scaffoldId: null, personaId: null, backlog: null });
    expect(frame.integrity).toEqual({ ok: true, missing: [] });
    for (const t of FRAME_TYPES) expect(frame.counts[t]).toBe(0);
    for (const t of POOL_FRAME_TYPES) expect(frame.poolIds[t]).toEqual([]);
  });
});

describe("checkFrameRefs / parseFrameBinding — contrats de type (typing)", () => {
  it("checkFrameRefs et FrameIntegrityReport/FrameMissingRef sont utilisables", () => {
    const empty: Record<string, string[]> = {};
    for (const t of POOL_FRAME_TYPES) empty[t] = [];
    const report: FrameIntegrityReport = checkFrameRefs(
      empty as never,
      [],
      [],
      [],
    );
    expect(report.ok).toBe(true);
    const miss: FrameMissingRef[] = report.missing;
    expect(miss).toEqual([]);
  });

  it("parseFrameBinding lit le schéma SF2 `assignments`", () => {
    const b = parseFrameBinding(bindingMd);
    expect(b?.id).toBe("iakaframe-claude-default");
    expect(b?.methodId).toBe("iakaframe");
    expect(b?.teamId).toBe("iakaframe-8");
    expect(b?.personaIds).toContain("odin");
    expect(b?.personaIds).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// T2/T4 — parseFrameBinding conserve le triplet {runner, model, tools} (SF2 dé-amputé).
// ---------------------------------------------------------------------------

const bindingWithToolsMd = `---
id: iakaframe-claude-default
methodId: iakaframe
teamId: iakaframe-8
node: claude
origin: forge-default
assignments:
  - { personaId: odin,    runner: claude-code, model: "opus",   tools: [Read, Grep, Glob, Bash] }
  - { personaId: gandalf, runner: claude-code, model: "opus",   tools: [Read, Write, Edit, WebSearch] }
---
# Binding
`;

describe("T2/T4 — le triplet {runner, model, tools} est conservé au parse", () => {
  it("préserve tools/runner/model par assignment et dérive personaIds", () => {
    const b = parseFrameBinding(bindingWithToolsMd);
    expect(b).not.toBeNull();
    expect(b!.assignments).toHaveLength(2);
    const odin = b!.assignments.find((a) => a.personaId === "odin")!;
    expect(odin.runner).toBe("claude-code");
    expect(odin.model).toBe("opus");
    expect(odin.tools).toEqual(["Read", "Grep", "Glob", "Bash"]);
    const gandalf = b!.assignments.find((a) => a.personaId === "gandalf")!;
    expect(gandalf.tools).toEqual(["Read", "Write", "Edit", "WebSearch"]);
    // personaIds reste dérivé (ordre préservé) → non-régression de l'intégrité binding→personaId.
    expect(b!.personaIds).toEqual(["odin", "gandalf"]);
  });

  it("binding SANS tools → assignments.tools = [] (défensif, non-régression)", () => {
    const b = parseFrameBinding(bindingMd);
    expect(b!.assignments).toHaveLength(8);
    expect(b!.assignments.every((a) => a.tools.length === 0)).toBe(true);
    expect(b!.assignments.every((a) => a.runner === "claude-code")).toBe(true);
    expect(b!.personaIds).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// Intégrité élargie (T1/T3/T5/T6) — canon sain + détection des fantômes.
// ---------------------------------------------------------------------------

/** Ids réels du pool skills du canon (17). */
const CANON_SKILL_IDS = [
  "iakaframe-odin", "iakastart", "iakaframe-aragorn", "iakaframe-cadrage", "iakaframe-qualite",
  "iakaframe-deploiement", "iakaframe-naonedge", "iakaframe-nathalie", "iakaframe-appflowy-doc",
  "iakaframe-init", "iakaframe-update", "iakaframe-forgejo", "iakaframe-docker",
  "iakaframe-etat-des-lieux", "iakaframe-learning", "iakaframe-log-conversation", "iakaframe-retrait",
];
const CANON_SUBSKILLS: Record<string, string[]> = {
  "iakaframe-init": ["iakaframe-forgejo", "iakaframe-docker", "iakaframe-etat-des-lieux"],
  "iakaframe-update": ["iakaframe-etat-des-lieux", "iakaframe-forgejo"],
  "iakaframe-odin": ["iakastart"],
};
/** Personas réelles avec leurs skills-rôles (multi-skills pour odin/nathalie). */
const CANON_PERSONAS: [string, string, string[]][] = [
  ["odin", "portefeuille", ["iakaframe-odin", "iakastart"]],
  ["aragorn", "coordination", ["iakaframe-aragorn"]],
  ["gandalf", "cadrage", ["iakaframe-cadrage"]],
  ["gimli", "dev", []],
  ["legolas", "qualite", ["iakaframe-qualite"]],
  ["helm", "deploiement", ["iakaframe-deploiement"]],
  ["loki", "design", ["iakaframe-naonedge"]],
  ["nathalie", "documentation", ["iakaframe-nathalie", "iakaframe-appflowy-doc"]],
];

const personaFull = (id: string, roleKey: string, skills: string[]): string =>
  `---\nid: ${id}\nname: ${id}\nroleKey: ${roleKey}\nskills: [${skills.join(", ")}]\nguardrails: [identity, perimeter]\n---\n# ${id}\n`;
const skillMaybeSub = (id: string): string => {
  const subs = CANON_SUBSKILLS[id];
  return subs
    ? `---\nid: ${id}\nname: ${id}\ndescription: d\nsubskills: [${subs.join(", ")}]\n---\n# ${id}\n`
    : `---\nid: ${id}\nname: ${id}\ndescription: d\n---\n# ${id}\n`;
};
const canonWorkflow = `---\nid: iakaframe-3phases\nname: wf\nphases:\n  - { id: p1, agentsRoleKeys: [cadrage] }\n  - { id: p2, agentsRoleKeys: [dev, qualite] }\n  - { id: prod, agentsRoleKeys: [deploiement] }\n---\n# wf\n`;

/** Miroir fidèle du canon réel (personas multi-skills + subskills + workflow agentsRoleKeys). */
function canonRaw(): FrameRaw {
  return {
    root: "/canon",
    pools: {
      personas: CANON_PERSONAS.map(([id, rk, sk]) => personaFull(id, rk, sk)),
      roles: ROLE_KEYS.map(role),
      principles: PRINCIPLE_IDS.map(principle),
      rituals: RITUAL_IDS.map(ritual),
      guardrails: GUARDRAIL_IDS.map(guardrail),
      scaffolds: [scaffold("portefeuille", "portfolio"), scaffold("projet", "project")],
      workflows: [canonWorkflow],
      skills: CANON_SKILL_IDS.map(skillMaybeSub),
    },
    teams: [teamMd],
    methods: [methodMd],
    bindings: [bindingMd],
  };
}

describe("intégrité élargie (T1/T3/T5/T6) — canon sain + fantômes détectés", () => {
  it("le canon réel (personas multi-skills + subskills + workflow + binding) passe : integrity.ok", () => {
    const f = buildFrame(canonRaw());
    expect(f.integrity.ok).toBe(true);
    expect(f.integrity.missing).toEqual([]);
  });

  it("T1 — persona → skill fantôme détectée (skills:[...] ne résout pas)", () => {
    const raw = canonRaw();
    raw.pools.personas = [
      ...raw.pools.personas,
      personaFull("ghost", "dev", ["skill-fantome"]),
    ];
    const f = buildFrame(raw);
    expect(f.integrity.ok).toBe(false);
    expect(f.integrity.missing).toContainEqual({
      source: "persona:ghost",
      field: "skills",
      id: "skill-fantome",
    });
  });

  it("T1 — persona → roleKey + guardrail fantômes détectés", () => {
    const raw = canonRaw();
    raw.pools.personas = [
      ...raw.pools.personas,
      `---\nid: ghost\nname: ghost\nroleKey: role-fantome\nskills: []\nguardrails: [garde-fantome]\n---\n# ghost\n`,
    ];
    const f = buildFrame(raw);
    expect(f.integrity.missing).toContainEqual({
      source: "persona:ghost",
      field: "roleKey",
      id: "role-fantome",
    });
    expect(f.integrity.missing).toContainEqual({
      source: "persona:ghost",
      field: "guardrails",
      id: "garde-fantome",
    });
  });

  it("T3 — subskill fantôme détecté + anti-self-ref (id ∉ subskills)", () => {
    const raw = canonRaw();
    raw.pools.skills = [
      ...raw.pools.skills,
      `---\nid: iakaframe-orch\nname: x\ndescription: d\nsubskills: [skill-fantome, iakaframe-orch]\n---\n# x\n`,
    ];
    const f = buildFrame(raw);
    expect(f.integrity.missing).toContainEqual({
      source: "skill:iakaframe-orch",
      field: "subskills",
      id: "skill-fantome",
    });
    expect(f.integrity.missing).toContainEqual({
      source: "skill:iakaframe-orch",
      field: "subskills",
      id: "iakaframe-orch",
    });
  });

  it("T5 — workflow → agentsRoleKeys fantôme détecté", () => {
    const raw = canonRaw();
    raw.pools.workflows = [
      ...raw.pools.workflows,
      `---\nid: wf-x\nname: x\nphases:\n  - { id: p1, agentsRoleKeys: [role-fantome] }\n---\n# x\n`,
    ];
    const f = buildFrame(raw);
    expect(f.integrity.missing).toContainEqual({
      source: "workflow:wf-x",
      field: "agentsRoleKeys",
      id: "role-fantome",
    });
  });

  it("T6 — team.guardrails fantôme détecté", () => {
    const raw = canonRaw();
    raw.teams = [teamMd.replace("guardrails: []", "guardrails: [garde-fantome]")];
    const f = buildFrame(raw);
    expect(f.integrity.missing).toContainEqual({
      source: "team:iakaframe-8",
      field: "guardrails",
      id: "garde-fantome",
    });
  });
});
