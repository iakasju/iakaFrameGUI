/**
 * resolve.ts — le **résolveur** d'authoring : oriente vers l'inférence **live** ou le **mock**.
 *
 * Logique d'orientation (copilote-inference-live.md §3.5), défensive de bout en bout :
 *   1. modèle vide/absent               → **mock** (comportement inchangé ; aucune « raison »).
 *   2. provider ≠ `ollama` (MVP, D2)    → **mock** + message « provider non supporté ».
 *   3. live : `await llm.complete`
 *        - rejet (réseau KO / timeout)  → **mock** + message « modèle indisponible » (jamais de stack).
 *        - `parseLiveProposition` null  → **mock** + message « réponse illisible ».
 *        - succès                       → Proposition **live** (diff/model/hint/diffFile RECALCULÉS).
 *
 * Le repli passe **toujours** par le **même** `propose()` mocké (déterminisme du fallback intact) :
 * la `Proposition` de repli est **strictement égale** à `propose(intention, context)` ; la « raison »
 * est délivrée **à côté** (champ `reason`), sans jamais muter la Proposition. Le LLM ne pilote QUE
 * `intro/artefacts/ops` — `diff`, `model`, `hint`, `diffFile` sont posés par notre code (frontière).
 */
import {
  parseLiveProposition,
  type LlmRequest,
  type LlmTransport,
} from "@iakaframe/core";
import {
  buildDiff,
  propose,
  type CopiloteContext,
  type MaterializeOp,
  type MaterializeTarget,
  type ProposedArtefact,
  type Proposition,
} from "../mock/copilote";
import {
  buildSurfaceElementPool,
  buildSystemPrompt,
  buildUserPrompt,
  LLM_OUTPUT_SCHEMA,
  SURFACE_TARGETS,
} from "./prompt";
import type { CopiloteIdentity } from "./identity";

/** Hôte Ollama par défaut (D3) — surchargé par l'endpoint d'authoring réglé (LAN). */
export const DEFAULT_AUTHORING_HOST = "http://localhost:11434";
/** Budget de temps par défaut d'un appel d'inférence d'authoring. */
export const DEFAULT_LLM_TIMEOUT_MS = 20000;

/** Provider supporté au MVP (D2) — tout autre ⇒ repli mock. */
export const MVP_PROVIDER = "ollama";

/** Messages de repli (canal `reason`, affichés dans l'en-tête — jamais une stack brute). */
export const FALLBACK_UNSUPPORTED = "provider non supporté au MVP (ollama) — repli mock";
export const FALLBACK_UNAVAILABLE = "modèle indisponible — repli mock";
export const FALLBACK_UNREADABLE = "réponse du modèle illisible — repli mock";

/** D'où vient la Proposition rendue : inférence réelle vs mock déterministe (repli). */
export type PropositionSource = "live" | "mock";

/** Résultat du résolveur : la Proposition + sa provenance + la raison éventuelle du repli. */
export interface ResolveResult {
  proposition: Proposition;
  source: PropositionSource;
  /** Raison du repli hors cas normal « pas de modèle » (affichée) ; `undefined` = cas nominal. */
  reason?: string;
}

/** Dépendances injectables du résolveur (le `llm` est le transport ; le reste a des défauts). */
export interface ResolveDeps {
  llm: LlmTransport;
  /** Le mock de repli (défaut : `propose`) — injectable pour les tests de déterminisme. */
  mock?: (intention: string, context: CopiloteContext) => Proposition;
  /** Endpoint d'authoring optionnel (D3) — vide ⇒ `DEFAULT_AUTHORING_HOST`. */
  endpoint?: string | null;
  /** Budget de temps de l'appel (défaut `DEFAULT_LLM_TIMEOUT_MS`). */
  timeoutMs?: number;
  /**
   * Identité du copilote, **dérivée du canon** par l'appelant (`loadCopiloteIdentity`). Absente
   * (racine introuvable, fiche manquante) ⇒ prompt système **anonyme**, byte-identique à
   * l'historique. Jamais d'identité fabriquée ici (I-1/I-5).
   */
  identity?: CopiloteIdentity | null;
}

