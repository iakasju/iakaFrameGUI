import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parseMethodMd,
  readListLayout,
  serializeMethodMd,
  type MethodMd,
} from "../src/frontmatter";
import goldenMethod from "./fixtures/method.iakaframe.md?raw";
import wrappedMethod from "./fixtures/method.iakaframe-wrapped.md?raw";

const m: MethodMd = {
  id: "iakaframe",
  name: "Méthode iakaframe",
  workflowId: "iakaframe-3phases",
  principleIds: ["qualite", "gestion-backlog", "documentation"],
  ritualIds: ["iakastart", "init"],
  guardrailIds: ["identity", "perimeter", "delegation"],
  roleKeys: ["portefeuille", "coordination", "dev"],
  scaffoldIds: ["portefeuille", "projet"],
};

describe("methodMd — (dé)sérialisation frontmatter (§3.10)", () => {
  it("round-trip : parseMethodMd(serializeMethodMd(m)) ≡ m", () => {
    expect(parseMethodMd(serializeMethodMd(m))).toEqual(m);
  });

  it("workflowId absent → omis à l'écriture et à la relecture", () => {
    const noWf: MethodMd = { ...m };
    delete noWf.workflowId;
    const md = serializeMethodMd(noWf);
    expect(md).not.toContain("workflowId");
    expect(parseMethodMd(md)).toEqual(noWf);
  });

  it("byte-parité : reproduit exactement la golden fixture (forme canonique)", () => {
    const { body } = parseFrontmatter(goldenMethod);
    const parsed = parseMethodMd(goldenMethod)!;
    expect(serializeMethodMd(parsed, body)).toBe(goldenMethod);
  });

  it("parse défensif : sans `id` → null", () => {
    expect(parseMethodMd("---\nname: x\n---\n")).toBeNull();
    expect(parseMethodMd(null)).toBeNull();
  });
});

// La fixture `method.iakaframe-wrapped.md` est la copie CONFORME du fichier réel
// `iakaframe/methods/iakaframe.md` : son `principleIds` (16 ids) est wrappé sur 4 lignes. La
// golden canonique, elle, est mono-ligne — elle ne couvrait donc PAS ce cas.
describe("methodMd — listes flow wrappées (fichier réel de la bibliothèque)", () => {
  it("relève la découpe en lignes des seules listes wrappées", () => {
    expect(readListLayout(wrappedMethod)).toEqual({ principleIds: [5, 5, 5, 1] });
  });

  it("parse : les 16 ids sont lus malgré le wrapping (aucune perte sémantique)", () => {
    const parsed = parseMethodMd(wrappedMethod)!;
    expect(parsed.principleIds).toHaveLength(16);
    expect(parsed.principleIds[0]).toBe("qualite");
    expect(parsed.principleIds[4]).toBe("isolation-docker");
    expect(parsed.principleIds[5]).toBe("self-hosted-first");
    expect(parsed.principleIds[15]).toBe("merge-versionnement");
  });

  it("round-trip byte-à-byte : le wrapping est PRÉSERVÉ quand le layout est fourni", () => {
    const { body } = parseFrontmatter(wrappedMethod);
    const parsed = parseMethodMd(wrappedMethod)!;
    const layout = readListLayout(wrappedMethod);
    expect(serializeMethodMd(parsed, body, layout)).toBe(wrappedMethod);
  });

  it("sans layout : forme canonique mono-ligne (byte-parité CLI préservée)", () => {
    const { body } = parseFrontmatter(wrappedMethod);
    const parsed = parseMethodMd(wrappedMethod)!;
    const out = serializeMethodMd(parsed, body);
    expect(out).toContain(
      "principleIds: [qualite, gestion-backlog, documentation, commits-versionnement, isolation-docker, self-hosted-first,",
    );
    expect(out).not.toContain("isolation-docker,\n  self-hosted-first");
    // La sémantique reste intacte dans les deux formes.
    expect(parseMethodMd(out)).toEqual(parsed);
  });

  it("layout périmé (liste éditée depuis la lecture) → ignoré, pas de rendu faux", () => {
    const parsed = parseMethodMd(wrappedMethod)!;
    const shorter: MethodMd = { ...parsed, principleIds: ["qualite", "langue"] };
    const out = serializeMethodMd(shorter, "", readListLayout(wrappedMethod));
    expect(out).toContain("principleIds: [qualite, langue]");
    expect(parseMethodMd(out)).toEqual(shorter);
  });
});
