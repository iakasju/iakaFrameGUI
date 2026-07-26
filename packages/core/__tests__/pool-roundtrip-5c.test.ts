/// <reference types="vite/client" />
/**
 * pool-roundtrip-5c.test.ts — la **preuve reine** du Lot 5c (persistance-5c-roles-guardrails-skills.md
 * AC3) : sur les `.md` RÉELS vendorés (byte-copies du canon `library/{roles,guardrails,skills}/`,
 * exactement ceux que `iakaframe vendor-check` compare), un cycle **lire → patcher SANS édition →
 * réécrire** est **byte-identique** à la source, pour CHACUN des 3 pools SANS parseur — dont le cas
 * **dossier** `skills/<id>/SKILL.md` (payload + ligne blanche de tête préservés).
 *
 * Généralisation du 5b (`pool-roundtrip-5b.test.ts`) aux pools sans parseur : un round-trip naïf
 * « type → serialize » jetterait les clés load-bearing non modélisées (role: `id`/`roleIndex`/`scope` ;
 * guardrail: `kind`/`hook`/`policy` ; skill: le corps) + le corps + la forme des listes.
 * `patchFrontmatter` ne réécrit une ligne que si sa valeur change, et préserve tout le reste à l'octet.
 */
import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parseRole,
  parseGuardrail,
  parseSkill,
  roleFrontmatterPatch,
  guardrailFrontmatterPatch,
  skillFrontmatterPatch,
  patchFrontmatter,
  serializeRoleMd,
  serializeGuardrailMd,
  serializeSkillMd,
} from "../src/index";

