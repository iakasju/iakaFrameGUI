/**
 * adaptersAgentsMd.test.ts — critères d'acceptation **P3b** (G-1→G-11) pour les adaptateurs
 * **`AGENTS.md`** des nœuds sans hooks : `codex`, `ollama-localhost`, `ollama-lan`.
 *
 * Tous purs : ils tournent **sans codex ni ollama installés** (G-8) — inspection d'arbre.
 */
import { describe, it, expect } from "vitest";
import {
  buildTeamFromRoster,
  emptyTeam,
  generateCodexKit,
  generateOllamaLocalhostKit,
  generateOllamaLanKit,
  generateClaudeCodeKit,
  getAdapter,
  implementedNodes,
  NODE_KINDS,
  CATALOG_GUARDRAILS,
  guardrailByKind,
  GUARD_SCRIPTS,
  type Team,
} from "../src/index";

/** Team gabarit (8 personas, un par rôle canonique). */
function gabaritTeam(): Team {
  return buildTeamFromRoster("Gabarit", "gabarit");
}

const ROLE_LABELS = [
  "Portefeuille",
  "Coordination",
  "Cadrage",
  "Développement",
  "Qualité",
  "Déploiement",
  "Design",
  "Documentation",
];

describe("G-1 — registre : 4 nœuds implémentés, interface stable", () => {
  it("les 4 NodeKind sont implémentés", () => {
    expect(implementedNodes()).toEqual([...NODE_KINDS]);
  });

  it("chaque nœud AGENTS.md expose kitFormat = agents-md", () => {
    for (const node of ["codex", "ollama-localhost", "ollama-lan"] as const) {
      expect(getAdapter(node).kitFormat).toBe("agents-md");
      expect(getAdapter(node).implemented).toBe(true);
    }
  });

  it("non-régression : l'adaptateur claude reste hooks + CLAUDE.md (claude-md)", () => {
    expect(getAdapter("claude").kitFormat).toBe("claude-md");
    const tree = generateClaudeCodeKit(gabaritTeam());
    expect(tree.files["CLAUDE.md"]).toBeDefined();
    expect(tree.files[".claude/settings.json"]).toBeDefined();
    expect(tree.files["AGENTS.md"]).toBeUndefined();
  });
});

describe("G-2 — codex → AGENTS.md conforme", () => {
  const tree = generateCodexKit(gabaritTeam());

  it("produit un AGENTS.md (pas un CLAUDE.md)", () => {
    expect(tree.files["AGENTS.md"]).toBeDefined();
    expect(tree.files["CLAUDE.md"]).toBeUndefined();
  });

  it("contient les 8 personas par rôle", () => {
    const md = tree.files["AGENTS.md"];
    for (const label of ROLE_LABELS) expect(md).toContain(label);
    // 8 lignes de roster (une pastille [ROYAUME][Nom] par persona).
    const badgeRows = md.match(/\| `\[[^\]]+\]\[[^\]]+\]` \|/g) ?? [];
    expect(badgeRows).toHaveLength(8);
  });

  it("contient les 3 phases + gates", () => {
    const md = tree.files["AGENTS.md"];
    expect(md).toContain("P1 — Cadrage");
    expect(md).toContain("P2 — Réalisation");
    expect(md).toContain("P3 — Staging");
    expect(md).toContain("Gate");
    expect(md).toContain("cadrage avant code");
  });

  it("contient le rituel d'identité en texte (badge/position/START-STOP bannis)", () => {
    const md = tree.files["AGENTS.md"];
    expect(md).toContain("[ROYAUME][Persona]");
    expect(md).toContain("ouverture");
    expect(md).toContain("clôture");
    expect(md).toContain("AVANT");
    expect(md).toContain("APRÈS");
    expect(md).toMatch(/« START ».*« STOP ».*bannis/s);
  });
});

describe("G-3 — ollama-localhost ≠ ollama-lan (endpoint distinct)", () => {
  it("localhost porte http://localhost:11434", () => {
    const md = generateOllamaLocalhostKit(gabaritTeam()).files["AGENTS.md"];
    expect(md).toContain("http://localhost:11434");
  });

  it("lan porte le placeholder <host-lan> par défaut (Q-5)", () => {
    const md = generateOllamaLanKit(gabaritTeam()).files["AGENTS.md"];
    expect(md).toContain("http://<host-lan>:11434");
    expect(md).not.toContain("http://localhost:11434");
  });

  it("lan accepte un host paramétré (champ de nœud, Q-5)", () => {
    const md = generateOllamaLanKit(gabaritTeam(), { lanHost: "192.168.2.11" })
      .files["AGENTS.md"];
    expect(md).toContain("http://192.168.2.11:11434");
    expect(md).not.toContain("<host-lan>");
  });

  it("les deux sorties sont distinctes (diff non vide sur l'entête/pré-requis)", () => {
    const a = generateOllamaLocalhostKit(gabaritTeam()).files["AGENTS.md"];
    const b = generateOllamaLanKit(gabaritTeam()).files["AGENTS.md"];
    expect(a).not.toBe(b);
  });
});

describe("G-4 — zéro fuite runner/model/MODELES (3 nœuds)", () => {
  const trees = {
    codex: generateCodexKit(gabaritTeam()),
    localhost: generateOllamaLocalhostKit(gabaritTeam()),
    lan: generateOllamaLanKit(gabaritTeam()),
  };
  for (const [name, tree] of Object.entries(trees)) {
    it(`${name} : aucun champ model/runner, aucune table MODELES`, () => {
      for (const content of Object.values(tree.files)) {
        expect(content).not.toMatch(/\bmodel\b/i);
        expect(content).not.toMatch(/\brunner\b/i);
        expect(content).not.toMatch(/MODELES/);
      }
    });
  }
});

