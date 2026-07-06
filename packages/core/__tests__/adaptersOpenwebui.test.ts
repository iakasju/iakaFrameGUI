/**
 * adaptersOpenwebui.test.ts — critères d'acceptation **P3c** (O-2→O-5, O-8) pour l'adaptateur
 * **Open WebUI** (5e nœud, format `openwebui-models` : N Models JSON, un par persona).
 *
 * Tous purs : ils tournent **sans Open WebUI** (O-8) — inspection d'arbre + `JSON.parse`.
 */
import { describe, it, expect } from "vitest";
import {
  buildTeamFromRoster,
  emptyTeam,
  generateOpenWebUIKit,
  generateCodexKit,
  generateClaudeCodeKit,
  getAdapter,
  implementedNodes,
  NODE_KINDS,
  guardrailByKind,
  type Team,
} from "../src/index";

/** Team gabarit (7 personas, un par rôle canonique). */
function gabaritTeam(): Team {
  return buildTeamFromRoster("Gabarit", "gabarit");
}

/** Forme (permissive) d'un Model parsé — pour inspecter les champs sensibles dans les tests. */
type ParsedModel = {
  id: string;
  base_model_id: string;
  name: string;
  params: Record<string, unknown> & { system: string };
  meta: {
    description: string;
    capabilities: Record<string, boolean>;
    tags: unknown[];
  };
  access_control: null;
  is_active: boolean;
  created_at: number;
  updated_at: number;
};

/** Parse tous les Models d'un arbre openwebui → { relPath → objet }. */
function parseModels(files: Record<string, string>): Record<string, ParsedModel> {
  const out: Record<string, ParsedModel> = {};
  for (const [path, content] of Object.entries(files)) {
    out[path] = JSON.parse(content) as ParsedModel;
  }
  return out;
}

describe("O-2 — registre : 5 nœuds implémentés, interface stable", () => {
  it("les 5 NodeKind sont implémentés (openwebui inclus)", () => {
    expect(implementedNodes()).toEqual([...NODE_KINDS]);
    expect(NODE_KINDS).toContain("openwebui");
  });

  it("openwebui : kitFormat = openwebui-models, implemented", () => {
    expect(getAdapter("openwebui").kitFormat).toBe("openwebui-models");
    expect(getAdapter("openwebui").implemented).toBe(true);
    expect(getAdapter("openwebui").node).toBe("openwebui");
  });

  it("non-régression : claude reste claude-md, codex reste agents-md", () => {
    expect(getAdapter("claude").kitFormat).toBe("claude-md");
    expect(getAdapter("codex").kitFormat).toBe("agents-md");
    // Les adaptateurs P3/P3b produisent toujours leur contrat markdown (inchangés).
    expect(generateClaudeCodeKit(gabaritTeam()).files["CLAUDE.md"]).toBeDefined();
    expect(generateCodexKit(gabaritTeam()).files["AGENTS.md"]).toBeDefined();
  });
});

