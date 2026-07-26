/// <reference types="vite/client" />
/**
 * pool-roundtrip-5b.test.ts — la **preuve reine** du Lot 5b (persistance-disque-authoring-elements.md
 * § 5b, AC3) : sur les `.md` RÉELS vendorés (byte-copies du canon `library/<pool>/`, exactement ceux
 * que `iakaframe vendor-check` compare), un cycle **lire → patcher SANS édition → réécrire** est
 * **byte-identique** à la source, pour CHACUN des 3 pools (principles / rituals / scaffolds).
 *
 * C'est le round-trip non-destructif du 5a (`frontmatter-patch.test.ts`) généralisé aux 3 pools :
 * un round-trip naïf « type → serialize » échouerait (il jette les clés non modélisées — `cadence`,
 * `timebox` pour un rituel — le corps, et la forme bloc des listes). `patchFrontmatter` ne réécrit
 * une ligne que si sa valeur change réellement, et préserve tout le reste à l'octet.
 */
import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parsePrinciple,
  parseRitual,
  parseScaffold,
  principleFrontmatterPatch,
  ritualFrontmatterPatch,
  scaffoldFrontmatterPatch,
  patchFrontmatter,
  serializePrincipleMd,
  serializeRitualMd,
  serializeScaffoldMd,
} from "../src/index";

