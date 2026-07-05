/**
 * roster.ts — le **roster canonique** = gabarit de départ (AR-5) — cœur 🟦.
 *
 * Dérivé de `IakaCockpit/src/mock/demoTeam.ts:40-64` (7 agents, un par rôle). Ici il
 * devient `CANONICAL_ROSTER` : 7 personas **pures** (sans runner/model), une par rôle
 * canonique, avec des **noms par défaut** (donnée éditable — AR-5, JAMAIS une désignation
 * de doc). `buildTeamFromRoster` produit une team de départ éditable ; `emptyTeam` une team
 * vide. Coordinateur par défaut = la persona du rôle `coordination`.
 */

import { CANONICAL_ROLES } from "./roles";
import { slugify, type Persona } from "./persona";
import {
  DEFAULT_METHOD_ID,
  DEFAULT_VIGNETTE_TEAM,
  type Team,
} from "./team";

/** Noms par défaut proposés par rôle (gabarit AR-5) — donnée éditable, pas une doc. */
const DEFAULT_NAMES: Readonly<Record<string, string>> = {
  portefeuille: "Odin",
  coordination: "Aragorn",
  architecture: "Gandalf",
  fabrication: "Gimli",
  tests: "Legolas",
  graphisme: "Loki",
  doc: "Nathalie",
};

/** Skills proposées par défaut par rôle (gabarit — reclassé par rôle, pas par nom). */
const DEFAULT_SKILLS: Readonly<Record<string, string[]>> = {
  portefeuille: ["iakaframe-odin"],
  coordination: ["iakaframe-aragorn"],
  architecture: ["iakaframe-cadrage"],
  fabrication: [],
  tests: ["iakaframe-qualite"],
  graphisme: ["iakaframe-naonedge"],
  doc: ["iakaframe-nathalie"],
};

/**
 * Le roster canonique : 7 personas pures (une par rôle canonique, ordre `roleIndex`).
 * Le `name` est un **défaut proposé** (éditable) ; `royaume` = clé de rôle MAJUSCULE.
 */
export const CANONICAL_ROSTER: readonly Persona[] = CANONICAL_ROLES.map((role) => {
  const name = DEFAULT_NAMES[role.key] ?? role.label;
  return {
    id: slugify(name),
    name,
    roleKey: role.key,
    royaume: role.key.toUpperCase(),
    roleIndex: role.roleIndex,
    skills: [...(DEFAULT_SKILLS[role.key] ?? [])],
    guardrails: [],
  };
});

/** Copie fraîche (deep) du roster canonique (personas indépendantes, éditables). */
export function cloneCanonicalRoster(): Persona[] {
  return CANONICAL_ROSTER.map((p) => ({
    ...p,
    skills: [...p.skills],
    guardrails: [...p.guardrails],
  }));
}

/**
 * Construit une **team de départ éditable** à partir du gabarit canonique (AR-5) :
 * 7 personas, coordinateur = persona du rôle `coordination` (repli `personas[0]`).
 */
export function buildTeamFromRoster(name: string, id?: string): Team {
  const teamName = name.trim().length > 0 ? name.trim() : "Nouvelle team";
  const personas = cloneCanonicalRoster();
  const coord =
    personas.find((p) => p.roleKey === "coordination") ?? personas[0];
  return {
    id: (id && id.trim().length > 0 ? id.trim() : slugify(teamName)) || "team",
    name: teamName,
    methodId: DEFAULT_METHOD_ID,
    vignetteTeam: DEFAULT_VIGNETTE_TEAM,
    coordinator: coord?.id ?? "",
    personas,
    connectors: [],
  };
}

/** Construit une **team vide** éditable (aucune persona, coordinateur à désigner). */
export function emptyTeam(name: string, id?: string): Team {
  const teamName = name.trim().length > 0 ? name.trim() : "Nouvelle team";
  return {
    id: (id && id.trim().length > 0 ? id.trim() : slugify(teamName)) || "team",
    name: teamName,
    methodId: DEFAULT_METHOD_ID,
    vignetteTeam: DEFAULT_VIGNETTE_TEAM,
    coordinator: "",
    personas: [],
    connectors: [],
  };
}
