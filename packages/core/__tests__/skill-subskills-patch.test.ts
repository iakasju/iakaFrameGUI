/// <reference types="vite/client" />
/**
 * skill-subskills-patch.test.ts — preuve du chantier #4 **Lot C** côté cœur : maintenant que
 * `subskills` (et `description`) deviennent **éditables** via `SkillEditor`/`ListEditor`, on prouve que
 * le patch reste **byte-préservant** sur les `SKILL.md` RÉELS vendorés (les mêmes que `iakaframe
 * vendor-check` compare byte-à-byte au canon), et **byte-minimal** en édition — le corps (payload) et
 * les clés load-bearing (`layer`, inconnues) restant intacts.
 *
 * Le cœur (`skillFrontmatterPatch`) était déjà posé au Lot 5c ; ce test **verrouille** le contrat pour
 * le Lot C (les champs deviennent réellement éditables côté UI) et couvre le champ `subskills` en
 * complément du `description` déjà éprouvé au 5c. **Aucun `.md` canon touché** : test additif pur.
 */
import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parseSkill,
  skillFrontmatterPatch,
  patchFrontmatter,
} from "../src/index";

const skillMds = import.meta.glob("./fixtures/skills/*/SKILL.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const idOfSkill = (p: string): string => p.split("/").slice(-2, -1)[0];
const composed = Object.entries(skillMds)
  .map(([p, md]) => [idOfSkill(p), md] as [string, string])
  .filter(([, md]) => /^subskills:/m.test(md))
  .sort((a, b) => a[0].localeCompare(b[0]));

/** Round-trip en ÉDITION SANS changement : `.md` → atome → patch → `.md`. */
function roundTrip(md: string): string {
  const s = parseSkill(parseFrontmatter(md).data);
  if (!s) throw new Error("skill illisible");
  return patchFrontmatter(md, skillFrontmatterPatch(s));
}

describe("Lot C — skill.subskills round-trip byte-préservant (AC3)", () => {
  it("inventaire : des skills COMPOSÉES (avec subskills) sont chargées", () => {
    expect(composed.length).toBeGreaterThan(0);
  });

  for (const [id, md] of composed) {
    it(`skill ${id} : lire → patcher (subskills incluses) sans édition → réécrire = identité byte`, () => {
      expect(roundTrip(md)).toBe(md);
    });
  }
});

describe("Lot C — édition subskills/description = diff minimal, load-bearing préservé (AC1/AC2/AC3)", () => {
  const git = skillMds["./fixtures/skills/iakaframe-git/SKILL.md"];

  it("ajouter une sous-skill ne touche QUE la ligne `subskills` (layer/description/corps intacts)", () => {
    const s = parseSkill(parseFrontmatter(git).data)!;
    expect(s.subskills.length).toBeGreaterThan(0);
    const edited = patchFrontmatter(
      git,
      skillFrontmatterPatch({ ...s, subskills: [...s.subskills, "iakaframe-jalon"] }),
    );
    const back = parseFrontmatter(edited).data;
    // La sous-skill ajoutée est là ; les précédentes préservées.
    expect(parseSkill(back)!.subskills).toEqual([...s.subskills, "iakaframe-jalon"]);
    // Clés load-bearing NON modélisées par le patch : préservées verbatim.
    expect(back.layer).toBe(parseFrontmatter(git).data.layer);
    expect(back.description).toBe(parseFrontmatter(git).data.description);
    expect(back.id).toBe("iakaframe-git");
    expect(back.name).toBe("iakaframe-git");
    // Le corps (payload) est préservé.
    expect(edited).toContain(git.split("---\n")[2].split("\n")[0]);
  });

  it("éditer la `description` ne touche NI subskills NI layer NI le corps", () => {
    const s = parseSkill(parseFrontmatter(git).data)!;
    const edited = patchFrontmatter(git, skillFrontmatterPatch({ ...s, description: "Nouveau blurb" }));
    const back = parseFrontmatter(edited).data;
    expect(back.description).toBe("Nouveau blurb");
    expect(parseSkill(back)!.subskills).toEqual(s.subskills); // subskills verbatim
    expect(back.layer).toBe(parseFrontmatter(git).data.layer);
  });

  it("honnêteté C-1 : muter `name`/`id` dans l'atome n'écrit RIEN (patch ne les émet jamais)", () => {
    const s = parseSkill(parseFrontmatter(git).data)!;
    // Même en trafiquant name/id, le patch (qui ne modélise que description/subskills) laisse le
    // fichier byte-identique dès lors que description/subskills sont inchangés.
    const edited = patchFrontmatter(git, skillFrontmatterPatch({ ...s, id: "USURPÉ", name: "USURPÉ" }));
    expect(edited).toBe(git); // id/name du disque intouchés → identité byte
  });
});
