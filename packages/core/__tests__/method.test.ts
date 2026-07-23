import { describe, it, expect } from "vitest";
import {
  IAKAFRAME_CANONICAL_METHOD,
  METHOD_CATALOG,
  DEFAULT_METHOD_ID,
  methodById,
  parseMethod,
  parseMethods,
  parseMethodText,
  serializeMethod,
  resolveWorkflow,
  principlesForMethod,
  ritualsForMethod,
  scaffoldsForMethod,
  unresolvedRefsForMethod,
  type Method,
} from "../src/method";
// A-9 : la fonction et son type doivent sortir par la façade publique du paquet.
import {
  unresolvedRefsForMethod as publicUnresolvedRefsForMethod,
  type MethodUnresolvedRef as PublicUnresolvedRef,
} from "../src/index";
import { parseMethodMd } from "../src/frontmatter";
import wrappedMethod from "./fixtures/method.iakaframe-wrapped.md?raw";
import { IAKAFRAME_CANONICAL_WORKFLOW } from "../src/workflow";
import { CATALOG_PRINCIPLE_IDS } from "../src/principle";
import { CATALOG_RITUAL_IDS } from "../src/ritual";
import { CATALOG_SCAFFOLD_IDS } from "../src/scaffold";
import { CANONICAL_ROLE_KEYS } from "../src/roles";

describe("IAKAFRAME_CANONICAL_METHOD (E2 §3)", () => {
  const m = IAKAFRAME_CANONICAL_METHOD;

  it("référence l'intégralité des catalogues du cœur (par id)", () => {
    expect(m.id).toBe(DEFAULT_METHOD_ID);
    expect(m.workflowId).toBe(IAKAFRAME_CANONICAL_WORKFLOW.id);
    expect(m.principleIds).toEqual([...CATALOG_PRINCIPLE_IDS]);
    expect(m.ritualIds).toEqual([...CATALOG_RITUAL_IDS]);
    expect(m.scaffoldIds).toEqual([...CATALOG_SCAFFOLD_IDS]);
    expect(m.roleKeys).toEqual([...CANONICAL_ROLE_KEYS]);
    expect(m.guardrailIds.length).toBeGreaterThan(0);
  });

  it("ne nomme aucun agent, ne pose ni runner ni model (AR-1 renforcé)", () => {
    const json = JSON.stringify(m);
    expect(json).not.toMatch(/\brunner\b/i);
    expect(json).not.toMatch(/\bmodel\b/i);
    // La méthode ne porte que des références (ids), pas de personas nommées.
    expect(json).not.toMatch(/persona/i);
  });

  it("est dans le catalogue", () => {
    expect(METHOD_CATALOG[DEFAULT_METHOD_ID]).toBe(m);
    expect(methodById(DEFAULT_METHOD_ID)).toBe(m);
    expect(methodById("inconnue")).toBeUndefined();
  });
});

describe("resolveWorkflow (déménagé, Q-3)", () => {
  it("sans méthode → canonique (rétro-compat)", () => {
    expect(resolveWorkflow()).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
    expect(resolveWorkflow(null)).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
  });

  it("méthode canonique → workflow canonique", () => {
    expect(resolveWorkflow(IAKAFRAME_CANONICAL_METHOD)).toBe(
      IAKAFRAME_CANONICAL_WORKFLOW,
    );
  });

  it("méthode à workflowId inconnu → canonique (défensif)", () => {
    expect(resolveWorkflow({ workflowId: "n-existe-pas" })).toBe(
      IAKAFRAME_CANONICAL_WORKFLOW,
    );
  });
});

