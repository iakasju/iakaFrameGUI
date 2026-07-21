/**
 * method.ts — la **Méthode** : concept de 1er ordre (discipline), E2 §3 — cœur 🟦.
 *
 * Une **Méthode** est la *discipline* (pas le casting) : elle **référence par id** ses six
 * composants — scaffold, workflow, principes, rituels, gardes-fous, référentiel de rôles
 * (Q-2, comme `Persona.skills`/`guardrails`). Elle **ne nomme aucun agent** ; elle **possède**
 * désormais le **Workflow** (migré depuis la Team, §3.2) : `resolveWorkflow` prend une `Method`
 * (Q-3) et se replie sur le **canonique** quand aucune méthode n'est fournie (rétro-compat
 * adaptateurs — sortie byte-identique).
 *
 * Esprit du cœur : type pur + parseur défensif (record invalide → `null`, jamais d'exception).
 * NB : `scaffoldIds` au pluriel (deux niveaux portefeuille+projet, §3.1) ; `workflowId`
 * optionnel (repli canonique, Q-3).
 */

import { CANONICAL_ROLE_KEYS } from "./roles";
import { CATALOG_PRINCIPLE_IDS, principleById, type Principle } from "./principle";
import { CATALOG_RITUAL_IDS, ritualById, type Ritual } from "./ritual";
import { CATALOG_SCAFFOLD_IDS, scaffoldById, type Scaffold } from "./scaffold";
import { CATALOG_GUARDRAIL_IDS } from "./guardrail";
import type { FrameMissingRef } from "./frame";
import {
  IAKAFRAME_CANONICAL_WORKFLOW,
  workflowById,
  type Workflow,
} from "./workflow";

/** Méthode par défaut (agnosticisme AR-9) — iakaframe au MVP. */
export const DEFAULT_METHOD_ID = "iakaframe";

/**
 * Une **Méthode** = la discipline, en **références** (ids) vers les catalogues du cœur.
 * Aucun runner/modèle, aucun nom d'agent (AR-1 renforcé, E2).
 */
export interface Method {
  /** Slug stable (ex. "iakaframe"). */
  id: string;
  /** Affichage. */
  name: string;
  /** Réf. Scaffold(s) — portefeuille + projet (§3.1). */
  scaffoldIds: string[];
  /** Réf. Workflow — le canonique au MVP ; absent → canonique via `resolveWorkflow` (Q-3). */
  workflowId?: string;
  /** Réf. Principe(s) — sous-ensemble du catalogue (§3.3). */
  principleIds: string[];
  /** Réf. Rituel(s) (§3.4). */
  ritualIds: string[];
  /** Réf. Garde-fou(s) (§3.5). */
  guardrailIds: string[];
  /** Réf. Role(s) — le jeu que le casting d'une Team doit couvrir (§3.6). */
  roleKeys: string[];
}

/**
 * **`IAKAFRAME_CANONICAL_METHOD`** — la méthode iakaframe, en DONNÉE : référence l'intégralité
 * des catalogues du cœur (14 principes · 5 rituels · 2 scaffolds · gardes canoniques · 7 rôles)
 * + le workflow canonique. C'est le **repli** des adaptateurs (sortie byte-identique).
 */
export const IAKAFRAME_CANONICAL_METHOD: Method = {
  id: DEFAULT_METHOD_ID,
  name: "Méthode iakaframe",
  scaffoldIds: [...CATALOG_SCAFFOLD_IDS],
  workflowId: IAKAFRAME_CANONICAL_WORKFLOW.id,
  principleIds: [...CATALOG_PRINCIPLE_IDS],
  ritualIds: [...CATALOG_RITUAL_IDS],
  guardrailIds: [...CATALOG_GUARDRAIL_IDS],
  roleKeys: [...CANONICAL_ROLE_KEYS],
};

/** **Catalogue de méthodes** du cœur (MVP : la seule canonique). Clé = `Method.id`. */
export const METHOD_CATALOG: Readonly<Record<string, Method>> = {
  [IAKAFRAME_CANONICAL_METHOD.id]: IAKAFRAME_CANONICAL_METHOD,
};

