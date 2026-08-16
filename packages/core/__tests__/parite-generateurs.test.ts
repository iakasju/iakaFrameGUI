/**
 * parite-generateurs.test.ts — **golden de parité CLI ↔ GUI**
 * (specs/instructions/parite-generateurs-contrat.md, dépôt iakaframe).
 *
 * Le CLI (`renderAgentContract`, `generate-agents.js`) est la RÉFÉRENCE. Ce test prouve que le
 * rendu GUI (`renderAgentContract` du cœur, alimenté par un **loader de fixture canon**) produit,
 * pour les 10 personas, le **même contrat byte-à-byte** que le golden figé — golden **vendoré
 * byte-à-byte** depuis le CLI (`cp cli/test/fixtures/agents-golden/*.md → ici`).
 *
 * Effet cliquet BILATÉRAL : toute dérive de format casse ce test ET le test CLI
 * (`cli/test/parite-generateurs.test.js`) tant que le golden n'est pas re-généré + re-vendoré.
 * Garde `sha256` : le hash déclaré dans l'en-tête == sha256 du contenu utile (anti-altération
 * locale de la copie vendorée).
 *
 * Loader de fixture (arbitrage Odin) : la `description`, les `guardrails` (vocabulaire **canon**
 * `identity, perimeter`) et le **corps verbatim** viennent des personas canon **vendorées** ; les
 * `tools` viennent du **binding** défaut vendoré — le modèle `Persona` pur reste inchangé.
 */
import { describe, it, expect } from "vitest";
import { renderAgentContract, toolsForPersona, parseFrontmatter, verbatimBody } from "../src/index";
import type { Binding } from "../src/index";

// --- fixtures partagées (byte-copies du dépôt iakaframe) -----------------------------------------
import aragornMd from "./fixtures/personas/aragorn.md?raw";
// Scission du squad prod (canon 0.39.0) : `charon.md` est la 10e persona canon.
import charonMd from "./fixtures/personas/charon.md?raw";
import feanorMd from "./fixtures/personas/feanor.md?raw";
import gandalfMd from "./fixtures/personas/gandalf.md?raw";
import gimliMd from "./fixtures/personas/gimli.md?raw";
import helmMd from "./fixtures/personas/helm.md?raw";
import legolasMd from "./fixtures/personas/legolas.md?raw";
import lokiMd from "./fixtures/personas/loki.md?raw";
import nathalieMd from "./fixtures/personas/nathalie.md?raw";
import odinMd from "./fixtures/personas/odin.md?raw";
import bindingMd from "./fixtures/binding/iakaframe-claude-default.md?raw";

import gAragorn from "./fixtures/agents-golden/aragorn.md?raw";
import gCharon from "./fixtures/agents-golden/charon.md?raw";
import gFeanor from "./fixtures/agents-golden/feanor.md?raw";
import gGandalf from "./fixtures/agents-golden/gandalf.md?raw";
import gGimli from "./fixtures/agents-golden/gimli.md?raw";
import gHelm from "./fixtures/agents-golden/helm.md?raw";
import gLegolas from "./fixtures/agents-golden/legolas.md?raw";
import gLoki from "./fixtures/agents-golden/loki.md?raw";
import gNathalie from "./fixtures/agents-golden/nathalie.md?raw";
import gOdin from "./fixtures/agents-golden/odin.md?raw";

const PERSONAS: Record<string, string> = {
  aragorn: aragornMd,
  charon: charonMd,
  feanor: feanorMd,
  gandalf: gandalfMd,
  gimli: gimliMd,
  helm: helmMd,
  legolas: legolasMd,
  loki: lokiMd,
  nathalie: nathalieMd,
  odin: odinMd,
};

const GOLDENS: Record<string, string> = {
  aragorn: gAragorn,
  charon: gCharon,
  feanor: gFeanor,
  gandalf: gGandalf,
  gimli: gGimli,
  helm: gHelm,
  legolas: gLegolas,
  loki: gLoki,
  nathalie: gNathalie,
  odin: gOdin,
};

