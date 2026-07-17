import { describe, it, expect } from "vitest";
import { frameCounts, frameTotal } from "@iakaframe/core";
import {
  assembleFrame,
  loadFramePortfolio,
  type FrameRawReads,
} from "./openFrame";
import type { Backend } from "../api/backend";

// --- Générateurs de contenus `.md` reproduisant le layout StefFrame2 ----------

const personaMd = (id: string, roleKey: string): string =>
  `---\nid: ${id}\nname: ${id}\nroleKey: ${roleKey}\nroyaume: ${roleKey.toUpperCase()}\n---\n# ${id}\n`;
const roleMd = (key: string): string => `---\nid: ${key}\nkey: ${key}\nlabel: ${key}\n---\n# ${key}\n`;
const atomMd = (id: string): string => `---\nid: ${id}\n---\n# ${id}\n`;

const PERSONAS = [
  personaMd("odin", "portefeuille"),
  personaMd("aragorn", "coordination"),
  personaMd("gandalf", "cadrage"),
  personaMd("gimli", "dev"),
  personaMd("legolas", "qualite"),
  personaMd("loki", "design"),
  personaMd("nathalie", "documentation"),
  personaMd("helm", "deploiement"),
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
const SKILL_IDS = Array.from({ length: 16 }, (_, i) => `skill-${i + 1}`);

const SCAFFOLDS = [
  `---\nid: portefeuille\nlevel: portfolio\nnonDestructive: true\nentries:\n  - { path: "BACKLOG.md", role: "backlog transverse", createIfAbsent: true }\n---\n# portefeuille\n`,
  `---\nid: projet\nlevel: project\nnonDestructive: true\n---\n# projet\n`,
];

const METHOD = `---
id: iakaframe
name: Méthode iakaframe
workflowId: iakaframe-3phases
principleIds: [${PRINCIPLE_IDS.join(", ")}]
ritualIds: [${RITUAL_IDS.join(", ")}]
guardrailIds: [${GUARDRAIL_IDS.join(", ")}]
roleKeys: [${ROLE_KEYS.join(", ")}]
scaffoldIds: [portefeuille, projet]
---
# Méthode iakaframe
`;

const TEAM = `---
id: iakaframe-8
name: La compagnie iakaframe
personas: [odin, aragorn, gandalf, gimli, legolas, loki, nathalie]
coordinator: aragorn
guardrails: []
vignetteTeam: none
---
# team
`;

const BINDING = `---
id: iakaframe-claude-default
methodId: iakaframe
teamId: iakaframe-8
node: claude
origin: forge-default
assignments:
  - { personaId: odin, runner: claude-code, model: "opus" }
  - { personaId: helm, runner: claude-code, model: "sonnet" }
---
# binding
`;

const SF2_READS: FrameRawReads = {
  root: "/frames/releases/StefFrame2",
  personas: PERSONAS,
  roles: ROLE_KEYS.map(roleMd),
  principles: PRINCIPLE_IDS.map(atomMd),
  rituals: RITUAL_IDS.map(atomMd),
  guardrails: GUARDRAIL_IDS.map(atomMd),
  scaffolds: SCAFFOLDS,
  workflows: [atomMd("iakaframe-3phases")],
  skills: SKILL_IDS.map(atomMd),
  methods: [METHOD],
  teams: [TEAM],
  bindings: [BINDING],
};

describe("assembleFrame — charge les 11 types d'un frame type StefFrame2 (A/D)", () => {
  it("porte les comptes exacts 8/8/14/5/3/2/1/16/1/1/1", () => {
    const c = frameCounts(assembleFrame(SF2_READS));
    expect(c).toEqual({
      personas: 8,
      roles: 8,
      principles: 14,
      rituals: 5,
      guardrails: 3,
      scaffolds: 2,
      workflows: 1,
      skills: 16,
      methods: 1,
      teams: 1,
      bindings: 1,
    });
    expect(frameTotal(assembleFrame(SF2_READS))).toBe(60);
  });

  it("workflows compté une seule fois (l'atome de pool — G5)", () => {
    expect(frameCounts(assembleFrame(SF2_READS)).workflows).toBe(1);
  });

  it("rattache la facette portefeuille (odin, scaffold portfolio, backlog)", () => {
    const p = assembleFrame(SF2_READS);
    expect(p.facet.odinPersonaId).toBe("odin");
    expect(p.facet.portfolioScaffoldId).toBe("portefeuille");
    expect(p.facet.backlogPath).toBe("BACKLOG.md");
  });
});

// --- loadFramePortfolio : orchestration via backend injecté -------------------

function fakeBackend(reads: FrameRawReads, home: string | null): Backend {
  const pools: Record<string, string[]> = {
    personas: reads.personas,
    roles: reads.roles,
    principles: reads.principles,
    rituals: reads.rituals,
    guardrails: reads.guardrails,
    scaffolds: reads.scaffolds,
    workflows: reads.workflows,
    skills: reads.skills,
  };
  const collections: Record<string, string[]> = {
    methods: reads.methods,
    teams: reads.teams,
    bindings: reads.bindings,
  };
  return {
    iakaframeHome: async () => home,
    poolReadAll: async (t: string) => pools[t] ?? [],
    libraryList: async (c: string) => collections[c] ?? [],
  } as unknown as Backend;
}

describe("loadFramePortfolio — lecture backend + intégrité (B/C)", () => {
  it("charge le frame courant et rapporte 0 erreur d'intégrité", async () => {
    const loaded = await loadFramePortfolio(fakeBackend(SF2_READS, SF2_READS.root));
    expect(loaded).not.toBeNull();
    expect(loaded!.refs.ok).toBe(true);
    expect(loaded!.refs.missing).toHaveLength(0);
    expect(frameCounts(loaded!.portfolio).bindings).toBe(1);
    expect(loaded!.portfolio.assembly.binding?.id).toBe("iakaframe-claude-default");
  });

  it("racine introuvable → null (l'appelant invite à la définir)", async () => {
    expect(await loadFramePortfolio(fakeBackend(SF2_READS, null))).toBeNull();
  });
});
