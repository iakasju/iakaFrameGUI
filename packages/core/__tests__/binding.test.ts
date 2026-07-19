/**
 * binding.test.ts — critères d'acceptation **P7** pour le **Binding** (E1) et l'**émission
 * conditionnelle du modèle** par les adaptateurs.
 *
 * Couvre : B-1 (schéma + défaut par nœud + parseurs défensifs + zéro credential),
 * B-2 (renfort : sans binding → arbre byte-identique au pur), B-3 (avec binding → modèle au bon
 * endroit), B-4 (binding « tout vide » ≡ kit pur), B-5 (renfort : le modèle vient du Binding,
 * jamais de la Team). La garde « Team pure » elle-même vit au niveau définition
 * (`persona.test.ts` / `team.test.ts`, AR-1) — non dupliquée ici.
 *
 * Tous purs : inspection d'arbre en mémoire, sans nœud réel.
 */
import { describe, it, expect } from "vitest";
import {
  buildTeamFromRoster,
  defaultBindingForNode,
  defaultRunnerForNode,
  parseBinding,
  parseBindingText,
  parsePersonaBinding,
  parseTools,
  modelForPersona,
  serializeBinding,
  generateClaudeCodeKit,
  generateCodexKit,
  generateOpenWebUIKit,
  NODE_KINDS,
  type Binding,
  type PersonaBinding,
  type Team,
} from "../src/index";

function gabaritTeam(): Team {
  return buildTeamFromRoster("Gabarit", "gabarit");
}

/** Construit un binding en fixant le même modèle sur toutes les personas (helper de test). */
function bindingWithModel(team: Team, node: Binding["node"], model: string): Binding {
  const base = defaultBindingForNode(team, node);
  return { ...base, bindings: base.bindings.map((b) => ({ ...b, model })) };
}

describe("B-1 — schéma Binding + défaut par nœud exportés", () => {
  it("defaultRunnerForNode : modèle persona — claude→claude, codex host-isé→chatgpt, ollama-*/openwebui alignés", () => {
    expect(defaultRunnerForNode("claude")).toBe("claude");
    // codex = host (host-isé, § 6.1/6.2) → sort du plan runner : défaut chatgpt (côté OpenAI).
    expect(defaultRunnerForNode("codex")).toBe("chatgpt");
    expect(defaultRunnerForNode("ollama-localhost")).toBe("ollama-local");
    expect(defaultRunnerForNode("ollama-lan")).toBe("ollama-distant");
    expect(defaultRunnerForNode("openwebui")).toBe("ollama-local");
  });

  it("defaultBindingForNode couvre chaque nœud : une liaison par persona, model vide", () => {
    const team = gabaritTeam();
    for (const node of NODE_KINDS) {
      const b = defaultBindingForNode(team, node);
      expect(b.node).toBe(node);
      expect(b.teamId).toBe(team.id);
      expect(b.origin).toBe("forge-default");
      expect(b.bindings).toHaveLength(team.personas.length);
      for (const pb of b.bindings) {
        expect(pb.model).toBe(""); // à compléter par l'utilisateur (Q-3).
        expect(pb.runner).toBe(defaultRunnerForNode(node));
      }
      // Les personaId du binding = ceux de la team.
      expect(b.bindings.map((pb) => pb.personaId).sort()).toEqual(
        team.personas.map((p) => p.id).sort(),
      );
    }
  });

  it("claude : toutes les personas ont model:'' (pas d'émission → équivalent au pur)", () => {
    const b = defaultBindingForNode(gabaritTeam(), "claude");
    expect(b.bindings.every((pb) => pb.model === "")).toBe(true);
  });
});

