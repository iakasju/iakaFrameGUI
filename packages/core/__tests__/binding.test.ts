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
  parseBindingMd,
  parseBindingText,
  parsePersonaBinding,
  modelForPersona,
  serializeBinding,
  generateClaudeCodeKit,
  generateCodexKit,
  generateOpenWebUIKit,
  NODE_KINDS,
  type Binding,
  type Team,
} from "../src/index";

function gabaritTeam(): Team {
  return buildTeamFromRoster("Gabarit", "gabarit");
}

/** Construit un binding en fixant le même modèle sur toutes les personas (helper de test). */
function bindingWithModel(team: Team, node: Binding["node"], model: string): Binding {
  const base = defaultBindingForNode(team, node);
  return { ...base, assignments: base.assignments.map((b) => ({ ...b, model })) };
}

describe("B-1 — schéma Binding + défaut par nœud exportés", () => {
  it("defaultRunnerForNode : claude→claude-code, codex→codex, ollama-*/openwebui→ollama", () => {
    expect(defaultRunnerForNode("claude")).toBe("claude-code");
    expect(defaultRunnerForNode("codex")).toBe("codex");
    expect(defaultRunnerForNode("ollama-localhost")).toBe("ollama");
    expect(defaultRunnerForNode("ollama-lan")).toBe("ollama");
    expect(defaultRunnerForNode("openwebui")).toBe("ollama");
  });

  it("defaultBindingForNode couvre chaque nœud : une liaison par persona, model vide", () => {
    const team = gabaritTeam();
    for (const node of NODE_KINDS) {
      const b = defaultBindingForNode(team, node);
      expect(b.node).toBe(node);
      expect(b.teamId).toBe(team.id);
      expect(b.methodId).toBe(""); // défaut : le déploiement n'a pas besoin de methodId (P-D).
      expect(b.origin).toBe("forge-default");
      expect(b.assignments).toHaveLength(team.personas.length);
      for (const pb of b.assignments) {
        expect(pb.model).toBe(""); // à compléter par l'utilisateur (Q-3).
        expect(pb.runner).toBe(defaultRunnerForNode(node));
      }
      // Les personaId du binding = ceux de la team.
      expect(b.assignments.map((pb) => pb.personaId).sort()).toEqual(
        team.personas.map((p) => p.id).sort(),
      );
    }
  });

  it("defaultBindingForNode : methodId threadé quand fourni (P-D, param optionnel)", () => {
    const b = defaultBindingForNode(gabaritTeam(), "claude", "iakaframe");
    expect(b.methodId).toBe("iakaframe");
  });

  it("claude : toutes les personas ont model:'' (pas d'émission → équivalent au pur)", () => {
    const b = defaultBindingForNode(gabaritTeam(), "claude");
    expect(b.assignments.every((pb) => pb.model === "")).toBe(true);
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
    ).toEqual({ personaId: "x", runner: "ollama", model: "" });
  });

  it("parsePersonaBinding : alias de runner résolu (ps→claude-code)", () => {
    expect(parsePersonaBinding({ personaId: "x", runner: "ps" })).toEqual({
      personaId: "x",
      runner: "claude-code",
      model: "",
    });
  });

  it("parseBinding : filtre les liaisons invalides, replie origin, valide node, lit assignments", () => {
    const b = parseBinding({
      id: "b1",
      methodId: "iakaframe",
      teamId: "t1",
      node: "claude",
      origin: "n'importe quoi",
      assignments: [
        { personaId: "a", runner: "claude-code", model: "sonnet" },
        { personaId: "b", runner: "inconnu" }, // filtrée (runner strict, P-C)
        "pas un objet", // filtrée
      ],
    });
    expect(b).not.toBeNull();
    expect(b!.methodId).toBe("iakaframe"); // lu depuis le JSON.
    expect(b!.origin).toBe("forge-default"); // origin invalide → défaut.
    expect(b!.assignments).toHaveLength(1);
    expect(b!.assignments[0].personaId).toBe("a");
  });

  it("parseBinding : methodId absent → '' (non requis en JSON, P-D)", () => {
    const b = parseBinding({ id: "b", teamId: "t", node: "claude" });
    expect(b).not.toBeNull();
    expect(b!.methodId).toBe("");
    expect(b!.assignments).toEqual([]);
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
      assignments: [
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
  it("claudeCode : model: dans le frontmatter du subagent ssi model non vide", () => {
    const team = gabaritTeam();
    const b = bindingWithModel(team, "claude", "claude-sonnet-4-5");
    const tree = generateClaudeCodeKit(team, { binding: b });
    for (const [path, content] of Object.entries(tree.files)) {
      if (path.startsWith(".claude/agents/")) {
        expect(content).toMatch(/\nmodel: claude-sonnet-4-5\n/);
      }
    }
  });

  it("claudeCode : une persona à model vide n'émet pas de ligne model", () => {
    const team = gabaritTeam();
    const b = defaultBindingForNode(team, "claude");
    // Seule la 1re persona (roleIndex 0) reçoit un modèle.
    b.assignments[0].model = "opus";
    const tree = generateClaudeCodeKit(team, { binding: b });
    const withModel = Object.entries(tree.files).filter(
      ([p, c]) => p.startsWith(".claude/agents/") && /\nmodel:/.test(c),
    );
    expect(withModel).toHaveLength(1);
    expect(withModel[0][1]).toContain("model: opus");
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

  it("le même arbre pur est produit quelle que soit la team (aucun modèle dans la team)", () => {
    // La team ne porte aucun modèle : c'est bien le binding (option) qui décide de l'émission.
    const team = gabaritTeam();
    const withModel = bindingWithModel(team, "claude", "opus");
    const treePure = generateClaudeCodeKit(team);
    const treeBound = generateClaudeCodeKit(team, { binding: withModel });
    expect(JSON.stringify(treePure)).not.toBe(JSON.stringify(treeBound));
  });
});

// --- Porte `.md` (frame) : `parseBindingMd` déménagée du shim `frontmatter.ts` vers `binding.ts`.
//     Le format `.md` est désormais une porte du MÊME type `Binding` (fusion de bindingMd.test.ts).

// Mirror FIDÈLE du fichier réel `bindings/iakaframe-claude-default.md` de StefFrame2 (G2) :
// les 8 assignations RÉELLES, opus → {odin, aragorn, gandalf}, sonnet → {gimli, legolas, helm,
// loki, nathalie}, runner `claude-code` pour toutes (§8.6). Toute divergence avec le fichier
// source doit casser un test ci-dessous.
const SF2_BINDING = `---
id: iakaframe-claude-default
methodId: iakaframe
teamId: iakaframe-8
node: claude
origin: forge-default
assignments:
  - { personaId: odin,     runner: claude-code, model: "opus" }
  - { personaId: aragorn,  runner: claude-code, model: "opus" }
  - { personaId: gandalf,  runner: claude-code, model: "opus" }
  - { personaId: gimli,    runner: claude-code, model: "sonnet" }
  - { personaId: legolas,  runner: claude-code, model: "sonnet" }
  - { personaId: helm,     runner: claude-code, model: "sonnet" }
  - { personaId: loki,     runner: claude-code, model: "sonnet" }
  - { personaId: nathalie, runner: claude-code, model: "sonnet" }
---
# Binding iakaframe — défaut Claude Code
`;

// Les 8 assignations attendues (personaId → model), source de vérité de l'assertion de split.
const SF2_EXPECTED = [
  { personaId: "odin", runner: "claude-code", model: "opus" },
  { personaId: "aragorn", runner: "claude-code", model: "opus" },
  { personaId: "gandalf", runner: "claude-code", model: "opus" },
  { personaId: "gimli", runner: "claude-code", model: "sonnet" },
  { personaId: "legolas", runner: "claude-code", model: "sonnet" },
  { personaId: "helm", runner: "claude-code", model: "sonnet" },
  { personaId: "loki", runner: "claude-code", model: "sonnet" },
  { personaId: "nathalie", runner: "claude-code", model: "sonnet" },
];

describe("parseBindingMd (G2 — porte `.md` du Binding unifié)", () => {
  it("parse le frontmatter d'un binding de frame (methodId, teamId, assignments)", () => {
    const b = parseBindingMd(SF2_BINDING);
    expect(b).not.toBeNull();
    expect(b!.id).toBe("iakaframe-claude-default");
    expect(b!.methodId).toBe("iakaframe");
    expect(b!.teamId).toBe("iakaframe-8");
    expect(b!.node).toBe("claude");
    expect(b!.origin).toBe("forge-default");
    // Ordre + contenu EXACTS des 8 assignations réelles (pas de troncature).
    expect(b!.assignments).toEqual(SF2_EXPECTED);
  });

  it("null si id/methodId/teamId manquant (défensif) ; jamais d'exception", () => {
    expect(parseBindingMd("---\nmethodId: m\nteamId: t\n---\n")).toBeNull();
    expect(parseBindingMd("---\nid: b\nteamId: t\n---\n")).toBeNull();
    expect(parseBindingMd("---\nid: b\nmethodId: m\n---\n")).toBeNull();
    for (const bad of [undefined, null, "", "pas de frontmatter"]) {
      expect(() => parseBindingMd(bad)).not.toThrow();
      expect(parseBindingMd(bad)).toBeNull();
    }
  });

  it("assignments absent → [] ; repli node/origin par défaut (tolérant, P-B)", () => {
    const b = parseBindingMd("---\nid: b\nmethodId: m\nteamId: t\n---\n");
    expect(b!.assignments).toEqual([]);
    expect(b!.node).toBe("claude");
    expect(b!.origin).toBe("forge-default");
  });

  it("node invalide → repli 'claude' (tolérant, contrairement à parseBinding JSON strict)", () => {
    const b = parseBindingMd("---\nid: b\nmethodId: m\nteamId: t\nnode: pas-un-noeud\n---\n");
    expect(b).not.toBeNull();
    expect(b!.node).toBe("claude");
  });

  // §8.6 — verrou du split COMPLET du binding réel (8 assignations, opus×3 / sonnet×5).
  it("le binding réel StefFrame2 : split complet 8 assignations opus×3 / sonnet×5, runner claude-code", () => {
    const b = parseBindingMd(SF2_BINDING);
    expect(b).not.toBeNull();
    expect(b!.assignments).toHaveLength(8);
    expect(b!.assignments.every((a) => a.runner === "claude-code")).toBe(true);
    // Les 8 personaId présents, dans l'ordre du fichier.
    expect(b!.assignments.map((a) => a.personaId)).toEqual([
      "odin",
      "aragorn",
      "gandalf",
      "gimli",
      "legolas",
      "helm",
      "loki",
      "nathalie",
    ]);
    const opus = b!.assignments.filter((a) => a.model === "opus").map((a) => a.personaId);
    const sonnet = b!.assignments.filter((a) => a.model === "sonnet").map((a) => a.personaId);
    expect(opus.sort()).toEqual(["aragorn", "gandalf", "odin"]);
    expect(sonnet.sort()).toEqual(["gimli", "helm", "legolas", "loki", "nathalie"]);
  });
});
