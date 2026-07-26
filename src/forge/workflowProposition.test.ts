/**
 * workflowProposition.test.ts — parseur + résolveur du pool **workflow** (le cas riche, brique B).
 * Champs éditables `name/kind/phases[]` ; `kind` validé à l'énum, `roleKeys` filtrés au canon, gate
 * validée, `id`/`order` de phase dérivés ; C-1 : `id` du workflow jamais lu.
 */
import { describe, it, expect } from "vitest";
import { fakeLlm } from "./llm/transport";
import { resolveWorkflowProposition, parseWorkflowProposition } from "./workflowProposition";
import type { FeanorContext } from "./llm/advise";

const ctx: FeanorContext = { mode: "create", entityType: "workflow", entityName: null, entityRole: null };

describe("parseWorkflowProposition — name/kind/phases + validations + C-1", () => {
  it("reconstruit des phases valides : id dérivé, order = index, roleKeys filtrés, gate normalisée", () => {
    const p = parseWorkflowProposition(
      JSON.stringify({
        name: "Cycle iakaframe",
        kind: "cycle-with-gate",
        phases: [
          { name: "P1 — Cadrage", description: "besoin → instruction", roleKeys: ["cadrage", "INVENTE"], gate: { kind: "human", condition: "le décideur valide" } },
          { name: "P2 — Réalisation", roleKeys: ["dev"], gate: { kind: "auto", condition: "gate qualité" } },
        ],
      }),
    );
    expect(p?.name).toBe("Cycle iakaframe");
    expect(p?.kind).toBe("cycle-with-gate");
    expect(p?.phases).toEqual([
      {
        id: "p1-cadrage",
        order: 0,
        name: "P1 — Cadrage",
        description: "besoin → instruction",
        roleKeys: ["cadrage"], // "INVENTE" écarté (non canonique)
        gate: { kind: "human", condition: "le décideur valide" },
      },
      {
        id: "p2-realisation",
        order: 1,
        name: "P2 — Réalisation",
        description: "",
        roleKeys: ["dev"],
        gate: { kind: "auto", condition: "gate qualité" },
      },
    ]);
  });
  it("kind non canonique → écarté ; phase sans nom → ignorée ; gate absente → human/condition vide", () => {
    const p = parseWorkflowProposition(
      JSON.stringify({ name: "W", kind: "galaxie", phases: [{ description: "orpheline" }, { name: "Seule" }] }),
    );
    expect(p?.name).toBe("W");
    expect(p).not.toHaveProperty("kind");
    expect(p?.phases).toEqual([
      { id: "seule", order: 0, name: "Seule", description: "", roleKeys: [], gate: { kind: "human", condition: "" } },
    ]);
  });
  it("ids de phase uniques même en cas de noms identiques", () => {
    const p = parseWorkflowProposition(
      JSON.stringify({ phases: [{ name: "Phase" }, { name: "Phase" }] }),
    );
    expect(p?.phases?.map((ph) => ph.id)).toEqual(["phase", "phase-2"]);
  });
  it("C-1 : `id` du workflow jamais lu ; null si aucun champ retenu", () => {
    expect(parseWorkflowProposition('{"id":"HACK"}')).toBeNull();
    expect(parseWorkflowProposition('{"phases":[]}')).toBeNull();
  });
});

describe("resolveWorkflowProposition — live nominal (offline)", () => {
  it("live → champs structurés, source live", async () => {
    const r = await resolveWorkflowProposition("propose un workflow", ctx, {
      llm: fakeLlm('{"name":"W","kind":"pipeline","phases":[{"name":"P1","gate":{"kind":"human","condition":"c"}}]}'),
      model: "ollama:llama3",
    });
    expect(r.source).toBe("live");
    expect(r.proposition?.name).toBe("W");
    expect(r.proposition?.kind).toBe("pipeline");
    expect(r.proposition?.phases).toHaveLength(1);
  });
});
