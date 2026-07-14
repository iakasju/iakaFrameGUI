/**
 * workflow.test.ts — critères d'acceptation **P6** (W-1→W-11) pour le concept **Workflow**.
 *
 * Purs : modèle + renderer + résolution testés en isolation (aucun nœud, aucune I/O).
 */
import { describe, it, expect } from "vitest";
import {
  IAKAFRAME_CANONICAL_WORKFLOW,
  WORKFLOW_CATALOG,
  workflowById,
  parseWorkflow,
  parsePhase,
  parseGate,
  renderWorkflowMarkdown,
  resolveWorkflow,
  buildTeamFromRoster,
  generateCodexKit,
  type Workflow,
} from "../src/index";

describe("W-1 — Workflow modélisé + canonique conforme (§ 3)", () => {
  const wf = IAKAFRAME_CANONICAL_WORKFLOW;

  it("porte 4 phases dont prod offChain", () => {
    expect(wf.phases).toHaveLength(4);
    const prod = wf.phases.find((p) => p.id === "prod");
    expect(prod?.offChain).toBe(true);
  });

  it("gates aux bons endroits : human au cadrage, auto en réalisation/staging, human en prod", () => {
    const byId = Object.fromEntries(wf.phases.map((p) => [p.id, p]));
    expect(byId.cadrage.gate.kind).toBe("human");
    expect(byId.realisation.gate.kind).toBe("auto");
    expect(byId.staging.gate.kind).toBe("auto");
    expect(byId.prod.gate.kind).toBe("human");
  });

  it("le jalon cadrage porte from architecture → to coordination", () => {
    const cadrage = wf.phases.find((p) => p.id === "cadrage")!;
    expect(cadrage.gate.from).toBe("architecture");
    expect(cadrage.gate.to).toBe("coordination");
  });

  it("methodId présent (agnosticisme AR-9)", () => {
    expect(wf.methodId).toBe("iakaframe");
  });
});

describe("W-1 — parseur défensif", () => {
  it("workflow sans id → null", () => {
    expect(parseWorkflow({ name: "x", phases: [{ id: "a", order: 0 }] })).toBeNull();
  });

  it("workflow sans phase valide → null", () => {
    expect(parseWorkflow({ id: "w", phases: [] })).toBeNull();
    expect(parseWorkflow({ id: "w", phases: [{ order: 0 }] })).toBeNull();
  });

  it("phase sans id → null ; gate mal formée → repli human/vide", () => {
    expect(parsePhase({ order: 1 })).toBeNull();
    expect(parseGate(null)).toEqual({ kind: "human", condition: "" });
    expect(parseGate({ kind: "auto", condition: "x" })).toEqual({
      kind: "auto",
      condition: "x",
    });
  });

  it("round-trip : le canonique re-parse à l'identique (structure)", () => {
    const round = parseWorkflow(JSON.parse(JSON.stringify(IAKAFRAME_CANONICAL_WORKFLOW)));
    expect(round).toEqual(IAKAFRAME_CANONICAL_WORKFLOW);
  });

  it("jamais d'exception sur entrée hostile", () => {
    for (const bad of [null, undefined, 42, "x", [], {}]) {
      expect(() => parseWorkflow(bad)).not.toThrow();
    }
  });
});

describe("W-2 — la MÉTHODE possède le workflow, repli canonique (E2, Q-3)", () => {
  it("sans méthode fournie → canonique (rétro-compat adaptateurs)", () => {
    expect(resolveWorkflow()).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(resolveWorkflow(undefined)).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(resolveWorkflow(null)).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
  });

  it("méthode avec workflowId inconnu → canonique (défensif)", () => {
    expect(resolveWorkflow({ workflowId: "n-existe-pas" })).toBe(
      IAKAFRAME_CANONICAL_WORKFLOW,
    );
  });

  it("méthode avec workflowId connu → ce workflow", () => {
    expect(resolveWorkflow({ workflowId: "iakaframe-canonical" })).toBe(
      IAKAFRAME_CANONICAL_WORKFLOW,
    );
    expect(workflowById("iakaframe-canonical")).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(workflowById("autre")).toBeUndefined();
  });

  it("la Team ne porte plus de workflowId (casting pur, E2)", () => {
    const team = buildTeamFromRoster("T", "t");
    expect(team).not.toHaveProperty("workflowId");
  });

  it("le catalogue MVP contient (au moins) le canonique", () => {
    expect(WORKFLOW_CATALOG["iakaframe-canonical"]).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
  });
});

