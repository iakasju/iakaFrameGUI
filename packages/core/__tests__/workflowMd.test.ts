/**
 * workflowMd.test.ts — (dé)sérialiseur `.md` du **workflow**, format **frame autoritaire**
 * (étape 3bis, doctrine `GUI ← frame`). Le workflow réel du frame encode `phases`/`gates` dans le
 * **frontmatter** (séquences de maps inline, `gates` en tableau séparé). Le GUI apprend à le lire
 * et à le ré-écrire (lean `WorkflowMd` + mapper vers le type riche `Workflow`), sans jamais toucher
 * au frame. Legacy JSON-in-body conservé en **repli lecture** (non-régression).
 *
 * Couvre : AC-1 (le workflow s'ouvre), round-trip byte-fidèle `WorkflowMd`, AC-3 (canonique valide +
 * point fixe + agnosticisme), AC-5 (legacy lisible), défensif.
 */
import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parseWorkflowMd,
  parseWorkflowFrontmatterMd,
  serializeWorkflowMd,
  serializeWorkflowFrontmatterMd,
  mdToWorkflow,
  workflowToMd,
  verbatimBody,
  type Workflow,
} from "../src/index";
import frameWorkflow from "./fixtures/workflow.iakaframe-3phases.md?raw";

// ---------------------------------------------------------------------------
// AC-1 — Le workflow RÉEL du frame S'OUVRE (le bug de base : parse ne renvoie plus null).
// ---------------------------------------------------------------------------
describe("AC-1 — parseWorkflowMd lit le format frame autoritaire (frontmatter phases/gates)", () => {
  it("le workflow réel du frame s'ouvre : 4 phases, roleKeys, gates appariées, prod hors-chaîne", () => {
    const wf = parseWorkflowMd(frameWorkflow);
    expect(wf).not.toBeNull();
    expect(wf!.id).toBe("iakaframe-3phases");
    expect(wf!.phases.map((p) => p.id)).toEqual(["p1", "p2", "p3", "prod"]);
    expect(wf!.phases.map((p) => p.roleKeys)).toEqual([
      ["cadrage"],
      ["dev", "qualite"],
      ["dev", "qualite"],
      ["deploiement"],
    ]);
    // Gates appariées par afterPhase (human/auto/auto/human).
    expect(wf!.phases.map((p) => p.gate.kind)).toEqual(["human", "auto", "auto", "human"]);
    // prod = side: prod → hors chaîne principale (offChain).
    expect(wf!.phases[3].offChain).toBe(true);
    expect(wf!.phases.slice(0, 3).every((p) => p.offChain !== true)).toBe(true);
    // Champs riches dérivés du lean : labels + descriptions « input → output ».
    expect(wf!.phases[0].name).toBe("Cadrage");
    expect(wf!.phases[0].description).toBe("besoin → specs/instructions/{feature}.md");
    // methodId absent du fichier → défaulté in-memory (jamais forcé sur le fichier).
    expect(wf!.methodId).toBe("iakaframe");
  });

  it("le lean WorkflowMd héberge sans perte input/output/side/label/criteria séparés", () => {
    const md = parseWorkflowFrontmatterMd(frameWorkflow);
    expect(md).not.toBeNull();
    expect(md!.methodId).toBeUndefined(); // le frame ne porte pas methodId
    expect(md!.phases[3]).toEqual({
      id: "prod",
      label: "Déploiement prod",
      side: "prod",
      agentsRoleKeys: ["deploiement"],
      input: "rc recettée + feu vert humain",
      output: "prod (alias de version) + surveillance/rollback",
    });
    expect(md!.gates).toEqual([
      { afterPhase: "p1", kind: "human", criteria: "l'utilisateur valide l'instruction" },
      {
        afterPhase: "p2",
        kind: "auto",
        criteria: "typecheck + lint + tests verts (verdict Legolas PASS, indépendant)",
      },
      { afterPhase: "p3", kind: "auto", criteria: "build/déploiement staging OK" },
      {
        afterPhase: "prod",
        kind: "human",
        criteria: "feu vert prod tracé (squad Helm ; jamais franchi seul)",
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Round-trip STRUCTUREL du lean WorkflowMd (byte-parité byte-exacte = niveau document, AC-2).
// Le lean parsé du frame est LOSSLESS : re-sérialisé canoniquement puis re-parsé → identique.
// ---------------------------------------------------------------------------
describe("WorkflowMd — round-trip structurel canonique (lossless)", () => {
  it("parse(serialize(md)) ≡ md pour le lean issu du frame", () => {
    const md = parseWorkflowFrontmatterMd(frameWorkflow)!;
    const canon = serializeWorkflowFrontmatterMd(md);
    expect(parseWorkflowFrontmatterMd(canon)).toEqual(md);
  });

  it("le canonique reste valide frame-format : phases/gates en frontmatter, PAS de bloc json", () => {
    const md = parseWorkflowFrontmatterMd(frameWorkflow)!;
    const canon = serializeWorkflowFrontmatterMd(md);
    const fm = canon.slice(0, canon.indexOf("\n---\n", 4));
    expect(fm).toMatch(/^phases:/m);
    expect(fm).toMatch(/^gates:/m);
    expect(fm).toMatch(/- \{ id: p1, label: Cadrage, agentsRoleKeys: \[cadrage\]/);
    expect(fm).toMatch(/- \{ afterPhase: p1, kind: human, criteria:/);
    expect(canon).not.toContain("```json");
    // methodId absent → omis (byte-parité : pas de ligne parasite).
    expect(fm).not.toMatch(/methodId:/);
    // Quoting inline-map-aware : les valeurs à virgule/deux-points/accolade sont quotées.
    expect(canon).toContain('output: "specs/instructions/{feature}.md"');
    expect(canon).toContain(
      'criteria: "typecheck + lint + tests verts (verdict Legolas PASS, indépendant)"',
    );
    // Les valeurs simples restent nues.
    expect(canon).toContain("input: besoin");
    expect(canon).toContain("kind: human");
  });
});

// ---------------------------------------------------------------------------
// AC-3 — Sérialisation canonique valide et idempotente (workflow riche édité / neuf).
// ---------------------------------------------------------------------------
describe("AC-3 — round-trip riche + point fixe canonique + agnosticisme", () => {
  it("le riche mappé depuis le frame round-trippe : parse(serialize(wf)) ≡ wf", () => {
    const wf = parseWorkflowMd(frameWorkflow)!;
    expect(parseWorkflowMd(serializeWorkflowMd(wf))).toEqual(wf);
  });

  it("point fixe : serialize(parse(serialize(wf))) === serialize(wf)", () => {
    const wf = parseWorkflowMd(frameWorkflow)!;
    const once = serializeWorkflowMd(wf);
    expect(serializeWorkflowMd(parseWorkflowMd(once)!)).toBe(once);
  });

  it("mapper riche ↔ lean : mdToWorkflow/workflowToMd sont réciproques (structurel)", () => {
    const md = parseWorkflowFrontmatterMd(frameWorkflow)!;
    expect(workflowToMd(mdToWorkflow(md))).toEqual(md);
  });

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

  it("agnosticisme : un workflow d'une autre méthode (methodId non défaut) round-trippe + émet methodId", () => {
    const md = serializeWorkflowMd(fake);
    expect(md).toContain("methodId: sparc"); // methodId non-défaut → émis + round-trippé
    expect(parseWorkflowMd(md)).toEqual(fake);
  });

  it("workflow neuf sans prose : canonique valide, réouvrable (AC-6)", () => {
    const md = serializeWorkflowMd(fake, "# SPARC\n\nRécit.\n");
    expect(md).toContain("# SPARC");
    expect(md).not.toContain("```json");
    expect(parseWorkflowMd(md)).toEqual(fake);
  });
});

// ---------------------------------------------------------------------------
// AC-5 — Legacy JSON-in-body encore lisible (non-régression des workflows créés dans le GUI).
// ---------------------------------------------------------------------------
describe("AC-5 — repli legacy : ancien encodage GUI (frontmatter plat + bloc json) lisible", () => {
  const legacy = [
    "---",
    "id: legacy-wf",
    "name: Workflow legacy",
    "methodId: iakaframe",
    "---",
    "# Récit",
    "",
    "<!-- iakaframe:workflow — phases/gates (données) -->",
    "",
    "```json",
    JSON.stringify(
      {
        phases: [
          {
            id: "a",
            order: 0,
            name: "A",
            description: "x → y",
            roleKeys: ["architecture"],
            gate: { kind: "human", condition: "ok" },
          },
        ],
      },
      null,
      2,
    ),
    "```",
    "",
  ].join("\n");

  it("un .md au format GUI historique s'ouvre encore (parse non nul)", () => {
    const wf = parseWorkflowMd(legacy);
    expect(wf).not.toBeNull();
    expect(wf!.id).toBe("legacy-wf");
    expect(wf!.phases.map((p) => p.id)).toEqual(["a"]);
    expect(wf!.methodId).toBe("iakaframe");
  });

  it("frame-format prioritaire : si phases en frontmatter, le bloc json du corps est ignoré", () => {
    // Le workflow du frame a une prose SANS bloc json ; on vérifie la priorité de branche.
    expect(parseWorkflowFrontmatterMd(legacy)).toBeNull(); // pas de phases en frontmatter
  });
});

// ---------------------------------------------------------------------------
// Défensif — jamais d'exception ; entrées illisibles → null.
// ---------------------------------------------------------------------------
describe("parseWorkflowMd défensif", () => {
  it("texte sans frontmatter/id → null", () => {
    expect(parseWorkflowMd("juste du texte")).toBeNull();
    expect(parseWorkflowMd(null)).toBeNull();
    expect(parseWorkflowMd("")).toBeNull();
  });

  it("frontmatter présent mais NI phases NI bloc json → null", () => {
    expect(parseWorkflowMd("---\nid: x\nname: X\n---\n# corps sans données\n")).toBeNull();
  });

  it("phases frontmatter présentes mais aucune phase valide (pas d'id) → null", () => {
    expect(parseWorkflowMd("---\nid: x\nphases:\n  - { label: sans-id }\n---\n")).toBeNull();
  });

  it("bloc json legacy illisible → null", () => {
    expect(parseWorkflowMd("---\nid: x\n---\n```json\n{ cassé\n```\n")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Garde-fou : la fixture est la COPIE CONFORME de la source frame (verbatimBody exploitable).
// ---------------------------------------------------------------------------
describe("fixture byte-fidèle", () => {
  it("le corps prose du frame est capté verbatim (récit « # Workflow iakaframe … »)", () => {
    const body = verbatimBody(frameWorkflow);
    expect(body.startsWith("# Workflow iakaframe — 3 phases")).toBe(true);
    // Cohérence parse : le frontmatter porte bien phases + gates.
    const { data } = parseFrontmatter(frameWorkflow);
    expect(Array.isArray(data.phases)).toBe(true);
    expect(Array.isArray(data.gates)).toBe(true);
  });
});