const IDS = Object.keys(PERSONAS).sort();

// --- binding défaut vendoré → Binding (pour exercer `toolsForPersona` de production) -------------
function loadBinding(): Binding {
  const { data } = parseFrontmatter(bindingMd);
  const rows = Array.isArray(data.assignments) ? data.assignments : [];
  return {
    id: "iakaframe-claude-default",
    node: "claude",
    teamId: "iakaframe-8",
    origin: "forge-default",
    bindings: rows.map((r) => {
      const a = r as Record<string, unknown>;
      return {
        personaId: String(a.personaId ?? ""),
        runner: "claude" as const,
        model: "",
        tools: Array.isArray(a.tools) ? (a.tools as string[]) : [],
      };
    }),
  };
}

// --- carte des subskills, tirée des skills VENDORÉES (miroir byte du canon) -----------------------
// Le contrat déployé porte la liste RÉSOLUE (R8 § 5.2). Pour la reproduire byte-à-byte sans
// hand-coder, on lit les `subskills:` des SKILL.md vendorées (import.meta.glob = un seul point de
// vérité, pas 19 imports) et on résout transitivement (même algorithme que le CLI resolveSkills).
const SKILL_RAW = import.meta.glob("./fixtures/skills/*/SKILL.md", {
  query: "?raw", import: "default", eager: true,
}) as Record<string, string>;

const SUBSKILLS: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const [p, raw] of Object.entries(SKILL_RAW)) {
    const m = p.match(/\/skills\/([^/]+)\/SKILL\.md$/);
    if (!m) continue;
    const { data } = parseFrontmatter(raw);
    map[m[1]] = Array.isArray(data.subskills)
      ? (data.subskills as string[])
      : data.subskills ? [String(data.subskills)] : [];
  }
  return map;
})();

// Résolution transitive déterministe (dédoublonnage 1re occurrence) — miroir de cli resolve-skills.
function resolveSkills(declared: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const path: string[] = [];
  const visit = (s: string) => {
    if (path.includes(s)) throw new Error(`cycle: ${[...path, s].join(" -> ")}`);
    if (!seen.has(s)) { seen.add(s); out.push(s); }
    path.push(s);
    for (const sub of SUBSKILLS[s] ?? []) visit(sub);
    path.pop();
  };
  for (const s of declared) visit(s);
  return out;
}

// --- loader de fixture canon : persona .md → entrée de renderAgentContract ------------------------
function loadCanon(id: string, binding: Binding) {
  const raw = PERSONAS[id];
  const { data } = parseFrontmatter(raw);
  const declaredSkills = Array.isArray(data.skills) ? (data.skills as string[]) : [];
  return {
    id,
    description: typeof data.description === "string" ? data.description : "",
    tools: toolsForPersona(binding, id),
    skills: resolveSkills(declaredSkills),
    guardrails: Array.isArray(data.guardrails) ? (data.guardrails as string[]) : [],
    body: verbatimBody(raw),
  };
}

// Un golden = en-tête `<!-- … -->` PUIS le contrat (`---\n…`). Contenu utile = à partir du 1er
// `---\n` (l'en-tête n'en contient jamais). L'en-tête déclare `sha256 : <hex>`.
function splitGolden(raw: string): { useful: string; declaredSha: string } {
  const i = raw.indexOf("---\n");
  expect(i).toBeGreaterThan(0);
  const useful = raw.slice(i);
  const m = raw.slice(0, i).match(/^sha256\s*:\s*([0-9a-f]{64})\s*$/m);
  expect(m).not.toBeNull();
  return { useful, declaredSha: m![1] };
}

