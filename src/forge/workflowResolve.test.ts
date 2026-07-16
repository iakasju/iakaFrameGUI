/**
 * workflowResolve.test.ts — EW-7 : résolution de la référence workflow de la Méthode par la forge.
 * Présent (collection) → objet ; absent/illisible → repli canonique + signal NON bloquant (Q-7).
 */
import { describe, it, expect } from "vitest";
import {
  IAKAFRAME_CANONICAL_WORKFLOW,
  serializeWorkflowMd,
  type Method,
  type Workflow,
} from "@iakaframe/core";
import { resolveMethodWorkflow } from "./workflowResolve";
import type { Backend } from "../api/backend";

function method(workflowId?: string): Method {
  return {
    id: "m",
    name: "M",
    scaffoldIds: [],
    principleIds: [],
    ritualIds: [],
    guardrailIds: [],
    roleKeys: [],
    ...(workflowId ? { workflowId } : {}),
  };
}

/** Backend factice : la collection `workflows/` est un dictionnaire id → texte `.md`. */
function fakeBackend(collection: Record<string, string>): Backend {
  return {
    libraryRead: async (c: string, id: string) =>
      c === "workflows" ? (collection[id] ?? null) : null,
  } as unknown as Backend;
}

const custom: Workflow = {
  id: "mon-wf",
  name: "Mon workflow",
  methodId: "iakaframe",
  phases: [
    { id: "x", order: 0, name: "X", description: "", roleKeys: ["architecture"], gate: { kind: "human", condition: "" } },
  ],
};

describe("EW-7 — resolveMethodWorkflow", () => {
  it("référence présente dans la collection → workflow parsé (pas de warning)", async () => {
    const api = fakeBackend({ "mon-wf": serializeWorkflowMd(custom) });
    const res = await resolveMethodWorkflow(method("mon-wf"), api);
    expect(res.workflow).toEqual(custom);
    expect(res.warning).toBeUndefined();
  });

  it("aucune référence → canonique (repli pur, aucun I/O), pas de warning", async () => {
    const api = fakeBackend({});
    const res = await resolveMethodWorkflow(method(), api);
    expect(res.workflow).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(res.warning).toBeUndefined();
  });

  it("référence = id du catalogue du cœur → workflow du catalogue, pas de warning", async () => {
    const api = fakeBackend({});
    const res = await resolveMethodWorkflow(method("iakaframe-canonical"), api);
    expect(res.workflow).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(res.warning).toBeUndefined();
  });

  it("référence ABSENTE (ni collection ni catalogue) → repli canonique + signal (Q-7)", async () => {
    const api = fakeBackend({});
    const res = await resolveMethodWorkflow(method("pendante"), api);
    expect(res.workflow).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(res.warning).toMatch(/introuvable/);
  });

  it("référence présente mais ILLISIBLE → repli canonique + signal (Q-7)", async () => {
    const api = fakeBackend({ cassé: "---\nid: cassé\n---\npas de bloc json\n" });
    const res = await resolveMethodWorkflow(method("cassé"), api);
    expect(res.workflow).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(res.warning).toMatch(/illisible/);
  });

  it("défensif : erreur de lecture backend → repli canonique (jamais d'exception)", async () => {
    const api = {
      libraryRead: async () => {
        throw new Error("boom");
      },
    } as unknown as Backend;
    const res = await resolveMethodWorkflow(method("x"), api);
    expect(res.workflow).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
  });
});
