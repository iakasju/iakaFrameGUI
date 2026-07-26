import { describe, it, expect } from "vitest";
import { parseFrontmatter, parseSkill, type SkillAtom } from "@iakaframe/core";
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

describe("persistSkill — l'édition atteint enfin le disque (correctif Lot C, AC1)", () => {
  it("édition : la description ET les subskills édités sont écrits (fin du quasi no-op)", async () => {
    const { api, writes } = fakeBackend(REAL_MD);
    const edited: SkillAtom = {
      id: "iakaframe-git",
      name: "iakaframe-git",
      description: "Blurb affûté par l'auteur",
      subskills: ["iakaframe-forgejo", "iakaframe-jalon"],
    };
    await persistSkill(edited, api);
    expect(writes).toHaveLength(1);
    const data = parseFrontmatter(writes[0].md).data;
    // Avant le Lot C, l'entrée de l'éditeur était jetée ; désormais elle est portée sur le disque.
    expect(data.description).toBe("Blurb affûté par l'auteur");
    expect(parseSkill(data)!.subskills).toEqual(["iakaframe-forgejo", "iakaframe-jalon"]);
    // Non-destructif : id/name (C-1) + clé load-bearing + corps préservés.
    expect(data.id).toBe("iakaframe-git");
    expect(data.name).toBe("iakaframe-git");
    expect(data.layer).toBe("family");
    expect(writes[0].md).toContain("Corps payload de la skill (préservé verbatim).");
  });

  it("édition sans changement : réécriture byte-identique (round-trip AC3)", async () => {
    const { api, writes } = fakeBackend(REAL_MD);
    const same = parseSkill(parseFrontmatter(REAL_MD).data)!;
    await persistSkill(same, api);
    expect(writes[0].md).toBe(REAL_MD);
  });

  it("création (fichier absent) : sérialise un SKILL.md neuf name == id", async () => {
    const { api, writes } = fakeBackend(null);
    await persistSkill(
      { id: "skill-neuve", name: "skill-neuve", description: "Neuve", subskills: [] },
      api,
    );
    const data = parseFrontmatter(writes[0].md).data;
    expect(data.id).toBe("skill-neuve");
    expect(data.name).toBe("skill-neuve");
    expect(data.description).toBe("Neuve");
    expect(writes[0].md).not.toContain("subskills:"); // atomique → pas de ligne parasite
  });
});