describe("résolveurs de composants (ids inconnus filtrés à la résolution)", () => {
  it("résout principes/rituels/scaffolds du canonique", () => {
    expect(principlesForMethod(IAKAFRAME_CANONICAL_METHOD)).toHaveLength(14);
    expect(ritualsForMethod(IAKAFRAME_CANONICAL_METHOD)).toHaveLength(5);
    expect(scaffoldsForMethod(IAKAFRAME_CANONICAL_METHOD)).toHaveLength(2);
  });

  it("filtre les ids inconnus sans lever (agnosticisme AR-9 préservé au parse)", () => {
    const m = parseMethod({
      id: "x",
      principleIds: ["qualite", "inconnu-42"],
      ritualIds: ["fantome"],
    })!;
    // Le parse CONSERVE les ids (agnosticisme) ...
    expect(m.principleIds).toEqual(["qualite", "inconnu-42"]);
    // ... la résolution FILTRE les inconnus.
    expect(principlesForMethod(m)).toHaveLength(1);
    expect(ritualsForMethod(m)).toHaveLength(0);
  });
});

describe("parseMethod / parseMethods / round-trip (défensif)", () => {
  it("rejette un record sans id", () => {
    expect(parseMethod({ name: "x" })).toBeNull();
    expect(parseMethod(null)).toBeNull();
  });

  it("applique les défauts et filtre les références en string[]", () => {
    const m = parseMethod({ id: "min" })!;
    expect(m.name).toBe("min");
    expect(m.principleIds).toEqual([]);
    expect(m.workflowId).toBeUndefined();
  });

  it("workflowId vide → omis (repli canonique via resolveWorkflow)", () => {
    const m = parseMethod({ id: "m", workflowId: "  " })!;
    expect(m).not.toHaveProperty("workflowId");
    expect(resolveWorkflow(m)).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
  });

  it("jamais d'exception sur entrée hostile", () => {
    for (const bad of [null, undefined, 42, "x", [], {}]) {
      expect(() => parseMethod(bad)).not.toThrow();
    }
  });

  it("round-trip du canonique (structure préservée)", () => {
    const round = parseMethodText(serializeMethod(IAKAFRAME_CANONICAL_METHOD));
    expect(round).toEqual(IAKAFRAME_CANONICAL_METHOD);
  });

  it("parseMethods : [] si illisible/non-tableau ; filtre les invalides", () => {
    expect(parseMethods(undefined)).toEqual([]);
    expect(parseMethods("{pas du json")).toEqual([]);
    expect(parseMethods('{"id":"x"}')).toEqual([]);
    const arr = JSON.stringify([IAKAFRAME_CANONICAL_METHOD, { name: "sans-id" }, 5]);
    const methods: Method[] = parseMethods(arr);
    expect(methods).toHaveLength(1);
    expect(methods[0].id).toBe(DEFAULT_METHOD_ID);
  });
});

// ---------------------------------------------------------------------------
// D-7 — la perte à la résolution devient VISIBLE (rapport séparé, additif).
// Les résolveurs ci-dessus ne changent pas d'un octet : A-8 est un test de NON-régression.
// ---------------------------------------------------------------------------

