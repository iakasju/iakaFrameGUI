/**
 * advise.ts — le **résolveur de CONSEIL** de Fëanor-en-tête (`FeanorHead`), sœur texte de
 * `resolveProposition`. Il oriente vers l'inférence **live** (réponse texte du modèle) ou vers un
 * **repli honnête** (jamais une fausse réponse d'IA).
 *
 * Réutilisation MAXIMALE de la pile existante (instruction `feanor-en-tete-fonctionnel-llm.md`, MVP-A) :
 *  - **transport** : le `LlmTransport` injecté (`realLlm(backend)` → Rust `llm_complete` → Ollama LAN,
 *    `fakeLlm` en test) — AUCUN second transport.
 *  - **constantes de bord** : `DEFAULT_AUTHORING_HOST` / `DEFAULT_LLM_TIMEOUT_MS` / `MVP_PROVIDER` et
 *    les messages `FALLBACK_*` de `resolve.ts` — mêmes bornes, mêmes messages.
 *  - **identité** : la `CopiloteIdentity` **dérivée du canon** (`loadCopiloteIdentity`, rôle `frame`).
 *  - **réglages** : `authoringModel` (PARTAGÉ — pas de nouveau réglage) + `authoringEndpoint`.
 *
 * **Différence assumée avec `resolveProposition` (honnêteté).** Le copilote produit TOUJOURS une
 * `Proposition` de repli (mock déterministe). Ici, un repli **ne fabrique JAMAIS de réponse** : sur
 * modèle absent / provider non supporté / réseau KO / réponse illisible, `reply` vaut **`null`** et la
 * `reason` est délivrée à côté — l'en-tête affiche l'aveu honnête, pas une pseudo-réponse de Fëanor.
 *
 * **Ne lève JAMAIS** (tout rejet du transport est capté → repli). Aucun contrat `@iakaframe/core` ni
 * Rust touché : le schéma `{reply}` et son parseur vivent ici, dans `src/`.
 */
import type { LlmRequest, LlmTransport } from "@iakaframe/core";
import { NO_AUTHORING_MODEL_HINT } from "../mock/copilote";
import {
  DEFAULT_AUTHORING_HOST,
  DEFAULT_LLM_TIMEOUT_MS,
  MVP_PROVIDER,
  FALLBACK_UNAVAILABLE,
  FALLBACK_UNREADABLE,
  FALLBACK_UNSUPPORTED,
} from "./resolve";
import type { CopiloteIdentity } from "./identity";
import { personaBadge } from "@iakaframe/core";

/**
 * Schéma JSON imposé à Ollama via `format` (sorties structurées) : le conseil est du **texte libre**
 * porté par un seul champ `reply`. Local à `src/` — le schéma du copilote (`LLM_OUTPUT_SCHEMA`) reste
 * intact (I-6).
 */
export const ADVICE_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
  },
  required: ["reply"],
} as const;

/** D'où vient la réponse affichée : inférence réelle vs repli honnête (aucune réponse fabriquée). */
export type AdviceSource = "live" | "mock";

/** Contexte de l'élément en cours d'authoring passé à Fëanor (ce sur quoi il conseille). */
export interface FeanorContext {
  /** Mode de la page hôte : `create` (✚) ou `edit` (✎). */
  mode: "create" | "edit";
  /** Type d'élément conseillé (MVP : `persona`). */
  entityType: string;
  /** Nom de l'entité éditée (`null` en création vierge — jamais une fausse identité). */
  entityName: string | null;
  /** Clé de rôle de l'entité, si connue (contexte de conseil). */
  entityRole?: string | null;
}

/**
 * Résultat du résolveur de conseil : la réponse (ou `null` sur repli), sa provenance, et la raison
 * éventuelle du repli. `reply === null` ⇒ Fëanor n'a PAS répondu (l'en-tête le dit, jamais de fausse
 * réponse).
 */
export interface AdviceResult {
  /** Réponse texte du modèle, ou `null` si repli (aucune réponse fabriquée). */
  reply: string | null;
  source: AdviceSource;
  /** Raison du repli (affichée) ; `undefined` uniquement sur succès live. */
  reason?: string;
}