/** Une méthode du catalogue par id (`undefined` si absente). */
export function methodById(id: string | undefined | null): Method | undefined {
  return id ? METHOD_CATALOG[id] : undefined;
}

// ---------------------------------------------------------------------------
// Résolution du workflow — DÉMÉNAGÉE depuis team.ts (Q-3). La Méthode possède le workflow.
// ---------------------------------------------------------------------------

/**
 * **Résout le workflow d'une Méthode** (§3.2, Q-3). Renvoie le workflow du catalogue référencé
 * par `method.workflowId` **sinon** le **canonique** (`IAKAFRAME_CANONICAL_WORKFLOW`). Défensif :
 * jamais d'exception, toujours ≥ le canonique. **Sans méthode fournie** (`undefined`/`null`) →
 * canonique : c'est la clé de la rétro-compat des adaptateurs (sortie byte-identique).
 */
export function resolveWorkflow(
  method?: Pick<Method, "workflowId"> | null,
): Workflow {
  return workflowById(method?.workflowId) ?? IAKAFRAME_CANONICAL_WORKFLOW;
}

// ---------------------------------------------------------------------------
// Résolveurs de composants (ids → objets du catalogue). Les ids inconnus sont filtrés ICI
// (à la résolution), pas au parse — l'agnosticisme AR-9 conserve les ids d'une autre méthode.
// ---------------------------------------------------------------------------

/** Principes d'une méthode, résolus depuis le catalogue (ids inconnus filtrés). */
export function principlesForMethod(method: Method): Principle[] {
  return method.principleIds
    .map((id) => principleById(id))
    .filter((p): p is Principle => p !== undefined);
}

/** Rituels d'une méthode, résolus depuis le catalogue (ids inconnus filtrés). */
export function ritualsForMethod(method: Method): Ritual[] {
  return method.ritualIds
    .map((id) => ritualById(id))
    .filter((r): r is Ritual => r !== undefined);
}

/** Scaffolds d'une méthode, résolus depuis le catalogue (ids inconnus filtrés). */
export function scaffoldsForMethod(method: Method): Scaffold[] {
  return method.scaffoldIds
    .map((id) => scaffoldById(id))
    .filter((s): s is Scaffold => s !== undefined);
}

// ---------------------------------------------------------------------------
// Visibilité de la perte à la résolution (D-7). Les résolveurs ci-dessus filtrent en SILENCE ;
// la fonction ci-dessous DIT ce qui a été perdu, sans rien changer à leur comportement.
// ---------------------------------------------------------------------------

/**
 * Une **référence non résolue** d'une méthode : id déclaré que les catalogues du cœur ne
 * connaissent pas. Forme **identique** à `FrameMissingRef` (`{ source, field, id }`) — c'est le
 * même geste un étage plus bas, on ne crée pas une troisième forme (D7-a).
 *
 * ⚠️ Ce n'est **pas** une faute de l'auteur de la méthode : la référence peut être parfaitement
 * légitime (elle existe dans le pool sur disque) et n'être **pas encore couverte** par le
 * catalogue codé en dur du cœur. La limite désignée est **le cœur**, pas la méthode.
 */
export type MethodUnresolvedRef = FrameMissingRef;

/** Lit un champ tableau d'une `Method` sans jamais lever (objet partiel/dégénéré toléré). */
function refsOf(method: Method, field: keyof Method): string[] {
  const raw = method[field];
  return Array.isArray(raw) ? raw.filter((s) => typeof s === "string") : [];
}

/**
 * **Références non résolues d'une méthode** (D-7) — fonction **pure**, additive, non bloquante :
 * elle ne modifie ni la sortie ni la signature des résolveurs, elle les **double d'un rapport**.
 *
 * Couvre les **6 constituants + `workflowId`** (D7-b) — y compris `guardrailIds`/`roleKeys` qui
 * n'ont pas de résolveur et sont justement les plus perdus. Un rapport partiel se lirait comme
 * complet : il serait pire qu'aucun rapport.
 *
 * Ordre **déterministe** (le rapport sert d'instrument de suivi, il doit être comparable d'une
 * exécution à l'autre) : ordre des champs ci-dessous, puis ordre de déclaration des ids.
 * Défensive : jamais d'exception, y compris sur une `Method` aux tableaux vides ou absents.
 * Les ids vides/blancs sont ignorés (`parseMethod` n'en produit jamais).
 */
