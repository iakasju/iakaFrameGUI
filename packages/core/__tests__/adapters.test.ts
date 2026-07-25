import { describe, it, expect } from "vitest";
import {
  buildTeamFromRoster,
  emptyTeam,
  generateClaudeCodeKit,
  getAdapter,
  RUNNER_ADAPTERS,
  implementedNodes,
  buildGuardrailWiring,
  GUARD_SCRIPTS,
  NODE_KINDS,
  type Team,
} from "../src/index";

/** Team gabarit (9 personas) SANS gardes (état du roster canonique P1). */
function gabaritTeam(): Team {
  return buildTeamFromRoster("Gabarit", "gabarit");
}

/** Team gabarit AVEC les 3 gardes attachées (exerce le câblage complet). */
function guardedTeam(): Team {
  const team = buildTeamFromRoster("Gardée", "gardee");
  // identity + perimeter sur une persona, delegation sur une autre.
  team.personas[1].guardrails = ["identity-guard", "perimeter-guard"];
  team.personas[3].guardrails = ["delegation-guard", "identity-guard"];
  return team;
}

describe("G-1 — adaptateur pur (aucune I/O)", () => {
  it("generateClaudeCodeKit renvoie un KitFileTree { files } sans toucher au disque", () => {
    const tree = generateClaudeCodeKit(gabaritTeam());
    expect(tree).toHaveProperty("files");
    expect(typeof tree.files).toBe("object");
    // Tous les chemins sont relatifs (jamais absolus / jamais de remontée).
    for (const path of Object.keys(tree.files)) {
      expect(path.startsWith("/")).toBe(false);
      expect(path.includes("..")).toBe(false);
    }
  });

  it("est déterministe : même team → même arbre", () => {
    const a = generateClaudeCodeKit(gabaritTeam());
    const b = generateClaudeCodeKit(gabaritTeam());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("G-2 — génération depuis la team gabarit (9 personas)", () => {
  const tree = generateClaudeCodeKit(gabaritTeam());
  const paths = Object.keys(tree.files);

  it("produit un .claude/agents/<id>.md par persona (9)", () => {
    const agents = paths.filter(
      (p) => p.startsWith(".claude/agents/") && p.endsWith(".md"),
    );
    expect(agents).toHaveLength(9);
  });

  it("produit les SKILL.md des skills référencées", () => {
    const skills = paths.filter((p) => p.endsWith("/SKILL.md"));
    // Le roster canonique attache 6 skills (le rôle fabrication n'en a pas).
    expect(skills.length).toBeGreaterThan(0);
    for (const s of skills) {
      expect(s).toMatch(/^\.claude\/skills\/[^/]+\/SKILL\.md$/);
    }
  });

  it("produit un CLAUDE.md et un .claude/settings.json valides", () => {
    expect(paths).toContain("CLAUDE.md");
    expect(paths).toContain(".claude/settings.json");
    // settings.json parsable.
    const settings = JSON.parse(tree.files[".claude/settings.json"]);
    expect(settings).toHaveProperty("hooks");
    expect(settings).toHaveProperty("permissions");
  });

  it("frontmatter des agents parsable (name + description, PAS de model)", () => {
    const anyAgent = paths.find((p) => p.startsWith(".claude/agents/"))!;
    const content = tree.files[anyAgent];
    expect(content.startsWith("---\n")).toBe(true);
    expect(content).toMatch(/\nname: /);
    expect(content).toMatch(/\ndescription: /);
    expect(content).not.toMatch(/\nmodel:/);
    expect(content).not.toMatch(/\nrunner:/);
  });
});

describe("G-3 — gardes → hooks + permissions + scripts présents", () => {
  const tree = generateClaudeCodeKit(guardedTeam());
  const settings = JSON.parse(tree.files[".claude/settings.json"]);

  it("câble identity-guard sur Stop et SubagentStop", () => {
    const cmd = (e: string) =>
      settings.hooks[e]?.[0]?.hooks?.[0]?.command ?? "";
    expect(cmd("Stop")).toContain("identity-guard.mjs");
    expect(cmd("SubagentStop")).toContain("identity-guard.mjs");
    expect(cmd("UserPromptSubmit")).toContain("identity-remind.mjs");
  });

  it("câble perimeter-guard sur PreToolUse(Edit|Write|Bash|NotebookEdit) et delegation sur Task", () => {
    const groups = settings.hooks.PreToolUse;
    const perimeter = groups.find(
      (g: { matcher: string }) => g.matcher === "Edit|Write|Bash|NotebookEdit",
    );
    const deleg = groups.find((g: { matcher: string }) => g.matcher === "Task");
    expect(perimeter.hooks[0].command).toContain("perimeter-guard.mjs");
    expect(deleg.hooks[0].command).toContain("delegation-guard.mjs");
  });

  it("copie les scripts de garde référencés dans .claude/hooks/", () => {
    expect(tree.files[".claude/hooks/identity-guard.mjs"]).toBeDefined();
    expect(tree.files[".claude/hooks/identity-remind.mjs"]).toBeDefined();
    expect(tree.files[".claude/hooks/perimeter-guard.mjs"]).toBeDefined();
    expect(tree.files[".claude/hooks/delegation-guard.mjs"]).toBeDefined();
    // Contenu VERBATIM = registre (câblé, jamais réécrit).
    expect(tree.files[".claude/hooks/identity-guard.mjs"]).toBe(
      GUARD_SCRIPTS["identity-guard.mjs"],
    );
    expect(tree.files[".claude/hooks/identity-guard.mjs"]).toContain("#!/usr/bin/env node");
  });

  it("n'émet aucun hook / aucun script quand la team n'a pas de gardes", () => {
    const tree0 = generateClaudeCodeKit(gabaritTeam());
    const settings0 = JSON.parse(tree0.files[".claude/settings.json"]);
    expect(Object.keys(settings0.hooks)).toHaveLength(0);
    expect(
      Object.keys(tree0.files).some((p) => p.startsWith(".claude/hooks/")),
    ).toBe(false);
  });

  it("buildGuardrailWiring déduplique les bindings et scripts", () => {
    const wiring = buildGuardrailWiring(guardedTeam());
    // identity apparaît sur 2 personas mais un seul jeu de bindings.
    const identityStop = wiring.bindings.filter(
      (b) => b.event === "Stop" && b.script === "identity-guard.mjs",
    );
    expect(identityStop).toHaveLength(1);
    expect(new Set(wiring.scripts).size).toBe(wiring.scripts.length);
  });
});

describe("G-4 — .mcp.json conditionnel", () => {
  it("absent si aucun connecteur", () => {
    const tree = generateClaudeCodeKit(gabaritTeam()); // connectors: []
    expect(tree.files[".mcp.json"]).toBeUndefined();
  });

  it("présent et parsable si ≥ 1 connecteur", () => {
    const team = gabaritTeam();
    team.connectors = ["git", "filesystem"];
    const tree = generateClaudeCodeKit(team);
    expect(tree.files[".mcp.json"]).toBeDefined();
    const mcp = JSON.parse(tree.files[".mcp.json"]);
    expect(Object.keys(mcp.mcpServers).sort()).toEqual(["filesystem", "git"]);
  });
});

describe("G-5 — aucune fuite runner/model dans les fichiers AUTHORÉS", () => {
  it("aucun fichier généré (hors scripts copiés) ne contient de champ runner/model", () => {
    const team = guardedTeam();
    team.connectors = ["git"];
    const tree = generateClaudeCodeKit(team);
    for (const [path, content] of Object.entries(tree.files)) {
      // Les scripts de garde sont des copies verbatim tierces → hors périmètre du grep
      // (l'invariant vise la fuite de liaison persona, pas le code des gardes).
      if (path.startsWith(".claude/hooks/")) continue;
      expect(content).not.toMatch(/\bmodel\b/i);
      expect(content).not.toMatch(/\brunner\b/i);
    }
  });

  it("les scripts copiés (verbatim) ne contiennent de toute façon ni runner ni model", () => {
    for (const content of Object.values(GUARD_SCRIPTS)) {
      expect(content).not.toMatch(/\bmodel\b/i);
      expect(content).not.toMatch(/\brunner\b/i);
    }
  });
});

describe("G-9 — extensibilité : interface RunnerAdapter + registre", () => {
  it("le registre couvre tous les NodeKind", () => {
    for (const node of NODE_KINDS) {
      expect(RUNNER_ADAPTERS[node]).toBeDefined();
      expect(getAdapter(node).node).toBe(node);
    }
  });

  it("les 4 nœuds sont implémentés (P3b) ; chacun génère un arbre", () => {
    expect(implementedNodes()).toEqual([...NODE_KINDS]);
    for (const node of NODE_KINDS) {
      expect(getAdapter(node).implemented).toBe(true);
      const tree = getAdapter(node).generate(gabaritTeam());
      expect(typeof tree.files).toBe("object");
      expect(Object.keys(tree.files).length).toBeGreaterThan(0);
    }
  });

  it("l'adaptateur claude expose le format de kit P2 (claude-md)", () => {
    expect(getAdapter("claude").kitFormat).toBe("claude-md");
  });
});

describe("team vide → arbre minimal cohérent", () => {
  it("aucun agent, mais CLAUDE.md + settings.json présents", () => {
    const tree = generateClaudeCodeKit(emptyTeam("Vide", "vide"));
    const agents = Object.keys(tree.files).filter((p) =>
      p.startsWith(".claude/agents/"),
    );
    expect(agents).toHaveLength(0);
    expect(tree.files["CLAUDE.md"]).toBeDefined();
    expect(tree.files[".claude/settings.json"]).toBeDefined();
  });
});
