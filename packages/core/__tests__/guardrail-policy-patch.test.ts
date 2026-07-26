/// <reference types="vite/client" />
/**
 * guardrail-policy-patch.test.ts — preuve du chantier #4 Lot B côté cœur : l'élargissement de
 * `guardrailFrontmatterPatch` avec `policy` (scalaire) est **byte-préservant** sur les `.md` RÉELS
 * vendorés (les mêmes que `iakaframe vendor-check` compare), et **byte-minimal** en édition.
 *
 * Trois garanties :
 *   1) round-trip SANS édition = identité byte (label + policy verbatim, `sameFrontmatterValue`) ;
 *   2) éditer `policy` (ou `label`) ne touche QUE la ligne concernée — le reste (id, kind, hook,
 *      corps) reste intact ;
 *   3) HONNÊTETÉ (AC1) : `kind` et `hook` (load-bearing) ne sont **jamais** émis par le patch — les
 *      modifier dans l'atome laisse le fichier byte-identique (verrous, pas des fantômes).
 */
import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parseGuardrail,
  guardrailFrontmatterPatch,
  patchFrontmatter,
  type GuardrailAtom,
} from "../src/index";

const guardrailMds = import.meta.glob("./fixtures/guardrails/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const idOf = (path: string): string => path.split("/").pop()!.replace(/\.md$/, "");
const entries = (r: Record<string, string>): [string, string][] =>
  Object.entries(r)
    .map(([p, md]) => [idOf(p), md] as [string, string])
    .sort((a, b) => a[0].localeCompare(b[0]));

/** Round-trip en ÉDITION SANS changement : `.md` → atome → patch → `.md`. */
function roundTrip(md: string): string {
  const g = parseGuardrail(parseFrontmatter(md).data);
  if (!g) throw new Error("garde-fou illisible");
  return patchFrontmatter(md, guardrailFrontmatterPatch(g));
}

describe("Lot B — guardrail.policy round-trip byte-préservant (AC3)", () => {
  const guardrails = entries(guardrailMds);

  it("inventaire : les 3 gardes-fous vendorés sont chargés", () => {
    expect(guardrails.length).toBe(3);
  });

  for (const [id, md] of guardrails) {
    it(`garde ${id} : lire → patcher (policy incluse) sans édition → réécrire = identité byte`, () => {
      expect(roundTrip(md)).toBe(md);
    });
  }
});

describe("Lot B — guardrail.policy édition = diff minimal (AC2/AC3)", () => {
  const identity = guardrailMds["./fixtures/guardrails/identity.md"];

  it("éditer `policy` ne touche QUE la ligne policy", () => {
    const g = parseGuardrail(parseFrontmatter(identity).data)!;
    const out = patchFrontmatter(
      identity,
      guardrailFrontmatterPatch({ ...g, policy: "Nouvelle politique de test." }),
    );

    const a = identity.split("\n");
    const b = out.split("\n");
    expect(b.length).toBe(a.length);
    const diff = a.map((l, i) => [l, b[i]] as const).filter(([x, y]) => x !== y);
    expect(diff.length).toBe(1);
    expect(diff[0][1]).toBe("policy: Nouvelle politique de test.");
    // Le reste (id, label, kind, hook, corps) intact.
    expect(out).toContain("id: identity");
    expect(out).toContain("kind: identity");
    expect(out).toContain('hook: "Stop;SubagentStop;UserPromptSubmit"');
    // Relecture cohérente.
    expect(parseGuardrail(parseFrontmatter(out).data)!.policy).toBe("Nouvelle politique de test.");
  });

  it("éditer `label` ne touche QUE la ligne label (policy reste verbatim)", () => {
    const g = parseGuardrail(parseFrontmatter(identity).data)!;
    const out = patchFrontmatter(identity, guardrailFrontmatterPatch({ ...g, label: "Badge renommé" }));
    const diff = identity
      .split("\n")
      .map((l, i) => [l, out.split("\n")[i]] as const)
      .filter(([x, y]) => x !== y);
    expect(diff.length).toBe(1);
    expect(diff[0][1]).toBe("label: Badge renommé");
    // policy verbatim (quotée comme au canon).
    expect(out).toContain('policy: "La position de la pastille');
  });
});

describe("Lot B — HONNÊTETÉ : kind/hook load-bearing jamais persistés par l'édition (AC1/AC4)", () => {
  for (const [id, md] of entries(guardrailMds)) {
    it(`garde ${id} : modifier kind/hook dans l'atome laisse le fichier byte-identique`, () => {
      const g = parseGuardrail(parseFrontmatter(md).data)!;
      const tampered: GuardrailAtom = { ...g, kind: "TAMPERED", hook: "TAMPERED" };
      // label + policy inchangés → seuls kind/hook « changent » côté objet, mais ils ne sont pas patchés.
      expect(patchFrontmatter(md, guardrailFrontmatterPatch(tampered))).toBe(md);
    });
  }
});
