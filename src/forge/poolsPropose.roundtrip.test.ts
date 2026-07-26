/**
 * poolsPropose.roundtrip.test.ts — brique B, invariant (d) **par pool** : une proposition acceptée
 * emprunte le chemin d'écriture **inchangé** `persist<Pool>` → **seuls les champs proposés changent**,
 * tout le reste (clés non modélisées, corps) est **préservé à l'octet** (édition = `patchFrontmatter`,
 * ou ré-émission verbatim + corps pour le workflow). Prouve aussi C-1 (id jamais renommé) au save.
 *
 * On teste au niveau `persist<Pool>` (le vrai writer, non touché par B) avec un backend factice :
 * `poolRead` rend le `.md` d'origine (octets réels), `poolWrite` capture les octets écrits.
 */
import { describe, it, expect } from "vitest";
import type { Backend } from "../api/backend";
import { persistPrinciple } from "./principlePersist";
import { persistRitual } from "./ritualPersist";
import { persistGuardrail } from "./guardrailPersist";
import { persistRole } from "./rolePersist";
import { persistScaffold } from "./scaffoldPersist";
import { persistSkill } from "./skillPersist";
import { persistWorkflow } from "./workflowPersist";
import type { Guardrail, Workflow } from "@iakaframe/core";

/** Backend factice : `poolRead` rend `md`, `poolWrite` capture (id + octets). */
function fakeBackend(md: string | null): { api: Backend; written: () => { id: string; text: string } | null } {
  let cap: { id: string; text: string } | null = null;
  const api = {
    poolRead: async () => md,
    poolWrite: async (_t: string, id: string, text: string) => {
      cap = { id, text };
    },
  } as unknown as Backend;
  return { api, written: () => cap };
}

