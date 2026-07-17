/**
 * Verrou de bornage AR-1/AR-6 (S6) — l'allow-list `plugin-shell` du pilote de RETRAIT.
 *
 * Le retrait (attach/detach/remove) est une DÉROGATION assumée et BORNÉE au « backend passe-plat »
 * (comme review). Ce test statique verrouille le bornage pour empêcher toute dérive silencieuse :
 *   - un binaire unique (`iakaframe`) + repli `node <…index.js>`, jamais de shell ;
 *   - des sous-commandes FIGÉES, un argv FIGÉ, `--json` en fin ;
 *   - seuls `<id>`/`<personaId>`/`<kind>`/`<type>` sont des validateurs (enum ou regex étroite) ;
 *   - `remove` et `remove --cascade --yes` sont DEUX entrées distinctes (cascade = appel explicite).
 */
import { describe, it, expect } from "vitest";
import defaultCapabilities from "../../src-tauri/capabilities/default.json";

type Arg = string | { validator: string };
interface AllowEntry {
  name: string;
  cmd: string;
  args: Arg[];
}

const ID = "^[A-Za-z0-9][A-Za-z0-9._:-]*$";
const KIND = "^(team|method|binding|skill)$";
const TYPE = "^(personas|skills|teams|methods|bindings)$";
const ENTRY = "^.+[\\\\/]index\\.js$";

function loadAllow(): AllowEntry[] {
  const perms = (defaultCapabilities as { permissions: unknown[] }).permissions;
  const shell = perms.find(
    (x): x is { identifier: string; allow: AllowEntry[] } =>
      typeof x === "object" && x !== null && (x as { identifier?: string }).identifier === "shell:allow-execute",
  );
  expect(shell, "la permission shell:allow-execute doit exister").toBeTruthy();
  return shell!.allow;
}

function byName(list: AllowEntry[], name: string): AllowEntry {
  const e = list.find((x) => x.name === name);
  expect(e, `entrée allow-list « ${name} » attendue`).toBeTruthy();
  return e!;
}

function validator(a: Arg): string | undefined {
  return typeof a === "object" ? a.validator : undefined;
}

describe("allow-list plugin-shell — bornage AR-1/AR-6 du pilote de retrait (S6)", () => {
  const allow = loadAllow();

  it("n'autorise QUE `iakaframe` et le repli `node` — aucun shell, aucun autre binaire", () => {
    for (const e of allow) {
      expect(["iakaframe", "node"]).toContain(e.cmd);
    }
  });

  it("expose les verbes de retrait (bin + repli node), argv figé + --json final", () => {
    for (const name of [
      "iaka-attach",
      "iaka-detach",
      "iaka-remove",
      "iaka-remove-cascade",
      "iaka-lib-list",
      "iaka-persona-show",
    ]) {
      const bin = byName(allow, name);
      const node = byName(allow, `${name}-node`);
      expect(bin.cmd).toBe("iakaframe");
      expect(node.cmd).toBe("node");
      // --json est toujours le dernier argument.
      expect(bin.args[bin.args.length - 1]).toBe("--json");
      expect(node.args[node.args.length - 1]).toBe("--json");
      // Le repli node fige l'entrée CLI (…/index.js) comme 1er argument.
      expect(validator(node.args[0])).toBe(ENTRY);
    }
  });

  it("detach/attach : sous-commande figée, seuls skillId et personaId sont des validateurs d'id", () => {
    for (const [name, verb] of [
      ["iaka-attach", "attach"],
      ["iaka-detach", "detach"],
    ] as const) {
      const e = byName(allow, name);
      expect(e.args[0]).toBe(verb);
      expect(validator(e.args[1])).toBe(ID); // <skillId>
      expect(e.args[2]).toBe("--persona");
      expect(validator(e.args[3])).toBe(ID); // <personaId>
      expect(e.args[4]).toBe("--json");
    }
  });

  it("remove : <kind> est un enum étroit, <id> un validateur d'id ; PAS de cascade sur `iaka-remove`", () => {
    const e = byName(allow, "iaka-remove");
    expect(e.args[0]).toBe("remove");
    expect(validator(e.args[1])).toBe(KIND);
    expect(validator(e.args[2])).toBe(ID);
    expect(e.args[3]).toBe("--json");
    // L'entrée non-cascade ne contient JAMAIS --cascade/--yes.
    expect(e.args).not.toContain("--cascade");
    expect(e.args).not.toContain("--yes");
  });

  it("remove --cascade --yes : entrée DISTINCTE et explicite (jamais fusionnée avec le remove simple)", () => {
    const e = byName(allow, "iaka-remove-cascade");
    expect(e.args).toEqual([
      "remove",
      { validator: KIND },
      { validator: ID },
      "--cascade",
      "--yes",
      "--json",
    ]);
  });

  it("list : <type> est un enum de collections ; show : figé sur --type personas", () => {
    const list = byName(allow, "iaka-lib-list");
    expect(list.args[0]).toBe("list");
    expect(validator(list.args[1])).toBe(TYPE);

    const show = byName(allow, "iaka-persona-show");
    expect(show.args[0]).toBe("show");
    expect(validator(show.args[1])).toBe(ID);
    expect(show.args.slice(2)).toEqual(["--type", "personas", "--json"]);
  });
});