describe("unresolvedRefsForMethod — visibilité de la perte (D-7)", () => {
  it("A-1 : le canonique ne perd rien → [] (garde-fou anti-faux-positif)", () => {
    expect(unresolvedRefsForMethod(IAKAFRAME_CANONICAL_METHOD)).toEqual([]);
  });

  it("A-2 : id inconnu signalé, id résolu absent du rapport", () => {
    const m = parseMethod({
      id: "x",
      principleIds: ["qualite", "inconnu-42"],
      ritualIds: ["fantome"],
    })!;
    const refs = unresolvedRefsForMethod(m);
    expect(refs).toHaveLength(2);
    expect(refs).toEqual([
      { source: "method:x", field: "principleIds", id: "inconnu-42" },
      { source: "method:x", field: "ritualIds", id: "fantome" },
    ]);
    expect(refs.some((r) => r.id === "qualite")).toBe(false);
  });

  it("A-3 : les 6 constituants + workflowId sont couverts (7 champs, 7 entrées)", () => {
    const m = parseMethod({
      id: "y",
      principleIds: ["p-inconnu"],
      ritualIds: ["r-inconnu"],
      scaffoldIds: ["s-inconnu"],
      guardrailIds: ["g-inconnu"],
      roleKeys: ["k-inconnu"],
      workflowId: "w-inconnu",
    })!;
    const refs = unresolvedRefsForMethod(m);
    // NB : A-3 annonce « 7 champs » mais n'en énumère que 6 — `workflowId` EST l'un des six
    // constituants du modèle (a)-(f), pas un septième. Les 6 champs listés sont tous couverts ;
    // l'attendu est donc 6. Écart de comptage du cadrage, signalé plutôt qu'absorbé.
    expect(refs).toHaveLength(6);
    expect(refs.map((r) => r.field)).toEqual([
      "principleIds",
      "ritualIds",
      "scaffoldIds",
      "guardrailIds",
      "roleKeys",
      "workflowId",
    ]);
  });

  it("A-4 : workflowId inconnu → 1 entrée, ET resolveWorkflow se replie toujours", () => {
    const m = parseMethod({ id: "z", workflowId: "n-existe-pas" })!;
    const refs = unresolvedRefsForMethod(m);
    expect(refs).toEqual([
      { source: "method:z", field: "workflowId", id: "n-existe-pas" },
    ]);
    expect(resolveWorkflow(m)).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
  });

  it("A-6 : entrées dégénérées → jamais d'exception", () => {
    const vide = parseMethod({ id: "vide" })!;
    expect(unresolvedRefsForMethod(vide)).toEqual([]);
    const blancs = { ...vide, principleIds: ["", "   "], roleKeys: [""] };
    expect(() => unresolvedRefsForMethod(blancs)).not.toThrow();
    expect(unresolvedRefsForMethod(blancs)).toEqual([]);
    // Objet partiel (champs absents) : toléré, pas de plantage.
    expect(() =>
      unresolvedRefsForMethod({ id: "partiel" } as unknown as Method),
    ).not.toThrow();
  });

  it("A-7 : ordre de sortie déterministe (deux appels strictement égaux)", () => {
    const m = parseMethod({
      id: "det",
      principleIds: ["a", "qualite", "b"],
      roleKeys: ["zzz", "portefeuille", "aaa"],
      guardrailIds: ["g1", "g2"],
    })!;
    expect(unresolvedRefsForMethod(m)).toEqual(unresolvedRefsForMethod(m));
    // Ordre = ordre des champs, puis ordre de DÉCLARATION des ids (pas alphabétique).
    expect(unresolvedRefsForMethod(m).map((r) => r.id)).toEqual([
      "a",
      "b",
      "g1",
      "g2",
      "zzz",
      "aaa",
    ]);
  });

  it("A-8 : non-régression — les résolveurs et resolveWorkflow sont inchangés", () => {
    const m = parseMethod({
      id: "nr",
      principleIds: ["qualite", "inconnu-42"],
      ritualIds: ["fantome"],
      scaffoldIds: ["portfolio", "inconnu"],
      workflowId: "n-existe-pas",
    })!;
    expect(principlesForMethod(m)).toHaveLength(1);
    expect(ritualsForMethod(m)).toHaveLength(0);
    expect(scaffoldsForMethod(m)).toHaveLength(1);
    expect(resolveWorkflow(m)).toBe(IAKAFRAME_CANONICAL_WORKFLOW);
    // Le rapport est un AJOUT : il n'a rien retiré aux sorties ci-dessus.
    expect(unresolvedRefsForMethod(m)).toHaveLength(4);
  });

  it("A-9 : la fonction et son type sont exportés depuis @iakaframe/core", () => {
    const ref: PublicUnresolvedRef = {
      source: "method:x",
      field: "principleIds",
      id: "inconnu",
    };
    expect(publicUnresolvedRefsForMethod).toBe(unresolvedRefsForMethod);
    expect(ref.field).toBe("principleIds");
  });
});

