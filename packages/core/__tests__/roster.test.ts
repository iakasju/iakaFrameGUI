import { describe, it, expect } from "vitest";
import { CANONICAL_ROLES } from "../src/roles";
import {
  CANONICAL_ROSTER,
  buildTeamFromRoster,
  emptyTeam,
} from "../src/roster";
import { serializeTeam } from "../src/team";
import { parseFrontmatter } from "../src/frontmatter";

describe("CANONICAL_ROSTER (gabarit AR-5)", () => {
  it("compte 10 personas, une par rôle canonique, dans l'ordre roleIndex", () => {
    // 10 depuis la scission du squad prod (canon 0.39.0) : `library/roles/surveillance.md`
    // existe et porte `roleIndex: 10` (base bibliothèque 1 ⇒ 9 côté cœur), appendu en queue.
    expect(CANONICAL_ROSTER).toHaveLength(10); // + surveillance/Helm (10e rôle)
    expect(CANONICAL_ROSTER.map((p) => p.roleKey)).toEqual(
      CANONICAL_ROLES.map((r) => r.key),
    );
    CANONICAL_ROSTER.forEach((p, i) => {
      expect(p.roleIndex).toBe(i);
      expect(p.royaume).toBe(p.roleKey.toUpperCase());
    });
  });

  it("aucune persona du gabarit ne porte runner/model (AR-1)", () => {
    for (const p of CANONICAL_ROSTER) {
      expect(p).not.toHaveProperty("runner");
      expect(p).not.toHaveProperty("model");
    }
  });
});

describe("buildTeamFromRoster / emptyTeam", () => {
  it("construit une team de 10 personas, coordinateur = coordination", () => {
    const t = buildTeamFromRoster("Ma team");
    // Conséquence produit assumée de la scission : une team neuve issue du gabarit compte
    // 10 personas, avec `deploiement → Charon` et `surveillance → Helm`.
    expect(t.personas).toHaveLength(10); // + surveillance/Helm (10e rôle)
    const coord = t.personas.find((p) => p.id === t.coordinator);
    expect(coord?.roleKey).toBe("coordination");
    // E2 : la team ne porte plus de méthode (casting pur).
    expect(t).not.toHaveProperty("methodId");
    // Le JSON persistable reste pur.
    expect(serializeTeam(t)).not.toMatch(/runner|model/);
  });

  it("emptyTeam est vide et sans coordinateur", () => {
    const t = emptyTeam("Vide");
    expect(t.personas).toEqual([]);
    expect(t.coordinator).toBe("");
  });
});

// --- Garde de parité DEFAULT_SKILLS ↔ canon (R8 D7/C21) ------------------------------------------
// Le gabarit `DEFAULT_SKILLS` (via CANONICAL_ROSTER[].skills) est la 3ᵉ table de skills ; sans garde
// elle re-diverge du canon (c'est la panne que R8 ferme). On compare, RÔLE PAR RÔLE, les skills du
// gabarit aux `skills:` DÉCLARÉES des personas VENDORÉES (miroir byte du canon).
describe("DEFAULT_SKILLS aligné sur les personas canon vendorées (garde C21)", () => {
  const PERSONA_RAW = import.meta.glob("./fixtures/personas/*.md", {
    query: "?raw", import: "default", eager: true,
  }) as Record<string, string>;

  // roleKey → skills déclarées, tiré des personas vendorées.
  const canonByRole: Record<string, string[]> = (() => {
    const map: Record<string, string[]> = {};
    for (const raw of Object.values(PERSONA_RAW)) {
      const { data } = parseFrontmatter(raw);
      const roleKey = typeof data.roleKey === "string" ? data.roleKey : "";
      if (!roleKey) continue;
      map[roleKey] = Array.isArray(data.skills) ? (data.skills as string[]) : [];
    }
    return map;
  })();

  it("chaque rôle du gabarit porte EXACTEMENT les skills déclarées de sa persona canon", () => {
    // couverture : les 10 rôles vendorés sont présents (personas complètes vendorées) — depuis
    // la scission, `charon.md` porte `roleKey: deploiement` et `helm.md` `roleKey: surveillance`.
    expect(Object.keys(canonByRole).sort()).toEqual(
      CANONICAL_ROLES.map((r) => r.key).sort(),
    );
    for (const p of CANONICAL_ROSTER) {
      expect(p.skills, `${p.roleKey}: gabarit != canon vendoré`).toEqual(
        canonByRole[p.roleKey],
      );
    }
  });

  it("ancres littérales : multi-skills reflétés (odin+iakastart, gandalf+lecture, nathalie+mémoire, gimli fabrication)", () => {
    const byRole = (k: string) => CANONICAL_ROSTER.find((p) => p.roleKey === k)!.skills;
    expect(byRole("portefeuille")).toEqual(["iakaframe-odin", "iakastart"]);
    expect(byRole("cadrage")).toEqual(["iakaframe-cadrage", "iakaframe-lecture-maquettes"]);
    expect(byRole("documentation")).toEqual(["iakaframe-nathalie", "iakaframe-memoire-humaine"]);
    expect(byRole("dev")).toEqual(["iakaframe-fabrication"]); // fin de « Gimli sans skill »
  });

  it("les personas du gabarit sont des copies indépendantes (éditables)", () => {
    const a = buildTeamFromRoster("A");
    const b = buildTeamFromRoster("B");
    a.personas[0].name = "Changé";
    expect(b.personas[0].name).not.toBe("Changé");
  });
});