describe("G-5 — fidélité du canal d'identité (prose ≡ hook)", () => {
  const identity = guardrailByKind("identity")!;

  it("la garde identité fournit LES DEUX rendus (hook + prose)", () => {
    expect(identity.rendering.hook).toBeDefined();
    expect(identity.rendering.prose).toBeDefined();
    expect(identity.rendering.hook!.script).toBe("identity-guard.mjs");
  });

  it("la prose reproduit les invariants clés du canal (mêmes règles que le hook)", () => {
    const body = identity.rendering.prose!.body;
    // Badge + royaume majuscule.
    expect(body).toContain("[ROYAUME][Persona]");
    expect(body).toContain("MAJUSCULE");
    // Position ouverture/clôture (le sens porté par la POSITION, comme le hook).
    expect(body).toMatch(/AVANT.*ouverture/s);
    expect(body).toMatch(/APRÈS.*clôture/s);
    // START/STOP bannis.
    expect(body).toMatch(/« START ».*« STOP ».*bannis/s);
    // Chaîne de badges + verbatim/anti-ventriloquie.
    expect(body).toContain("sans interjection");
    expect(body).toMatch(/[Vv]erbatim/);
    expect(body).toContain("anti-ventriloquie");
  });

  it("le hook de référence (script) porte la MÊME notion de position", () => {
    const script = GUARD_SCRIPTS["identity-guard.mjs"];
    // Le hook et la prose s'accordent sur : ouverture = AVANT, clôture = APRES.
    expect(script).toMatch(/ouverture = pastille AVANT/);
    expect(script).toMatch(/cloture\s+= pastille APRES/);
  });
});

describe("G-6 — gardes en texte, aucun hook/settings.json (nœuds sans hooks)", () => {
  for (const [name, gen] of [
    ["codex", generateCodexKit],
    ["ollama-localhost", generateOllamaLocalhostKit],
    ["ollama-lan", generateOllamaLanKit],
  ] as const) {
    it(`${name} : aucun settings.json ni .claude/hooks`, () => {
      const tree = gen(gabaritTeam());
      for (const path of Object.keys(tree.files)) {
        expect(path).not.toContain("settings.json");
        expect(path.startsWith(".claude/")).toBe(false);
      }
    });

    it(`${name} : identity ET perimeter présentes en sections de prose`, () => {
      const md = gen(gabaritTeam()).files["AGENTS.md"];
      expect(md).toContain(guardrailByKind("identity")!.rendering.prose!.heading);
      expect(md).toContain(guardrailByKind("perimeter")!.rendering.prose!.heading);
    });
  }
});

describe("G-7 — .mcp.json conditionnel pour TOUS les nœuds (Q-4)", () => {
  for (const [name, gen] of [
    ["codex", generateCodexKit],
    ["ollama-localhost", generateOllamaLocalhostKit],
    ["ollama-lan", generateOllamaLanKit],
  ] as const) {
    it(`${name} : absent sans connecteur`, () => {
      expect(gen(gabaritTeam()).files[".mcp.json"]).toBeUndefined();
    });

    it(`${name} : présent (format MCP standard) si ≥ 1 connecteur`, () => {
      const team = gabaritTeam();
      team.connectors = ["git", "filesystem"];
      const mcp = gen(team).files[".mcp.json"];
      expect(mcp).toBeDefined();
      const parsed = JSON.parse(mcp);
      expect(Object.keys(parsed.mcpServers).sort()).toEqual(["filesystem", "git"]);
      expect(parsed.mcpServers.git.type).toBe("stdio");
    });
  }
});

describe("G-8 — pur, déterministe, testable sans nœud", () => {
  it("codex : même team → même arbre", () => {
    const a = generateCodexKit(gabaritTeam());
    const b = generateCodexKit(gabaritTeam());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("team vide → AGENTS.md cohérent, aucun agent", () => {
    const tree = generateCodexKit(emptyTeam("Vide", "vide"));
    expect(tree.files["AGENTS.md"]).toBeDefined();
    expect(tree.files["AGENTS.md"]).toContain("0 personas");
  });
});

describe("G-9 — arbres déployables par kit_deploy (inchangé) : chemins sûrs", () => {
  it("tous les chemins générés sont relatifs, sans traversal ni chemin absolu", () => {
    const team = gabaritTeam();
    team.connectors = ["git"];
    for (const gen of [
      generateCodexKit,
      generateOllamaLocalhostKit,
      generateOllamaLanKit,
    ]) {
      for (const path of Object.keys(gen(team).files)) {
        expect(path.startsWith("/")).toBe(false);
        expect(path.includes("..")).toBe(false);
      }
    }
  });
});

describe("G-11 — rôles jamais désignés par un nom de code (doc générée)", () => {
  it("les sections de méthode (phases, gardes) emploient des rôles, pas des noms de persona", () => {
    // Le corps CANONIQUE (indépendant des données de team) ne cite aucun nom du gabarit.
    const guardsText = CATALOG_GUARDRAILS.map((g) => g.rendering.prose?.body ?? "").join(
      "\n",
    );
    for (const codeName of ["Odin", "Aragorn", "Gandalf", "Gimli", "Legolas", "Loki"]) {
      expect(guardsText).not.toContain(codeName);
    }
  });
});