describe("brique B — round-trip byte par pool (persist<Pool> inchangé, seuls les champs proposés changent)", () => {
  it("principle : `policy` proposée changée ; label/trigger + clé inconnue + corps préservés à l'octet", async () => {
    const md =
      "---\n" +
      "id: qualite\n" +
      "label: Qualité\n" +
      "policy: tester avant de clore\n" +
      "trigger: à chaque tâche\n" +
      "vignette: none\n" +
      "---\n\n# Qualité\n\n> la politique de qualité\n";
    const { api, written } = fakeBackend(md);
    // Élément = valeurs d'origine + proposition (policy seule change).
    await persistPrinciple(
      { id: "qualite", label: "Qualité", policy: "tester ET typer avant de clore", trigger: "à chaque tâche" },
      api,
    );
    const w = written()!;
    expect(w.id).toBe("qualite"); // C-1
    expect(w.text).toContain("policy: tester ET typer avant de clore");
    expect(w.text).not.toContain("policy: tester avant de clore\n");
    expect(w.text).toContain("label: Qualité\n"); // inchangé verbatim
    expect(w.text).toContain("trigger: à chaque tâche\n");
    expect(w.text).toContain("vignette: none\n"); // clé non modélisée préservée
    expect(w.text).toContain("# Qualité\n\n> la politique de qualité\n"); // corps préservé
  });

  it("ritual : `label` proposé changé ; triggers/actions/side + clé inconnue + corps préservés", async () => {
    const md =
      "---\n" +
      "id: iakastart\n" +
      "label: Bootstrap\n" +
      "triggers: [iakastart, odin]\n" +
      "actions: [banner, roster]\n" +
      "side: cockpit\n" +
      "cadence: manuel\n" +
      "---\n\n# Bootstrap\n";
    const { api, written } = fakeBackend(md);
    await persistRitual(
      { id: "iakastart", label: "Bootstrap Équipe", triggers: ["iakastart", "odin"], actions: ["banner", "roster"], side: "cockpit" },
      api,
    );
    const w = written()!;
    expect(w.id).toBe("iakastart");
    expect(w.text).toContain("label: Bootstrap Équipe");
    expect(w.text).toContain("cadence: manuel\n"); // clé non modélisée préservée
    expect(w.text).toContain("# Bootstrap\n"); // corps préservé
  });

  it("guardrail : `policy` proposée changée ; `kind`/`hook` load-bearing + corps préservés à l'octet", async () => {
    const md =
      "---\n" +
      "id: identity-guard\n" +
      "label: Identité\n" +
      "kind: identity\n" +
      "hook: Stop;SubagentStop\n" +
      "policy: badge à chaque prise de parole\n" +
      "---\n\n# Identité\n\n> garde d'identité\n";
    const { api, written } = fakeBackend(md);
    const g: Guardrail = {
      id: "identity-guard",
      label: "Identité",
      kind: "identity",
      scope: "persona",
      rendering: {},
      policy: "badge à l'ouverture ET à la clôture",
    };
    await persistGuardrail(g, api);
    const w = written()!;
    expect(w.id).toBe("identity-guard");
    expect(w.text).toContain("policy: badge à l'ouverture ET à la clôture");
    expect(w.text).toContain("kind: identity\n"); // load-bearing préservé verbatim
    expect(w.text).toContain("hook: Stop;SubagentStop\n"); // load-bearing préservé verbatim
    expect(w.text).toContain("# Identité\n\n> garde d'identité\n"); // corps préservé
  });

  it("role : `scope` proposé changé ; `label`/`roleIndex` + corps préservés (poolRead par key)", async () => {
    const md =
      "---\n" +
      "key: coordination\n" +
      "label: Coordination\n" +
      "roleIndex: 1\n" +
      "scope: team\n" +
      "---\n\n# Coordination\n";
    const { api, written } = fakeBackend(md);
    await persistRole({ key: "coordination", label: "Coordination", roleIndex: 1, scope: "portfolio" }, api);
    const w = written()!;
    expect(w.id).toBe("coordination"); // poolWrite par key
    expect(w.text).toContain("scope: portfolio");
    expect(w.text).toContain("label: Coordination\n"); // inchangé
    expect(w.text).toContain("roleIndex: 1\n"); // jamais recalculé
    expect(w.text).toContain("# Coordination\n"); // corps préservé
  });

  it("scaffold : `level` proposé changé ; `entries` + corps préservés à l'octet", async () => {
    const md =
      "---\n" +
      "id: project\n" +
      "level: project\n" +
      "entries:\n" +
      "  - { path: specs/, role: cadrage, createIfAbsent: true }\n" +
      "nonDestructive: true\n" +
      "---\n\n# project\n";
    const { api, written } = fakeBackend(md);
    await persistScaffold(
      {
        id: "project",
        level: "portfolio",
        entries: [{ path: "specs/", role: "cadrage", createIfAbsent: true }],
        nonDestructive: true,
      },
      api,
    );
    const w = written()!;
    expect(w.id).toBe("project");
    expect(w.text).toContain("level: portfolio");
    expect(w.text).toContain("{ path: specs/, role: cadrage, createIfAbsent: true }"); // entries verbatim
    expect(w.text).toContain("# project\n"); // corps préservé
  });

  it("skill : `description` proposée changée ; `subskills` + corps préservés (subskills inchangés verbatim)", async () => {
    const md =
      "---\n" +
      "id: iakaframe-fabrication\n" +
      "name: iakaframe-fabrication\n" +
      "description: le geste de fabriquer\n" +
      "subskills: [iakaframe-git, iakaframe-forgejo]\n" +
      "---\n\n# iakaframe-fabrication\n\n> le forgeron\n";
    const { api, written } = fakeBackend(md);
    await persistSkill(
      {
        id: "iakaframe-fabrication",
        name: "iakaframe-fabrication",
        description: "le geste de fabriquer — commiter, builder, remettre",
        subskills: ["iakaframe-git", "iakaframe-forgejo"],
      },
      api,
    );
    const w = written()!;
    expect(w.id).toBe("iakaframe-fabrication");
    expect(w.text).toContain("description: le geste de fabriquer — commiter, builder, remettre");
    expect(w.text).toContain("name: iakaframe-fabrication\n"); // verrouillé, préservé
    expect(w.text).toContain("# iakaframe-fabrication\n\n> le forgeron\n"); // corps préservé
  });

  it("workflow : `name` proposé changé ; corps préservé (verbatimBody), id verrouillé", async () => {
    const md =
      "---\n" +
      "id: iakaframe-canonical\n" +
      "name: Workflow canonique\n" +
      "methodId: iakaframe\n" +
      "kind: pipeline\n" +
      "---\n\n## Workflow canonique\n\nUne prose de section à préserver.\n";
    // Le workflow ré-émet frame-format + corps (verbatimBody, tiré des octets réels par persistWorkflow).
    // Base = artefact valide (phases itérables) ; la proposition ne change que le `name`.
    const base: Workflow = {
      id: "iakaframe-canonical",
      name: "Workflow canonique",
      methodId: "iakaframe",
      kind: "pipeline",
      phases: [],
    };
    const { api, written } = fakeBackend(md);
    await persistWorkflow({ ...base, name: "Workflow canonique AFFÛTÉ" }, api);
    const w = written()!;
    expect(w.id).toBe("iakaframe-canonical"); // C-1
    expect(w.text).toContain("Workflow canonique AFFÛTÉ");
    expect(w.text).toContain("Une prose de section à préserver."); // corps préservé (verbatimBody)
  });
});
