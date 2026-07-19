/**
 * llm.ts — socle **pur** de l'inférence d'authoring **live** (copilote), côté cœur 🟦.
 *
 * ZÉRO I/O, ZÉRO réseau : ce module ne fait que **décrire** le transport (types) et **parser
 * défensivement** la complétion d'un modèle. L'appel réseau réel vit dans le backend Rust
 * (`llm_complete`, dérogation bornée AR-1/AR-6) et est injecté en front via un `LlmTransport`.
 *
 * ⚠️ **FRONTIÈRE authoring ≠ exécution** : ce parseur ne connaît **que** des cibles de
 * matérialisation d'artefacts (fournies par l'appelant) et un **réservoir** d'ids disponibles ;
 * il **rejette** toute cible hors liste et tout id hors réservoir. Aucune notion de runner/modèle
 * d'EXÉCUTION (Binding) n'existe ici — la frontière est tenue par filtrage, jamais par confiance.
 *
 * Esprit `parse*` du cœur (cf. `kit.ts`) : `try/catch` sur `JSON.parse`, validation champ par
 * champ, **retourne `null`** (jamais d'exception) quand le résultat est inexploitable.
 */

// ---------------------------------------------------------------------------
// Transport injectable (socle de testabilité — prouvable SANS réseau via `fakeLlm`).
// ---------------------------------------------------------------------------

/** Une requête d'inférence d'authoring, agnostique du schéma `Proposition` (séparation nette). */
export interface LlmRequest {
  /** Provider normalisé (MVP : `"ollama"` seul). */
  provider: string;
  /** Identifiant de modèle (peut contenir des `:`, ex. `"qwen2.5-coder:7b"`). */
  model: string;
  /** Hôte résolu de l'inférence (défaut `http://localhost:11434`, ou endpoint LAN réglé). */
  host: string;
  /** Prompt système (impose le schéma JSON de sortie, interdit toute notion d'exécution). */
  system: string;
  /** Prompt utilisateur (intention + surface + réservoir + présents + fichier de diff). */
  user: string;
  /** Budget de temps de l'appel (ms). */
  timeoutMs: number;
  /**
   * Schéma JSON de sortie (Ollama `format`, D4) — imposé au modèle pour des sorties structurées.
   * Optionnel : absent ⇒ le backend retombe sur le mode JSON générique (`format:"json"`).
   */
  format?: unknown;
}

/**
 * Transport d'inférence : renvoie le **TEXTE brut** de la complétion (le JSON produit par le
 * modèle). **Rejette** sur réseau KO / timeout / provider indisponible — l'appelant (résolveur)
 * traduit tout rejet en **repli mock**. Aucune connaissance du schéma `Proposition` ici.
 */
export interface LlmTransport {
  complete(req: LlmRequest): Promise<string>;
}

// ---------------------------------------------------------------------------
// Sortie structurée : les SEULS champs délégués au modèle (tout le reste est recalculé).
// ---------------------------------------------------------------------------

/** Classes d'icônes d'artefact autorisées (réutilise le CSS de la maquette). */
export const LIVE_ARTEFACT_ICONS = [
  "skill",
  "hook",
  "prin",
  "rit",
  "bind",
  "scaf",
  "role",
] as const;

export type LiveArtefactIcon = (typeof LIVE_ARTEFACT_ICONS)[number];

/** Un artefact « créatif » proposé par le modèle (affichage seul). */
export interface LiveArtefact {
  icon: LiveArtefactIcon;
  tag: string;
  title: string;
  detail: string;
}

/** Une op de matérialisation proposée par le modèle (`target`/`id` filtrés défensivement). */
export interface LiveOp {
  target: string;
  id: string;
  label: string;
}

/**
 * Le fragment **délégué au modèle** : intro + artefacts + ops. `diff`, `model`, `hint`, `diffFile`
 * NE viennent JAMAIS d'ici — ils sont recalculés par le code appelant (frontière de confiance).
 */
export interface LiveProposition {
  intro: string;
  artefacts: LiveArtefact[];
  ops: LiveOp[];
}

/** Options de parsing : l'appelant fournit les cibles permises + le réservoir d'ids par cible. */
export interface ParseLiveOptions {
  /** Cibles de matérialisation autorisées (les valeurs de `MaterializeTarget`, côté app). */
  allowedTargets: Iterable<string>;
  /** Réservoir d'ids disponibles **par cible** (catalogues du cœur) — un id hors liste est rejeté. */
  reservoir: Readonly<Record<string, readonly string[]>>;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Parse **défensivement** la complétion brute du modèle (§ sortie structurée) :
 *
 * - `JSON.parse` en `try/catch` → `null` si illisible (jamais d'exception).
 * - `intro` : chaîne (vide toléré ; l'appelant pose un défaut).
 * - `artefacts` : filtre chaque entrée (icône ∈ {@link LIVE_ARTEFACT_ICONS}, `tag`/`title`/`detail`
 *   chaînes) ; les invalides sont **jetées** (pas d'échec global).
 * - `ops` : filtre chaque entrée (`target` ∈ `allowedTargets`, `id` ∈ `reservoir[target]`) ; toute
 *   op à cible inconnue ou id hors réservoir est **rejetée** (frontière type-safe + réservoir).
 * - **`null` si zéro op valide** : la proposition serait vide de matérialisable → l'appelant
 *   retombe sur le mock.
 */
export function parseLiveProposition(
  raw: string,
  opts: ParseLiveOptions,
): LiveProposition | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(parsed)) return null;

  const intro = typeof parsed.intro === "string" ? parsed.intro.trim() : "";

  const allowed = new Set<string>(opts.allowedTargets);
  const icons = new Set<string>(LIVE_ARTEFACT_ICONS);

  const artefacts: LiveArtefact[] = [];
  if (Array.isArray(parsed.artefacts)) {
    for (const a of parsed.artefacts) {
      if (!isObject(a)) continue;
      if (typeof a.icon !== "string" || !icons.has(a.icon)) continue;
      if (
        typeof a.tag !== "string" ||
        typeof a.title !== "string" ||
        typeof a.detail !== "string"
      ) {
        continue;
      }
      artefacts.push({
        icon: a.icon as LiveArtefactIcon,
        tag: a.tag,
        title: a.title,
        detail: a.detail,
      });
    }
  }

  const ops: LiveOp[] = [];
  if (Array.isArray(parsed.ops)) {
    for (const o of parsed.ops) {
      if (!isObject(o)) continue;
      if (typeof o.target !== "string" || !allowed.has(o.target)) continue;
      if (typeof o.id !== "string") continue;
      const pool = opts.reservoir[o.target];
      if (!pool || !pool.includes(o.id)) continue; // id hors réservoir → rejeté
      const label =
        typeof o.label === "string" && o.label.trim().length > 0 ? o.label : o.id;
      ops.push({ target: o.target, id: o.id, label });
    }
  }

  if (ops.length === 0) return null; // inexploitable (aucune matérialisation) → repli mock

  return { intro, artefacts, ops };
}
