/**
 * discovery.test.ts — critères d'acceptation **Q-3** pour la **découverte des modèles au nœud** et
 * la **règle de pré-remplissage du Binding par rôle** (§ 6 de l'instruction).
 *
 * Couvre, côté cœur pur : AC-Q3-1 (clé par rôle, jamais par nom), AC-Q3-2 (les 9 rôles canon,
 * `frame` inclus), AC-Q3-3 (déterminisme + priorité **motif > ordre de liste**), AC-Q3-4
 * (défensif, jamais d'exception), AC-Q3-6 (non-régression : `""` reste le défaut sûr) et le volet
 * cœur d'AC-Q3-9 (périmètre des nœuds). Le volet UI/flux vit dans `src/hooks/useForgeDeploy.test.ts`
 * et `src/components/LiaisonPanel.test.tsx`.
 *
 * Tous purs : aucune liste n'est fabriquée, aucun nœud réel n'est interrogé.
 */
import { describe, it, expect } from "vitest";
import {
  buildTeamFromRoster,
  CANONICAL_ROLE_KEYS,
  defaultBindingForNode,
  discoveryEndpointForNode,
  MODEL_DISCOVERY_NODES,
  MODEL_PATTERNS_BY_ROLE,
  NODE_KINDS,
  prefillBindingModels,
  prefilledBindingForNode,
  SPECIALIZED_MODEL_PATTERNS,
  suggestModelForRole,
  supportsModelDiscovery,
  type NodeKind,
  type Persona,
  type Team,
} from "../src/index";

/** Cas B de l'instruction (§ 6.3) : un nœud fourni, deux spécialisés + un généraliste. */
const CAS_B = ["qwen2.5-coder:7b", "qwen3-vl:8b", "qwen3:8b"];

/** Cas A de l'instruction (§ 6.3) : le poste du décideur — un seul modèle. */
const CAS_A = ["llama3.1:8b"];

function persona(id: string, name: string, roleKey: string, roleIndex = 0): Persona {
  return { id, name, roleKey, royaume: roleKey.toUpperCase(), roleIndex, skills: [], guardrails: [] };
}

function teamOf(personas: Persona[]): Team {
  return {
    id: "t",
    name: "T",
    vignetteTeam: "",
    coordinator: personas[0]?.id ?? "",
    personas,
    connectors: [],
  };
}

describe("Q-3 — table de motifs (§ 6.1)", () => {
  it("ne contient que des motifs spécialisés pour dev/qualite/design ; les 6 autres rôles n'en ont aucun", () => {
    expect(Object.keys(MODEL_PATTERNS_BY_ROLE).sort()).toEqual(["design", "dev", "qualite"]);
    for (const key of CANONICAL_ROLE_KEYS) {
      if (!["dev", "qualite", "design"].includes(key)) {
        expect(MODEL_PATTERNS_BY_ROLE[key]).toBeUndefined();
      }
    }
  });

  it("l'union des motifs est exactement { coder, code, vl, vision } — quatre FRAGMENTS, aucun nom de modèle", () => {
    expect([...SPECIALIZED_MODEL_PATTERNS].sort()).toEqual(["code", "coder", "vision", "vl"]);
    // Un motif est un fragment : ni tag (`:`), ni éditeur, ni version.
    for (const p of SPECIALIZED_MODEL_PATTERNS) {
      expect(p).toMatch(/^[a-z]+$/);
    }
  });
});

