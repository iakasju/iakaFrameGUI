/**
 * useForgeDeploy.discovery.test.ts — critères d'acceptation **Q-3** côté **flux** : découverte des
 * modèles AU NŒUD à l'activation de la liaison, pré-remplissage par rôle, et **chemin d'échec
 * unique**.
 *
 * Couvre : AC-Q3-5 (les 3 échecs de `llm_models` produisent le MÊME état), AC-Q3-8 (confirmation
 * explicite : rien tant que « Lier ce kit » n'est pas coché ; décocher efface), AC-Q3-9 (périmètre
 * des 5 nœuds, en comptant les appels à `llmModels`), AC-Q3-10 (la découverte passe EXCLUSIVEMENT
 * par `llmModels`) et AC-Q3-12 (rien de neuf n'est persisté).
 *
 * Fichier **nouveau** : `useForgeDeploy.test.ts` n'est pas touché (non-régression).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { buildTeamFromRoster, NODE_KINDS, type NodeKind, type Team } from "@iakaframe/core";
import {
  useForgeDeploy,
  DISCOVERY_EMPTY_REASON,
  DISCOVERY_NO_HOST_REASON,
  DISCOVERY_UNAVAILABLE_REASON,
} from "./useForgeDeploy";
import type { Backend, LlmModelsResult } from "../api/backend";

/** Les **trois** aveux réels de `llm_models` (`llm.rs:633`, `:662`, `:673`), verbatim. */
const REASON_HOST_REFUSED =
  "hote refuse (hors allow-list localhost + endpoint regle) : http://192.168.2.11:11434";
const REASON_UNREACHABLE =
  "modeles indisponibles (endpoint injoignable) : error sending request";
const REASON_NO_MODEL = "aucun modele expose par la source";

const CAS_B = ["qwen2.5-coder:7b", "qwen3-vl:8b", "qwen3:8b"];

interface Spy {
  api: Backend;
  /** Endpoints passés à `llmModels` — sert à compter les déclenchements de découverte. */
  discoveryCalls: string[];
  /** Toutes les commandes façade appelées (garde AC-Q3-10 / AC-Q3-12). */
  commandCalls: string[];
  deployCalls: Array<{ destDir: string; files: Record<string, string>; force: boolean }>;
}

function spyBackend(models?: (endpoint: string) => LlmModelsResult): Spy {
  const discoveryCalls: string[] = [];
  const commandCalls: string[] = [];
  const deployCalls: Spy["deployCalls"] = [];
  const api = {
    call: async () => undefined as never,
    isTauri: () => false,
    teamList: async () => [],
    teamRead: async () => null,
    teamWrite: async () => {},
    teamDelete: async () => {},
    workspacePath: async () => "/tmp/ws",
    kitDeploy: async (destDir: string, files: Record<string, string>, force = false) => {
      commandCalls.push("kitDeploy");
      deployCalls.push({ destDir, files, force });
      return Object.keys(files);
    },
    pickDirectory: async () => {
      commandCalls.push("pickDirectory");
      return "/tmp/picked";
    },
    llmModels: async (endpoint: string): Promise<LlmModelsResult> => {
      commandCalls.push("llmModels");
      discoveryCalls.push(endpoint);
      return models ? models(endpoint) : { models: [] };
    },
  } as unknown as Backend;
  return { api, discoveryCalls, commandCalls, deployCalls };
}

function makeTeamById(team: Team): (id: string) => Team | null {
  return (id: string) => (id === team.id ? team : null);
}

/** Monte le hook, choisit la team + le nœud, coche « Lier ce kit » et attend la découverte. */
async function lier(spy: Spy, team: Team, node: NodeKind, lanHost?: string) {
  const { result } = renderHook(() =>
    useForgeDeploy({ api: spy.api, teamById: makeTeamById(team) }),
  );
  act(() => result.current.selectTeam(team.id));
  act(() => result.current.selectNode(node));
  if (lanHost !== undefined) act(() => result.current.setLanHost(lanHost));
  await act(async () => {
    result.current.enableBinding();
  });
  return result;
}

