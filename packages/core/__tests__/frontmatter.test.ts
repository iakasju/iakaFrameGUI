import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  _frontmatterInternal as I,
} from "../src/frontmatter";

describe("parseFrontmatter — sous-ensemble YAML de la bibliothèque (miroir CLI)", () => {
  it("sépare le frontmatter du corps et préserve le corps tel quel", () => {
    const { data, body } = parseFrontmatter(
      "---\nid: x\n---\n# Titre\n\nDeux lignes.\n",
    );
    expect(data.id).toBe("x");
    expect(body).toBe("# Titre\n\nDeux lignes.\n");
  });

  it("sans délimiteur `---` → data vide + corps = texte entier", () => {
    const { data, body } = parseFrontmatter("pas de frontmatter\nici");
    expect(data).toEqual({});
    expect(body).toBe("pas de frontmatter\nici");
  });

  it("lit les scalaires quotés, emoji, booléens et entiers", () => {
    const { data } = parseFrontmatter(
      ['---', 'a: "quoté"', "b: 'simple'", "c: 🔵 badge", "d: true", "e: 42", "f: none", "---", ""].join(
        "\n",
      ),
    );
    expect(data.a).toBe("quoté");
    expect(data.b).toBe("simple");
    expect(data.c).toBe("🔵 badge");
    expect(data.d).toBe(true);
    expect(data.e).toBe(42);
    expect(data.f).toBe("none");
  });

  it("lit une liste flow mono-ligne et multi-ligne", () => {
    const mono = parseFrontmatter("---\nxs: [a, b, c]\n---\n").data.xs;
    expect(mono).toEqual(["a", "b", "c"]);
    const multi = parseFrontmatter(
      "---\nxs: [a, b,\n  c, d]\nnext: z\n---\n",
    ).data;
    expect(multi.xs).toEqual(["a", "b", "c", "d"]);
    expect(multi.next).toBe("z");
  });

  it("lit une séquence de maps inline `- { k: v }`", () => {
    const { data } = parseFrontmatter(
      [
        "---",
        "assignments:",
        "  - { personaId: gandalf, runner: claude-code }",
        "  - { personaId: gimli, runner: claude-code }",
        "---",
        "",
      ].join("\n"),
    );
    expect(data.assignments).toEqual([
      { personaId: "gandalf", runner: "claude-code" },
      { personaId: "gimli", runner: "claude-code" },
    ]);
  });

  it("tolère une ligne hors sous-ensemble sans planter (ignorée)", () => {
    const { data } = parseFrontmatter("---\nid: x\nligne bizarre sans clé\ny: 1\n---\n");
    expect(data.id).toBe("x");
    expect(data.y).toBe(1);
  });

  it("jamais d'exception sur entrée nulle/vide", () => {
    expect(parseFrontmatter(null)).toEqual({ data: {}, body: "" });
    expect(parseFrontmatter(undefined)).toEqual({ data: {}, body: "" });
    expect(parseFrontmatter("")).toEqual({ data: {}, body: "" });
  });

  it("splitTopLevel respecte quotes et crochets imbriqués", () => {
    expect(I.splitTopLevel('a, "b, c", d')).toEqual(["a", ' "b, c"', " d"]);
    expect(I.splitTopLevel("[a, b], c")).toEqual(["[a, b]", " c"]);
  });

  it("balance détecte les crochets non équilibrés (hors quotes)", () => {
    expect(I.balance("[a, b")).toBe(1);
    expect(I.balance("[a, b]")).toBe(0);
    expect(I.balance('["]", a]')).toBe(0);
  });
});
