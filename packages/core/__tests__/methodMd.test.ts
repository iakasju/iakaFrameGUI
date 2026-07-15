import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parseMethodMd,
  serializeMethodMd,
  type MethodMd,
} from "../src/frontmatter";
import goldenMethod from "./fixtures/method.iakaframe.md?raw";

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