// ---------------------------------------------------------------------------
// A-5 — cas de référence sur la fixture VENDORÉE existante (aucune fixture ajoutée).
//
// ⚠️ MESURE, PAS AJUSTEMENT. Le drift de vendorage décrit ici jusqu'au lot D-8 est RÉSORBÉ :
// D-9 a re-vendoré le canon, et `fixtures/method.iakaframe-wrapped.md` porte désormais les
// 18 `principleIds` du fichier source `iakaframe/methods/iakaframe.md`. Les 14 entrées non
// résolues d'alors deviennent donc 16, dont 4 `principleIds` au lieu de 2 :
// `canon-avant-citation` et `preuve-avant-declaration` existent dans `library/principles/`
// mais restent absents de `CATALOG_PRINCIPLES` (14 entrées).
// Ce déplacement est pré-annoncé au § 4.3 de `specs/instructions/d9-re-vendorage-canon-iakaframe.md`.
// Ces références non résolues ne sont PAS résorbées par D-9 : le catalogue du cœur n'est
// pas élargi (dette D7-f, distincte). Ce test les rend exactes, il ne les corrige pas.
//
// VOLET B1 (roster 8) : `deploiement` est devenu un rôle canonique GUI (CANONICAL_ROLES) →
// ce roleKey RÉSOUT, faisant tomber le total de 16 à 15 (une entrée `roleKeys` en moins).
// VOLET B2 (alignement des 5 clés GUI sur le canon) : `cadrage`, `dev`, `qualite`, `design`,
// `documentation` sont désormais canoniques dans `CANONICAL_ROLES` → ils RÉSOLVENT tous. Les 5
// entrées `roleKeys` non résolues disparaissent, faisant tomber le total de 15 à 10 (roleKeys → []).
// La fixture vendorée est INCHANGÉE (canon) ; seul le catalogue GUI s'est aligné (GUI ← frame).
// ---------------------------------------------------------------------------

describe("A-5 — références non résolues du cas réel (fixture vendorée)", () => {
  const parsed = parseMethodMd(wrappedMethod)! as unknown as Method;
  const refs = unresolvedRefsForMethod(parsed);
  const byField = (f: string) => refs.filter((r) => r.field === f).map((r) => r.id);

  it("10 entrées sur la fixture telle qu'elle est vendorée aujourd'hui (roleKeys canon résolus par B2)", () => {
    expect(refs).toHaveLength(10);
  });

  it("décomposition par champ, id par id", () => {
    expect(byField("ritualIds")).toEqual([]);
    expect(byField("principleIds")).toEqual([
      "interruption-minimale-odin",
      "merge-versionnement",
      "canon-avant-citation",
      "preuve-avant-declaration",
    ]);
    expect(byField("scaffoldIds")).toEqual(["portefeuille", "projet"]);
    expect(byField("guardrailIds")).toEqual(["identity", "perimeter", "delegation"]);
    // B2 : les 8 roleKeys canon résolvent tous désormais (dont les 5 alignés) → aucun non résolu.
    expect(byField("roleKeys")).toEqual([]);
    expect(byField("workflowId")).toEqual(["iakaframe-3phases"]);
  });

  it("scaffolds et gardes-fous sont perdus à 100 % (les deux sans résolveur)", () => {
    expect(byField("scaffoldIds")).toHaveLength(parsed.scaffoldIds.length);
    expect(byField("guardrailIds")).toHaveLength(parsed.guardrailIds.length);
  });

  // Ancrage anti-drift (D-9, § 4.4). Le test qu'il remplace reconstituait EN LIGNE les 2 ids
  // manquants pour compenser le drift de vendorage ; ce drift étant résorbé, il les
  // dupliquerait désormais (20 principes, 6 non résolus) et échouerait.
  //
  // ⚠️ Si ce test casse un jour, c'est que la fixture a re-divergé du canon. Il se répare en
  // rejouant `node packages/core/scripts/gen-fixtures.mjs` — JAMAIS en éditant le chiffre 18
  // ni la liste ci-dessous. Ajuster l'attendu sur l'observé masquerait précisément le drift
  // que cet ancrage existe pour détecter.
  it("ancrage : la fixture wrapped porte exactement les 18 principleIds du canon", () => {
    expect(parsed.principleIds).toHaveLength(18);
    expect(parsed.principleIds.slice(14)).toEqual([
      "interruption-minimale-odin",
      "merge-versionnement",
      "canon-avant-citation",
      "preuve-avant-declaration",
    ]);
  });
});