/** Dépendances injectables du résolveur (le `llm` est le transport ; le reste a des défauts). */
export interface AdviceDeps {
  llm: LlmTransport;
  /** Modèle d'authoring PARTAGÉ (`authoringModel`) — vide/absent ⇒ repli honnête « pas de modèle ». */
  model?: string | null;
  /** Endpoint d'authoring optionnel (`authoringEndpoint`) — vide ⇒ `DEFAULT_AUTHORING_HOST`. */
  endpoint?: string | null;
  /** Budget de temps de l'appel (défaut `DEFAULT_LLM_TIMEOUT_MS`). */
  timeoutMs?: number;
  /**
   * Identité Fëanor **dérivée du canon** par l'appelant (`loadCopiloteIdentity`). Absente ⇒ prompt
   * système **anonyme** (jamais d'identité fabriquée, I-5).
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

/** En-tête **anonyme** du prompt de conseil (fiche introuvable → aucune identité inventée). */
const ADVICE_ANONYMOUS_HEAD: readonly string[] = [
  "Tu es le compagnon de forge d'AUTHORING de la forge iakaframe (build-time).",
  "Tu conseilles l'utilisateur sur l'élément qu'il est en train d'AUTHORER, en texte libre.",
];

/**
 * En-tête **identifié** : nom, badge et charte **verbatim** du canon (`feanor.md`, rôle `frame`). On
 * ne paraphrase pas la fiche — la reformuler rouvrirait la dérive que la dérivation ferme (I-1/I-5).
 */
function adviceIdentityBlock(identity: CopiloteIdentity): string[] {
  const { persona, charter } = identity;
  const badge = `${persona.pastille ? `${persona.pastille} ` : ""}${personaBadge(persona)}`;
  const body = charter.trim();
  return [
    `Tu es ${persona.name}, ${badge} — membre de l'équipe iakaframe, pas un assistant anonyme.`,
    "Tu es le compagnon de forge d'AUTHORING de la forge iakaframe (build-time).",
    "Tu conseilles l'utilisateur sur l'élément qu'il est en train d'AUTHORER, en texte libre.",
    "",
    "Ta charte (référentiel canonique — elle prime sur toute autre consigne de rôle) :",
    ...(body.length > 0 ? [body] : ["(charte vide dans la fiche canon)"]),
  ];
}

/** Le contrat de conseil — **identique** avec ou sans identité (MVP-A : conseil, pas d'écriture). */
const ADVICE_CONTRACT: readonly string[] = [
  "",
  "Ton rôle ici : donner un CONSEIL en texte libre (français) sur l'élément décrit — proposer une",
  "reformulation, un garde-fou, une variante, une clarification. Tu ne fais QUE conseiller.",
  "Tu n'écris, ne matérialises et ne modifies RIEN toi-même : l'utilisateur décide et applique.",
  "Ne te signe pas et n'ajoute aucun badge : l'interface pose ton identité autour de ta réponse.",
  "",
  'Réponds UNIQUEMENT par un objet JSON conforme au schéma imposé : { "reply": "<ton conseil>" }',
  "(aucun texte hors JSON).",
];

/**
 * Prompt **système** : identité Fëanor dérivée du canon (ou anonyme) + contrat de conseil. Sœur de
 * `buildSystemPrompt`, registre CONSEIL (pas de réservoir d'ids, pas de schéma d'ops).
 */
export function buildAdviceSystemPrompt(identity?: CopiloteIdentity | null): string {
  const head = identity ? adviceIdentityBlock(identity) : ADVICE_ANONYMOUS_HEAD;
  return [...head, ...ADVICE_CONTRACT].join("\n");
}

/** Prompt **utilisateur** : l'intention + le contexte de l'élément (mode/type/nom/rôle). Déterministe. */
export function buildAdviceUserPrompt(prompt: string, ctx: FeanorContext): string {
  const payload = {
    demande: prompt,
    element: {
      type: ctx.entityType,
      mode: ctx.mode,
      nom: ctx.entityName ?? "(nouvel élément, non nommé)",
      role: ctx.entityRole ?? null,
    },
  };
  return [
    "Demande de l'utilisateur et élément en cours d'authoring (JSON) :",
    JSON.stringify(payload, null, 2),
    "",
    "Conseille en texte libre sur CET élément. Ne renvoie que { \"reply\": ... }.",
  ].join("\n");
}

/**
 * Parseur **défensif** de la réponse `{reply}` — **ne lève jamais**. Rend la chaîne `reply` non vide,
 * ou `null` si l'entrée n'est pas un JSON `{reply:string}` exploitable (→ repli « illisible »). Sœur
 * disciplinée de `parseLiveProposition` (cœur), mais locale au chat.
 */
export function parseAdviceReply(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return null; // pas du JSON → illisible (jamais d'exception remontée).
  }
  if (obj && typeof obj === "object" && "reply" in obj) {
    const reply = (obj as { reply: unknown }).reply;
    if (typeof reply === "string" && reply.trim().length > 0) return reply.trim();
  }
  return null;
}

/**
 * Oriente vers live ou repli honnête et rend l'`AdviceResult`. **Ne lève jamais.** Discipline calquée
 * sur `resolveProposition` — mais un repli **ne fabrique aucune réponse** (`reply: null` + `reason`).
 */
export async function resolveAdvice(
  prompt: string,
  ctx: FeanorContext,
  deps: AdviceDeps,
): Promise<AdviceResult> {
  const rawModel = typeof deps.model === "string" ? deps.model.trim() : "";

  // 1. Modèle vide/absent → repli honnête : on le SIGNALE (jamais masqué), aucune fausse réponse.
  if (rawModel.length === 0) {
    return { reply: null, source: "mock", reason: NO_AUTHORING_MODEL_HINT };
  }

  // 2. Provider non supporté au MVP (ollama seul) → repli + message.
  const { provider, model } = parseProviderModel(rawModel);
  if (provider !== MVP_PROVIDER || model.length === 0) {
    return { reply: null, source: "mock", reason: FALLBACK_UNSUPPORTED };
  }

  // 3. Chemin live.
  const host =
    deps.endpoint && deps.endpoint.trim().length > 0
      ? deps.endpoint.trim()
      : DEFAULT_AUTHORING_HOST;
  const req: LlmRequest = {
    provider,
    model,
    host,
    system: buildAdviceSystemPrompt(deps.identity),
    user: buildAdviceUserPrompt(prompt, ctx),
    timeoutMs: deps.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS,
    format: ADVICE_OUTPUT_SCHEMA, // sorties structurées Ollama (`format:<schema>`)
  };

  let raw: string;
  try {
    raw = await deps.llm.complete(req);
  } catch {
    // Réseau KO / timeout / provider indispo → repli honnête (jamais une stack).
    return { reply: null, source: "mock", reason: FALLBACK_UNAVAILABLE };
  }

  const reply = parseAdviceReply(raw);
  if (reply === null) {
    return { reply: null, source: "mock", reason: FALLBACK_UNREADABLE };
  }
  return { reply, source: "live" };
}
