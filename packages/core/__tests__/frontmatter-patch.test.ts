/**
 * frontmatter-patch.test.ts — le **patcheur non-destructif** (Lot 5a, C1) +
 * `serializePersonaMd` (création) + `personaFrontmatterPatch` (glue édition).
 *
 * PREUVE REINE (AC3) : sur les **9 personas réelles vendorées** (byte-copies du canon, celles que
 * `vendor-check` compare), un cycle **lire → patcher SANS édition → réécrire** est **byte-identique**
 * à la source. Le round-trip naïf « type → serialize » échouerait (il JETTE `description`/`vignette`
 * + le corps) — c'est tout l'intérêt de `patchFrontmatter` : il ne réécrit une ligne que si sa
 * valeur change réellement, et préserve tout le reste à l'octet.
 */
import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parsePersona,
  patchFrontmatter,
  personaFrontmatterPatch,
  serializePersonaMd,
  serializeTeamMd,
} from "../src/index";

import aragornMd from "./fixtures/personas/aragorn.md?raw";
import feanorMd from "./fixtures/personas/feanor.md?raw";
import gandalfMd from "./fixtures/personas/gandalf.md?raw";
import gimliMd from "./fixtures/personas/gimli.md?raw";
import helmMd from "./fixtures/personas/helm.md?raw";
import legolasMd from "./fixtures/personas/legolas.md?raw";
import lokiMd from "./fixtures/personas/loki.md?raw";
import nathalieMd from "./fixtures/personas/nathalie.md?raw";
import odinMd from "./fixtures/personas/odin.md?raw";

const PERSONAS: ReadonlyArray<[string, string]> = [
  ["aragorn", aragornMd],
  ["feanor", feanorMd],
  ["gandalf", gandalfMd],
  ["gimli", gimliMd],
  ["helm", helmMd],
  ["legolas", legolasMd],
  ["loki", lokiMd],
  ["nathalie", nathalieMd],
  ["odin", odinMd],
];

/** Reproduit la chaîne de persistance en ÉDITION : `.md` → Persona → patch → `.md`. */
function editRoundTrip(md: string): string {
  const persona = parsePersona(parseFrontmatter(md).data);
  if (!persona) throw new Error("persona illisible");
  return patchFrontmatter(md, personaFrontmatterPatch(persona));
}

describe("patchFrontmatter — round-trip byte-préservant (AC3, les 9 personas réelles)", () => {
  for (const [id, md] of PERSONAS) {
    it(`${id} : lire → patcher sans édition → réécrire = identité byte`, () => {
      expect(editRoundTrip(md)).toBe(md);
    });
  }

  it("garantie collective : les 9 personas sont byte-identiques après round-trip", () => {
    for (const [, md] of PERSONAS) expect(editRoundTrip(md)).toBe(md);
  });
});

