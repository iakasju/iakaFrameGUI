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
  renderWorkflowMarkdown,
  verbatimBody,
  type Workflow,
} from "../src/index";
import frameWorkflow from "./fixtures/workflow.iakaframe-3phases.md?raw";

// ---------------------------------------------------------------------------
// AC-1 — Le workflow RÉEL du frame S'OUVRE (le bug de base : parse ne renvoie plus null).
// ---------------------------------------------------------------------------
describe("AC-1 — parseWorkflowMd lit le format frame autoritaire (frontmatter phases/gates)", () => {
  it("le workflow réel du frame s'ouvre : 5 phases pour 4 gates, roleKeys, prod hors-chaîne", () => {
    const wf = parseWorkflowMd(frameWorkflow);
    expect(wf).not.toBeNull();
    expect(wf!.id).toBe("iakaframe-3phases");
    // 5 phases : fait canon `workflow.iakaframe-3phases.md:10` (l'étape `surveillance`).
    expect(wf!.phases.map((p) => p.id)).toEqual(["p1", "p2", "p3", "prod", "surveillance"]);
    expect(wf!.phases.map((p) => p.roleKeys)).toEqual([
      ["cadrage"],
      ["dev", "qualite"],
      ["dev", "qualite"],
      ["deploiement"],
      ["surveillance"],
    ]);
    // Gates appariées par afterPhase — 4 gates pour 5 phases (fait canon `:11-19`). Le 5e terme
    // est `undefined` et NON `"human"` : y écrire `"human"` graverait l'invention que ce lot ferme.
    expect(wf!.phases.map((p) => p.gate?.kind)).toEqual([
      "human", "auto", "auto", "human", undefined,
    ]);
    // ⚠️ `toEqual` ne distingue PAS une clé absente d'une clé à `undefined` : seul `in` le prouve.
    // C'est la mesure qui sépare « présent-si-porté » de « posé à undefined » (risque R-4).
    expect("gate" in wf!.phases[4]).toBe(false);
    // prod ET surveillance = side: prod → hors chaîne principale (offChain).
    expect(wf!.phases[3].offChain).toBe(true);
    expect(wf!.phases[4].offChain).toBe(true);
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
    expect(md!.kind).toBe("pipeline"); // `kind` first-class capté du frontmatter (§ 3.1 / A-2)
    // Le lean est FIDÈLE au canon : 5 phases pour 4 gates. L'étape `surveillance` n'a AUCUN gate,
    // et le canon déclare cette absence en toutes lettres dans le fichier lui-même (« c'est une
    // DÉCLARATION, pas un oubli »). Le lean ne l'invente pas — c'est le mapper riche qui le fait
    // (défaut GATE-DE-PHASE-OPTIONNEL, backlog). Cette asymétrie est donc ASSERTÉE, pas subie.
    expect(md!.phases).toHaveLength(5);
    expect(md!.gates).toHaveLength(4);
    expect(md!.phases[3]).toEqual({
      id: "prod",
      label: "Déploiement prod",
      side: "prod",
      actorsRoleKeys: ["deploiement"], // champ d'acteurs unifié (canon A-2)
      input: "rc recettée + feu vert humain",
      // Littéral repris VERBATIM du canon 0.39.0 : la scission a retiré « surveillance/ » de
      // l'`output` de l'étape `prod` — la veille n'est plus une sortie de la bascule, c'est une
      // étape à part entière (`surveillance`, ci-dessous).
      output: "prod (alias de version) + rollback prêt",
    });
    // La 5e phase, absente avant la scission (fait canon `library/workflows/iakaframe-3phases.md`).
    expect(md!.phases[4]).toEqual({
      id: "surveillance",
      label: "Veille de production",
      side: "prod",
      actorsRoleKeys: ["surveillance"],
      input: "une production en service",
      output: "état de santé + alerte motivée",
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
        // Littéral repris VERBATIM du canon 0.39.0 : la scission nomme le porteur du feu vert
        // (Charon tient la bascule sur ordre) là où le canon disait « squad Helm ».
        criteria: "feu vert prod tracé (squad prod, Charon ; jamais franchi seul)",
      },
    ]);
    // AUCUN 5e gate côté lean : la fidélité au canon se prouve par l'ABSENCE, pas seulement par
    // le compte. Si un `afterPhase: surveillance` apparaissait ici, le lean aurait commencé à
    // inventer lui aussi — ce que le canon interdit explicitement.
    expect(md!.gates.map((g) => g.afterPhase)).not.toContain("surveillance");
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
    expect(fm).toMatch(/- \{ id: p1, label: Cadrage, actorsRoleKeys: \[cadrage\]/);
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

// ---------------------------------------------------------------------------
// GATE-DE-PHASE-OPTIONNEL — les preuves de fidélité (specs/instructions/gate-de-phase-optionnel.md
// § 2.2). Règle qui les gouverne : **une preuve de fidélité confronte la sortie AU FICHIER, jamais
// à une autre sortie du même programme.** Les deux round-trips ci-dessus (`parse(serialize(wf))` et
// le point fixe) passaient AVANT ce lot, défaut présent, parce qu'une invention *symétrique* est
// ré-écrite puis relue à l'identique : un round-trip qui se compare à lui-même ne la voit pas.
// ---------------------------------------------------------------------------
describe("fidélité des gates — le modèle n'invente plus (P2 comptage / P4 généricité)", () => {
  // --- P2 — COMPTAGE : 5 phases / 4 gates conservé aux QUATRE points de mesure -----------------
  it("P2 — 5 phases / 4 gates, de l'entrée aux octets écrits (les 4 points de mesure)", () => {
    // 1. lean issu du fichier — le parseur, lui, a toujours été fidèle.
    const lean = parseWorkflowFrontmatterMd(frameWorkflow)!;
    expect(lean.phases).toHaveLength(5);
    expect(lean.gates).toHaveLength(4);

    // 2. riche : 5 phases, dont 4 SEULEMENT portent une gate.
    const rich = mdToWorkflow(lean);
    expect(rich.phases).toHaveLength(5);
    expect(rich.phases.filter((p) => p.gate !== undefined)).toHaveLength(4);

    // 3. retour au lean : la fabrication ne se propage plus.
    const back = workflowToMd(rich);
    expect(back.phases).toHaveLength(5);
    expect(back.gates).toHaveLength(4);

    // 4. LES OCTETS ÉCRITS — le seul point qui parle la langue du fichier.
    const saved = serializeWorkflowMd(rich, "# corps\n");
    expect(saved.match(/^\s*- \{ afterPhase:/gm)).toHaveLength(4);
  });

  it("P3 — négative nommée : le gate inventé n'atteint pas les octets", () => {
    const rich = mdToWorkflow(parseWorkflowFrontmatterMd(frameWorkflow)!);
    expect(serializeWorkflowMd(rich, "# corps\n")).not.toMatch(/afterPhase:\s*surveillance/);
  });

  // --- AC-6 — ANTI-HEURISTIQUE : ce qui sépare l'Option A retenue de l'Option D écartée ---------
  // L'Option D (« ne pas émettre un gate `human` à condition vide ») aurait rendu le rouge vert en
  // UNE ligne — et elle est fausse : elle confond « pas de gate » avec « gate humain dont le
  // critère n'est pas encore rédigé », et SUPPRIMERAIT le second. Ce test la ferait échouer.
  it("AC-6 — un gate explicitement porté et VIDE est conservé au round-trip", () => {
    const md = parseWorkflowFrontmatterMd(
      [
        "---",
        "id: vide",
        "name: Gate vide",
        "phases:",
        "  - { id: a, label: A, actorsRoleKeys: [dev], input: x, output: y }",
        "gates:",
        '  - { afterPhase: a, kind: human, criteria: "" }',
        "---",
        "# corps",
        "",
      ].join("\n"),
    )!;
    expect(md.gates).toHaveLength(1);

    const back = workflowToMd(mdToWorkflow(md));
    expect(back.gates).toHaveLength(1);
    expect(back.gates[0]).toEqual({ afterPhase: "a", kind: "human", criteria: "" });
    expect(mdToWorkflow(md).phases[0].gate).toEqual({ kind: "human", condition: "" });
  });

  // --- P4 — GÉNÉRICITÉ : la fidélité est une propriété du MODÈLE, pas un cas du canon ----------
  // Sans ce test, un correctif qui aurait codé en dur `id === "surveillance"` (ou `side === "prod"`)
  // satisferait tous les précédents. Ici : une AUTRE méthode, un autre `kind`, et la phase dégatée
  // est MÉDIANE et dans la chaîne principale — donc ni dernière, ni `offChain`.
  const SPARC = [
    "---",
    "id: sparc-lite",
    "name: SPARC (3 étapes)",
    "methodId: sparc",
    "kind: flow",
    "phases:",
    "  - { id: s1, label: Spécifier, actorsRoleKeys: [cadrage], input: besoin, output: spec }",
    "  - { id: s2, label: Architecturer, actorsRoleKeys: [dev], input: spec, output: plan }",
    "  - { id: s3, label: Réaliser, actorsRoleKeys: [dev], input: plan, output: code }",
    "gates:",
    "  - { afterPhase: s1, kind: human, criteria: la spec tient }",
    "  - { afterPhase: s3, kind: auto, criteria: tests verts }",
    "---",
    "# SPARC",
    "",
  ].join("\n");

  it("P4 — une AUTRE méthode, phase MÉDIANE sans gate : round-trip fidèle", () => {
    const lean = parseWorkflowFrontmatterMd(SPARC)!;
    expect(lean.phases).toHaveLength(3);
    expect(lean.gates.map((g) => g.afterPhase)).toEqual(["s1", "s3"]);

    const rich = mdToWorkflow(lean);
    // La phase dégatée est bien MÉDIANE et dans la chaîne principale (pas offChain).
    expect(rich.phases[1].id).toBe("s2");
    expect(rich.phases[1].offChain).toBeUndefined();
    expect("gate" in rich.phases[1]).toBe(false);
    expect(rich.phases[0].gate).toBeDefined();
    expect(rich.phases[2].gate).toBeDefined();

    // Réciprocité inter-niveaux sur une méthode qui n'est PAS iakaframe.
    expect(workflowToMd(rich)).toEqual(lean);
    expect(serializeWorkflowMd(rich, "# SPARC\n")).not.toMatch(/afterPhase:\s*s2/);
  });

  it("P4 — le rendu markdown porte `—` dans la cellule Gate d'une phase sans gate", () => {
    const rich = mdToWorkflow(parseWorkflowFrontmatterMd(SPARC)!);
    const rows = renderWorkflowMarkdown(rich)
      .split("\n")
      .filter((l) => l.startsWith("| ") && !l.startsWith("| Phase") && !l.startsWith("|---"));
    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain("Architecturer");
    expect(rows[1].trimEnd().endsWith("| — |")).toBe(true);
  });
});
