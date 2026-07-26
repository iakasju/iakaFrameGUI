/**
 * phases-kit-claude.test.ts — la section **phases/workflow** dans le `CLAUDE.md` généré.
 *
 * Couvre `specs/instructions/phases-workflow-kits-claude.md` :
 *   AC-1  `CLAUDE.md` porte la section, au même rang que dans `AGENTS.md`.
 *   AC-2  le tableau rendu est **identique** à celui d'`AGENTS.md` — preuve directe de I-2
 *         (un seul rendu ; deux implémentations divergeraient en silence).
 *   AC-3  un `workflow` injecté (P6b) **prime** sur celui de la Méthode.
 *   I-1   sans `method` ni `workflow`, on retombe sur le **canonique**.
 *
 * Ces gardes manquaient : avant elles, **rien ne verrouillait** la sortie de `renderClaudeMd`, et
 * l'addition de la section n'a fait rougir aucun test existant.
 */
import { describe, it, expect } from "vitest";
import {
  buildTeamFromRoster,
  generateClaudeCodeKit,
  generateAgentsMdKit,
  IAKAFRAME_CANONICAL_WORKFLOW,
  renderWorkflowMarkdown,
  type Team,
  type Workflow,
} from "../src/index";

function team(): Team {
  return buildTeamFromRoster("Gabarit", "gabarit");
}

const claudeMd = (opts?: Parameters<typeof generateClaudeCodeKit>[1]): string =>
  generateClaudeCodeKit(team(), opts).files["CLAUDE.md"];

/** Workflow injecté (P6b) — volontairement distinct du canonique pour prouver la primauté. */
const workflowInjecte: Workflow = {
  ...IAKAFRAME_CANONICAL_WORKFLOW,
  id: "duo",
  name: "Duo",
  sectionTitle: "Cycle Duo",
  phases: [
    {
      id: "p1",
      order: 0,
      name: "Esquisse",
      description: "besoin → esquisse",
      roleKeys: ["cadrage"],
      gate: { kind: "human", condition: "le décideur valide l'esquisse" },
    },
    {
      id: "p2",
      order: 1,
      name: "Taille",
      description: "esquisse → livrable",
      roleKeys: ["dev"],
      gate: { kind: "auto", condition: "tests verts" },
    },
  ],
};

describe("section phases dans le kit Claude Code", () => {
  it("AC-1 : le CLAUDE.md porte la section, entre la Team et la Méthode", () => {
    const md = claudeMd();
    const iTeam = md.indexOf("## Team");
    const iWorkflow = md.indexOf(`## ${IAKAFRAME_CANONICAL_WORKFLOW.sectionTitle ?? IAKAFRAME_CANONICAL_WORKFLOW.name}`);
    const iMethode = md.indexOf("## Méthode");
    expect(iTeam).toBeGreaterThan(-1);
    expect(iWorkflow).toBeGreaterThan(iTeam);
    expect(iMethode).toBeGreaterThan(iWorkflow);
    // Le tableau lui-même est bien là (en-tête de colonnes).
    expect(md).toContain("| Phase | Rôle | Entrée → Sortie | Gate |");
  });

  it("AC-2 : le tableau est IDENTIQUE à celui d'AGENTS.md (un seul rendu — I-2)", () => {
    const attendu = renderWorkflowMarkdown(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(claudeMd()).toContain(attendu);

    // Et le même bloc se retrouve mot pour mot dans le kit codex : c'est la MÊME source.
    const agents = generateAgentsMdKit(
      team(),
      { title: "T", intro: "> intro", prerequisites: "## Pré-requis" },
      undefined,
    ).files["AGENTS.md"];
    expect(agents).toContain(attendu);
  });

  it("AC-3 : un workflow injecté (P6b) prime sur le canonique", () => {
    const md = claudeMd({ workflow: workflowInjecte });
    expect(md).toContain("## Cycle Duo");
    expect(md).toContain("Esquisse");
    expect(md).toContain("besoin → esquisse");
    // Le canonique n'est plus rendu.
    expect(md).not.toContain(
      `## ${IAKAFRAME_CANONICAL_WORKFLOW.sectionTitle ?? IAKAFRAME_CANONICAL_WORKFLOW.name}`,
    );
  });

  it("I-1 : sans method ni workflow → canonique (le kit reste PUR)", () => {
    const md = claudeMd();
    expect(md).toBe(claudeMd(undefined));
    // Aucune donnée d'exécution n'entre par cette porte.
    expect(md).not.toContain("runner");
    expect(md).not.toContain("base_model_id");
  });

  it("déterminisme : deux générations rendent exactement le même CLAUDE.md", () => {
    expect(claudeMd({ workflow: workflowInjecte })).toBe(claudeMd({ workflow: workflowInjecte }));
  });
});