describe("W-4 — renderWorkflowMarkdown : sortie canonique = littéral historique (byte-exact)", () => {
  /**
   * Littéral figé HISTORIQUE (copie fidèle de l'ancien `const PHASES` d'agentsMd.ts avant P6).
   * La section rendue depuis la DONNÉE doit être **byte-identique** à ce littéral.
   */
  const LEGACY_PHASES_LITERAL = `## Les 3 phases (cible : staging) + le squad prod

| Phase | Rôle | Entrée → Sortie | Gate |
|---|---|---|---|
| 🔵 **P1 — Cadrage** | architecture | besoin → \`specs/instructions/<feature>.md\` | **humain** (le décideur valide) |
| 🔴 **P2 — Réalisation** | fabrication + tests | instruction → branche + commits + tests verts | **auto** (typecheck/lint/tests) |
| 🟢 **P3 — Staging** | fabrication (devops) + tests | PASS → build/déploiement **staging** (\`vX.Y.Z-rc\`) | auto |

La chaîne **s'arrête au staging**. La **mise en production** est un **squad séparé**, déclenché
**sur feu vert humain** — hors les 3 phases. Au-dessus des projets : le rôle **portefeuille**
(switch de projet, vue d'ensemble). Transverses : **graphisme** (design on-brand), **doc** (guides).`;

  it("le rendu du canonique reproduit exactement le littéral", () => {
    expect(renderWorkflowMarkdown(IAKAFRAME_CANONICAL_WORKFLOW)).toBe(
      LEGACY_PHASES_LITERAL,
    );
  });

  it("la phase prod (offChain) est exclue du tableau (3 lignes seulement)", () => {
    const md = renderWorkflowMarkdown(IAKAFRAME_CANONICAL_WORKFLOW);
    const rows = md.split("\n").filter((l) => l.startsWith("| ") && !l.includes("---"));
    // 1 entête + 3 phases de chaîne = 4 lignes `| ... |` (prod exclue).
    expect(rows).toHaveLength(4);
    expect(md).not.toContain("Squad prod");
  });
});

describe("W-6 — agnosticisme : rend un workflow factice ≠ canonique (2 phases, sans calage)", () => {
  const fake: Workflow = {
    id: "fake-2p",
    name: "Méthode factice",
    methodId: "sparc",
    phases: [
      {
        id: "spec",
        order: 0,
        name: "Spécification",
        description: "idée → spec",
        roleKeys: ["architecture"],
        gate: { kind: "human", condition: "revue" },
      },
      {
        id: "code",
        order: 1,
        name: "Code",
        description: "spec → binaire",
        roleKeys: ["fabrication", "tests"],
        gate: { kind: "auto", condition: "CI verte" },
      },
    ],
  };

  it("rend un tableau générique (titre = name, rôles par LIBELLÉS, gate générique)", () => {
    const md = renderWorkflowMarkdown(fake);
    expect(md).toContain("## Méthode factice");
    // Rôles rendus par libellés canoniques (pas les clés brutes ni un nom de code).
    expect(md).toContain("| **Spécification** | Architecture | idée → spec | **humain** (revue) |");
    expect(md).toContain("| **Code** | Fabrication + Tests | spec → binaire | **auto** (CI verte) |");
    // Aucune note de section, aucune fuite iakaframe.
    expect(md).not.toContain("squad prod");
    expect(md).not.toContain("iakaframe");
  });

  it("les phases hors ordre sont triées par order au rendu", () => {
    const shuffled: Workflow = { ...fake, phases: [fake.phases[1], fake.phases[0]] };
    const md = renderWorkflowMarkdown(shuffled);
    expect(md.indexOf("Spécification")).toBeLessThan(md.indexOf("Code"));
  });
});

describe("W-5 — zéro modèle : le workflow et son rendu ne posent aucun modèle/runner", () => {
  it("le canonique ne contient ni model ni runner", () => {
    const json = JSON.stringify(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(json).not.toMatch(/\bmodel\b/i);
    expect(json).not.toMatch(/\brunner\b/i);
    expect(json).not.toMatch(/base_model_id/);
  });

  it("le rendu markdown ne pose aucun modèle", () => {
    const md = renderWorkflowMarkdown(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(md).not.toMatch(/\bmodel\b/i);
    expect(md).not.toMatch(/\brunner\b/i);
  });
});

describe("W-3 — l'adaptateur agents-md rend la section DEPUIS la donnée", () => {
  it("la section phases générée provient du renderer (byte-égale au rendu du workflow résolu)", () => {
    const team = buildTeamFromRoster("Gabarit", "gabarit");
    // Sans méthode fournie → workflow canonique (repli), byte-identique.
    const md = generateCodexKit(team).files["AGENTS.md"];
    expect(md).toContain(renderWorkflowMarkdown(resolveWorkflow()));
  });
});