// Les fixtures RÉELLES vendorées (les mêmes que vendor-check compare byte-à-byte au canon).
const roleMds = import.meta.glob("./fixtures/roles/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const guardrailMds = import.meta.glob("./fixtures/guardrails/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
// skills : DOSSIER `<id>/SKILL.md` (glob imbriqué — le cas neuf du 5c).
const skillMds = import.meta.glob("./fixtures/skills/*/SKILL.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const idOfFlat = (p: string): string => p.split("/").pop()!.replace(/\.md$/, "");
const idOfSkill = (p: string): string => p.split("/").slice(-2, -1)[0]; // le nom du DOSSIER fait foi
const flatEntries = (r: Record<string, string>): [string, string][] =>
  Object.entries(r)
    .map(([p, md]) => [idOfFlat(p), md] as [string, string])
    .sort((a, b) => a[0].localeCompare(b[0]));
const skillEntries = (r: Record<string, string>): [string, string][] =>
  Object.entries(r)
    .map(([p, md]) => [idOfSkill(p), md] as [string, string])
    .sort((a, b) => a[0].localeCompare(b[0]));

function roleRoundTrip(md: string): string {
  const r = parseRole(parseFrontmatter(md).data);
  if (!r) throw new Error("rôle illisible");
  return patchFrontmatter(md, roleFrontmatterPatch(r));
}
function guardrailRoundTrip(md: string): string {
  const g = parseGuardrail(parseFrontmatter(md).data);
  if (!g) throw new Error("garde-fou illisible");
  return patchFrontmatter(md, guardrailFrontmatterPatch(g));
}
function skillRoundTrip(md: string): string {
  const s = parseSkill(parseFrontmatter(md).data);
  if (!s) throw new Error("skill illisible");
  return patchFrontmatter(md, skillFrontmatterPatch(s));
}

describe("Lot 5c — round-trip byte-préservant sur les `.md` réels (AC3)", () => {
  const roles = flatEntries(roleMds);
  const guardrails = flatEntries(guardrailMds);
  const skills = skillEntries(skillMds);

  it("inventaire : les 3 pools vendorés sont bien chargés (9 + 3 + 19)", () => {
    expect(roles.length).toBe(9);
    expect(guardrails.length).toBe(3);
    expect(skills.length).toBe(19);
  });

  for (const [id, md] of roles) {
    it(`role ${id} : lire → patcher sans édition → réécrire = identité byte`, () => {
      expect(roleRoundTrip(md)).toBe(md);
    });
  }
  for (const [id, md] of guardrails) {
    it(`guardrail ${id} : lire → patcher sans édition → réécrire = identité byte`, () => {
      expect(guardrailRoundTrip(md)).toBe(md);
    });
  }
  for (const [id, md] of skills) {
    it(`skill ${id} (SKILL.md) : lire → patcher sans édition → réécrire = identité byte`, () => {
      expect(skillRoundTrip(md)).toBe(md);
    });
  }
});

describe("Lot 5c — non-destructif : clés load-bearing PRÉSERVÉES (AC2)", () => {
  it("éditer le `label` d'un guardrail NE TOUCHE PAS `kind`/`hook`/`policy` ni le corps", () => {
    const md = guardrailMds["./fixtures/guardrails/identity.md"];
    const before = parseFrontmatter(md).data;
    const g = parseGuardrail(before)!;
    const edited = patchFrontmatter(md, guardrailFrontmatterPatch({ ...g, label: "Badges" }));
    const after = parseFrontmatter(edited).data;
    expect(after.kind).toBe(before.kind);
    expect(after.hook).toBe(before.hook);
    expect(after.policy).toBe(before.policy);
    expect(after.id).toBe("identity"); // id verrouillé (C-1)
    expect(after.label).toBe("Badges");
    // Diff minimal : seule la ligne du label a bougé.
    const a = md.split("\n");
    const b = edited.split("\n");
    expect(b.length).toBe(a.length);
    expect(a.map((l, i) => [l, b[i]]).filter(([x, y]) => x !== y).length).toBe(1);
  });

  it("éditer le `label` d'un rôle NE RECALCULE PAS `roleIndex` ni ne touche `scope`", () => {
    const md = roleMds["./fixtures/roles/cadrage.md"];
    const before = parseFrontmatter(md).data;
    const r = parseRole(before)!;
    const edited = patchFrontmatter(md, roleFrontmatterPatch({ ...r, label: "Cadreur" }));
    const after = parseFrontmatter(edited).data;
    expect(after.roleIndex).toBe(before.roleIndex); // préservé verbatim, jamais recalculé
    expect(after.scope).toBe(before.scope);
    expect(after.key).toBe("cadrage"); // clé verrouillée (C-1)
    expect(after.label).toBe("Cadreur");
  });

  it("éditer la `description` d'une skill préserve le corps (payload) et n'ajoute pas de `subskills` si absent", () => {
    // iakaframe-deploiement : skill ATOMIQUE (aucune ligne `subskills` au canon).
    const md = skillMds["./fixtures/skills/iakaframe-deploiement/SKILL.md"];
    const s = parseSkill(parseFrontmatter(md).data)!;
    expect(s.subskills.length).toBe(0);
    const edited = patchFrontmatter(md, skillFrontmatterPatch({ ...s, description: "Nouvelle description" }));
    // Aucune ligne `subskills:` ajoutée (piège du round-trip évité) ; corps intact.
    expect(edited).not.toContain("subskills:");
    expect(parseFrontmatter(edited).data.description).toBe("Nouvelle description");
    expect(parseFrontmatter(edited).data.name).toBe("iakaframe-deploiement"); // name verrouillé (C-1)
  });
});

describe("Lot 5c — sérialiseurs de création (fichier neuf, forme canonique)", () => {
  it("serializeRoleMd émet l'ordre `id, key, label, roleIndex, scope` et se relit", () => {
    const md = serializeRoleMd({ id: "audit", key: "audit", label: "Auditeur", roleIndex: 9, scope: "team" });
    expect(md).toBe("---\nid: audit\nkey: audit\nlabel: Auditeur\nroleIndex: 9\nscope: team\n---\n");
    expect(parseRole(parseFrontmatter(md).data)).toMatchObject({ id: "audit", key: "audit", roleIndex: 9 });
  });

  it("serializeGuardrailMd émet l'ordre `id, label, kind, hook, policy` et se relit", () => {
    const md = serializeGuardrailMd({ id: "gate", label: "Gate", kind: "custom", hook: "", policy: "P" });
    // `hook` vide → quoté `""` (renderScalar quote la chaîne vide pour rester relisible).
    expect(md).toBe('---\nid: gate\nlabel: Gate\nkind: custom\nhook: ""\npolicy: P\n---\n');
    expect(parseGuardrail(parseFrontmatter(md).data)).toMatchObject({ id: "gate", kind: "custom", policy: "P" });
  });

  it("serializeSkillMd omet `subskills` si vide, l'émet en flow-list sinon", () => {
    const atomic = serializeSkillMd({ id: "x-solo", name: "x-solo", description: "Solo" });
    expect(atomic).toBe("---\nid: x-solo\nname: x-solo\ndescription: Solo\n---\n");
    const composed = serializeSkillMd({ id: "x-comp", name: "x-comp", description: "C", subskills: ["a", "b"] });
    expect(composed).toBe("---\nid: x-comp\nname: x-comp\ndescription: C\nsubskills: [a, b]\n---\n");
    expect(parseSkill(parseFrontmatter(composed).data)).toMatchObject({ id: "x-comp", subskills: ["a", "b"] });
  });
});
