import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { serializeTeamMd, parseTeamMd, type TeamMd } from "@iakaframe/core";
import {
  useForgeDocument,
  type DocConfig,
  type RefsReport,
} from "./useForgeDocument";
import type { Backend } from "../api/backend";

/** Backend bibliothèque minimal en mémoire (I1 testée via validateRefs injecté). */
function fakeBackend(): { api: Backend; writes: string[] } {
  const files = new Map<string, string>();
  const writes: string[] = [];
  const api = {
    isTauri: () => false,
    libraryList: async () => [],
    libraryRead: async () => null,
    libraryWrite: async (c: string, id: string, text: string) => {
      writes.push(`${c}/${id}.md`);
      files.set(`${c}/${id}`, text);
    },
    libraryExists: async () => false,
  } as unknown as Backend;
  return { api, writes };
}

const blankTeam = (): TeamMd => ({
  id: "",
  name: "sans-titre",
  personas: [],
  coordinator: "",
  guardrails: [],
  vignetteTeam: "none",
});

function teamConfig(
  api: Backend,
  validateRefs: (t: TeamMd) => Promise<RefsReport>,
): DocConfig<TeamMd> {
  return {
    collection: "teams",
    blank: blankTeam,
    serialize: (t) => serializeTeamMd(t),
    parse: (t) => parseTeamMd(t),
    idOf: (t) => t.id,
    nameOf: (t) => t.name,
    validateRefs,
    api,
  };
}

describe("useForgeDocument — intégrité référentielle I1 au Save (miroir de `add`)", () => {
  it("réf. cassée ⇒ refus, AUCUNE écriture, rapport des ids manquants", async () => {
    const { api, writes } = fakeBackend();
    const validateRefs = async (): Promise<RefsReport> => ({
      ok: false,
      missing: [{ field: "personas", id: "inconnu", collection: "personas" }],
    });
    const { result } = renderHook(() => useForgeDocument(teamConfig(api, validateRefs)));
    act(() => result.current.requestNew());
    act(() =>
      result.current.edit({ ...blankTeam(), id: "t", personas: ["inconnu"] }),
    );
    let outcome!: Awaited<ReturnType<typeof result.current.saveAs>>;
    await act(async () => {
      outcome = await result.current.saveAs("t", "T");
    });
    expect(outcome.ok).toBe(false);
    expect(writes).toHaveLength(0);
    expect(result.current.lastError).toMatch(/inconnu/);
  });

  it("réf. valide ⇒ écriture effectuée", async () => {
    const { api, writes } = fakeBackend();
    const validateRefs = async (): Promise<RefsReport> => ({ ok: true, missing: [] });
    const { result } = renderHook(() => useForgeDocument(teamConfig(api, validateRefs)));
    act(() => result.current.requestNew());
    act(() =>
      result.current.edit({ ...blankTeam(), id: "t", personas: ["aragorn"], coordinator: "aragorn" }),
    );
    await act(async () => {
      await result.current.saveAs("t", "T");
    });
    expect(writes).toEqual(["teams/t.md"]);
    expect(result.current.dirty).toBe(false);
  });

  it("pool absent ⇒ avertissement NON bloquant (Q-4), écriture autorisée", async () => {
    const { api, writes } = fakeBackend();
    const validateRefs = async (): Promise<RefsReport> => ({
      ok: true,
      missing: [],
      warning: "pool library/ absent — intégrité non vérifiée",
    });
    const { result } = renderHook(() => useForgeDocument(teamConfig(api, validateRefs)));
    act(() => result.current.requestNew());
    act(() => result.current.edit({ ...blankTeam(), id: "t", personas: ["x"] }));
    await act(async () => {
      await result.current.saveAs("t", "T");
    });
    expect(writes).toEqual(["teams/t.md"]);
    expect(result.current.lastWarning).toMatch(/pool/);
  });
});
