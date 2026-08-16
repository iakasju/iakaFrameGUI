/**
 * roster.ts — le **roster canonique** = gabarit de départ (AR-5) — cœur 🟦.
 *
 * Dérivé de `IakaCockpit/src/mock/demoTeam.ts:40-64` (7 agents, un par rôle). Ici il
 * devient `CANONICAL_ROSTER` : 10 personas **pures** (sans runner/model), une par rôle
 * canonique (dont `frame`/Fëanor 9ᵉ rôle, et `surveillance`/Helm 10ᵉ rôle), avec des
 * **noms par défaut** (donnée
 * éditable — AR-5, JAMAIS une désignation de doc). `buildTeamFromRoster` produit une team de
 * départ éditable ; `emptyTeam` une team vide. Coordinateur par défaut = la persona du rôle
 * `coordination`.
 */

import { CANONICAL_ROLES } from "./roles";
import { slugify, type Persona } from "./persona";
import { DEFAULT_VIGNETTE_TEAM, type Team } from "./team";

/** Noms par défaut proposés par rôle (gabarit AR-5) — donnée éditable, pas une doc. */
const DEFAULT_NAMES: Readonly<Record<string, string>> = {
  portefeuille: "Odin",
  coordination: "Aragorn",
  cadrage: "Gandalf",
  dev: "Gimli",
  qualite: "Legolas",
  // SCISSION DU SQUAD PROD (canon 0.39.0) : `library/personas/charon.md` porte
  // `roleKey: deploiement` et `library/personas/helm.md` porte `roleKey: surveillance`.
  // Helm a donc CHANGÉ de rôle — il n'est plus le porteur de `deploiement`.
  deploiement: "Charon",
  design: "Loki",
  documentation: "Nathalie",
  frame: "Fëanor",
  surveillance: "Helm",
};

/**
 * Skills proposées par défaut par rôle (gabarit — reclassé par rôle, pas par nom).
 *
 * ALIGNÉ SUR LE CANON (R8 D7/C21) : ce sont les `skills:` **déclarées** des personas canon
 * (`library/personas/<persona>.md`), rôle par rôle — MULTI-skills inclus (Odin porte iakastart,
 * Gandalf la lecture de maquettes, Nathalie la mémoire humaine). Gimli (dev) porte
 * `iakaframe-fabrication` : fin du « pas de skill ». La garde `roster.test.ts` compare ce gabarit
 * aux personas VENDORÉES et rougit à toute divergence (empêche la 3ᵉ table de re-diverger).
 */
const DEFAULT_SKILLS: Readonly<Record<string, string[]>> = {
  portefeuille: ["iakaframe-odin", "iakastart"],
  coordination: ["iakaframe-aragorn"],
  cadrage: ["iakaframe-cadrage", "iakaframe-lecture-maquettes"],
  dev: ["iakaframe-fabrication"],
  qualite: ["iakaframe-qualite"],
  deploiement: ["iakaframe-deploiement"],
  design: ["iakaframe-naonedge"],
  documentation: ["iakaframe-nathalie", "iakaframe-memoire-humaine"],
  frame: ["iakaframe-frame"],
  // `library/personas/helm.md` déclare `skills: [iakaframe-surveillance]` ; `deploiement`
  // reste INCHANGÉ car `library/personas/charon.md` déclare `skills: [iakaframe-deploiement]`.
  surveillance: ["iakaframe-surveillance"],
};

/**
 * Le roster canonique : 10 personas pures (une par rôle canonique, ordre `roleIndex`).
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
 * 10 personas, coordinateur = persona du rôle `coordination` (repli `personas[0]`).
 */
export function buildTeamFromRoster(name: string, id?: string): Team {
  const teamName = name.trim().length > 0 ? name.trim() : "Nouvelle team";
  const personas = cloneCanonicalRoster();
  const coord =
    personas.find((p) => p.roleKey === "coordination") ?? personas[0];
  return {
    id: (id && id.trim().length > 0 ? id.trim() : slugify(teamName)) || "team",
    name: teamName,
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
    vignetteTeam: DEFAULT_VIGNETTE_TEAM,
    coordinator: "",
    personas: [],
    connectors: [],
  };
}