describe("B-1 — parseurs défensifs (jamais d'exception) + zéro credential", () => {
  it("parsePersonaBinding : record invalide → null ; runner inconnu → null", () => {
    expect(parsePersonaBinding(null)).toBeNull();
    expect(parsePersonaBinding({})).toBeNull();
    expect(parsePersonaBinding({ personaId: "", runner: "ollama" })).toBeNull();
    expect(parsePersonaBinding({ personaId: "x", runner: "inconnu" })).toBeNull();
    expect(
      parsePersonaBinding({ personaId: "x", runner: "ollama", model: 42 }),
    ).toEqual({ personaId: "x", runner: "ollama-local", model: "", tools: [] }); // ollama→ollama-local (§ 6.1)
  });

  it("parsePersonaBinding : alias de runner résolu (ps→claude, renommage § 6.1)", () => {
    expect(parsePersonaBinding({ personaId: "x", runner: "ps" })).toEqual({
      personaId: "x",
      runner: "claude",
      model: "",
      tools: [],
    });
  });

  it("parseBinding : filtre les liaisons invalides, replie origin, valide node", () => {
    const b = parseBinding({
      id: "b1",
      teamId: "t1",
      node: "claude",
      origin: "n'importe quoi",
      bindings: [
        { personaId: "a", runner: "claude-code", model: "sonnet" },
        { personaId: "b", runner: "inconnu" }, // filtrée
        "pas un objet", // filtrée
      ],
    });
    expect(b).not.toBeNull();
    expect(b!.origin).toBe("forge-default"); // origin invalide → défaut.
    expect(b!.bindings).toHaveLength(1);
    expect(b!.bindings[0].personaId).toBe("a");
  });

  it("parseBinding : id/teamId manquants ou node invalide → null", () => {
    expect(parseBinding({ teamId: "t", node: "claude" })).toBeNull();
    expect(parseBinding({ id: "b", node: "claude" })).toBeNull();
    expect(parseBinding({ id: "b", teamId: "t", node: "pas-un-noeud" })).toBeNull();
  });

  it("parseBindingText : texte illisible → null (jamais d'exception)", () => {
    expect(parseBindingText("{pas du json")).toBeNull();
    expect(parseBindingText("")).toBeNull();
    expect(parseBindingText(null)).toBeNull();
  });

  it("aucun credential ne survit au parse (token/apiKey/password ignorés)", () => {
    const b = parseBinding({
      id: "b",
      teamId: "t",
      node: "openwebui",
      token: "secret-xyz",
      apiKey: "sk-123",
      bindings: [
        {
          personaId: "a",
          runner: "ollama",
          model: "qwen",
          password: "hunter2",
          apiKey: "sk-abc",
        },
      ],
    });
    const json = serializeBinding(b!);
    expect(json).not.toMatch(/secret-xyz|sk-123|sk-abc|hunter2/);
    expect(json).not.toMatch(/token|apiKey|password/i);
  });
});

describe("B1 — tools par persona (triplet runner/model/tools, § 5.1)", () => {
  it("parseTools : défensif — non-tableau → [] ; items non-string filtrés ; trim ; ids vides écartés", () => {
    expect(parseTools(undefined)).toEqual([]);
    expect(parseTools("comfyui-local")).toEqual([]); // non-tableau
    expect(parseTools(42)).toEqual([]);
    expect(parseTools(["comfyui-local", 7, null, "  a  ", "", "  "])).toEqual([
      "comfyui-local",
      "a",
    ]);
  });

  it("parsePersonaBinding : tools portés + défensifs (jamais d'exception)", () => {
    expect(
      parsePersonaBinding({
        personaId: "loki",
        runner: "chatgpt",
        model: "gpt-*",
        tools: ["comfyui-local", 42, "  x  "],
      }),
    ).toEqual({
      personaId: "loki",
      runner: "chatgpt",
      model: "gpt-*",
      tools: ["comfyui-local", "x"],
    });
    // tools absent → [] ; tools invalide → [] (byte-équivalent au binding sans tools).
    expect(parsePersonaBinding({ personaId: "x", runner: "claude" })!.tools).toEqual([]);
    expect(
      parsePersonaBinding({ personaId: "x", runner: "claude", tools: "nope" })!.tools,
    ).toEqual([]);
  });

  it("defaultBindingForNode : chaque liaison porte tools:[] (défaut)", () => {
    const b = defaultBindingForNode(gabaritTeam(), "claude");
    expect(b.bindings.every((pb) => Array.isArray(pb.tools) && pb.tools.length === 0)).toBe(
      true,
    );
  });

  it("serializeBinding : round-trip parse∘serialize stable avec tools (aucun credential)", () => {
    const team = gabaritTeam();
    const base = defaultBindingForNode(team, "claude");
    const withTools: Binding = {
      ...base,
      bindings: base.bindings.map((b, i) =>
        i === 0 ? { ...b, tools: ["comfyui-local"] } : b,
      ),
    };
    const json = serializeBinding(withTools);
    const round = parseBindingText(json);
    expect(round).not.toBeNull();
    expect(round!.bindings[0].tools).toEqual(["comfyui-local"]);
    // Stable : re-sérialiser le parse redonne le même texte.
    expect(serializeBinding(round!)).toBe(json);
  });

  it("un persona sur litellm + un model → binding valide (litellm = runner, pas host)", () => {
    const pb = parsePersonaBinding({
      personaId: "gimli",
      runner: "litellm",
      model: "qwen 3.6",
    });
    expect(pb).toEqual({
      personaId: "gimli",
      runner: "litellm",
      model: "qwen 3.6",
      tools: [],
    });
  });
});

