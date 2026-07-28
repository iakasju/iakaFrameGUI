/// <reference types="vite/client" />
/**
 * patch-body.test.ts — chantier #4 « corps skill », côté cœur. Prouve la fonction **additive**
 * `patchBody` (image miroir de `patchFrontmatter`) : elle remplace **uniquement** le corps d'un `.md`
 * en **préservant le frontmatter à l'octet**, sur les `SKILL.md` RÉELS vendorés (les mêmes que
 * `iakaframe vendor-check` compare byte-à-byte au canon). Prouve aussi que l'atome (`parseSkill` +
 * `verbatimBody`) porte enfin le corps, `\n` de tête inclus. **Aucun `.md` canon touché** — test
 * additif pur (`patchBody` est du code cœur, drift 0 par construction).
 */
import { describe, it, expect } from "vitest";
import { parseFrontmatter, parseSkill, patchBody, verbatimBody } from "../src/index";

const skillMds = import.meta.glob("./fixtures/skills/*/SKILL.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const idOfSkill = (p: string): string => p.split("/").slice(-2, -1)[0];
const fixtures = Object.entries(skillMds)
  .map(([p, md]) => [idOfSkill(p), md] as [string, string])
  .sort((a, b) => a[0].localeCompare(b[0]));

describe("patchBody — AC5 : identité quand le corps est inchangé (round-trip byte)", () => {
  it("inventaire : des SKILL.md réels sont chargés", () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  for (const [id, md] of fixtures) {
    it(`skill ${id} : patchBody(md, verbatimBody(md)) === md (frontmatter + corps byte-identiques)`, () => {
      expect(patchBody(md, verbatimBody(md))).toBe(md);
    });
  }
});

describe("patchBody — corps édité : SEUL le corps change, frontmatter byte-préservé (AC2)", () => {
  // La fixture `iakaframe-fabrication` porte une clé load-bearing `layer: capacity` AU-DELÀ des
  // {id,name,description,subskills} — preuve de préservation.
  const md = skillMds["./fixtures/skills/iakaframe-fabrication/SKILL.md"];

  it("remplacer le corps ne touche AUCUN octet du frontmatter (layer/subskills/description intacts)", () => {
    const before = parseFrontmatter(md).data;
    const edited = patchBody(md, "\n# Corps réécrit par l'auteur\n\nNouveau payload.\n");
    const after = parseFrontmatter(edited).data;
    // Frontmatter byte-préservé : le head (jusqu'au `---` fermant inclus) est littéralement identique.
    const headOf = (s: string): string => s.slice(0, s.indexOf("\n---\n") + "\n---\n".length);
    expect(headOf(edited)).toBe(headOf(md));
    // Toutes les clés du frontmatter, y compris load-bearing/inconnues, intactes.
    expect(after.id).toBe(before.id);
    expect(after.name).toBe(before.name);
    expect(after.description).toBe(before.description);
    expect(after.layer).toBe(before.layer);
    expect(after.layer).toBe("capacity"); // clé load-bearing hors {id,name,description,subskills}
    expect(after.subskills).toEqual(before.subskills);
    // Seul le corps a changé.
    expect(verbatimBody(edited)).toBe("\n# Corps réécrit par l'auteur\n\nNouveau payload.\n");
    expect(verbatimBody(edited)).not.toBe(verbatimBody(md));
  });
});

describe("patchBody — défensif : document sans frontmatter délimité → rendu inchangé", () => {
  it("pas de `---` en tête → src rendu tel quel (jamais de corruption)", () => {
    const raw = "pas de frontmatter\nici\n";
    expect(patchBody(raw, "peu importe")).toBe(raw);
  });

  it("`---` ouvrant sans `---` fermant → src rendu tel quel", () => {
    const raw = "---\nid: x\ncorps sans fermeture\n";
    expect(patchBody(raw, "peu importe")).toBe(raw);
  });
});

describe("parseSkill — l'atome porte le corps via verbatimBody (AC3, `\\n` de tête préservé)", () => {
  const md = skillMds["./fixtures/skills/iakaframe-fabrication/SKILL.md"];

  it("le `.body` de l'atome === verbatimBody(md) (et NON parseFrontmatter().body, qui strippe le `\\n`)", () => {
    const s = parseSkill(parseFrontmatter(md).data, verbatimBody(md))!;
    expect(s.body).toBe(verbatimBody(md));
    // Le corps réel commence par la ligne blanche de tête (byte-parité du contrat déployé).
    expect(s.body.startsWith("\n")).toBe(true);
    // parseFrontmatter().body strippe ce `\n` de tête — d'où l'usage de verbatimBody.
    expect(parseFrontmatter(md).body.startsWith("\n")).toBe(false);
    // Round-trip : réécrire le corps de l'atome (inchangé) redonne le fichier byte-identique.
    expect(patchBody(md, s.body)).toBe(md);
  });

  it("`parseSkill(raw)` sans 2e argument reste rétrocompatible (body défaut `\"\"`)", () => {
    const s = parseSkill(parseFrontmatter(md).data)!;
    expect(s.body).toBe("");
  });
});
