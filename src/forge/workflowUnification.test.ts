/**
 * workflowUnification.test.ts — la **preuve** du sous-lot 5c-workflow
 * (unification-workflow-pool-collection-5c.md, **Option A** : le pool est la vérité unique).
 *
 *  - **AC-W1 (anti-double-écriture, born-red)** : `persistWorkflow` écrit le **pool**
 *    (`pool_write("workflows")`) et **JAMAIS** la collection (`library_write`). Le chemin de la
 *    seconde maison éditable est retiré — aucune écriture divergente ne subsiste.
 *  - **AC-W4 (round-trip byte)** : un workflow **ré-enregistré sans changement** est
 *    **byte-identique** (ré-émission source verbatim). C-1 : l'`id` (== nom de fichier) inchangé.
 */
import { describe, it, expect, vi } from "vitest";
import { parseWorkflowMd, addPhase, type Workflow } from "@iakaframe/core";
import { persistWorkflow } from "./workflowPersist";
import type { Backend } from "../api/backend";
import frameWorkflow from "../../packages/core/__tests__/fixtures/workflow.iakaframe-3phases.md?raw";

function spyBackend(seed: Record<string, string> = {}): {
  api: Backend;
  store: Record<string, string>;
  libraryWrite: ReturnType<typeof vi.fn>;
  poolWrite: ReturnType<typeof vi.fn>;
} {
  const store: Record<string, string> = { ...seed };
  const libraryWrite = vi.fn(async () => {});
  const poolWrite = vi.fn(async (_p: string, id: string, text: string) => {
    store[id] = text;
  });
  const api = {
    isTauri: () => false,
    poolRead: async (_p: string, id: string) => store[id] ?? null,
    poolWrite,
    libraryWrite, // présent mais NE DOIT JAMAIS être appelé pour un workflow (born-red).
  } as unknown as Backend;
  return { api, store, libraryWrite, poolWrite };
}

describe("5c-workflow — vérité unique : le pool, jamais la collection", () => {
  it("AC-W1 : persistWorkflow écrit le POOL et n'appelle JAMAIS libraryWrite (anti-double-écriture)", async () => {
    const wf = parseWorkflowMd(frameWorkflow)!;
    const { api, libraryWrite, poolWrite } = spyBackend();
    await persistWorkflow(wf, api);
    expect(poolWrite).toHaveBeenCalledTimes(1);
    expect(poolWrite).toHaveBeenCalledWith("workflows", "iakaframe-3phases", expect.any(String));
    expect(libraryWrite).not.toHaveBeenCalled(); // AUCUNE écriture collection divergente.
  });

  it("AC-W4 : ré-enregistrer un workflow inchangé écrit des octets IDENTIQUES au pool (source verbatim)", async () => {
    const wf = parseWorkflowMd(frameWorkflow)!;
    const { api, store } = spyBackend({ "iakaframe-3phases": frameWorkflow });
    await persistWorkflow(wf, api);
    expect(store["iakaframe-3phases"]).toBe(frameWorkflow); // byte-identité (C-1 : id inchangé).
  });

  it("AC-W4 : un workflow ÉDITÉ est ré-émis en frame-format canonique + corps préservé", async () => {
    const wf = addPhase(parseWorkflowMd(frameWorkflow)!);
    const { api, store, poolWrite } = spyBackend({ "iakaframe-3phases": frameWorkflow });
    await persistWorkflow(wf as Workflow, api);
    expect(poolWrite).toHaveBeenCalledWith("workflows", "iakaframe-3phases", expect.any(String));
    const saved = store["iakaframe-3phases"];
    expect(saved).not.toBe(frameWorkflow); // édité → ré-authoring canonique
    expect(saved).toMatch(/^phases:/m);
    expect(saved).toContain("# Workflow iakaframe"); // prose du corps préservée
  });
});