describe("B1 — illustration d'acceptation : team iakaframe multi-runner + tools (§ 9)", () => {
  it("odin=claude/fable, legolas=claude/haiku, gimli=ollama-distant/qwen 3.6, loki=chatgpt/gpt-* + comfyui-local", () => {
    // Le node = HOST claude ; l'enforcement reste au host, quel que soit le runner de chaque persona.
    const overrides: Record<string, Omit<PersonaBinding, "personaId">> = {
      odin: { runner: "claude", model: "fable", tools: [] },
      legolas: { runner: "claude", model: "haiku", tools: [] },
      gimli: { runner: "ollama-distant", model: "qwen 3.6", tools: [] },
      loki: { runner: "chatgpt", model: "gpt-*", tools: ["comfyui-local"] },
    };

    const team = buildTeamFromRoster("iakaframe", "iakaframe");
    const base = defaultBindingForNode(team, "claude");
    const binding: Binding = {
      ...base,
      id: "iakaframe@claude",
      bindings: base.bindings.map((b) => {
        const o = overrides[b.personaId];
        return o ? { ...b, ...o } : b;
      }),
    };

    // Round-trip par la porte stricte : le binding illustré est VALIDE (aucune liaison jetée).
    const parsed = parseBindingText(serializeBinding(binding));
    expect(parsed).not.toBeNull();
    expect(parsed!.node).toBe("claude"); // le HOST où vit l'enforcement.

    const by = (id: string): PersonaBinding =>
      parsed!.bindings.find((b) => b.personaId === id)!;

    // Chaque persona porte runner + model + tools (le triplet du modèle persona).
    expect(by("odin")).toMatchObject({ runner: "claude", model: "fable", tools: [] });
    expect(by("legolas")).toMatchObject({ runner: "claude", model: "haiku", tools: [] });
    expect(by("gimli")).toMatchObject({
      runner: "ollama-distant",
      model: "qwen 3.6",
      tools: [],
    });
    expect(by("loki")).toMatchObject({
      runner: "chatgpt",
      model: "gpt-*",
      tools: ["comfyui-local"],
    });

    // gimli sur Ollama distant et loki sur ChatGPT sont des CIBLES d'exécution : aucun n'est un host.
    expect(by("gimli").runner).not.toBe("codex");
    expect(by("loki").runner).not.toBe("codex");
  });
});

describe("B-2 (renfort) — sans binding, l'arbre reste byte-identique au pur", () => {
  it("claude : generate(team) ≡ generate(team, {}) (option binding absente)", () => {
    const team = gabaritTeam();
    expect(JSON.stringify(generateClaudeCodeKit(team, {}))).toBe(
      JSON.stringify(generateClaudeCodeKit(team)),
    );
  });

  it("les frontmatters subagents n'ont AUCUNE ligne model sans binding", () => {
    const tree = generateClaudeCodeKit(gabaritTeam());
    for (const [path, content] of Object.entries(tree.files)) {
      if (path.startsWith(".claude/agents/")) {
        expect(content).not.toMatch(/\nmodel:/);
      }
    }
  });

  it("openwebui : base_model_id vide sans binding ; codex : pas de section moteur", () => {
    for (const content of Object.values(generateOpenWebUIKit(gabaritTeam()).files)) {
      expect(JSON.parse(content).base_model_id).toBe("");
    }
    expect(generateCodexKit(gabaritTeam()).files["AGENTS.md"]).not.toContain(
      "Moteur par persona",
    );
  });
});

describe("B-4 — binding « tout vide » ≡ kit pur (aucune émission)", () => {
  it("claude : binding tous model:'' → arbre identique au pur", () => {
    const team = gabaritTeam();
    const empty = defaultBindingForNode(team, "claude");
    expect(JSON.stringify(generateClaudeCodeKit(team, { binding: empty }))).toBe(
      JSON.stringify(generateClaudeCodeKit(team)),
    );
  });

  it("openwebui : binding tous model:'' → arbre identique au pur", () => {
    const team = gabaritTeam();
    const empty = defaultBindingForNode(team, "openwebui");
    expect(JSON.stringify(generateOpenWebUIKit(team, { binding: empty }))).toBe(
      JSON.stringify(generateOpenWebUIKit(team)),
    );
  });

  it("codex : binding tous model:'' → AGENTS.md identique au pur", () => {
    const team = gabaritTeam();
    const empty = defaultBindingForNode(team, "codex");
    expect(generateCodexKit(team, { binding: empty }).files["AGENTS.md"]).toBe(
      generateCodexKit(team).files["AGENTS.md"],
    );
  });
});

