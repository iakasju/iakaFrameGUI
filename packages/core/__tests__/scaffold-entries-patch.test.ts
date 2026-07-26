/// <reference types="vite/client" />
/**
 * scaffold-entries-patch.test.ts — preuve du chantier #4 Lot A côté cœur : l'élargissement de
 * `scaffoldFrontmatterPatch` avec `entries` (kind `blockmap`) est **byte-préservant** sur les `.md`
 * RÉELS vendorés (les mêmes que `iakaframe vendor-check` compare), et **byte-minimal** en édition.
 *
 * Deux garanties :
 *   1) round-trip SANS édition = identité byte (entries verbatim, `sameFrontmatterValue`) ;
 *   2) éditer UNE entrée (path/role/createIfAbsent) ou réordonner ne touche QUE le bloc `entries`,
 *      dans la forme canon `  - { path: "…", role: "…", createIfAbsent: bool }` — le reste du fichier
 *      (id, level, nonDestructive, corps) reste intact.
 */
import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parseScaffold,
  scaffoldFrontmatterPatch,
  patchFrontmatter,
  type Scaffold,
} from "../src/index";

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

/** Round-trip en ÉDITION SANS changement : `.md` → objet → patch → `.md`. */
function roundTrip(md: string): string {
  const s = parseScaffold(parseFrontmatter(md).data);
  if (!s) throw new Error("scaffold illisible");
  return patchFrontmatter(md, scaffoldFrontmatterPatch(s));
}

describe("Lot A — scaffold.entries round-trip byte-préservant (AC3)", () => {
  const scaffolds = entries(scaffoldMds);

  it("inventaire : les 2 scaffolds vendorés sont chargés", () => {
    expect(scaffolds.length).toBe(2);
  });

  for (const [id, md] of scaffolds) {
    it(`scaffold ${id} : lire → patcher (entries incluses) sans édition → réécrire = identité byte`, () => {
      expect(roundTrip(md)).toBe(md);
    });
  }
});

describe("Lot A — scaffold.entries édition = diff minimal, forme canon (AC2/AC3)", () => {
  const projet = scaffoldMds["./fixtures/scaffolds/projet.md"];

  it("éditer le `path` d'UNE entrée ne touche QUE cette ligne (forme bloc canon)", () => {
    const s = parseScaffold(parseFrontmatter(projet).data)!;
    const editedEntries = s.entries.map((e, i) =>
      i === 0 ? { ...e, path: "specs-renamed/" } : e,
    );
    const out = patchFrontmatter(
      projet,
      scaffoldFrontmatterPatch({ ...s, entries: editedEntries } as Scaffold),
    );

    const a = projet.split("\n");
    const b = out.split("\n");
    expect(b.length).toBe(a.length); // aucune ligne ajoutée/retirée
    const diff = a.map((l, i) => [l, b[i]] as const).filter(([x, y]) => x !== y);
    expect(diff.length).toBe(1); // une seule ligne change
    expect(diff[0][1]).toBe(
      '  - { path: "specs-renamed/", role: "espace cadrage / réflexion (jamais de code)", createIfAbsent: true }',
    );
    // Le reste (id, level, nonDestructive, corps) intact.
    expect(out).toContain("id: projet");
    expect(out).toContain("nonDestructive: true");
    expect(out).toContain("# Scaffold projet");
    // Relecture cohérente.
    const back = parseScaffold(parseFrontmatter(out).data)!;
    expect(back.entries[0].path).toBe("specs-renamed/");
    expect(back.entries).toHaveLength(s.entries.length);
  });

  it("ajouter une entrée l'écrit en forme bloc canon et préserve les précédentes", () => {
    const s = parseScaffold(parseFrontmatter(projet).data)!;
    const withNew: Scaffold = {
      ...s,
      entries: [...s.entries, { path: "docker/", role: "isolation Docker", createIfAbsent: true }],
    };
    const out = patchFrontmatter(projet, scaffoldFrontmatterPatch(withNew));
    expect(out).toContain('  - { path: "docker/", role: "isolation Docker", createIfAbsent: true }');
    // Les entrées d'origine sont toujours là, verbatim.
    expect(out).toContain(
      '  - { path: "specs/", role: "espace cadrage / réflexion (jamais de code)", createIfAbsent: true }',
    );
    const back = parseScaffold(parseFrontmatter(out).data)!;
    expect(back.entries).toHaveLength(s.entries.length + 1);
    expect(back.entries[back.entries.length - 1].path).toBe("docker/");
  });

  it("réordonner (↑/↓) les entrées ré-émet le bloc dans le nouvel ordre, sans perte", () => {
    const s = parseScaffold(parseFrontmatter(projet).data)!;
    const swapped = [...s.entries];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    const out = patchFrontmatter(projet, scaffoldFrontmatterPatch({ ...s, entries: swapped }));
    const back = parseScaffold(parseFrontmatter(out).data)!;
    expect(back.entries[0].path).toBe(s.entries[1].path);
    expect(back.entries[1].path).toBe(s.entries[0].path);
    expect(back.entries).toHaveLength(s.entries.length);
  });

  it("createIfAbsent: false est rendu nu (byte-parité canon portefeuille)", () => {
    const portefeuille = scaffoldMds["./fixtures/scaffolds/portefeuille.md"];
    const s = parseScaffold(parseFrontmatter(portefeuille).data)!;
    // édite le path de l'entrée .env (createIfAbsent: false) pour forcer la ré-émission du bloc
    const idx = s.entries.findIndex((e) => e.createIfAbsent === false);
    expect(idx).toBeGreaterThanOrEqual(0);
    const edited = s.entries.map((e, i) => (i === idx ? { ...e, path: ".env2" } : e));
    const out = patchFrontmatter(portefeuille, scaffoldFrontmatterPatch({ ...s, entries: edited }));
    expect(out).toContain("createIfAbsent: false }"); // rendu nu, pas "false"
  });
});
