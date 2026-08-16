/// <reference types="vite/client" />
/**
 * role-scope-patch.test.ts — preuve du chantier #4 Lot B côté cœur : l'élargissement de
 * `roleFrontmatterPatch` avec `scope` (scalaire) est **byte-préservant** sur les `.md` RÉELS vendorés
 * (les mêmes que `iakaframe vendor-check` compare), et **byte-minimal** en édition.
 *
 * Trois garanties :
 *   1) round-trip SANS édition = identité byte (label + scope verbatim, `sameFrontmatterValue`) ;
 *   2) éditer `scope` (ou `label`) ne touche QUE la ligne concernée — le reste (id, key, roleIndex,
 *      corps) reste intact ;
 *   3) HONNÊTETÉ (AC1) : `roleIndex` n'est **jamais** émis par le patch — le modifier dans l'objet
 *      `Role` laisse le fichier byte-identique (verrou « préservé, jamais recalculé », pas un fantôme).
 */
import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parseRole,
  roleFrontmatterPatch,
  patchFrontmatter,
  type Role,
} from "../src/index";

const roleMds = import.meta.glob("./fixtures/roles/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const idOf = (path: string): string => path.split("/").pop()!.replace(/\.md$/, "");
const entries = (r: Record<string, string>): [string, string][] =>
  Object.entries(r)
    .map(([p, md]) => [idOf(p), md] as [string, string])
    .sort((a, b) => a[0].localeCompare(b[0]));

/** Round-trip en ÉDITION SANS changement : `.md` → objet → patch → `.md`. */
function roundTrip(md: string): string {
  const r = parseRole(parseFrontmatter(md).data);
  if (!r) throw new Error("rôle illisible");
  return patchFrontmatter(md, roleFrontmatterPatch(r));
}

describe("Lot B — role.scope round-trip byte-préservant (AC3)", () => {
  const roles = entries(roleMds);

  // 10 depuis la scission du squad prod (canon 0.39.0) : `library/roles/surveillance.md` vendoré.
  it("inventaire : les 10 rôles vendorés sont chargés", () => {
    expect(roles.length).toBe(10);
  });

  for (const [id, md] of roles) {
    it(`rôle ${id} : lire → patcher (scope inclus) sans édition → réécrire = identité byte`, () => {
      expect(roundTrip(md)).toBe(md);
    });
  }
});

describe("Lot B — role.scope édition = diff minimal (AC2/AC3)", () => {
  const dev = roleMds["./fixtures/roles/dev.md"];

  it("éditer `scope` ne touche QUE la ligne scope", () => {
    const r = parseRole(parseFrontmatter(dev).data)!;
    const out = patchFrontmatter(dev, roleFrontmatterPatch({ ...r, scope: "persona" }));

    const a = dev.split("\n");
    const b = out.split("\n");
    expect(b.length).toBe(a.length);
    const diff = a.map((l, i) => [l, b[i]] as const).filter(([x, y]) => x !== y);
    expect(diff.length).toBe(1);
    expect(diff[0][1]).toBe("scope: persona");
    // Le reste (id, key, label, roleIndex, corps) intact.
    expect(out).toContain("id: dev");
    expect(out).toContain("key: dev");
    expect(out).toContain("roleIndex: 4");
    expect(out).toContain("# Développeur");
    // Relecture cohérente.
    expect(parseRole(parseFrontmatter(out).data)!.scope).toBe("persona");
  });

  it("éditer `label` ne touche QUE la ligne label (scope reste verbatim)", () => {
    const r = parseRole(parseFrontmatter(dev).data)!;
    const out = patchFrontmatter(dev, roleFrontmatterPatch({ ...r, label: "Dev renommé" }));
    const diff = dev.split("\n").map((l, i) => [l, out.split("\n")[i]] as const).filter(([x, y]) => x !== y);
    expect(diff.length).toBe(1);
    expect(diff[0][1]).toBe("label: Dev renommé");
    expect(out).toContain("scope: team");
  });
});

describe("Lot B — HONNÊTETÉ : roleIndex jamais persisté par l'édition (AC1/C-1)", () => {
  for (const [id, md] of entries(roleMds)) {
    it(`rôle ${id} : modifier roleIndex dans l'objet Role laisse le fichier byte-identique`, () => {
      const r = parseRole(parseFrontmatter(md).data)!;
      const tampered: Role = { ...r, roleIndex: r.roleIndex + 42 };
      // label + scope inchangés → seul roleIndex « change » côté objet, mais il n'est pas patché.
      expect(patchFrontmatter(md, roleFrontmatterPatch(tampered))).toBe(md);
    });
  }
});