describe("B-3 — avec binding, le modèle apparaît au bon endroit (depuis le Binding)", () => {
  // Décision (parité CLI, specs/instructions/parite-generateurs-contrat.md §6.1) : le contrat
  // `.claude/agents/<id>.md` **ne porte PAS `model`** — le modèle vit dans le `binding.json`
  // (artefact séparé). La facette du binding qui pilote le contrat claude, c'est `tools`.
  it("claudeCode : le contrat d'agent ne porte JAMAIS model (modèle → binding.json, hors contrat)", () => {
    const team = gabaritTeam();
    const b = bindingWithModel(team, "claude", "claude-sonnet-4-5");
    const tree = generateClaudeCodeKit(team, { binding: b });
    for (const [path, content] of Object.entries(tree.files)) {
      if (path.startsWith(".claude/agents/")) {
        expect(content).not.toMatch(/\nmodel:/);
      }
    }
  });

  it("claudeCode : tools câblés depuis le binding (scalaire virgule), omis si allowlist vide", () => {
    const team = gabaritTeam();
    const b = defaultBindingForNode(team, "claude");
    // Seule la 1re persona reçoit une allowlist d'outils ; les autres → ligne tools omise.
    const firstId = b.bindings[0].personaId;
    b.bindings[0].tools = ["Read", "Grep", "Glob"];
    const tree = generateClaudeCodeKit(team, { binding: b });
    const withTools = Object.entries(tree.files).filter(
      ([p, c]) => p.startsWith(".claude/agents/") && /\ntools:/.test(c),
    );
    expect(withTools).toHaveLength(1);
    expect(withTools[0][0]).toBe(`.claude/agents/${firstId}.md`);
    expect(withTools[0][1]).toMatch(/\ntools: Read, Grep, Glob\n/);
  });

  it("openwebui : base_model_id = model du binding", () => {
    const team = gabaritTeam();
    const b = bindingWithModel(team, "openwebui", "qwen2.5-coder:14b");
    const tree = generateOpenWebUIKit(team, { binding: b });
    for (const content of Object.values(tree.files)) {
      expect(JSON.parse(content).base_model_id).toBe("qwen2.5-coder:14b");
    }
  });

  it("codex : le modèle par persona apparaît dans AGENTS.md (section moteur)", () => {
    const team = gabaritTeam();
    const b = bindingWithModel(team, "codex", "gpt-5-codex");
    const md = generateCodexKit(team, { binding: b }).files["AGENTS.md"];
    expect(md).toContain("Moteur par persona");
    expect(md).toContain("gpt-5-codex");
  });
});

describe("B-5 (renfort) — le modèle vient du Binding, jamais de la Team", () => {
  it("modelForPersona : '' sans binding, sans liaison, ou modèle vide", () => {
    const team = gabaritTeam();
    const pid = team.personas[0].id;
    expect(modelForPersona(null, pid)).toBe("");
    expect(modelForPersona(undefined, pid)).toBe("");
    const b = defaultBindingForNode(team, "claude");
    expect(modelForPersona(b, pid)).toBe(""); // liaison présente mais modèle vide.
    expect(modelForPersona(b, "persona-inconnue")).toBe("");
  });

  it("claude : le contrat ne dépend que de tools ; un modèle seul n'altère pas l'arbre", () => {
    // Décision parité CLI : le modèle est hors contrat claude (→ binding.json). Un binding qui ne
    // fixe QUE le modèle produit donc un arbre identique au pur ; c'est `tools` qui le fait varier.
    const team = gabaritTeam();
    const modelOnly = bindingWithModel(team, "claude", "opus");
    expect(JSON.stringify(generateClaudeCodeKit(team, { binding: modelOnly }))).toBe(
      JSON.stringify(generateClaudeCodeKit(team)),
    );
    const withTools = defaultBindingForNode(team, "claude");
    withTools.bindings[0].tools = ["Read"];
    expect(JSON.stringify(generateClaudeCodeKit(team, { binding: withTools }))).not.toBe(
      JSON.stringify(generateClaudeCodeKit(team)),
    );
  });
});
