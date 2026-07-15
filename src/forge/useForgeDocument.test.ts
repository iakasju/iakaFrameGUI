import { describe, it, expect } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  parseMethodMd,
  serializeMethodMd,
  type MethodMd,
} from "@iakaframe/core";
import { useForgeDocument, type DocConfig } from "./useForgeDocument";
import type { Backend } from "../api/backend";

/** Backend bibliothèque en mémoire (une Map par `<collection>/<id>`). */
function fakeBackend(seed: Record<string, string> = {}): {
  api: Backend;
  files: Map<string, string>;
  writes: string[];
} {
  const files = new Map<string, string>(Object.entries(seed));
  const writes: string[] = [];
  const api = {
    isTauri: () => false,
    libraryList: async (c: string) =>
      [...files.entries()]
        .filter(([k]) => k.startsWith(`${c}/`))
        .map(([, v]) => v),
    libraryRead: async (c: string, id: string) => files.get(`${c}/${id}`) ?? null,
    libraryWrite: async (c: string, id: string, text: string) => {
      writes.push(`${c}/${id}.md`);
      files.set(`${c}/${id}`, text);
    },
    libraryExists: async (c: string, id: string) => files.has(`${c}/${id}`),
  } as unknown as Backend;
  return { api, files, writes };
}

const blankMethod = (): MethodMd => ({
  id: "",
  name: "sans-titre",
  principleIds: [],
  ritualIds: [],
  guardrailIds: [],
  roleKeys: [],
  scaffoldIds: [],
});

function methodConfig(api: Backend, extra: Partial<DocConfig<MethodMd>> = {}): DocConfig<MethodMd> {
  return {
    collection: "methods",
    blank: blankMethod,
    serialize: (m) => serializeMethodMd(m),
    parse: (t) => parseMethodMd(t),
    idOf: (m) => m.id,
    nameOf: (m) => m.name,
    api,
    ...extra,
  };
}

