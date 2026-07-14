/**
 * team.ts — la **Team PURE, method-agnostic** (AR-1 + E2 §4) + parseurs défensifs (cœur 🟦).
 *
 * Schéma dérivé de `IakaCockpit/src/hooks/useTeams.ts:76-86` (`Team`) **MOINS** tout ce
 * qui touche au runner/modèle : une team forgée ne porte QUE des personas pures (§ 2.8
 * contrat). **E2 la purifie davantage** : elle perd **aussi** son `methodId` (l'appariement
 * Méthode↔Team se décide au **Kit**, `kit.ts`) et son `workflowId` (le Workflow **monte dans
 * la Méthode**, `method.ts`). La Team devient un **casting pur**, réutilisable sur plusieurs
 * méthodes. Les parseurs (`parseTeam`/`parseTeams`/`parseTeamText`) calquent l'esprit du
 * Cockpit (`useTeams.ts:157-192`) : un fichier illisible/partiel → team ignorée (jamais
 * d'exception). Le `coordinator` invalide se replie sur `personas[0]`.
 */

import { parsePersona, type Persona } from "./persona";

/** Casting « pastilles » par défaut au MVP (Q-4) : pas de portraits embarqués. */
export const DEFAULT_VIGNETTE_TEAM = "none";

/**
 * Une team forgée **PURE** et **method-agnostic** (AR-1 + E2). AUCUN runner, AUCUN modèle (posés
 * run-time côté cockpit), **AUCUNE méthode, AUCUN workflow** (portés par Méthode/Kit, E2).
 */
export interface Team {
  /** Slug stable, unique (ex. "iakaframe"). */
  id: string;
  /** Affichage. */
  name: string;
  /** Casting visuel ("none" = pastilles `[ROYAUME][Nom]` au MVP, Q-4). */
  vignetteTeam: string;
  /** Id de persona coordinatrice (= chef de projet) ; doit exister dans `personas[]`. */
  coordinator: string;
  /** Roster de personas pures. */
  personas: Persona[];
  /** Ids de connecteurs MCP attachés (AR-8 ; MVP = déclaration). */
  connectors: string[];
  // E2 : PLUS de `methodId` (→ Kit), PLUS de `workflowId` (→ Méthode). Casting pur.
}

/** Filtre un tableau brut en `string[]` (ignore non-string / vides). */
function toStringArray(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];
}

/**
 * Parse défensif d'UNE team (record/personas invalides ignorés ; `null` si inutilisable).
 * Le `coordinator` référence une persona existante → conservé ; sinon repli `personas[0]`.
 * Les clés étrangères (runner/model d'un JSON pollué) ne sont pas propagées (les personas
 * passent par `parsePersona`, la team ne lit que ses champs connus).
 */
export function parseTeam(raw: unknown): Team | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === "string" && r.id.trim().length > 0 ? r.id.trim() : null;
  if (!id) return null;

  const name =
    typeof r.name === "string" && r.name.trim().length > 0 ? r.name.trim() : id;

  const vignetteTeam =
    typeof r.vignetteTeam === "string" && r.vignetteTeam.trim().length > 0
      ? r.vignetteTeam.trim()
      : DEFAULT_VIGNETTE_TEAM;

  const personas = Array.isArray(r.personas)
    ? r.personas.map(parsePersona).filter((p): p is Persona => p !== null)
    : [];

  const coordRaw = typeof r.coordinator === "string" ? r.coordinator : "";
  const coordinator =
    coordRaw.length > 0 && personas.some((p) => p.id === coordRaw)
      ? coordRaw
      : (personas[0]?.id ?? "");

  const team: Team = {
    id,
    name,
    vignetteTeam,
    coordinator,
    personas,
    connectors: toStringArray(r.connectors),
  };
  return team;
}

/**
 * Parse un tableau JSON de teams (défensif). Renvoie `[]` si absent/illisible/non-tableau ;
 * les teams invalides sont filtrées. Jamais d'exception.
 */
export function parseTeams(json: string | undefined | null): Team[] {
  if (!json || json.trim().length === 0) return [];
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.map(parseTeam).filter((t): t is Team => t !== null);
}

/**
 * Parse le contenu texte d'UN fichier team (`<teamId>.json`, un objet `Team` sérialisé).
 * Renvoie `null` si illisible/invalide (jamais d'exception) — l'appelant ignore la team.
 */
export function parseTeamText(text: string | undefined | null): Team | null {
  if (!text || text.trim().length === 0) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  return parseTeam(data);
}

/**
 * Sérialise une team pour la persistance (un objet `Team` par fichier). Passe par
 * `parseTeam` d'abord pour **garantir l'invariant** (aucune clé étrangère runner/model ne
 * peut fuiter, même si l'objet en mémoire était pollué). Indenté (lisible sur disque).
 */
export function serializeTeam(team: Team): string {
  const clean = parseTeam(team) ?? team;
  return JSON.stringify(clean, null, 2);
}