describe("AC-Q3-1 — clé par RÔLE, jamais par nom de persona", () => {
  it("deux personas de noms différents mais de même roleKey obtiennent le MÊME pré-remplissage", () => {
    const a = suggestModelForRole(CAS_B, "dev");
    const b = suggestModelForRole(CAS_B, "dev");
    expect(a).toBe(b);

    // Miroir de `frame.test.ts:168` : la persona renommée conserve son pré-remplissage.
    const team = teamOf([
      persona("gimli", "Gimli", "dev", 3),
      persona("bob", "Bob-le-dev", "dev", 3),
      persona("loki", "Loki", "design", 6),
    ]);
    const bound = prefilledBindingForNode(team, "ollama-localhost", CAS_B);
    const modelOf = (id: string) => bound.bindings.find((x) => x.personaId === id)?.model;
    expect(modelOf("gimli")).toBe("qwen2.5-coder:7b");
    expect(modelOf("bob")).toBe("qwen2.5-coder:7b"); // même rôle, autre nom → même modèle.
    expect(modelOf("loki")).toBe("qwen3-vl:8b"); // rôle différent → modèle différent.
  });

  it("renommer une persona (même roleKey, autre name/id) ne change pas le modèle proposé", () => {
    const avant = teamOf([persona("gimli", "Gimli", "dev", 3)]);
    const apres = teamOf([persona("forgeron", "Le Forgeron", "dev", 3)]);
    const ma = prefilledBindingForNode(avant, "ollama-localhost", CAS_B).bindings[0].model;
    const mb = prefilledBindingForNode(apres, "ollama-localhost", CAS_B).bindings[0].model;
    expect(mb).toBe(ma);
  });
});

describe("AC-Q3-2 — les 9 rôles canon sont couverts (frame inclus)", () => {
  it("pour chaque clé de CANONICAL_ROLE_KEYS, la règle rend un id APPARTENANT à la liste découverte", () => {
    expect(CANONICAL_ROLE_KEYS).toHaveLength(9);
    expect(CANONICAL_ROLE_KEYS).toContain("frame");
    for (const key of CANONICAL_ROLE_KEYS) {
      const proposed = suggestModelForRole(CAS_B, key);
      expect(proposed).not.toBe(""); // jamais vide sur liste non vide.
      expect(CAS_B).toContain(proposed); // jamais un id inventé.
    }
  });

  it("le roster canon complet (9 personas) est intégralement pré-rempli, aucune liaison vide", () => {
    const team = buildTeamFromRoster("Ma team", "ma-team");
    const bound = prefilledBindingForNode(team, "ollama-localhost", CAS_B);
    expect(bound.bindings).toHaveLength(9);
    for (const b of bound.bindings) {
      expect(CAS_B).toContain(b.model);
    }
  });

  it("cas A (§ 6.3) — un seul modèle au nœud : les 9 rôles le reçoivent (dégradation saine)", () => {
    for (const key of CANONICAL_ROLE_KEYS) {
      expect(suggestModelForRole(CAS_A, key)).toBe("llama3.1:8b");
    }
  });
});

