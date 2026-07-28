import { describe, it, expect } from "vitest";
import { parseFrontmatter, parseSkill, verbatimBody, type SkillAtom } from "@iakaframe/core";
import type { Backend } from "../api/backend";
import { persistSkill } from "./skillPersist";

/** Backend factice minimal : mémorise l'écriture pour l'inspecter (le correctif Lot C). */
function fakeBackend(existing: string | null) {
  const writes: { id: string; md: string }[] = [];
  const api = {
    poolRead: async () => existing,
    poolWrite: async (_pool: string, id: string, md: string) => {
      writes.push({ id, md });
    },
  } as unknown as Backend;
  return { api, writes };
}

const REAL_MD = `---
id: iakaframe-git
name: iakaframe-git
description: Blurb initial du disque.
layer: family
subskills: [iakaframe-forgejo]
---

# iakaframe — git

Corps payload de la skill (préservé verbatim).
`;

/**
 * Reconstruit l'atome **comme buildFrame le ferait** : le corps DOIT toujours être capté par
 * `verbatimBody(md)` (jamais `""`). C'est l'invariant qui protège du wipe de corps (chantier #4) —
 * un atome construit sans corps écraserait le payload réel à l'écriture.
 */
function atomFrom(md: string): SkillAtom {
  return parseSkill(parseFrontmatter(md).data, verbatimBody(md))!;
}

describe("persistSkill — l'édition atteint enfin le disque (correctif Lot C, AC1)", () => {
  it("édition : la description ET les subskills édités sont écrits (fin du quasi no-op)", async () => {
    const { api, writes } = fakeBackend(REAL_MD);
    const edited: SkillAtom = {
      ...atomFrom(REAL_MD),
      description: "Blurb affûté par l'auteur",
      subskills: ["iakaframe-forgejo", "iakaframe-jalon"],
    };
    await persistSkill(edited, api);
    expect(writes).toHaveLength(1);
    const data = parseFrontmatter(writes[0].md).data;
    // Avant le Lot C, l'entrée de l'éditeur était jetée ; désormais elle est portée sur le disque.
    expect(data.description).toBe("Blurb affûté par l'auteur");
    expect(parseSkill(data)!.subskills).toEqual(["iakaframe-forgejo", "iakaframe-jalon"]);
    // Non-destructif : id/name (C-1) + clé load-bearing préservés.
    expect(data.id).toBe("iakaframe-git");
    expect(data.name).toBe("iakaframe-git");
    expect(data.layer).toBe("family");
    // ⚠️ Anti-wipe : le corps NON édité reste intact (l'atome portait verbatimBody).
    expect(writes[0].md).toContain("Corps payload de la skill (préservé verbatim).");
    expect(verbatimBody(writes[0].md)).toBe(verbatimBody(REAL_MD));
  });

  it("édition sans changement : réécriture byte-identique (round-trip AC3)", async () => {
    const { api, writes } = fakeBackend(REAL_MD);
    // L'atome porte le corps réel (verbatimBody) — comme buildFrame. Persister sans rien changer
    // laisse le fichier BYTE-IDENTIQUE (frontmatter ET corps), jamais de corps vide.
    await persistSkill(atomFrom(REAL_MD), api);
    expect(writes[0].md).toBe(REAL_MD);
  });

  it("chantier #4 — édition du CORPS : seul le corps change, frontmatter byte-préservé (AC2)", async () => {
    const { api, writes } = fakeBackend(REAL_MD);
    const edited: SkillAtom = {
      ...atomFrom(REAL_MD),
      body: "\n# iakaframe — git\n\nCorps RÉÉCRIT par l'auteur.\n",
    };
    await persistSkill(edited, api);
    const written = writes[0].md;
    // Seul le corps a changé.
    expect(verbatimBody(written)).toBe("\n# iakaframe — git\n\nCorps RÉÉCRIT par l'auteur.\n");
    // Frontmatter byte-préservé : le head jusqu'au `---` fermant est littéralement identique.
    const headOf = (s: string): string => s.slice(0, s.indexOf("\n---\n") + "\n---\n".length);
    expect(headOf(written)).toBe(headOf(REAL_MD));
    const data = parseFrontmatter(written).data;
    expect(data.description).toBe("Blurb initial du disque.");
    expect(data.layer).toBe("family");
    expect(parseSkill(data)!.subskills).toEqual(["iakaframe-forgejo"]);
  });

  it("chantier #4 — anti-wipe explicite : le corps réel survit quand il n'a pas été édité", async () => {
    // Cas nominal : l'atome porte TOUJOURS verbatimBody → le corps réel survit (pas de wipe).
    const { api, writes } = fakeBackend(REAL_MD);
    await persistSkill(atomFrom(REAL_MD), api);
    expect(verbatimBody(writes[0].md).length).toBeGreaterThan(0);
    expect(writes[0].md).toBe(REAL_MD);
  });

  it("création (fichier absent) : sérialise un SKILL.md neuf name == id, avec le corps saisi (AC4)", async () => {
    const { api, writes } = fakeBackend(null);
    await persistSkill(
      {
        id: "skill-neuve",
        name: "skill-neuve",
        description: "Neuve",
        subskills: [],
        body: "\n# Skill neuve\n\nPayload saisi à la création.\n",
      },
      api,
    );
    const data = parseFrontmatter(writes[0].md).data;
    expect(data.id).toBe("skill-neuve");
    expect(data.name).toBe("skill-neuve");
    expect(data.description).toBe("Neuve");
    expect(writes[0].md).not.toContain("subskills:"); // atomique → pas de ligne parasite
    expect(writes[0].md).toContain("Payload saisi à la création.");
  });
});
