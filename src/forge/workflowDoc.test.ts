/**
 * workflowDoc.test.ts — le **document Workflow** (4ᵉ onglet) branché sur `useForgeDocument`
 * (P6b, EW-3 / EW-4). Vérifie New (seed = clone du canonique), Save As (écrit `workflows/<id>.md`),
 * Open (round-trip structurel), dirty et renommage en ligne — avec backend mock.
 */
import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  IAKAFRAME_CANONICAL_WORKFLOW,
  addPhase,
  serializeWorkflowMd,
  parseWorkflowMd,
  type Workflow,
} from "@iakaframe/core";
import { useForgeDocument, poolStorage, type DocConfig } from "./useForgeDocument";
import type { Backend } from "../api/backend";

/** Backend mock : un magasin id → texte `.md` pour le POOL `library/workflows/` (Lot 5c, Option A). */
function fakeBackend(): { api: Backend; store: Record<string, string> } {
  const store: Record<string, string> = {};
  const api = {
    isTauri: () => false,
    poolExists: async (_p: string, id: string) => id in store,
    poolWrite: async (_p: string, id: string, text: string) => {
      store[id] = text;
    },
    poolRead: async (_p: string, id: string) => store[id] ?? null,
    poolReadAll: async () => Object.values(store),
  } as unknown as Backend;
  return { api, store };
}

function workflowConfig(api: Backend): DocConfig<Workflow> {
  return {
    storage: (a) => poolStorage("workflows", a),
    blank: () => ({
      ...IAKAFRAME_CANONICAL_WORKFLOW,
      phases: IAKAFRAME_CANONICAL_WORKFLOW.phases.map((p) => ({ ...p })),
    }),
    serialize: (w) => serializeWorkflowMd(w),
    parse: (txt) => parseWorkflowMd(txt),
    idOf: (w) => w.id,
    nameOf: (w) => w.name,
    withName: (w, name) => ({ ...w, name }),
    api,
  };
}

describe("EW-3 — document Workflow : 5 gestes + dirty + renommage", () => {
  it("New seede une copie du canonique (mêmes phases)", () => {
    const { api } = fakeBackend();
    const { result } = renderHook(() => useForgeDocument(workflowConfig(api)));
    act(() => result.current.requestNew());
    expect(result.current.artifact?.phases).toHaveLength(
      IAKAFRAME_CANONICAL_WORKFLOW.phases.length,
    );
    expect(result.current.dirty).toBe(false);
  });

  it("édition marque dirty ; renommage en ligne pose le name (withName)", () => {
    const { api } = fakeBackend();
    const { result } = renderHook(() => useForgeDocument(workflowConfig(api)));
    act(() => result.current.requestNew());
    act(() => result.current.edit(addPhase(result.current.artifact!)));
    expect(result.current.dirty).toBe(true);
    act(() => result.current.setName("Mon workflow"));
    expect(result.current.name).toBe("Mon workflow");
  });
});

describe("EW-4 — persistance round-trip du pool (Lot 5c, Option A)", () => {
  it("Save As écrit library/workflows/<id>.md ; Open réhydrate un workflow structurellement égal", async () => {
    const { api, store } = fakeBackend();
    const { result } = renderHook(() => useForgeDocument(workflowConfig(api)));
    act(() => result.current.requestNew());
    // Édite (ajoute une phase) puis Save As sous un id de bibliothèque libre (Q-4).
    act(() => result.current.edit(addPhase(result.current.artifact!)));
    const edited = result.current.artifact!;
    await act(async () => {
      await result.current.saveAs("mon-workflow", "Mon workflow");
    });
    expect(Object.keys(store)).toEqual(["mon-workflow"]);
    expect(result.current.dirty).toBe(false);

    // Réouvre depuis la collection → structurellement égal (mêmes phases).
    act(() => result.current.requestClose());
    await act(async () => {
      result.current.requestOpen("mon-workflow");
    });
    // laisse l'ouverture asynchrone se résoudre
    await act(async () => {});
    const reopened = result.current.artifact!;
    expect(reopened.phases.map((p) => p.id)).toEqual(edited.phases.map((p) => p.id));
    expect(reopened.name).toBe("Mon workflow");
    expect(reopened.id).toBe("mon-workflow");
  });
});
