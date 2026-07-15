import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parseTeamMd,
  serializeTeamMd,
  type TeamMd,
} from "../src/frontmatter";
import goldenTeam from "./fixtures/team.iakaframe-8.md?raw";

const t: TeamMd = {
  id: "iakaframe-8",
  name: "La compagnie iakaframe",
  personas: ["odin", "aragorn", "gandalf", "gimli", "legolas", "helm", "loki", "nathalie"],
  coordinator: "aragorn",
  guardrails: ["identity", "perimeter", "delegation"],
  vignetteTeam: "none",
};

describe("teamMd — (dé)sérialisation frontmatter (§3.9)", () => {
  it("round-trip : parseTeamMd(serializeTeamMd(t)) ≡ t", () => {
    expect(parseTeamMd(serializeTeamMd(t))).toEqual(t);
  });

  it("round-trip d'une team vide (listes vides, coordinator vide)", () => {
    const empty: TeamMd = {
      id: "vide",
      name: "vide",
      personas: [],
      coordinator: "",
      guardrails: [],
      vignetteTeam: "none",
    };
    expect(parseTeamMd(serializeTeamMd(empty))).toEqual(empty);
  });

  it("byte-parité : reproduit exactement la golden fixture (CLI-compatible)", () => {
    const { body } = parseFrontmatter(goldenTeam);
    const parsed = parseTeamMd(goldenTeam)!;
    expect(serializeTeamMd(parsed, body)).toBe(goldenTeam);
  });

  it("le texte produit débute par `---` et contient `id:`", () => {
    const md = serializeTeamMd(t);
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("id: iakaframe-8");
  });

  it("parse défensif : sans `id` → null (jamais d'exception)", () => {
    expect(parseTeamMd("---\nname: x\n---\n")).toBeNull();
    expect(parseTeamMd("")).toBeNull();
    expect(parseTeamMd(null)).toBeNull();
  });
});