describe("AC-Q3-3 — déterminisme de la règle (§ 6.2)", () => {
  it("cas B — dev/qualite → coder ; design → vl ; les 6 autres → défaut GÉNÉRALISTE (pas models[0])", () => {
    expect(suggestModelForRole(CAS_B, "dev")).toBe("qwen2.5-coder:7b");
    expect(suggestModelForRole(CAS_B, "qualite")).toBe("qwen2.5-coder:7b");
    expect(suggestModelForRole(CAS_B, "design")).toBe("qwen3-vl:8b");
    for (const key of ["portefeuille", "coordination", "cadrage", "deploiement", "documentation", "frame"]) {
      expect(suggestModelForRole(CAS_B, key)).toBe("qwen3:8b");
      expect(suggestModelForRole(CAS_B, key)).not.toBe(CAS_B[0]); // ⑤ ≠ premier de liste.
    }
  });

  it("priorité MOTIF > ORDRE DE LISTE : un id contenant `code` précède un id contenant `coder`, et `coder` gagne", () => {
    const models = ["deepseek-code:6b", "qwen2.5-coder:7b", "qwen3:8b"];
    expect(models[0]).toContain("code");
    expect(models[0]).not.toContain("coder"); // le plus large est bien EN PREMIER dans la liste.
    expect(suggestModelForRole(models, "dev")).toBe("qwen2.5-coder:7b");
    expect(suggestModelForRole(models, "qualite")).toBe("qwen2.5-coder:7b");
  });

  it("de même pour design : un id contenant `vision` précède un id contenant `vl`, et `vl` gagne", () => {
    const models = ["some-vision:3b", "qwen3-vl:8b", "qwen3:8b"];
    expect(suggestModelForRole(models, "design")).toBe("qwen3-vl:8b");
  });

  it("plusieurs ids pour un même motif → le PREMIER dans l'ordre rendu par le nœud (④)", () => {
    const models = ["a-coder:1b", "b-coder:2b", "generaliste:1b"];
    expect(suggestModelForRole(models, "dev")).toBe("a-coder:1b");
    // Ordre inversé au nœud → l'autre gagne : aucun tri, aucun score caché.
    expect(suggestModelForRole(["b-coder:2b", "a-coder:1b", "generaliste:1b"], "dev")).toBe("b-coder:2b");
  });

  it("casse ignorée : la comparaison se fait en minuscules, l'id est rendu VERBATIM (②)", () => {
    const models = ["Qwen2.5-CODER:7b", "Qwen3:8b"];
    expect(suggestModelForRole(models, "dev")).toBe("Qwen2.5-CODER:7b");
    expect(suggestModelForRole(models, "cadrage")).toBe("Qwen3:8b");
  });

  it("tous les modèles sont spécialisés → défaut = models[0] (⑤, seconde branche)", () => {
    const models = ["qwen2.5-coder:7b", "qwen3-vl:8b"];
    expect(suggestModelForRole(models, "documentation")).toBe("qwen2.5-coder:7b");
  });

  it("la règle est déterministe : 20 appels identiques rendent le même id", () => {
    const runs = new Set(Array.from({ length: 20 }, () => suggestModelForRole(CAS_B, "frame")));
    expect([...runs]).toEqual(["qwen3:8b"]);
  });
});

describe("AC-Q3-4 — défensif : jamais d'exception, liste vide → \"\"", () => {
  it("liste vide → \"\" (①, chemin d'échec du § 5.3)", () => {
    expect(suggestModelForRole([], "dev")).toBe("");
    expect(suggestModelForRole(null, "dev")).toBe("");
    expect(suggestModelForRole(undefined, "dev")).toBe("");
  });

  it("roleKey inconnu / vide / non-string → rôle sans motif (⑥ → ⑤), aucune exception", () => {
    for (const bad of ["role-inexistant", "", "   ", null, undefined, 42, {}, [], true]) {
      expect(() => suggestModelForRole(CAS_B, bad)).not.toThrow();
      expect(suggestModelForRole(CAS_B, bad)).toBe("qwen3:8b"); // défaut généraliste.
    }
  });

  it("entrées vides / non-string dans models → écartées, aucune exception", () => {
    const sale = ["", "   ", null, 7, "qwen3:8b", undefined, "qwen2.5-coder:7b"] as unknown as string[];
    expect(() => suggestModelForRole(sale, "dev")).not.toThrow();
    expect(suggestModelForRole(sale, "dev")).toBe("qwen2.5-coder:7b");
    expect(suggestModelForRole(sale, "documentation")).toBe("qwen3:8b");
    // Une liste ne contenant AUCUN candidat exploitable équivaut à une liste vide.
    expect(suggestModelForRole(["", "  "], "dev")).toBe("");
  });

  it("roleKey canon en casse inhabituelle reste reconnu", () => {
    expect(suggestModelForRole(CAS_B, "DEV")).toBe("qwen2.5-coder:7b");
    expect(suggestModelForRole(CAS_B, " Design ")).toBe("qwen3-vl:8b");
  });
});