export function unresolvedRefsForMethod(method: Method): MethodUnresolvedRef[] {
  if (typeof method !== "object" || method === null) return [];
  const source = `method:${typeof method.id === "string" ? method.id : ""}`;
  const out: MethodUnresolvedRef[] = [];

  /** Empile les ids d'un champ que `resolves` ne sait pas résoudre. */
  const scan = (field: keyof Method, resolves: (id: string) => boolean): void => {
    for (const id of refsOf(method, field)) {
      if (id.trim().length === 0) continue;
      if (!resolves(id)) out.push({ source, field, id });
    }
  };

  scan("principleIds", (id) => principleById(id) !== undefined);
  scan("ritualIds", (id) => ritualById(id) !== undefined);
  scan("scaffoldIds", (id) => scaffoldById(id) !== undefined);
  scan("guardrailIds", (id) => CATALOG_GUARDRAIL_IDS.includes(id));
  scan("roleKeys", (id) => CANONICAL_ROLE_KEYS.includes(id));

  // `workflowId` : scalaire optionnel. Le repli sur le canonique (`resolveWorkflow`) est CONSERVÉ,
  // il devient seulement visible — c'est le repli qui fabrique un résultat plausible (§1.1).
  const workflowId = method.workflowId;
  if (typeof workflowId === "string" && workflowId.trim().length > 0) {
    if (workflowById(workflowId) === undefined) {
      out.push({ source, field: "workflowId", id: workflowId });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Parseurs défensifs (jamais d'exception ; un champ illisible → repli sûr).
// ---------------------------------------------------------------------------

/** Filtre un tableau brut en `string[]` (ignore non-string / vides). */
function toStringArray(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];
}

/**
 * Parse défensif d'UNE méthode (`null` si inutilisable : pas d'`id`). Les tableaux de références
 * sont filtrés en `string[]` (les ids sont conservés tels quels — agnosticisme AR-9) ; `name`
 * repli sur l'`id` ; `workflowId` conservé s'il est une chaîne non vide, sinon omis.
 */
export function parseMethod(raw: unknown): Method | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id =
    typeof r.id === "string" && r.id.trim().length > 0 ? r.id.trim() : null;
  if (!id) return null;
  const name =
    typeof r.name === "string" && r.name.trim().length > 0 ? r.name.trim() : id;
  const method: Method = {
    id,
    name,
    scaffoldIds: toStringArray(r.scaffoldIds),
    principleIds: toStringArray(r.principleIds),
    ritualIds: toStringArray(r.ritualIds),
    guardrailIds: toStringArray(r.guardrailIds),
    roleKeys: toStringArray(r.roleKeys),
  };
  const workflowId =
    typeof r.workflowId === "string" && r.workflowId.trim().length > 0
      ? r.workflowId.trim()
      : undefined;
  if (workflowId) method.workflowId = workflowId;
  return method;
}

/**
 * Parse un tableau JSON de méthodes (défensif). `[]` si absent/illisible/non-tableau ; les
 * méthodes invalides sont filtrées. Jamais d'exception.
 */
export function parseMethods(json: string | undefined | null): Method[] {
  if (!json || json.trim().length === 0) return [];
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.map(parseMethod).filter((m): m is Method => m !== null);
}

/**
 * Parse le contenu texte d'UN fichier méthode (`<methodId>.json`). `null` si illisible/invalide
 * (jamais d'exception) — l'appelant ignore la méthode.
 */
export function parseMethodText(text: string | undefined | null): Method | null {
  if (!text || text.trim().length === 0) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  return parseMethod(data);
}

/**
 * Sérialise une méthode pour la persistance (passe par `parseMethod` d'abord pour garantir la
 * forme). Indenté (lisible sur disque).
 */
export function serializeMethod(method: Method): string {
  const clean = parseMethod(method) ?? method;
  return JSON.stringify(clean, null, 2);
}
