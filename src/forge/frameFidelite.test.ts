/**
 * frameFidelite — round-trip **au niveau document** (défauts 2+3, doctrine `GUI ← frame`). Ouvrir un
 * artefact **réel** du frame puis Save **sans édition** doit produire un fichier **byte-identique**
 * (diff vide) : preuve mécanique que le GUI ne déforme plus le frame. Le test passe par les closures
 * `serialize`/`parse` de `ForgeShell` (**mappers inclus**) — c'est là que corps, wrapping et `emits`
 * se perdaient. Fixtures = copies conformes de `methods/iakaframe.md` et `kits/iakaframe-claude.md`.
 */
import { describe, it, expect } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  DEFAULT_KIT_NODE,
  parseKitMd,
  parseMethodMd,
  serializeKitMd,
  serializeMethodMd,
  type Kit,
  type Method,
} from "@iakaframe/core";
import { useForgeDocument, type DocConfig } from "./useForgeDocument";
import { IAKAFRAME_STARTER_METHOD } from "./useForgeMethod";
import { kitToMd, mdToKit, mdToMethod, methodToMd } from "./mappers";
import type { Backend } from "../api/backend";
import methodWrapped from "../../packages/core/__tests__/fixtures/method.iakaframe-wrapped.md?raw";
import kitClaude from "../../packages/core/__tests__/fixtures/kit.iakaframe-claude.md?raw";

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
      [...files.entries()].filter(([k]) => k.startsWith(`${c}/`)).map(([, v]) => v),
    libraryRead: async (c: string, id: string) => files.get(`${c}/${id}`) ?? null,
    libraryWrite: async (c: string, id: string, text: string) => {
      writes.push(`${c}/${id}.md`);
      files.set(`${c}/${id}`, text);
    },
    libraryExists: async (c: string, id: string) => files.has(`${c}/${id}`),
  } as unknown as Backend;
  return { api, files, writes };
}

// --- Boilerplate de repli (miroir EXACT de ForgeShell : bodies des documents neufs) ---
const methodBody = (m: Method): string =>
  `# ${m.name}\n\nAssemblage de discipline (ids vers \`library/*\`). Forgé par iakaFrameGUI.\n`;
const kitBody = (k: Kit): string =>
  `# Kit ${k.id || "sans-titre"}\n\nManifeste d'assemblage (méthode + team + binding). Forgé par iakaFrameGUI.\n`;

/** Config Méthode = miroir de la closure `methodDoc` de ForgeShell (mappers + rethread corps/layout). */
const methodConfig = (api: Backend): DocConfig<Method> => ({
  collection: "methods",
  blank: () => ({ ...IAKAFRAME_STARTER_METHOD }),
  serialize: (m, o) =>
    serializeMethodMd(methodToMd(m), o.body ?? methodBody(m), o.layout ?? undefined),
  parse: (t) => {
    const md = parseMethodMd(t);
    return md ? mdToMethod(md) : null;
  },
  idOf: (m) => m.id,
  nameOf: (m) => m.name,
  api,
});

/** Config Kit = miroir de la closure `kitDoc` de ForgeShell (mappers + rethread corps). */
const kitConfig = (api: Backend): DocConfig<Kit> => ({
  collection: "kits",
  blank: (): Kit => ({
    id: "iakaframe-kit",
    methodId: "iakaframe",
    teamId: "iakaframe",
    node: DEFAULT_KIT_NODE,
  }),
  serialize: (k, o) => serializeKitMd(kitToMd(k), o.body ?? kitBody(k)),
  parse: (t) => {
    const md = parseKitMd(t);
    return md ? mdToKit(md) : null;
  },
  idOf: (k) => k.id,
  nameOf: (k) => k.id,
  api,
});

