import { describe, it, expect } from "vitest";
import {
  CANONICAL_ROSTER,
  buildFrame,
  parsePersona,
  POOL_FRAME_TYPES,
  type FrameRaw,
  type Persona,
  type PoolFrameType,
} from "@iakaframe/core";
import {
  buildPersonaCard,
  buildPersonaReservoir,
  reservoirPersonasFromFrame,
} from "./personaCards";

// --- Petits fabricants de `.md` pour construire un Frame réel via buildFrame (aucun I/O). --------
function personaMd(o: {
  id: string;
  name: string;
  roleKey: string;
  royaume: string;
  pastille?: string;
  skills?: string[];
  guardrails?: string[];
  mission?: string;
}): string {
  return [
    "---",
    `id: ${o.id}`,
    `name: ${o.name}`,
    `roleKey: ${o.roleKey}`,
    `royaume: ${o.royaume}`,
    ...(o.pastille ? [`pastille: "${o.pastille}"`] : []),
    `skills: [${(o.skills ?? []).join(", ")}]`,
    `guardrails: [${(o.guardrails ?? []).join(", ")}]`,
    ...(o.mission ? [`mission: ${o.mission}`] : []),
    "---",
    `# ${o.name}`,
    "",
  ].join("\n");
}

function teamMd(ids: string[]): string {
  return [
    "---",
    "id: t",
    "name: T",
    `personas: [${ids.join(", ")}]`,
    `coordinator: ${ids[0] ?? ""}`,
    "guardrails: []",
    "vignetteTeam: none",
    "---",
    "# T",
    "",
  ].join("\n");
}

function frameOf(personaMds: string[], teamIds: string[]): FrameRaw {
  const pools = Object.fromEntries(
    POOL_FRAME_TYPES.map((t) => [t, [] as string[]]),
  ) as Record<PoolFrameType, string[]>;
  pools.personas = personaMds;
  return { root: null, pools, teams: [teamMd(teamIds)], methods: [], bindings: [] };
}

describe("personaReservoir — projection pure des fiches à vignettes (Lot 3, A3)", () => {
  it("projette les 10 personas vendorées du roster canonique (le casting du réservoir)", () => {
    const cards = buildPersonaReservoir(CANONICAL_ROSTER);
    expect(cards).toHaveLength(10);
    const names = cards.map((c) => c.name);
    // Les 10 attendus (ordre roleIndex). Scission du squad prod (canon 0.39.0) :
    // `deploiement` est tenu par Charon (charon.md), Helm passe au 10e rôle `surveillance`.
    expect(names).toEqual([
      "Odin",
      "Aragorn",
      "Gandalf",
      "Gimli",
      "Legolas",
      "Charon",
      "Loki",
      "Nathalie",
      "Fëanor",
      "Helm",
    ]);
  });

  it("dérive la vignette (initiales + dégradé casté) des champs EXISTANTS — aucun asset canon", () => {
    const cards = buildPersonaReservoir(CANONICAL_ROSTER);
    const gimli = cards.find((c) => c.id === "gimli")!;
    // Initiales dérivées du nom, dégradé casté par roleIndex (dev = 3 → rouge du casting).
    expect(gimli.initials).toBe("GI");
    expect(gimli.roleIndex).toBe(3);
    expect(gimli.gradient).toEqual(["#b3261e", "#7d1a15"]);
    // Fëanor (9ᵉ rôle, index 8) reçoit bien la flamme distincte, pas l'or du portefeuille.
    const feanor = cards.find((c) => c.id === "feanor")!;
    expect(feanor.roleIndex).toBe(8);
    expect(feanor.gradient).toEqual(["#c2410c", "#7c2d12"]);
  });

  it("dérive le badge [ROYAUME][Nom] et le libellé de rôle (jamais un nom de code)", () => {
    const gandalf = buildPersonaCard(CANONICAL_ROSTER.find((p) => p.id === "gandalf")!);
    expect(gandalf.badge).toBe("[CADRAGE][Gandalf]");
    expect(gandalf.roleLabel).toBe("Cadrage");
    expect(gandalf.roleKey).toBe("cadrage");
  });

  it("n'invente JAMAIS de pastille : absente du roster → null (pas de badge fabriqué)", () => {
    const cards = buildPersonaReservoir(CANONICAL_ROSTER);
    expect(cards.every((c) => c.pastille === null)).toBe(true);
    // …mais une pastille déclarée est reprise verbatim.
    const withPastille: Persona = { ...CANONICAL_ROSTER[3], pastille: "🔴" };
    expect(buildPersonaCard(withPastille).pastille).toBe("🔴");
  });

  it("conserve skills et guardrails déclarés (référence, jamais réécriture)", () => {
    const p: Persona = {
      id: "x",
      name: "Xavier",
      roleKey: "dev",
      royaume: "DEV",
      roleIndex: 3,
      skills: ["iakaframe-fabrication"],
      guardrails: ["identity", "perimeter"],
    };
    const card = buildPersonaCard(p);
    expect(card.skills).toEqual(["iakaframe-fabrication"]);
    expect(card.guardrails).toEqual(["identity", "perimeter"]);
  });

  it("surface la ligne de mission déclarée (sinon null — jamais fabriquée)", () => {
    const withMission = parsePersona({
      id: "gimli",
      name: "Gimli",
      roleKey: "dev",
      royaume: "IAKAFRAME",
      mission: "Implémente l'instruction validée, jusqu'au staging.",
    })!;
    expect(buildPersonaCard(withMission).mission).toBe(
      "Implémente l'instruction validée, jusqu'au staging.",
    );
    // Le gabarit synthétique CANONICAL_ROSTER ne porte PAS de mission → null partout.
    expect(buildPersonaReservoir(CANONICAL_ROSTER).every((c) => c.mission === null)).toBe(true);
  });
});