describe("useForgeDocument — modèle de document unifié (Q-1)", () => {
  it("New charge un vierge (sans-titre, id null, non dirty)", () => {
    const { api } = fakeBackend();
    const { result } = renderHook(() => useForgeDocument(methodConfig(api)));
    act(() => result.current.requestNew());
    expect(result.current.id).toBeNull();
    expect(result.current.name).toBe("sans-titre");
    expect(result.current.dirty).toBe(false);
    expect(result.current.source).toBe("new");
  });

  it("edit marque dirty ; Save sur id=null bascule Save As", async () => {
    const { api, writes } = fakeBackend();
    const { result } = renderHook(() => useForgeDocument(methodConfig(api)));
    act(() => result.current.requestNew());
    act(() => result.current.edit({ ...blankMethod(), principleIds: ["qualite"] }));
    expect(result.current.dirty).toBe(true);

    let outcome!: Awaited<ReturnType<typeof result.current.save>>;
    await act(async () => {
      outcome = await result.current.save();
    });
    expect(outcome.requiresSaveAs).toBe(true);
    expect(writes).toHaveLength(0);
    expect(result.current.saveAsOpen).toBe(true);
  });

  it("Save As écrit <collection>/<id>.md, texte débutant par --- avec id: ; dirty retombe", async () => {
    const { api, writes, files } = fakeBackend();
    const { result } = renderHook(() => useForgeDocument(methodConfig(api)));
    act(() => result.current.requestNew());
    act(() => result.current.edit({ ...blankMethod(), principleIds: ["qualite"] }));

    let outcome!: Awaited<ReturnType<typeof result.current.saveAs>>;
    await act(async () => {
      outcome = await result.current.saveAs("Méthode démo", "Méthode démo");
    });
    expect(outcome.ok).toBe(true);
    expect(writes).toEqual(["methods/methode-demo.md"]);
    const text = files.get("methods/methode-demo")!;
    expect(text.startsWith("---\n")).toBe(true);
    expect(text).toContain("id: methode-demo");
    expect(result.current.dirty).toBe(false);
    expect(result.current.id).toBe("methode-demo");
    expect(result.current.source).toBe("library");
  });

  it("Save d'un document déjà nommé réécrit son propre fichier (I2)", async () => {
    const seed = {
      "methods/m1": serializeMethodMd({ ...blankMethod(), id: "m1", name: "M1" }),
    };
    const { api, writes } = fakeBackend(seed);
    const { result } = renderHook(() => useForgeDocument(methodConfig(api)));
    await act(async () => {
      result.current.requestOpen("m1");
    });
    await waitFor(() => expect(result.current.id).toBe("m1"));
    act(() => result.current.edit({ ...blankMethod(), id: "m1", name: "M1", ritualIds: ["init"] }));
    await act(async () => {
      await result.current.save();
    });
    expect(writes).toEqual(["methods/m1.md"]);
    expect(result.current.dirty).toBe(false);
  });

  it("Open charge depuis libraryRead ; persistance résolue (round-trip)", async () => {
    const original: MethodMd = {
      ...blankMethod(),
      id: "iakaframe",
      name: "Méthode iakaframe",
      principleIds: ["qualite", "mvp-first"],
    };
    const seed = { "methods/iakaframe": serializeMethodMd(original) };
    const { api } = fakeBackend(seed);
    const { result } = renderHook(() => useForgeDocument(methodConfig(api)));
    await act(async () => {
      result.current.requestOpen("iakaframe");
    });
    await waitFor(() => expect(result.current.id).toBe("iakaframe"));
    expect(result.current.artifact?.principleIds).toEqual(["qualite", "mvp-first"]);
    expect(result.current.name).toBe("Méthode iakaframe");
    expect(result.current.dirty).toBe(false);
  });

  it("New/Open/Close sur un document dirty ouvrent la garde ; Annuler = no-op", () => {
    const { api } = fakeBackend();
    const { result } = renderHook(() => useForgeDocument(methodConfig(api)));
    act(() => result.current.requestNew());
    act(() => result.current.edit({ ...blankMethod(), roleKeys: ["dev"] }));
    act(() => result.current.requestClose());
    expect(result.current.guardOpen).toBe(true);
    // Annuler : le document reste ouvert et dirty.
    act(() => result.current.guardCancel());
    expect(result.current.guardOpen).toBe(false);
    expect(result.current.artifact).not.toBeNull();
    expect(result.current.dirty).toBe(true);
  });

  it("garde → Abandonner poursuit le geste (Close vide le document)", () => {
    const { api } = fakeBackend();
    const { result } = renderHook(() => useForgeDocument(methodConfig(api)));
    act(() => result.current.requestNew());
    act(() => result.current.edit({ ...blankMethod(), roleKeys: ["dev"] }));
    act(() => result.current.requestClose());
    act(() => result.current.guardDiscardThenProceed());
    expect(result.current.guardOpen).toBe(false);
    expect(result.current.artifact).toBeNull();
  });

  it("listEntries scanne la collection (id + nom triés)", async () => {
    const seed = {
      "methods/b": serializeMethodMd({ ...blankMethod(), id: "b", name: "Bravo" }),
      "methods/a": serializeMethodMd({ ...blankMethod(), id: "a", name: "Alpha" }),
    };
    const { api } = fakeBackend(seed);
    const { result } = renderHook(() => useForgeDocument(methodConfig(api)));
    let entries!: { id: string; name: string }[];
    await act(async () => {
      entries = await result.current.listEntries();
    });
    expect(entries).toEqual([
      { id: "a", name: "Alpha" },
      { id: "b", name: "Bravo" },
    ]);
  });

  it("Save As non destructif : refuse d'écraser un id existant", async () => {
    const seed = {
      "methods/pris": serializeMethodMd({ ...blankMethod(), id: "pris", name: "Pris" }),
    };
    const { api, writes } = fakeBackend(seed);
    const { result } = renderHook(() => useForgeDocument(methodConfig(api)));
    act(() => result.current.requestNew());
    act(() => result.current.edit({ ...blankMethod(), roleKeys: ["dev"] }));
    let outcome!: Awaited<ReturnType<typeof result.current.saveAs>>;
    await act(async () => {
      outcome = await result.current.saveAs("pris", "Pris");
    });
    expect(outcome.ok).toBe(false);
    expect(writes).toHaveLength(0);
    expect(result.current.lastError).toMatch(/existe déjà/);
  });
});