// Les fixtures RÉELLES vendorées (les mêmes que vendor-check compare byte-à-byte à library/<pool>/).
const principleMds = import.meta.glob("./fixtures/principles/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const ritualMds = import.meta.glob("./fixtures/rituals/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const scaffoldMds = import.meta.glob("./fixtures/scaffolds/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const idOf = (path: string): string => path.split("/").pop()!.replace(/\.md$/, "");
const entries = (r: Record<string, string>): [string, string][] =>
  Object.entries(r)
    .map(([p, md]) => [idOf(p), md] as [string, string])
    .sort((a, b) => a[0].localeCompare(b[0]));

/** Round-trip en ÉDITION SANS changement : `.md` → objet → patch → `.md` doit être l'identité. */
function principleRoundTrip(md: string): string {
  const p = parsePrinciple(parseFrontmatter(md).data);
  if (!p) throw new Error("principe illisible");
  return patchFrontmatter(md, principleFrontmatterPatch(p));
}
function ritualRoundTrip(md: string): string {
  const r = parseRitual(parseFrontmatter(md).data);
  if (!r) throw new Error("rituel illisible");
  return patchFrontmatter(md, ritualFrontmatterPatch(r));
}
function scaffoldRoundTrip(md: string): string {
  const s = parseScaffold(parseFrontmatter(md).data);
  if (!s) throw new Error("scaffold illisible");
  return patchFrontmatter(md, scaffoldFrontmatterPatch(s));
}

describe("Lot 5b — round-trip byte-préservant sur les `.md` réels (AC3)", () => {
  const principles = entries(principleMds);
  const rituals = entries(ritualMds);
  const scaffolds = entries(scaffoldMds);

  it("inventaire : les 3 pools vendorés sont bien chargés (18 + 5 + 2)", () => {
    expect(principles.length).toBe(18);
    expect(rituals.length).toBe(5);
    expect(scaffolds.length).toBe(2);
  });

  for (const [id, md] of principles) {
    it(`principle ${id} : lire → patcher sans édition → réécrire = identité byte`, () => {
      expect(principleRoundTrip(md)).toBe(md);
    });
  }
  for (const [id, md] of rituals) {
    it(`ritual ${id} : lire → patcher sans édition → réécrire = identité byte`, () => {
      expect(ritualRoundTrip(md)).toBe(md);
    });
  }
  for (const [id, md] of scaffolds) {
    it(`scaffold ${id} : lire → patcher sans édition → réécrire = identité byte`, () => {
      expect(scaffoldRoundTrip(md)).toBe(md);
    });
  }
});

describe("Lot 5b — non-destructif : clés non modélisées PRÉSERVÉES (AC2)", () => {
  it("éditer le `level` d'un scaffold NE FAIT PAS disparaître `entries` (tableau riche non éditable)", () => {
    const md = scaffoldMds["./fixtures/scaffolds/projet.md"];
    const before = parseFrontmatter(md).data;
    expect(Array.isArray(before.entries)).toBe(true);
    expect((before.entries as unknown[]).length).toBeGreaterThan(0);

    const s = parseScaffold(before)!;
    const edited = patchFrontmatter(md, scaffoldFrontmatterPatch({ ...s, level: "portfolio" }));
    const after = parseFrontmatter(edited).data;

    // entries + nonDestructive (hors patch) préservés ; corps intact ; seul `level` a bougé.
    expect(JSON.stringify(after.entries)).toBe(JSON.stringify(before.entries));
    expect(after.nonDestructive).toBe(before.nonDestructive);
    expect(after.id).toBe("projet"); // id verrouillé (C-1)
    expect(after.level).toBe("portfolio");
    expect(edited).toContain("# Scaffold projet");
  });

  it("éditer le `label` d'un rituel préserve la forme bloc des `actions` + le `side`", () => {
    const md = ritualMds["./fixtures/rituals/snapshot.md"];
    const r = parseRitual(parseFrontmatter(md).data)!;
    const edited = patchFrontmatter(md, ritualFrontmatterPatch({ ...r, label: "État des lieux" }));
    // La forme bloc (`  - "..."`) des actions est intacte (aucune valeur d'action n'a changé).
    expect(edited).toContain('  - "Capter les faits git');
    expect(edited).toContain("side: cockpit");
    expect(parseFrontmatter(edited).data.label).toBe("État des lieux");
  });

  it("un principe édité sur son seul `label` ne touche QUE la ligne du label (diff minimal)", () => {
    const md = principleMds["./fixtures/principles/qualite.md"];
    const p = parsePrinciple(parseFrontmatter(md).data)!;
    const edited = patchFrontmatter(md, principleFrontmatterPatch({ ...p, label: "Qualité mineure" }));
    const a = md.split("\n");
    const b = edited.split("\n");
    expect(b.length).toBe(a.length);
    const diff = a.map((l, i) => [l, b[i]] as const).filter(([x, y]) => x !== y);
    expect(diff.length).toBe(1);
    expect(diff[0][1]).toBe("label: Qualité mineure");
  });
});

describe("Lot 5b — sérialiseurs de création (fichier neuf, forme canonique)", () => {
  it("serializePrincipleMd émet l'ordre de champ des fichiers réels et se relit", () => {
    const md = serializePrincipleMd({
      id: "flow", label: "Manage flow", policy: "Piloter le flux, pas les gens.", trigger: "revue",
    });
    expect(md).toBe(
      "---\nid: flow\nlabel: Manage flow\npolicy: Piloter le flux, pas les gens.\ntrigger: revue\n---\n",
    );
    const back = parsePrinciple(parseFrontmatter(md).data);
    expect(back).toMatchObject({ id: "flow", label: "Manage flow", trigger: "revue" });
  });

  it("serializeRitualMd émet `triggers`/`actions` en flow-list et se relit", () => {
    const md = serializeRitualMd({
      id: "kickoff", label: "Kickoff", triggers: ["kickoff"], actions: ["Reunir the team", "Cadrer"], side: "forge",
    });
    // « Reunir the team » contient des espaces → quoté en flow-list (needsListQuote) ; « Cadrer » nu.
    expect(md).toBe(
      "---\nid: kickoff\nlabel: Kickoff\ntriggers: [kickoff]\nactions: [\"Reunir the team\", Cadrer]\nside: forge\n---\n",
    );
    const back = parseRitual(parseFrontmatter(md).data);
    expect(back).toMatchObject({ id: "kickoff", side: "forge", triggers: ["kickoff"] });
  });

  it("serializeScaffoldMd émet `entries: []` (non éditable au MVP) et `nonDestructive: true`", () => {
    const md = serializeScaffoldMd({ id: "svc", level: "project" });
    expect(md).toBe("---\nid: svc\nlevel: project\nnonDestructive: true\nentries: []\n---\n");
    const back = parseScaffold(parseFrontmatter(md).data);
    expect(back).toMatchObject({ id: "svc", level: "project", nonDestructive: true, entries: [] });
  });
});
