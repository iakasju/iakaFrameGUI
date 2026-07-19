import { describe, it, expect } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  parseMethodMd,
  serializeMethodMd,
  type MethodMd,
} from "@iakaframe/core";
import { useForgeDocument, type DocConfig } from "./useForgeDocument";
import { BACKEND_UNAVAILABLE_MSG, call, type Backend } from "../api/backend";

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

  it("setName sur artefact ouvert : dirty, name mis à jour, id/source inchangés", () => {
    const { api } = fakeBackend();
    const withName = (m: MethodMd, name: string) => ({ ...m, name });
    const { result } = renderHook(() => useForgeDocument(methodConfig(api, { withName })));
    act(() => result.current.requestNew());
    expect(result.current.source).toBe("new");
    act(() => result.current.setName("Méthode démo"));
    expect(result.current.name).toBe("Méthode démo");
    expect(result.current.dirty).toBe(true);
    expect(result.current.id).toBeNull(); // vierge : id reste null
    expect(result.current.source).toBe("new");
  });

  it("setName préserve l'id d'un document issu d'Open (non-destructif)", async () => {
    const seed = {
      "methods/m1": serializeMethodMd({ ...blankMethod(), id: "m1", name: "M1" }),
    };
    const { api } = fakeBackend(seed);
    const withName = (m: MethodMd, name: string) => ({ ...m, name });
    const { result } = renderHook(() => useForgeDocument(methodConfig(api, { withName })));
    await act(async () => {
      result.current.requestOpen("m1");
    });
    await waitFor(() => expect(result.current.id).toBe("m1"));
    act(() => result.current.setName("Nouveau nom"));
    expect(result.current.name).toBe("Nouveau nom");
    expect(result.current.id).toBe("m1"); // id inchangé
    expect(result.current.source).toBe("library");
    expect(result.current.dirty).toBe(true);
  });

  it("setName n'altère pas la valeur (texte libre, accents/emoji conservés)", () => {
    const { api } = fakeBackend();
    const withName = (m: MethodMd, name: string) => ({ ...m, name });
    const { result } = renderHook(() => useForgeDocument(methodConfig(api, { withName })));
    act(() => result.current.requestNew());
    act(() => result.current.setName("Équipe été 🚀"));
    expect(result.current.name).toBe("Équipe été 🚀");
  });

  it("setName sans artefact ouvert : no-op", () => {
    const { api } = fakeBackend();
    const withName = (m: MethodMd, name: string) => ({ ...m, name });
    const { result } = renderHook(() => useForgeDocument(methodConfig(api, { withName })));
    act(() => result.current.setName("X"));
    expect(result.current.artifact).toBeNull();
    expect(result.current.dirty).toBe(false);
  });

  it("setName no-op si config.withName absent (ex. Kit)", () => {
    const { api } = fakeBackend();
    const { result } = renderHook(() => useForgeDocument(methodConfig(api)));
    act(() => result.current.requestNew());
    act(() => result.current.setName("X"));
    expect(result.current.name).toBe("sans-titre");
    expect(result.current.dirty).toBe(false);
  });

  it("canRename : vrai avec withName + artefact ; faux sans withName ; faux si artefact null", () => {
    const { api } = fakeBackend();
    const withName = (m: MethodMd, name: string) => ({ ...m, name });
    const { result: withCfg } = renderHook(() =>
      useForgeDocument(methodConfig(api, { withName })),
    );
    expect(withCfg.current.canRename).toBe(false); // artefact null
    act(() => withCfg.current.requestNew());
    expect(withCfg.current.canRename).toBe(true);

    const { result: noWith } = renderHook(() => useForgeDocument(methodConfig(api)));
    act(() => noWith.current.requestNew());
    expect(noWith.current.canRename).toBe(false); // pas de withName
  });

  it("renommer + Save (doc déjà nommé) réécrit le même fichier avec le nouveau nom", async () => {
    const seed = {
      "methods/m1": serializeMethodMd({ ...blankMethod(), id: "m1", name: "Ancien" }),
    };
    const { api, writes, files } = fakeBackend(seed);
    const withName = (m: MethodMd, name: string) => ({ ...m, name });
    const { result } = renderHook(() => useForgeDocument(methodConfig(api, { withName })));
    await act(async () => {
      result.current.requestOpen("m1");
    });
    await waitFor(() => expect(result.current.id).toBe("m1"));
    act(() => result.current.setName("Nouveau"));
    await act(async () => {
      await result.current.save();
    });
    expect(writes).toEqual(["methods/m1.md"]);
    expect(files.get("methods/m1")).toContain("Nouveau");
    expect(result.current.dirty).toBe(false);
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

  // --- #1 : écriture hors backend → message utilisateur propre (garde `call()`, relayée par le hook) ---
  it("écriture hors backend : lastError = message court propre (pas de stack invoke)", async () => {
    // Non-circulaire : on route `libraryWrite` du fake vers le VRAI `call()`. En jsdom (aucun
    // `__TAURI_INTERNALS__`), la garde de `call()` lève réellement BACKEND_UNAVAILABLE_MSG — on
    // vérifie donc que la garde produit le message propre ET que le hook le relaie (pas une stack).
    const { api } = fakeBackend();
    (api as unknown as { libraryWrite: Backend["libraryWrite"] }).libraryWrite = (c, id, text) =>
      call<void>("library_write", { collection: c, id, text });
    const { result } = renderHook(() => useForgeDocument(methodConfig(api)));
    act(() => result.current.requestNew());
    act(() => result.current.edit({ ...blankMethod(), principleIds: ["qualite"] }));

    let outcome!: Awaited<ReturnType<typeof result.current.saveAs>>;
    await act(async () => {
      outcome = await result.current.saveAs("demo", "Démo");
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toBe(BACKEND_UNAVAILABLE_MSG);
    expect(result.current.lastError).toBe(BACKEND_UNAVAILABLE_MSG);
    // Anti-stack : aucun fragment technique remonté à l'utilisateur.
    expect(result.current.lastError).not.toContain("invoke");
    expect(result.current.lastError).not.toContain("Cannot read properties");
  });

  // --- Anti-boucle (Option B) : identité du doc stable entre deux rendus sans changement d'état ---
  it("anti-boucle : l'objet doc garde son identité entre deux rendus, même quand `config` est recréé à chaque rendu", () => {
    // Reproduit la réalité de ForgeShell : `config` est un LITTÉRAL recréé à CHAQUE rendu
    // (arrow-functions neuves via `methodConfig(api)`). Avant le correctif, `config` figurait dans
    // les deps de `listEntries`/`performOpen`/… → l'objet retourné par le hook changeait d'identité
    // à chaque rendu → l'effet consommateur (onglet Méthode) rebouclait à l'infini (setState en
    // microtâche, 100 % CPU). Ce test ÉCHOUE si `config` réintègre les deps (identités instables) ;
    // il passe une fois les callbacks lus via `configRef`. NON tautologique : sur l'ancien code,
    // `result.current` (et `listEntries`) seraient de NOUVELLES références après `rerender()`.
    const { api } = fakeBackend();
    const { result, rerender } = renderHook(() => useForgeDocument(methodConfig(api)));
    const firstDoc = result.current;
    const firstListEntries = result.current.listEntries;
    rerender(); // re-rendu forcé, AUCUN changement d'état → l'identité doit être préservée.
    expect(result.current).toBe(firstDoc);
    expect(result.current.listEntries).toBe(firstListEntries);
  });

  // --- #2 : l'invite Save As orpheline se referme au Close ET au New (reset d'état document) ---
  it("reset saveAsOpen : Close et New referment l'invite Save As orpheline", () => {
    // Close : New → openSaveAs (invite ouverte) → Close ⇒ invite refermée + document vidé.
    const { api } = fakeBackend();
    const closed = renderHook(() => useForgeDocument(methodConfig(api)));
    act(() => closed.result.current.requestNew());
    act(() => closed.result.current.openSaveAs());
    expect(closed.result.current.saveAsOpen).toBe(true);
    act(() => closed.result.current.requestClose()); // document non dirty : Close direct
    expect(closed.result.current.saveAsOpen).toBe(false);
    expect(closed.result.current.artifact).toBeNull();

    // Variante New : openSaveAs (invite ouverte) → New ⇒ invite non orpheline sur le nouveau vierge.
    const renewed = renderHook(() => useForgeDocument(methodConfig(api)));
    act(() => renewed.result.current.requestNew());
    act(() => renewed.result.current.openSaveAs());
    expect(renewed.result.current.saveAsOpen).toBe(true);
    act(() => renewed.result.current.requestNew());
    expect(renewed.result.current.saveAsOpen).toBe(false);
  });
});
