/**
 * persona.ts — la **persona** (incarnation nommée d'un rôle) + parseur défensif (🟦/🟧).
 *
 * Schéma dérivé de `IakaCockpit/src/hooks/useTeams.ts:59-86` (ex-« Agent ») **MOINS les
 * champs `runner` et `model`** — invariant AR-1 : une persona forgée ne porte JAMAIS de
 * runner ni de modèle (ce couple est run-time, côté cockpit). Le parseur défensif
 * (`parsePersona`) calque `parseAgent` du Cockpit (`useTeams.ts:127-155`) : record invalide
 * → `null`, jamais d'exception ; et il **IGNORE explicitement** toute clé `runner`/`model`
 * présente en entrée (résilience à un JSON pollué — jamais réémise).
 */

import { roleIndexOf } from "./roles";
import type { FrontmatterPatch } from "./frontmatter";

/**
 * Une persona forgée. **AUCUN champ `runner`, AUCUN champ `model`** (AR-1).
 * Le `name` est un **nommage libre** (AR-5) ; `royaume` (MAJUSCULE) sert la pastille
 * `[ROYAUME][Nom]` ; `roleKey` réfère un rôle canonique ; `roleIndex` pioche le casting.
 */
export interface Persona {
  /** Slug stable, unique dans la team (ex. "aragorn"). */
  id: string;
  /** Affichage — NOMMAGE LIBRE (AR-5) ; ex. "Aragorn" ou un nom choisi. */
  name: string;
  /** Rôle de la persona (réf. `Role.key`, ex. "coordination"). */
  roleKey: string;
  /** Royaume MAJUSCULE — pastille `[ROYAUME][Nom]`. */
  royaume: string;
  /**
   * Emoji de pastille du badge (ex. `"🟠"` pour Fëanor). **Optionnel — absent = non déclaré** :
   * on ne fabrique jamais de pastille par défaut (un badge inventé serait indiscernable d'un badge
   * canon). La clé n'est émise par le parseur que si la fiche la déclare, pour ne pas casser
   * l'égalité d'un round-trip sur une persona qui ne la porte pas.
   */
  pastille?: string;
  /**
   * Ligne de **mission** d'affichage (courte) — le libellé de la maquette réservoir. **Optionnel —
   * absent = non déclaré** : DISTINCT de `description` (blurb de déclenchement du sous-agent,
   * load-bearing). La clé n'est émise par le parseur que si la fiche la déclare, pour ne pas casser
   * l'égalité d'un round-trip sur une persona qui ne la porte pas (même politique que `pastille`).
   */
  mission?: string;
  /** Index de casting (0..N-1), dérivé du rôle par défaut, éditable. */
  roleIndex: number;
  /** Ids de skills attribuées (ex. "iakaframe-cadrage"). */
  skills: string[];
  /** Ids de gardes-fous attachés (AR-8 ; MVP = déclaration). */
  guardrails: string[];
}

/** Pastille d'affichage `[ROYAUME][Nom]` d'une persona (royaume forcé MAJUSCULE). */
export function personaBadge(p: Pick<Persona, "royaume" | "name">): string {
  return `[${(p.royaume || "").toUpperCase()}][${p.name}]`;
}

/** Slugifie un nom libre en id stable (minuscules, alphanum + tirets). */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Filtre un tableau brut en `string[]` (ignore les entrées non-string / vides). */
function toStringArray(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];
}

/**
 * Parse défensif d'UNE persona (record invalide → `null`, jamais d'exception). Calque
 * `parseAgent` du Cockpit. **Invariant AR-1** : les clés `runner`/`model` éventuellement
 * présentes en entrée sont **ignorées** (jamais recopiées dans le résultat).
 */
export function parsePersona(raw: unknown): Persona | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (name.length === 0) return null;

  const id =
    typeof r.id === "string" && r.id.trim().length > 0
      ? r.id.trim()
      : slugify(name);

  const roleKey =
    typeof r.roleKey === "string" && r.roleKey.trim().length > 0
      ? r.roleKey.trim()
      : "";

  const royaume =
    typeof r.royaume === "string" && r.royaume.trim().length > 0
      ? r.royaume.trim()
      : roleKey.toUpperCase();

  const roleIndex =
    typeof r.roleIndex === "number" && Number.isFinite(r.roleIndex)
      ? r.roleIndex
      : roleIndexOf(roleKey);

  // Pastille : reprise VERBATIM si déclarée, sinon CLÉ ABSENTE (jamais de défaut fabriqué,
  // jamais de clé vide qui casserait un round-trip).
  const pastille = typeof r.pastille === "string" ? r.pastille.trim() : "";

  // Mission : même politique que la pastille — VERBATIM si déclarée, sinon CLÉ ABSENTE.
  const mission = typeof r.mission === "string" ? r.mission.trim() : "";

  // AR-1 : `r.runner` / `r.model` sont volontairement NON lus → jamais réémis.
  return {
    id,
    name,
    roleKey,
    royaume,
    ...(pastille.length > 0 ? { pastille } : {}),
    ...(mission.length > 0 ? { mission } : {}),
    roleIndex,
    skills: toStringArray(r.skills),
    guardrails: toStringArray(r.guardrails),
  };
}

/**
 * Construit le **patch de frontmatter** d'une persona pour une réécriture **non-destructive**
 * (Lot 5a, C1) : uniquement les champs de fichier que l'éditeur modélise
 * (`name, mission?, roleKey, royaume, pastille?, skills, guardrails`). **Exclus volontairement** :
 * `id` (verrouillé en édition, C-1 : jamais de renommage), `roleIndex` (dérivé, pas un champ de
 * fichier), et toute clé non modélisée (`description`, `vignette`, inconnues) — ces dernières sont
 * **préservées à l'octet** par {@link patchFrontmatter} du seul fait de leur absence du patch.
 * `mission`/`pastille` ne sont émis que s'ils sont déclarés (même politique que `parsePersona`).
 */
export function personaFrontmatterPatch(p: Persona): FrontmatterPatch {
  const patch: FrontmatterPatch = {
    name: { kind: "scalar", value: p.name },
    roleKey: { kind: "scalar", value: p.roleKey },
    royaume: { kind: "scalar", value: p.royaume },
    skills: { kind: "list", value: [...p.skills] },
    guardrails: { kind: "list", value: [...p.guardrails] },
  };
  if (p.mission !== undefined && p.mission.length > 0) {
    patch.mission = { kind: "scalar", value: p.mission };
  }
  if (p.pastille !== undefined && p.pastille.length > 0) {
    patch.pastille = { kind: "scalar", value: p.pastille };
  }
  return patch;
}