describe("O-3 — génération : N Models JSON valides (un par persona)", () => {
  const team = gabaritTeam();
  const tree = generateOpenWebUIKit(team);

  it("produit un models/<personaId>.json par persona (7), aucun autre fichier", () => {
    const paths = Object.keys(tree.files);
    expect(paths).toHaveLength(7);
    for (const p of paths) expect(p).toMatch(/^models\/[^/]+\.json$/);
    const expected = team.personas
      .map((p) => `models/${p.id}.json`)
      .sort();
    expect(paths.sort()).toEqual(expected);
  });

  it("chaque Model est JSON.parse-able et conforme à la forme des gabarits", () => {
    const models = parseModels(tree.files);
    for (const [path, m] of Object.entries(models)) {
      const id = path.replace(/^models\//, "").replace(/\.json$/, "");
      expect(m.id).toBe(id);
      expect(typeof m.name).toBe("string");
      expect(m.name.length).toBeGreaterThan(0);
      expect(typeof m.params.system).toBe("string");
      expect(m.params.system.length).toBeGreaterThan(0);
      expect(m.meta).toBeDefined();
      expect(m.meta.description).toBeDefined();
      expect(m.meta.capabilities).toBeDefined();
      expect(Array.isArray(m.meta.tags)).toBe(true);
      expect(m.access_control).toBeNull();
      expect(m.is_active).toBe(true);
      expect(typeof m.created_at).toBe("number");
      expect(typeof m.updated_at).toBe("number");
    }
  });

  it("les id des Models = id des personas de la team", () => {
    const models = parseModels(tree.files);
    const ids = Object.values(models).map((m) => m.id).sort();
    expect(ids).toEqual(team.personas.map((p) => p.id).sort());
  });
});

describe("O-4 — zéro modèle fixé (AR-1)", () => {
  const models = parseModels(generateOpenWebUIKit(gabaritTeam()).files);

  it("base_model_id est VIDE pour tous les Models", () => {
    for (const m of Object.values(models)) {
      expect(m.base_model_id).toBe("");
    }
  });

  it("aucun paramètre d'inférence : params ne contient QUE system", () => {
    for (const m of Object.values(models)) {
      expect(Object.keys(m.params)).toEqual(["system"]);
      expect(m.params.temperature).toBeUndefined();
      expect(m.params.num_ctx).toBeUndefined();
    }
  });

  it("aucun tag de modèle réel dans les fichiers (assertion sur tout le contenu)", () => {
    for (const content of Object.values(generateOpenWebUIKit(gabaritTeam()).files)) {
      // Aucune référence à un vrai modèle (les gabarits historiques : deepseek/qwen/:latest).
      expect(content).not.toMatch(/deepseek/i);
      expect(content).not.toMatch(/qwen/i);
      expect(content).not.toMatch(/:latest/);
    }
  });

  it("capabilities neutres : vision seulement pour le rôle graphisme", () => {
    const team = gabaritTeam();
    const files = generateOpenWebUIKit(team).files;
    for (const p of team.personas) {
      const m = JSON.parse(files[`models/${p.id}.json`]);
      expect(m.meta.capabilities.vision).toBe(p.roleKey === "graphisme");
      expect(m.meta.capabilities.usage).toBe(false);
      expect(m.meta.capabilities.citations).toBe(false);
    }
  });

  it("meta.description documente le réglage du modèle à l'import", () => {
    for (const m of Object.values(models)) {
      expect(m.meta.description).toMatch(/import/i);
    }
  });
});

describe("O-5 — rituel d'identité en prose fidèle (mêmes règles que le hook)", () => {
  const models = parseModels(generateOpenWebUIKit(gabaritTeam()).files);
  const identity = guardrailByKind("identity")!;
  const perimeter = guardrailByKind("perimeter")!;

  it("chaque params.system embarque la prose d'identité VERBATIM (réutilisée, non réécrite)", () => {
    for (const m of Object.values(models)) {
      expect(m.params.system).toContain(identity.rendering.prose!.body);
      expect(m.params.system).toContain(identity.rendering.prose!.heading);
    }
  });

  it("les invariants clés du canal sont présents (badge, position, START/STOP, verbatim)", () => {
    for (const m of Object.values(models)) {
      const s = m.params.system;
      expect(s).toContain("[ROYAUME][Persona]");
      expect(s).toContain("MAJUSCULE");
      expect(s).toMatch(/AVANT.*ouverture/s);
      expect(s).toMatch(/APRÈS.*clôture/s);
      expect(s).toMatch(/« START ».*« STOP ».*bannis/s);
      expect(s).toMatch(/[Vv]erbatim/);
      expect(s).toContain("anti-ventriloquie");
    }
  });

  it("chaque params.system embarque aussi la garde de périmètre en prose", () => {
    for (const m of Object.values(models)) {
      expect(m.params.system).toContain(perimeter.rendering.prose!.heading);
      expect(m.params.system).toContain(perimeter.rendering.prose!.body);
    }
  });

  it("le system prompt cite le rôle et la pastille concrète de la persona", () => {
    const team = gabaritTeam();
    const files = generateOpenWebUIKit(team).files;
    const gimli = team.personas.find((p) => p.roleKey === "fabrication")!;
    const s = JSON.parse(files[`models/${gimli.id}.json`]).params.system;
    expect(s).toContain(gimli.name);
    expect(s).toContain(`[${gimli.royaume.toUpperCase()}][${gimli.name}]`);
  });
});

describe("O-8 — pur, déterministe, testable sans nœud + pas de .mcp.json (Q-4)", () => {
  it("même team → même arbre (timestamps constants, tri déterministe)", () => {
    const a = generateOpenWebUIKit(gabaritTeam());
    const b = generateOpenWebUIKit(gabaritTeam());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("timestamps constants (jamais Date.now)", () => {
    const models = parseModels(generateOpenWebUIKit(gabaritTeam()).files);
    for (const m of Object.values(models)) {
      expect(m.created_at).toBe(1_750_000_000);
      expect(m.updated_at).toBe(1_750_000_000);
    }
  });

  it("aucun .mcp.json, même si la team déclare des connecteurs (Q-4)", () => {
    const team = gabaritTeam();
    team.connectors = ["git", "filesystem"];
    const files = generateOpenWebUIKit(team).files;
    expect(files[".mcp.json"]).toBeUndefined();
    for (const p of Object.keys(files)) expect(p).toMatch(/^models\//);
  });

  it("aucun settings.json ni hook (nœud sans hooks)", () => {
    for (const p of Object.keys(generateOpenWebUIKit(gabaritTeam()).files)) {
      expect(p).not.toContain("settings.json");
      expect(p.startsWith(".claude/")).toBe(false);
    }
  });

  it("team vide → aucun Model (0 fichier)", () => {
    const tree = generateOpenWebUIKit(emptyTeam("Vide", "vide"));
    expect(Object.keys(tree.files)).toHaveLength(0);
  });

  it("chemins déployables sûrs (relatifs, sans traversal) pour kit_deploy", () => {
    for (const p of Object.keys(generateOpenWebUIKit(gabaritTeam()).files)) {
      expect(p.startsWith("/")).toBe(false);
      expect(p.includes("..")).toBe(false);
    }
  });
});

describe("O-11 — rôles jamais désignés par un nom de code (corps canonique)", () => {
  it("le rituel d'identité injecté n'emploie aucun nom de persona", () => {
    // La prose canonique (indépendante des données de team) ne cite aucun nom du gabarit.
    const body = guardrailByKind("identity")!.rendering.prose!.body;
    for (const codeName of ["Odin", "Aragorn", "Gandalf", "Gimli", "Legolas", "Loki"]) {
      expect(body).not.toContain(codeName);
    }
  });
});