/** Split `provider:model` sur le **premier** `:` (le modèle peut contenir des `:`). */
function parseProviderModel(raw: string): { provider: string; model: string } {
  const idx = raw.indexOf(":");
  if (idx < 0) return { provider: "", model: raw.trim() };
  return {
    provider: raw.slice(0, idx).trim().toLowerCase(),
    model: raw.slice(idx + 1).trim(),
  };
}

/** Hint d'une Proposition **live** (posé par notre code, jamais par le LLM). */
function buildLiveHint(context: CopiloteContext, model: string): string {
  const note =
    context.surface === "methode"
      ? "La méthode ne nomme aucun agent : que la discipline. "
      : "";
  return `${note}Modèle d'authoring : ${model} (LLM live). La forge n'écrit rien sans votre validation.`;
}

/**
 * Oriente vers live ou mock et rend la `Proposition` finale. **Ne lève jamais** (tout rejet du
 * transport est capté → repli mock). Le diff live est **recalculé** par `buildDiff` (jamais dicté).
 */
export async function resolveProposition(
  intention: string,
  context: CopiloteContext,
  deps: ResolveDeps,
): Promise<ResolveResult> {
  const mock = deps.mock ?? propose;
  const rawModel = typeof context.model === "string" ? context.model.trim() : "";

  // 1. Modèle vide/absent → mock direct (comportement actuel inchangé ; aucune raison).
  if (rawModel.length === 0) {
    return { proposition: mock(intention, context), source: "mock" };
  }

  // 2. Provider non supporté au MVP → repli mock + message.
  const { provider, model } = parseProviderModel(rawModel);
  if (provider !== MVP_PROVIDER || model.length === 0) {
    return {
      proposition: mock(intention, context),
      source: "mock",
      reason: FALLBACK_UNSUPPORTED,
    };
  }

  // 3. Chemin live.
  const surface = context.surface;
  const elementPool = buildSurfaceElementPool(surface);
  const host =
    deps.endpoint && deps.endpoint.trim().length > 0
      ? deps.endpoint.trim()
      : DEFAULT_AUTHORING_HOST;
  const req: LlmRequest = {
    provider,
    model,
    host,
    system: buildSystemPrompt(deps.identity),
    user: buildUserPrompt(intention, context, elementPool),
    timeoutMs: deps.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS,
    format: LLM_OUTPUT_SCHEMA, // D4 : sorties structurées Ollama (`format:<schema>`)
  };

  let raw: string;
  try {
    raw = await deps.llm.complete(req);
  } catch {
    // Réseau KO / timeout / provider indispo → repli mock + message clair (jamais une stack).
    return {
      proposition: mock(intention, context),
      source: "mock",
      reason: FALLBACK_UNAVAILABLE,
    };
  }

  const live = parseLiveProposition(raw, {
    allowedTargets: SURFACE_TARGETS[surface],
    elementPool,
  });
  if (!live) {
    return {
      proposition: mock(intention, context),
      source: "mock",
      reason: FALLBACK_UNREADABLE,
    };
  }

  // Succès live : le LLM ne pilote QUE intro/artefacts/ops ; tout le reste est recalculé par nous.
  const ops: MaterializeOp[] = live.ops.map((o) => ({
    target: o.target as MaterializeTarget, // sûr : ∈ SURFACE_TARGETS[surface] (filtré au parsing)
    id: o.id,
    label: o.label,
  }));
  const artefacts: ProposedArtefact[] = live.artefacts.map((a) => ({
    icon: a.icon,
    tag: a.tag,
    title: a.title,
    detail: a.detail,
  }));
  const proposition: Proposition = {
    intention,
    model: rawModel,
    intro: live.intro.length > 0 ? live.intro : "Proposition du modèle d'authoring.",
    artefacts,
    diff: buildDiff(ops, context), // diff de confiance, recalculé localement
    diffFile: `${context.diffFile ?? "artefact"} · avant → après`,
    ops,
    hint: buildLiveHint(context, rawModel),
  };
  return { proposition, source: "live" };
}