describe("Q-3 — découverte au nœud & pré-remplissage (flux)", () => {
  let team: Team;

  beforeEach(() => {
    localStorage.clear();
    team = buildTeamFromRoster("Ma team", "ma-team");
  });

  it("cocher « Lier ce kit » interroge le nœud UNE fois et pré-remplit par rôle (§ 5.1, § 6)", async () => {
    const spy = spyBackend(() => ({ models: CAS_B }));
    const result = await lier(spy, team, "ollama-localhost");

    expect(spy.discoveryCalls).toEqual(["http://localhost:11434"]);
    expect(result.current.discoveredModels).toEqual(CAS_B);
    expect(result.current.discoveryReason).toBeNull();

    const modelOfRole = (roleKey: string) => {
      const p = team.personas.find((x) => x.roleKey === roleKey);
      return result.current.binding?.bindings.find((b) => b.personaId === p?.id)?.model;
    };
    expect(modelOfRole("dev")).toBe("qwen2.5-coder:7b");
    expect(modelOfRole("qualite")).toBe("qwen2.5-coder:7b");
    expect(modelOfRole("design")).toBe("qwen3-vl:8b");
    expect(modelOfRole("frame")).toBe("qwen3:8b");
    expect(modelOfRole("documentation")).toBe("qwen3:8b");
  });

  it("AC-Q3-9 — la découverte part EXACTEMENT pour les 3 nœuds Ollama, jamais claude ni codex", async () => {
    const attendu: Record<NodeKind, number> = {
      claude: 0,
      codex: 0,
      "ollama-localhost": 1,
      "ollama-lan": 1,
      openwebui: 1,
    };
    expect(NODE_KINDS).toHaveLength(5);
    for (const node of NODE_KINDS) {
      const spy = spyBackend(() => ({ models: CAS_B }));
      await lier(spy, team, node, node === "ollama-lan" ? "192.168.2.11" : undefined);
      expect(spy.discoveryCalls).toHaveLength(attendu[node]);
    }
  });

  it("AC-Q3-9 — claude/codex : aucun appel, aucun pré-remplissage, `model:\"\"` conservé", async () => {
    for (const node of ["claude", "codex"] as NodeKind[]) {
      const spy = spyBackend(() => ({ models: CAS_B }));
      const result = await lier(spy, team, node);
      expect(spy.discoveryCalls).toHaveLength(0);
      expect(result.current.discoveredModels).toEqual([]);
      expect(result.current.binding!.bindings.every((b) => b.model === "")).toBe(true);
    }
  });

  it("AC-Q3-9 — ollama-lan interroge le lanHost saisi (soumis à la garde d'hôte Rust, non modifiée)", async () => {
    const spy = spyBackend(() => ({ models: [], reason: REASON_HOST_REFUSED }));
    await lier(spy, team, "ollama-lan", "192.168.2.11");
    expect(spy.discoveryCalls).toEqual(["http://192.168.2.11:11434"]);
  });

  it("AC-Q3-5 — les TROIS échecs de `llm_models` produisent le MÊME état visible", async () => {
    const etats = [];
    for (const reason of [REASON_HOST_REFUSED, REASON_UNREACHABLE, REASON_NO_MODEL]) {
      const spy = spyBackend(() => ({ models: [], reason }));
      const result = await lier(spy, team, "ollama-localhost");
      etats.push({
        models: result.current.discoveredModels,
        reason: result.current.discoveryReason,
        discovering: result.current.discovering,
        // Le modèle pré-rempli est `""` pour TOUTES les personas — défaut sûr.
        tousVides: result.current.binding!.bindings.every((b) => b.model === ""),
      });
    }
    // Même forme d'état pour les trois : liste vide, aucun modèle posé, découverte terminée.
    for (const [i, e] of etats.entries()) {
      expect(e.models).toEqual([]); // jamais une fausse liste.
      expect(e.tousVides).toBe(true);
      expect(e.discovering).toBe(false);
      // La raison du nœud est conservée VERBATIM (aveu honnête, jamais masqué ni reformulé).
      expect(e.reason).toBe([REASON_HOST_REFUSED, REASON_UNREACHABLE, REASON_NO_MODEL][i]);
    }
    // Les trois états ne diffèrent QUE par le texte de l'aveu.
    expect(new Set(etats.map((e) => JSON.stringify({ ...e, reason: null })))).toHaveProperty("size", 1);
  });

  it("AC-Q3-5 — la façade qui REJETTE (hors Tauri) converge sur le même état", async () => {
    const spy = spyBackend(() => {
      throw new Error("BACKEND_UNAVAILABLE");
    });
    const result = await lier(spy, team, "ollama-localhost");
    expect(result.current.discoveredModels).toEqual([]);
    expect(result.current.discoveryReason).toBe(DISCOVERY_UNAVAILABLE_REASON);
    expect(result.current.binding!.bindings.every((b) => b.model === "")).toBe(true);
    expect(result.current.discovering).toBe(false);
  });

  it("AC-Q3-5 — nœud répondant sans modèle ni raison → aveu de repli, jamais une liste vide silencieuse", async () => {
    const spy = spyBackend(() => ({ models: [] }));
    const result = await lier(spy, team, "openwebui");
    expect(result.current.discoveryReason).toBe(DISCOVERY_EMPTY_REASON);
  });

  it("AC-Q3-5 — ollama-lan sans host : aucun appel à l'aveuglette, mais un aveu quand même", async () => {
    const spy = spyBackend(() => ({ models: CAS_B }));
    const result = await lier(spy, team, "ollama-lan", "");
    expect(spy.discoveryCalls).toHaveLength(0);
    expect(result.current.discoveryReason).toBe(DISCOVERY_NO_HOST_REASON);
    expect(result.current.binding!.bindings.every((b) => b.model === "")).toBe(true);
  });

  it("AC-Q3-8 — tant que « Lier ce kit » n'est pas coché : binding null, aucune découverte, aucun binding.json", async () => {
    const spy = spyBackend(() => ({ models: CAS_B }));
    const { result } = renderHook(() =>
      useForgeDeploy({ api: spy.api, teamById: makeTeamById(team) }),
    );
    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("ollama-localhost"));
    expect(result.current.binding).toBeNull();
    expect(spy.discoveryCalls).toHaveLength(0);

    act(() => result.current.generate());
    act(() => result.current.setDestDir("/tmp/cible"));
    await act(async () => {
      await result.current.deploy();
    });
    expect(spy.deployCalls[0].files["binding.json"]).toBeUndefined();
  });

  it("AC-Q3-8 — décocher efface le binding ET la découverte (retour au kit pur)", async () => {
    const spy = spyBackend(() => ({ models: CAS_B }));
    const result = await lier(spy, team, "ollama-localhost");
    expect(result.current.binding).not.toBeNull();
    expect(result.current.discoveredModels).toEqual(CAS_B);

    act(() => result.current.clearBinding());
    expect(result.current.binding).toBeNull();
    expect(result.current.discoveredModels).toEqual([]);
    expect(result.current.discoveryReason).toBeNull();
  });

  it("AC-Q3-8 — les champs pré-remplis restent ÉDITABLES (la saisie prime sur la proposition)", async () => {
    const spy = spyBackend(() => ({ models: CAS_B }));
    const result = await lier(spy, team, "ollama-localhost");
    const dev = team.personas.find((p) => p.roleKey === "dev")!;
    expect(result.current.binding!.bindings.find((b) => b.personaId === dev.id)!.model).toBe(
      "qwen2.5-coder:7b",
    );
    act(() => result.current.setPersonaModel(dev.id, "mon-choix-a-moi"));
    expect(result.current.binding!.bindings.find((b) => b.personaId === dev.id)!.model).toBe(
      "mon-choix-a-moi",
    );
  });

  it("changer de nœud réinitialise binding ET découverte (le kit lié n'est jamais périmé)", async () => {
    const spy = spyBackend(() => ({ models: CAS_B }));
    const result = await lier(spy, team, "ollama-localhost");
    expect(result.current.discoveredModels).toEqual(CAS_B);
    act(() => result.current.selectNode("claude"));
    expect(result.current.binding).toBeNull();
    expect(result.current.discoveredModels).toEqual([]);
  });

  it("AC-Q3-10 / AC-Q3-12 — la découverte n'appelle QUE `llmModels` ; rien n'est persisté", async () => {
    const spy = spyBackend(() => ({ models: CAS_B }));
    const before = { ...localStorage };
    await lier(spy, team, "ollama-localhost");
    // Une seule commande façade sur tout le chemin de liaison : la découverte existante.
    expect(spy.commandCalls).toEqual(["llmModels"]);
    // Aucune écriture de réglage (`setAuthoring*`, `setProjectDir`, …) ni de cache.
    expect(spy.commandCalls.some((c) => c.startsWith("set"))).toBe(false);
    // `localStorage` ne gagne aucune clé de modèles/découverte (seul `node` du flux existant bouge).
    const after = Object.keys(localStorage);
    expect(after.filter((k) => !Object.keys(before).includes(k))).toEqual([
      "iakaframegui.deploy.node",
    ]);
    expect(after.some((k) => /model|discover/i.test(k))).toBe(false);
  });

  it("une réponse TARDIVE ne pollue pas un autre (team, nœud) — jeton de course", async () => {
    let resolve!: (v: LlmModelsResult) => void;
    const api = {
      call: async () => undefined as never,
      isTauri: () => false,
      teamList: async () => [],
      workspacePath: async () => "/tmp/ws",
      kitDeploy: async () => [],
      pickDirectory: async () => null,
      llmModels: () => new Promise<LlmModelsResult>((r) => (resolve = r)),
    } as unknown as Backend;
    const { result } = renderHook(() =>
      useForgeDeploy({ api, teamById: makeTeamById(team) }),
    );
    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("ollama-localhost"));
    act(() => result.current.enableBinding());
    // L'utilisateur change de nœud AVANT que le nœud ne réponde.
    act(() => result.current.selectNode("claude"));
    await act(async () => {
      resolve({ models: CAS_B });
    });
    expect(result.current.binding).toBeNull();
    expect(result.current.discoveredModels).toEqual([]);
  });

  it("le pré-remplissage n'écrase pas une frappe survenue PENDANT la découverte", async () => {
    let resolve!: (v: LlmModelsResult) => void;
    const api = {
      call: async () => undefined as never,
      isTauri: () => false,
      teamList: async () => [],
      workspacePath: async () => "/tmp/ws",
      kitDeploy: async () => [],
      pickDirectory: async () => null,
      llmModels: () => new Promise<LlmModelsResult>((r) => (resolve = r)),
    } as unknown as Backend;
    const { result } = renderHook(() =>
      useForgeDeploy({ api, teamById: makeTeamById(team) }),
    );
    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("ollama-localhost"));
    act(() => result.current.enableBinding());
    const dev = team.personas.find((p) => p.roleKey === "dev")!;
    act(() => result.current.setPersonaModel(dev.id, "saisi-a-la-main"));
    await act(async () => {
      resolve({ models: CAS_B });
    });
    expect(result.current.binding!.bindings.find((b) => b.personaId === dev.id)!.model).toBe(
      "saisi-a-la-main",
    );
    // Les autres personas, elles, ont bien été pourvues.
    const design = team.personas.find((p) => p.roleKey === "design")!;
    expect(result.current.binding!.bindings.find((b) => b.personaId === design.id)!.model).toBe(
      "qwen3-vl:8b",
    );
  });

  it("la liste découverte est RELUE à chaque activation (aucun cache, § 5.1)", async () => {
    const spy = spyBackend(() => ({ models: CAS_B }));
    const { result } = renderHook(() =>
      useForgeDeploy({ api: spy.api, teamById: makeTeamById(team) }),
    );
    act(() => result.current.selectTeam("ma-team"));
    act(() => result.current.selectNode("ollama-localhost"));
    await act(async () => {
      result.current.enableBinding();
    });
    act(() => result.current.clearBinding());
    await act(async () => {
      result.current.enableBinding();
    });
    expect(spy.discoveryCalls).toHaveLength(2);
  });

  it("le binding pré-rempli arrive intact dans `binding.json` (modèle du nœud, zéro credential)", async () => {
    const spy = spyBackend(() => ({ models: CAS_B }));
    const result = await lier(spy, team, "ollama-localhost");
    act(() => result.current.generate());
    act(() => result.current.setDestDir("/tmp/cible"));
    await act(async () => {
      await result.current.deploy();
    });
    const written = spy.deployCalls[0].files["binding.json"];
    expect(written).toBeDefined();
    const parsed = JSON.parse(written) as { bindings: { model: string }[] };
    expect(parsed.bindings.every((b) => CAS_B.includes(b.model))).toBe(true);
    expect(written).not.toMatch(/token|apiKey|password/i);
  });
});
