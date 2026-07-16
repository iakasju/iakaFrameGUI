/**
 * workflowMd.test.ts — (dé)sérialiseur `.md` du **workflow** (P6b, Q-8 / EW-2 / EW-15).
 *
 * Encodage : frontmatter **plat** (`id`/`name`/`methodId`) + phases/gates dans le **corps** (bloc
 * JSON). Round-trip structurel à l'identique ; défensif ; agnostique (workflow factice à 2 phases).
 */
import { describe, it, expect } from "vitest";
import {
  IAKAFRAME_CANONICAL_WORKFLOW,
  serializeWorkflowMd,
  parseWorkflowMd,
  type Workflow,
} from "../src/index";

describe("EW-2 — serialize/parseWorkflowMd : round-trip à l'identique", () => {
  it("round-trippe le canonique (id, name, methodId, phases/gates, calage) structurellement", () => {
    const md = serializeWorkflowMd(IAKAFRAME_CANONICAL_WORKFLOW);
    const back = parseWorkflowMd(md);
    expect(back).toEqual(IAKAFRAME_CANONICAL_WORKFLOW);
  });

  it("Q-8 : frontmatter PLAT (id/name/methodId) + phases dans le CORPS (bloc json)", () => {
    const md = serializeWorkflowMd(IAKAFRAME_CANONICAL_WORKFLOW);
    // Frontmatter plat : les 3 scalaires y sont ; les phases n'y sont PAS.
    const fm = md.slice(0, md.indexOf("\n---\n", 4));
    expect(fm).toMatch(/id: iakaframe-canonical/);
    expect(fm).toMatch(/name: /);
    expect(fm).toMatch(/methodId: iakaframe/);
    expect(fm).not.toMatch(/phases/);
    // Les phases vivent dans le corps, en bloc json.
    expect(md).toContain("```json");
    expect(md).toContain('"phases"');
  });

  it("prose humaine optionnelle insérée avant le bloc de données", () => {
    const md = serializeWorkflowMd(IAKAFRAME_CANONICAL_WORKFLOW, "# Mon workflow\n\nRécit.");
    expect(md).toContain("# Mon workflow");
    expect(parseWorkflowMd(md)).toEqual(IAKAFRAME_CANONICAL_WORKFLOW);
  });
});

describe("EW-2 — parseWorkflowMd défensif", () => {
  it("texte sans frontmatter/id → null", () => {
    expect(parseWorkflowMd("juste du texte")).toBeNull();
    expect(parseWorkflowMd(null)).toBeNull();
    expect(parseWorkflowMd("")).toBeNull();
  });

  it("frontmatter présent mais SANS bloc json → null", () => {
    expect(parseWorkflowMd("---\nid: x\nname: X\n---\n# corps sans données\n")).toBeNull();
  });

  it("bloc json ILLISIBLE (json cassé) → null", () => {
    const md = "---\nid: x\n---\n```json\n{ phases: [ cassé\n```\n";
    expect(parseWorkflowMd(md)).toBeNull();
  });

  it("bloc json sans phase valide → null (parseWorkflow défensif)", () => {
    const md = '---\nid: x\n---\n```json\n{ "phases": [] }\n```\n';
    expect(parseWorkflowMd(md)).toBeNull();
  });
});

describe("EW-15 — agnosticisme : workflow factice à 2 phases", () => {
  const fake: Workflow = {
    id: "sparc-lite",
    name: "SPARC (2 phases)",
    methodId: "sparc",
    phases: [
      {
        id: "spec",
        order: 0,
        name: "Spécifier",
        description: "besoin → spec",
        roleKeys: ["architecture"],
        gate: { kind: "human", condition: "spec validée" },
      },
      {
        id: "code",
        order: 1,
        name: "Coder",
        description: "spec → code",
        roleKeys: ["fabrication"],
        gate: { kind: "auto", condition: "tests" },
      },
    ],
  };

  it("un workflow d'une autre méthode round-trippe sans hard-wire iakaframe", () => {
    expect(parseWorkflowMd(serializeWorkflowMd(fake))).toEqual(fake);
  });
});