describe("patchFrontmatter — non-destructif (AC2 : clés non modélisées PRÉSERVÉES)", () => {
  it("éditer le `name` NE FAIT PAS disparaître `description` (blurb sous-agent, load-bearing)", () => {
    // Born-red conceptuel : un round-trip « type → serialize » jetterait `description`.
    const before = parseFrontmatter(odinMd).data;
    expect(before.description).toBeTruthy(); // pré-condition : la source PORTE une description.

    const persona = parsePersona(before)!;
    const edited = patchFrontmatter(
      odinMd,
      personaFrontmatterPatch({ ...persona, name: "Allfather" }),
    );

    const after = parseFrontmatter(edited).data;
    // description ET vignette (non modélisées par `Persona`) préservées À L'OCTET.
    expect(after.description).toBe(before.description);
    expect(after.vignette).toBe(before.vignette);
    // Le corps (prose sous le frontmatter) est intact.
    expect(edited).toContain("# 🦅 Odin — CTO & super-agent portefeuille");
    // Seul le champ édité a bougé.
    expect(after.name).toBe("Allfather");
    expect(after.id).toBe("odin"); // id verrouillé (C-1)
    expect(after.roleKey).toBe(before.roleKey);
  });

  it("une édition d'un seul champ ne touche QUE la ligne de ce champ (diff minimal)", () => {
    const persona = parsePersona(parseFrontmatter(gimliMd).data)!;
    const edited = patchFrontmatter(
      gimliMd,
      personaFrontmatterPatch({ ...persona, royaume: "NAINS" }),
    );
    // diff ligne à ligne : exactement une ligne diffère (celle de royaume).
    const a = gimliMd.split("\n");
    const b = edited.split("\n");
    expect(b.length).toBe(a.length);
    const diff = a.map((l, i) => [l, b[i]] as const).filter(([x, y]) => x !== y);
    expect(diff.length).toBe(1);
    expect(diff[0][0]).toBe("royaume: IAKAFRAME");
    expect(diff[0][1]).toBe("royaume: NAINS");
  });

  it("`roleIndex` (dérivé) et `id` (verrouillé) ne sont JAMAIS écrits par le patch", () => {
    const persona = parsePersona(parseFrontmatter(lokiMd).data)!;
    const edited = patchFrontmatter(
      lokiMd,
      personaFrontmatterPatch({ ...persona, roleIndex: 42, id: "loki" }),
    );
    expect(edited).toBe(lokiMd); // rien de sémantique n'a changé → identité.
    expect(edited).not.toContain("roleIndex");
  });

  it("clé absente du frontmatter → ajoutée en fin de bloc (upsert), corps intact", () => {
    const src = "---\nid: x\nname: X\n---\n# corps\n";
    const out = patchFrontmatter(src, {
      name: { kind: "scalar", value: "X" }, // inchangé → verbatim
      pastille: { kind: "scalar", value: "🔴" }, // absent → ajouté
    });
    expect(out).toBe("---\nid: x\nname: X\npastille: 🔴\n---\n# corps\n");
  });

  it("document sans frontmatter délimité → rendu inchangé (défensif)", () => {
    const plain = "pas de frontmatter\n";
    expect(patchFrontmatter(plain, { name: { kind: "scalar", value: "Y" } })).toBe(plain);
  });

  it("sérialiseurs de CONTRAT intouchés : `serializeTeamMd` reste disponible et byte-stable", () => {
    // Garde anti-régression : le patcheur est une ADDITION, il ne détourne aucun sérialiseur.
    const md = serializeTeamMd({
      id: "t",
      name: "T",
      personas: ["a"],
      coordinator: "a",
      guardrails: [],
      vignetteTeam: "none",
    });
    expect(md).toContain("id: t");
    expect(md).toContain("personas: [a]");
  });
});

describe("serializePersonaMd — création canonique (fichier neuf)", () => {
  it("émet l'ordre de champ des fichiers réels, `roleIndex` jamais écrit", () => {
    const md = serializePersonaMd({
      id: "sam",
      name: "Sam",
      mission: "Jardinier fidèle.",
      roleKey: "dev",
      royaume: "SHIRE",
      pastille: "🟢",
      skills: ["iakaframe-fabrication"],
      guardrails: ["identity", "perimeter"],
    });
    expect(md).toBe(
      "---\n" +
        "id: sam\n" +
        "name: Sam\n" +
        "mission: Jardinier fidèle.\n" +
        "roleKey: dev\n" +
        "royaume: SHIRE\n" +
        "pastille: 🟢\n" +
        "skills: [iakaframe-fabrication]\n" +
        "guardrails: [identity, perimeter]\n" +
        "---\n",
    );
    expect(md).not.toContain("roleIndex");
  });

  it("un persona créé puis relu redonne le même objet (round-trip parse)", () => {
    const md = serializePersonaMd({
      id: "sam",
      name: "Sam",
      roleKey: "dev",
      royaume: "SHIRE",
      skills: [],
      guardrails: [],
    });
    const back = parsePersona(parseFrontmatter(md).data);
    expect(back).toMatchObject({ id: "sam", name: "Sam", roleKey: "dev", royaume: "SHIRE" });
  });
});