// sha256 via **Web Crypto** (globalThis.crypto.subtle — typé par la lib DOM, sans @types/node) :
// le cœur `@iakaframe/core` est zéro-dépendance, on n'introduit pas de types Node pour les tests.
async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("parité CLI ↔ GUI — golden de contrat d'agent (10 personas)", () => {
  const binding = loadBinding();

  it("rendu GUI == golden CLI byte-à-byte (name=id, tools câblés, guardrails, sans model)", () => {
    for (const id of IDS) {
      const { useful } = splitGolden(GOLDENS[id]);
      const rendered = renderAgentContract(loadCanon(id, binding));
      expect(rendered, `${id}: rendu GUI != golden`).toBe(useful);
    }
  });

  it("garde sha256 : hash déclaré == sha256 du contenu utile (anti-altération vendoring)", async () => {
    for (const id of IDS) {
      const { useful, declaredSha } = splitGolden(GOLDENS[id]);
      expect(await sha256(useful), `${id}: sha256 golden altéré`).toBe(declaredSha);
    }
  });

  it("format autorité : name=id, guardrails flow-list, jamais de model dans le contrat", () => {
    for (const id of IDS) {
      const rendered = renderAgentContract(loadCanon(id, binding));
      expect(rendered).toMatch(new RegExp(`^name: ${id}$`, "m"));
      expect(rendered).toMatch(/^guardrails: \[/m);
      expect(rendered).not.toMatch(/^model:/m);
    }
  });

  // Attendu 10/10 TIRÉ du binding vendoré lui-même (source unique). Parse DIRECT du frontmatter,
  // distinct de `loadBinding` : `expected[id]` et `toolsForPersona(binding, id)` empruntent deux
  // chemins depuis la même source → la couverture prouve que `toolsForPersona` surface fidèlement
  // les tools des 10 assignments, sans réécrire l'attendu à la main.
  const expectedTools: Record<string, string[]> = (() => {
    const { data } = parseFrontmatter(bindingMd);
    const rows = Array.isArray(data.assignments) ? data.assignments : [];
    const byId: Record<string, string[]> = {};
    for (const r of rows) {
      const a = r as Record<string, unknown>;
      byId[String(a.personaId ?? "")] = Array.isArray(a.tools) ? (a.tools as string[]) : [];
    }
    return byId;
  })();

  it("tools câblés depuis le binding vendoré — couverture 10/10 (attendu tiré du binding)", () => {
    // C-AC1 : les 10 ids, valeurs égales aux `tools` du binding vendoré correspondant. 10 depuis
    // la scission : `bindings/iakaframe-claude-default.md` vendoré porte un assignment `charon`.
    expect(Object.keys(expectedTools).sort()).toEqual(IDS);
    for (const id of IDS) {
      expect(toolsForPersona(binding, id), `${id}: tools != binding`).toEqual(expectedTools[id]);
    }
    // C-AC2 : ancre littérale anti-tautologie (attrape une altération de `loadBinding` qu'un test
    // 100 % dérivé du binding ne verrait pas) + forme scalaire-virgule du contrat. `Skill` en fin
    // de liste des 10 assignments (R8 § 5.3, Fait 3).
    expect(toolsForPersona(binding, "gimli")).toEqual([
      "Read", "Edit", "Write", "Bash", "Grep", "Glob", "Skill",
    ]);
    expect(renderAgentContract(loadCanon("gimli", binding))).toMatch(
      /^tools: Read, Edit, Write, Bash, Grep, Glob, Skill$/m,
    );
  });

  it("skills: projeté (liste résolue transitive) APRÈS tools, AVANT guardrails (R8 § 5.2)", () => {
    const gimli = renderAgentContract(loadCanon("gimli", binding));
    // chaîne fabrication résolue (7, jalon inclus) — parité avec le CLI resolveSkills.
    expect(gimli).toMatch(
      /^skills: \[iakaframe-fabrication, iakaframe-gestion-de-source, iakaframe-git, iakaframe-forgejo, iakaframe-conteneurisation, iakaframe-docker, iakaframe-jalon\]$/m,
    );
    expect(gimli).toMatch(/tools: [^\n]+\nskills: \[[^\n]+\]\nguardrails: \[/);
    // legolas : une seule skill déclarée, sans subskill → liste résolue = [iakaframe-qualite].
    expect(renderAgentContract(loadCanon("legolas", binding))).toMatch(
      /^skills: \[iakaframe-qualite\]$/m,
    );
  });
});
