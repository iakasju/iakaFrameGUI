/**
 * resolve.ts — le **résolveur** d'authoring : **honnête par défaut** (option C,
 * `copilote-honnete-mock-opt-in.md`). Aligné byte-à-byte sur le socle honnête
 * `resolveAdvice`/`resolveElementProposition` : hors mode démo, l'échec d'inférence **avoue**
 * (`proposition: null` + `reason`) — **jamais** une proposition fabriquée présentée comme réelle.
 *
 * Logique d'orientation (mapping §2.2), défensive de bout en bout :
 *   1. modèle vide/absent               → **aveu** (`null`, `"none"`, `NO_AUTHORING_MODEL_HINT`).
 *   2. **mode démo opt-in** (`authoringModel === "mock"`, valeur réservée) → **mock ÉTIQUETÉ**
 *      (`propose()`, `"mock"`, `MOCK_DEMO_LABEL`) — **AVANT** le test provider (`mock` n'a pas
 *      de `:` : sans cet ordre il tomberait en « provider non supporté »).
 *   3. provider ≠ `ollama` (MVP, D2)    → **aveu** (`null`, `"none"`, `FALLBACK_UNSUPPORTED`).
 *   4. live : `await llm.complete`
 *        - rejet (réseau KO / timeout)  → **aveu** (`null`, `"none"`, `FALLBACK_UNAVAILABLE` ; jamais de stack).
 *        - `parseLiveProposition` null  → **aveu** (`null`, `"none"`, `FALLBACK_UNREADABLE`).
 *        - succès                       → Proposition **live** (diff/model/hint/diffFile RECALCULÉS).
 *
 * Le mock reste **injectable en test** (`deps.mock`) et **déterministe** — seul son **déclenchement
 * runtime** devient opt-in (cas 2). Le LLM ne pilote QUE `intro/artefacts/ops` — `diff`, `model`,
 * `hint`, `diffFile` sont posés par notre code (frontière). **Ne lève JAMAIS**.
 */
import {
  parseLiveProposition,
  type LlmRequest,
  type LlmTransport,
} from "@iakaframe/core";
import {
  buildDiff,
  NO_AUTHORING_MODEL_HINT,
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

/** Provider supporté au MVP (D2) — tout autre ⇒ aveu honnête. */
export const MVP_PROVIDER = "ollama";

/**
 * Valeur réservée d'opt-in du **mode démo** (D1) : saisie dans le réglage existant `authoringModel`
 * (insensible à la casse, trimée ; provider `mock` accepté : `mock` ou `mock:<libellé>`). Sa détection
 * route vers `propose()` — **toujours étiqueté** `MOCK_DEMO_LABEL`, jamais confondu avec une inférence.
 */
export const MOCK_DEMO_MODEL = "mock";

/**
 * Étiquette **non négociable** (H-2) portée par TOUTE proposition de source `"mock"` (bandeau + ligne
 * `who`) : la proposition est fabriquée, ce n'est pas une vraie inférence.
 */
export const MOCK_DEMO_LABEL =
  "MOCK · démo hors-ligne — proposition fabriquée, pas une vraie inférence";

/**
 * Messages d'**aveu** (canal `reason`, affichés dans l'en-tête — jamais une stack brute). Reformulés
 * (option C) : plus de « — repli mock » (mensonger dès lors que le défaut est l'aveu). PARTAGÉS par le
 * socle honnête (`advise.ts`/`elementProposition.ts`) — le reformulage améliore aussi leurs aveux.
 */
export const FALLBACK_UNSUPPORTED = "provider non supporté au MVP (ollama seul)";
export const FALLBACK_UNAVAILABLE = "modèle indisponible (réseau ou hôte injoignable)";
export const FALLBACK_UNREADABLE = "réponse du modèle illisible";

/**
 * D'où vient (ou non) la Proposition rendue :
 *  - `"live"` = inférence réelle (proposition non-null) ;
 *  - `"mock"` = mode démo OPT-IN (proposition non-null, TOUJOURS étiquetée `MOCK_DEMO_LABEL`) ;
 *  - `"none"` = **aveu honnête** (`proposition === null` — aucune proposition fabriquée).
 */
export type PropositionSource = "live" | "mock" | "none";

/** Résultat du résolveur : la Proposition (ou `null` = aveu) + sa provenance + la raison éventuelle. */
export interface ResolveResult {
  /** `null` ⇔ aveu (`source: "none"`) : aucune proposition fabriquée présentée comme réelle. */
  proposition: Proposition | null;
  source: PropositionSource;
  /** Raison d'un aveu (repli) OU étiquette d'une démo mock (affichée) ; `undefined` = succès live. */
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
 * Oriente vers l'inférence live, le mode démo opt-in ou l'**aveu honnête**, et rend le `ResolveResult`.
 * **Ne lève jamais** (tout rejet du transport est capté → aveu, jamais une stack). Le diff live est
 * **recalculé** par `buildDiff` (jamais dicté). Hors mode démo, **aucune** proposition n'est fabriquée.
 */
export async function resolveProposition(
  intention: string,
  context: CopiloteContext,
  deps: ResolveDeps,
): Promise<ResolveResult> {
  const mock = deps.mock ?? propose;
  const rawModel = typeof context.model === "string" ? context.model.trim() : "";

  // 1. Modèle vide/absent → AVEU honnête (aucune proposition fabriquée ; l'absence est signalée).
  if (rawModel.length === 0) {
    return { proposition: null, source: "none", reason: NO_AUTHORING_MODEL_HINT };
  }

  const { provider, model } = parseProviderModel(rawModel);

  // 2. Mode démo OPT-IN (valeur réservée `mock`, insensible à la casse) — **AVANT** le test provider :
  //    `mock` n'a pas de `:` (provider vide), il tomberait sinon en « provider non supporté ». La
  //    proposition mockée est TOUJOURS étiquetée (`MOCK_DEMO_LABEL`) — jamais confondue avec du live.
  if (rawModel.toLowerCase() === MOCK_DEMO_MODEL || provider === MOCK_DEMO_MODEL) {
    return { proposition: mock(intention, context), source: "mock", reason: MOCK_DEMO_LABEL };
  }

  // 3. Provider non supporté au MVP → AVEU honnête (aucune proposition fabriquée).
  if (provider !== MVP_PROVIDER || model.length === 0) {
    return { proposition: null, source: "none", reason: FALLBACK_UNSUPPORTED };
  }

  // 4. Chemin live.
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
    // Réseau KO / timeout / provider indispo → AVEU honnête (message clair, jamais une stack).
    return { proposition: null, source: "none", reason: FALLBACK_UNAVAILABLE };
  }

  const live = parseLiveProposition(raw, {
    allowedTargets: SURFACE_TARGETS[surface],
    elementPool,
  });
  if (!live) {
    // Réponse illisible / zéro op valide → AVEU honnête (aucune proposition fabriquée).
    return { proposition: null, source: "none", reason: FALLBACK_UNREADABLE };
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