describe("reservoirPersonasFromFrame — le réservoir DÉRIVE des .md, pas d'une table synthétique (AR-2)", () => {
  it("rend les personas RÉELLES parsées dans l'ordre de la team active (royaume IAKAFRAME, pas DEV)", () => {
    // Pool dans un ordre DIFFÉRENT de la team, pour prouver que l'ordre suivi est celui de la team.
    const raw = frameOf(
      [
        personaMd({
          id: "feanor",
          name: "Fëanor",
          roleKey: "frame",
          royaume: "FRAME",
          pastille: "🟠",
          skills: ["iakaframe-frame"],
          guardrails: ["identity", "perimeter"],
          mission: "Aide à forger une frame neuve.",
        }),
        personaMd({
          id: "gimli",
          name: "Gimli",
          roleKey: "dev",
          royaume: "IAKAFRAME",
          pastille: "🔴",
          skills: ["iakaframe-fabrication"],
          guardrails: ["identity", "perimeter"],
          mission: "Implémente l'instruction validée, jusqu'au staging.",
        }),
        personaMd({
          id: "odin",
          name: "Odin",
          roleKey: "portefeuille",
          royaume: "PORTEFEUILLE",
          pastille: "🟡",
          skills: ["iakaframe-odin"],
          guardrails: ["identity", "delegation"],
          mission: "CTO du portefeuille.",
        }),
      ],
      ["odin", "gimli", "feanor"],
    );
    const reservoir = reservoirPersonasFromFrame(buildFrame(raw));

    // Ordre = ordre de la team, pas du pool.
    expect(reservoir.map((p) => p.id)).toEqual(["odin", "gimli", "feanor"]);

    const gimli = reservoir.find((p) => p.id === "gimli")!;
    // La vraie cause du bug est corrigée : royaume RÉEL (IAKAFRAME), plus le synthétique DEV.
    expect(gimli.royaume).toBe("IAKAFRAME");
    expect(gimli.pastille).toBe("🔴");
    expect(gimli.skills).toEqual(["iakaframe-fabrication"]);
    expect(gimli.guardrails).toEqual(["identity", "perimeter"]);
    expect(gimli.mission).toBe("Implémente l'instruction validée, jusqu'au staging.");
    // Royaumes hétérogènes RÉELS : Odin=PORTEFEUILLE, Fëanor=FRAME (jamais roleKey.toUpperCase()).
    expect(reservoir.find((p) => p.id === "odin")!.royaume).toBe("PORTEFEUILLE");
    expect(reservoir.find((p) => p.id === "feanor")!.royaume).toBe("FRAME");
  });

  it("ignore un id de team sans persona parsée (défensif) ; vide possible → repli à l'appelant", () => {
    const raw = frameOf(
      [personaMd({ id: "gimli", name: "Gimli", roleKey: "dev", royaume: "IAKAFRAME" })],
      ["gimli", "absent"],
    );
    const reservoir = reservoirPersonasFromFrame(buildFrame(raw));
    expect(reservoir.map((p) => p.id)).toEqual(["gimli"]);
  });
});
