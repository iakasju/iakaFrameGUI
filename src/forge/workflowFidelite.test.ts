/**
 * workflowFidelite — round-trip **au niveau document** du workflow (étape 3bis, doctrine
 * `GUI ← frame`). Ouvrir le workflow **réel du frame** puis Save **sans édition** doit produire un
 * fichier **byte-identique** (diff vide) — y compris l'**alignement manuel** du frontmatter
 * (`kind: auto,␣␣criteria`, piège 3) et l'**absence de `methodId`** (piège 4). Preuve-reine AC-2.
 *
 * Le test passe par la closure `serializeWorkflowDoc` (partagée avec `ForgeShell`) branchée sur
 * `useForgeDocument` (capture d'origine 3a) — c'est là que la byte-parité se joue. Édition → la
 * sérialisation **canonique** frame-format reprend la main (AC-3/AC-4), prose préservée.
 */
import { describe, it, expect } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { parseWorkflowMd, type Workflow } from "@iakaframe/core";
import { useForgeDocument, poolStorage, type DocConfig } from "./useForgeDocument";
import { serializeWorkflowDoc } from "./workflowSerialize";
import type { Backend } from "../api/backend";
import frameWorkflow from "../../packages/core/__tests__/fixtures/workflow.iakaframe-3phases.md?raw";

/** Backend POOL en mémoire (Lot 5c, Option A) — une Map par `<poolType>/<id>`. */
function fakeBackend(seed: Record<string, string> = {}): {
  api: Backend;
  files: Map<string, string>;
  writes: string[];
} {
  const files = new Map<string, string>(Object.entries(seed));
  const writes: string[] = [];
  const api = {
    isTauri: () => false,
    poolReadAll: async (p: string) =>
      [...files.entries()].filter(([k]) => k.startsWith(`${p}/`)).map(([, v]) => v),
    poolRead: async (p: string, id: string) => files.get(`${p}/${id}`) ?? null,
    poolWrite: async (p: string, id: string, text: string) => {
      writes.push(`${p}/${id}.md`);
      files.set(`${p}/${id}`, text);
    },
    poolExists: async (p: string, id: string) => files.has(`${p}/${id}`),
  } as unknown as Backend;
  return { api, files, writes };
}

/** Config Workflow = miroir EXACT de la closure `workflowDoc` de ForgeShell (pool storage + serializeWorkflowDoc). */
const workflowConfig = (api: Backend): DocConfig<Workflow> => ({
  storage: (a) => poolStorage("workflows", a),
  blank: () => ({ id: "", name: "", methodId: "iakaframe", phases: [] }),
  serialize: (w, o) => serializeWorkflowDoc(w, o),
  parse: (t) => parseWorkflowMd(t),
  idOf: (w) => w.id,
  nameOf: (w) => w.name,
  withName: (w, name) => ({ ...w, name }),
  api,
});

describe("fidélité Open→Save du workflow au frame (AC-2, doctrine GUI ← frame)", () => {
  it("AC-2 — Open→Save sans édition = byte-identique (double-espace + absence methodId préservés)", async () => {
    const { api, files, writes } = fakeBackend({ "workflows/iakaframe-3phases": frameWorkflow });
    const { result } = renderHook(() => useForgeDocument(workflowConfig(api)));
    await act(async () => {
      result.current.requestOpen("iakaframe-3phases");
    });
    await waitFor(() => expect(result.current.id).toBe("iakaframe-3phases"));
    // AC-1 au niveau document : le workflow réel s'ouvre (4 phases, prod hors-chaîne).
    expect(result.current.artifact?.phases).toHaveLength(4);
    expect(result.current.artifact?.phases[3].offChain).toBe(true);

    await act(async () => {
      await result.current.save();
    });
    expect(writes).toEqual(["workflows/iakaframe-3phases.md"]);
    // Preuve-reine : diff VIDE byte-identique (alignement manuel + pas de methodId).
    const saved = files.get("workflows/iakaframe-3phases")!;
    expect(saved).toBe(frameWorkflow);
    expect(saved).toContain("kind: auto,  criteria"); // double-espace verbatim
    expect(saved).not.toContain("methodId");
  });

  it("AC-4 — édition → canonique frame-format, prose préservée, PAS de bloc json", async () => {
    const { api, files } = fakeBackend({ "workflows/iakaframe-3phases": frameWorkflow });
    const { result } = renderHook(() => useForgeDocument(workflowConfig(api)));
    await act(async () => {
      result.current.requestOpen("iakaframe-3phases");
    });
    await waitFor(() => expect(result.current.id).toBe("iakaframe-3phases"));

    // Édite : renomme le workflow → la capture verbatim ne s'applique plus (canonique reprend).
    act(() => result.current.setName("Workflow édité"));
    await act(async () => {
      await result.current.save();
    });
    const saved = files.get("workflows/iakaframe-3phases")!;
    expect(saved).not.toBe(frameWorkflow); // ré-authoring canonique
    expect(saved).toContain("name: Workflow édité");
    // Frame-format : phases/gates en frontmatter, gates en tableau séparé, PAS de json.
    expect(saved).toMatch(/^phases:/m);
    expect(saved).toMatch(/^gates:/m);
    expect(saved).not.toContain("```json");
    // Prose du corps préservée verbatim (AC-4).
    expect(saved).toContain("# Workflow iakaframe — 3 phases (cible staging) + squad prod");
    expect(saved).toContain("« Gimli solo »");
    // Réouvrable + structurellement cohérent.
    const reopened = parseWorkflowMd(saved)!;
    expect(reopened.name).toBe("Workflow édité");
    expect(reopened.phases.map((p) => p.id)).toEqual(["p1", "p2", "p3", "prod"]);
  });

  it("workflow neuf (aucune capture) → Save écrit un frame-format canonique + prose neuve", async () => {
    const { api, files } = fakeBackend();
    const { result } = renderHook(() => useForgeDocument(workflowConfig(api)));
    const neuf: Workflow = {
      id: "",
      name: "Neuf",
      methodId: "iakaframe",
      phases: [
        {
          id: "s1",
          order: 0,
          name: "Étape 1",
          description: "a → b",
          roleKeys: ["architecture"],
          gate: { kind: "human", condition: "ok" },
        },
      ],
    };
    act(() => result.current.edit(neuf));
    await act(async () => {
      await result.current.saveAs("neuf", "Neuf");
    });
    const saved = files.get("workflows/neuf")!;
    expect(saved).toContain("Forgé par iakaFrameGUI"); // boilerplate de prose neuve
    expect(saved).not.toContain("```json");
    expect(saved).toMatch(/^phases:/m);
    const reopened = parseWorkflowMd(saved)!;
    expect(reopened.phases.map((p) => p.id)).toEqual(["s1"]);
  });
});