describe("AC-Q3-6 — non-régression : `\"\"` reste le défaut sûr", () => {
  it("defaultBindingForNode pose TOUJOURS model:\"\" sur les 5 nœuds (inchangé)", () => {
    const team = buildTeamFromRoster("Ma team", "ma-team");
    for (const node of NODE_KINDS) {
      const b = defaultBindingForNode(team, node);
      expect(b.bindings.every((x) => x.model === "")).toBe(true);
    }
  });

  it("découverte en échec (liste vide) → Binding rendu INCHANGÉ, model:\"\" partout", () => {
    const team = buildTeamFromRoster("Ma team", "ma-team");
    const base = defaultBindingForNode(team, "ollama-localhost");
    expect(prefillBindingModels(base, team, [])).toEqual(base);
    expect(prefillBindingModels(base, team, null)).toEqual(base);
    expect(prefilledBindingForNode(team, "ollama-localhost", []).bindings.every((b) => b.model === "")).toBe(true);
  });

  it("claude et codex ne sont JAMAIS pré-remplis, même si une liste est fournie", () => {
    const team = buildTeamFromRoster("Ma team", "ma-team");
    for (const node of ["claude", "codex"] as NodeKind[]) {
      const bound = prefilledBindingForNode(team, node, CAS_B);
      expect(bound.bindings.every((b) => b.model === "")).toBe(true);
    }
  });

  it("le pré-remplissage n'écrase JAMAIS une saisie de l'utilisateur", () => {
    const team = buildTeamFromRoster("Ma team", "ma-team");
    const base = defaultBindingForNode(team, "ollama-localhost");
    const pid = base.bindings[0].personaId;
    const edited = {
      ...base,
      bindings: base.bindings.map((b) => (b.personaId === pid ? { ...b, model: "choix-humain" } : b)),
    };
    const after = prefillBindingModels(edited, team, CAS_B);
    expect(after.bindings.find((b) => b.personaId === pid)?.model).toBe("choix-humain");
    expect(after.bindings.filter((b) => b.personaId !== pid).every((b) => b.model !== "")).toBe(true);
  });

  it("aucun champ n'est ajouté au schéma PersonaBinding (clés inchangées)", () => {
    const team = buildTeamFromRoster("Ma team", "ma-team");
    const bound = prefilledBindingForNode(team, "ollama-localhost", CAS_B);
    for (const b of bound.bindings) {
      expect(Object.keys(b).sort()).toEqual(["model", "personaId", "runner", "tools"]);
    }
    expect(Object.keys(bound).sort()).toEqual(["bindings", "id", "node", "origin", "teamId"]);
    expect(bound.origin).toBe("forge-default");
  });
});

describe("AC-Q3-9 (volet cœur) — périmètre des nœuds", () => {
  it("découverte EXACTEMENT pour ollama-localhost / ollama-lan / openwebui, jamais claude ni codex", () => {
    const dans = NODE_KINDS.filter((n) => supportsModelDiscovery(n));
    expect([...dans].sort()).toEqual(["ollama-lan", "ollama-localhost", "openwebui"]);
    expect([...MODEL_DISCOVERY_NODES].sort()).toEqual([...dans].sort());
    expect(supportsModelDiscovery("claude")).toBe(false);
    expect(supportsModelDiscovery("codex")).toBe(false);
    expect(supportsModelDiscovery("n-importe-quoi")).toBe(false);
    expect(supportsModelDiscovery(null)).toBe(false);
  });

  it("l'hôte interrogé suit le § 5.2 ; `null` = rien à interroger", () => {
    expect(discoveryEndpointForNode("ollama-localhost")).toBe("http://localhost:11434");
    expect(discoveryEndpointForNode("openwebui")).toBe("http://localhost:11434");
    expect(discoveryEndpointForNode("claude")).toBeNull();
    expect(discoveryEndpointForNode("codex")).toBeNull();
    // ollama-lan : le lanHost saisi, toléré en host nu / host:port / URL complète.
    expect(discoveryEndpointForNode("ollama-lan", "192.168.2.11")).toBe("http://192.168.2.11:11434");
    expect(discoveryEndpointForNode("ollama-lan", "192.168.2.11:4000")).toBe("http://192.168.2.11:4000");
    expect(discoveryEndpointForNode("ollama-lan", "http://192.168.2.11:11434/")).toBe("http://192.168.2.11:11434");
    // Host LAN non saisi → rien à interroger (aucun appel à l'aveuglette).
    expect(discoveryEndpointForNode("ollama-lan")).toBeNull();
    expect(discoveryEndpointForNode("ollama-lan", "   ")).toBeNull();
  });
});