describe("fidélité Open→Save au frame (défauts 2+3, doctrine GUI ← frame)", () => {
  it("AC-1 — round-trip idempotent MÉTHODE : Open→Save sans édition = byte-identique (corps + wrapping)", async () => {
    const { api, files, writes } = fakeBackend({ "methods/iakaframe": methodWrapped });
    const { result } = renderHook(() => useForgeDocument(methodConfig(api)));
    await act(async () => {
      result.current.requestOpen("iakaframe");
    });
    await waitFor(() => expect(result.current.id).toBe("iakaframe"));
    // Corps NON vide + `principleIds` de 18 ids wrappé sur 4 lignes (garde-fou de la fixture).
    expect(result.current.artifact?.principleIds).toHaveLength(18);
    await act(async () => {
      await result.current.save();
    });
    expect(writes).toEqual(["methods/iakaframe.md"]);
    // Preuve-reine : diff vide (corps préservé — défaut 2 — ET wrapping préservé — défaut 3).
    expect(files.get("methods/iakaframe")).toBe(methodWrapped);
  });

  it("AC-2 — round-trip idempotent KIT : Open→Save sans édition = byte-identique (corps + emits)", async () => {
    const { api, files, writes } = fakeBackend({ "kits/iakaframe-claude": kitClaude });
    const { result } = renderHook(() => useForgeDocument(kitConfig(api)));
    await act(async () => {
      result.current.requestOpen("iakaframe-claude");
    });
    await waitFor(() => expect(result.current.id).toBe("iakaframe-claude"));
    // `emits` transporté par les mappers (sinon perdu au Save — cf. § Découvertes).
    expect(result.current.artifact?.emits).toEqual([
      ".claude/agents/*",
      ".claude/skills/*",
      ".claude/hooks/*",
      "CLAUDE.md",
    ]);
    await act(async () => {
      await result.current.save();
    });
    expect(writes).toEqual(["kits/iakaframe-claude.md"]);
    expect(files.get("kits/iakaframe-claude")).toBe(kitClaude);
  });

  it("AC-4 — document neuf : Save écrit le boilerplate (capture nulle, comportement historique)", async () => {
    const { api, files } = fakeBackend();
    const { result } = renderHook(() => useForgeDocument(methodConfig(api)));
    act(() => result.current.requestNew());
    await act(async () => {
      await result.current.saveAs("neuve", "Neuve");
    });
    const text = files.get("methods/neuve")!;
    expect(text).toContain("Forgé par iakaFrameGUI"); // boilerplate, pas de corps d'origine.
  });

  it("AC-5 — layout périmé ignoré : éditer principleIds reflowe en forme canonique (pas de rendu faux)", async () => {
    const { api, files } = fakeBackend({ "methods/iakaframe": methodWrapped });
    const { result } = renderHook(() => useForgeDocument(methodConfig(api)));
    await act(async () => {
      result.current.requestOpen("iakaframe");
    });
    await waitFor(() => expect(result.current.id).toBe("iakaframe"));
    // Édite la liste flow (retire des ids) : le layout capturé [5,5,5,3]=18 ne recouvre plus 3 ids.
    act(() => {
      const m = result.current.artifact!;
      result.current.edit({ ...m, principleIds: m.principleIds.slice(0, 3) });
    });
    await act(async () => {
      await result.current.save();
    });
    const text = files.get("methods/iakaframe")!;
    // Garde `serializeMethodMd` (total !== rendered.length) → mono-ligne canonique, jamais faux.
    expect(text).toContain(
      "principleIds: [qualite, gestion-backlog, documentation]\n",
    );
  });

  it("capture d'origine remise à null au Close puis New → Save écrit le boilerplate", async () => {
    const { api, files } = fakeBackend({ "methods/iakaframe": methodWrapped });
    const { result } = renderHook(() => useForgeDocument(methodConfig(api)));
    await act(async () => {
      result.current.requestOpen("iakaframe");
    });
    await waitFor(() => expect(result.current.id).toBe("iakaframe"));
    act(() => result.current.requestClose()); // capture → null
    act(() => result.current.requestNew());
    await act(async () => {
      await result.current.saveAs("neuve2", "Neuve2");
    });
    const text = files.get("methods/neuve2")!;
    expect(text).toContain("Forgé par iakaFrameGUI");
    expect(text).not.toContain("methode-de-travail.md"); // pas le corps du frame ouvert avant.
  });
});
