/**
 * elementProposition — le **résolveur générique de PROPOSITION d'élément** de Fëanor-en-tête (brique B,
 * `feanor-extensions-mvpb-streaming-web-live.md` § 3, **généralisation** aux pools restants). C'est la
 * **factorisation** du patron prouvé par le pilote `personaProposition.ts` : le corps d'orientation
 * (live vs repli honnête) est **strictement identique** d'un pool à l'autre — seuls varient le **schéma**
 * des champs éditables, le **parseur défensif** et le **libellé** du pool. On extrait donc ici la
 * mécanique commune, chaque pool ne fournissant qu'un **`ElementPropositionSpec<T>`**.
 *
 * ⚠️ **Le pilote `personaProposition.ts` reste sur sa copie autonome** (prouvée, non touchée) : le
 * générique équipe les 7 pools NEUFS (principle · ritual · guardrail · role · scaffold · workflow ·
 * skill) sans jamais recâbler le pilote. C'est le choix « mécanique sûre » — la migration de persona
 * vers ce générique serait triviale plus tard, mais elle n'apporte rien et risquerait le pilote.
 *
 * Réutilisation MAXIMALE de la pile du #1 (aucun second transport, aucun contrat cœur touché) :
 *  - **transport** : le `LlmTransport` injecté (`realLlm(backend)` → Rust `llm_complete` → Ollama LAN,
 *    `fakeLlm` en test).
 *  - **bornes / messages** : `DEFAULT_AUTHORING_HOST` / `DEFAULT_LLM_TIMEOUT_MS` / `MVP_PROVIDER` et
 *    les `FALLBACK_*` de `resolve.ts` — mêmes bornes, mêmes messages que le pilote.
 *  - **identité** : la `CopiloteIdentity` **dérivée du canon** (rôle `frame`), verbatim.
 *  - **réglage** : `authoringModel` (PARTAGÉ) + `authoringEndpoint`.
 *
 * **Honnêteté (non négociable, calquée sur `advise.ts`/le pilote persona, PAS sur le `propose`
 * toujours-mocké du copilote).** Modèle absent / provider non supporté (hors `{ollama, openai}`) /
 * réseau KO / réponse illisible → **AUCUNE proposition fabriquée** : `proposition` vaut **`null`** +
 * `reason` (aveu honnête). **Ne lève JAMAIS.** Les schémas `{champs}` et leurs parseurs défensifs
 * vivent dans les fichiers `src/` de pool (`LLM_OUTPUT_SCHEMA` du copilote intouché, I-6).
 *
 * **Lot 2b — proposition structurée via LiteLLM/openai.** L'allow-set provider passe de `MVP_PROVIDER`
 * (ollama seul) à `SUPPORTED_PROVIDERS` (`{ollama, openai}`). Sur `openai`, la **présence** du `format`
 * signale au backend Rust une sortie structurée → `response_format:{"type":"json_object"}`. Si le
 * backend LiteLLM **n'honore pas** `response_format` et rend du texte non structuré/illisible, le
 * parseur défensif du pool rend `null` → **aveu** `FALLBACK_UNREADABLE`, JAMAIS une fausse proposition.
 *
 * **C-1 (Constitution).** Les champs **verrouillés** (id / key / roleIndex ; `kind`/`hook` load-bearing
 * du garde-fou ; `name` de la skill…) ne sont **jamais** modélisés au schéma ni lus par les parseurs :
 * seuls les champs que `<pool>FrontmatterPatch` (ou `serialize<Pool>Doc`) persiste sont proposables.
 */
import { personaBadge, type LlmRequest } from "@iakaframe/core";
import type { FeanorContext } from "./llm/advise";
import type { CopiloteIdentity } from "./llm/identity";
import type { ElementProposalResult, ElementProposeDeps } from "./elementKind";
import { NO_AUTHORING_MODEL_HINT } from "./mock/copilote";
import {
  DEFAULT_AUTHORING_HOST,
  DEFAULT_LLM_TIMEOUT_MS,
  SUPPORTED_PROVIDERS,
  FALLBACK_UNAVAILABLE,
  FALLBACK_UNREADABLE,
  FALLBACK_UNSUPPORTED,
} from "./llm/resolve";

/**
 * Contrat d'un pool pour la proposition d'élément : ce qui **varie** d'un type à l'autre. `T` = le
 * type concret de l'élément (`Principle`, `Ritual`, …). La mécanique live/repli, elle, est commune.
 */
export interface ElementPropositionSpec<T> {
  /** Libellé FR du pool (« principe », « rituel »…) — injecté dans le prompt de proposition. */
  typeLabel: string;
  /** Schéma JSON des **champs éditables** imposé à Ollama (`format`). Aucun `required` (partiel permis). */
  schema: object;
  /**
   * Lignes de contrat **spécifiques au pool** : la liste des champs autorisés et leurs contraintes
   * (enum, ids de catalogue…). Injectées dans le prompt système, sous les consignes génériques.
   */
  contractFields: readonly string[];
  /**
   * Parseur **défensif** de la réponse brute → champs éditables validés (`Partial<T>`), ou `null` si
   * l'entrée n'est pas exploitable / ne porte AUCUN champ retenu (→ repli « illisible »). **Ne lève
   * jamais.** Les champs verrouillés (C-1) ne sont jamais lus.
   */
  parse: (raw: string) => Partial<T> | null;
}

/* ───────────────────────── Helpers de parsing partagés (défensifs) ───────────────────────── */

/** Chaîne trimmée non vide, sinon `undefined` (jamais une valeur fabriquée). */
export function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

/** Liste de chaînes trimmées non vides (dédupliquée), depuis un tableau brut ; `[]` si non-tableau. */
export function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === "string") {
      const t = x.trim();
      if (t.length > 0 && !out.includes(t)) out.push(t);
    }
  }
  return out;
}

/** Retient les ids string non vides d'un tableau brut dont l'id est dans `allowed` (anti-hallucination). */
export function filterCatalogIds(raw: unknown, allowed: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const id of strList(raw)) {
    if (allowed.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

/** Parse défensif d'un objet JSON brut → `Record` ou `null` (jamais d'exception remontée). */
export function parseJsonObject(raw: string): Record<string, unknown> | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return null; // pas du JSON → illisible (jamais d'exception).
  }
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return null;
  return obj as Record<string, unknown>;
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

/* ───────────────────────────────── Prompts (identité + contrat) ───────────────────────────────── */

/** En-tête **anonyme** (fiche `frame` introuvable → aucune identité inventée). */
function anonymousHead(typeLabel: string): string[] {
  return [
    "Tu es le compagnon de forge d'AUTHORING de la forge iakaframe (build-time).",
    `Tu PROPOSES les champs d'un élément (${typeLabel}) que l'utilisateur relira et enregistrera lui-même.`,
  ];
}

/** En-tête **identifié** : nom, badge et charte **verbatim** du canon (`feanor.md`, rôle `frame`). */
function identityBlock(identity: CopiloteIdentity, typeLabel: string): string[] {
  const { persona, charter } = identity;
  const badge = `${persona.pastille ? `${persona.pastille} ` : ""}${personaBadge(persona)}`;
  const body = charter.trim();
  return [
    `Tu es ${persona.name}, ${badge} — membre de l'équipe iakaframe, pas un assistant anonyme.`,
    "Tu es le compagnon de forge d'AUTHORING de la forge iakaframe (build-time).",
    `Tu PROPOSES les champs d'un élément (${typeLabel}) que l'utilisateur relira et enregistrera lui-même.`,
    "",
    "Ta charte (référentiel canonique — elle prime sur toute autre consigne de rôle) :",
    ...(body.length > 0 ? [body] : ["(charte vide dans la fiche canon)"]),
  ];
}

/** Consignes **génériques** de proposition (registre CHAMPS structurés, jamais de texte, jamais d'écriture). */
function genericContract(typeLabel: string): string[] {
  return [
    "",
    `Ton rôle ici : PROPOSER un ${typeLabel} sous forme de CHAMPS structurés (pas de texte libre).`,
    "Ne propose JAMAIS d'id (ni de clé/index d'identité) : la forge les dérive et les verrouille.",
    "Tu ne matérialises, n'écris et ne modifies RIEN : l'utilisateur relit ta proposition dans",
    "l'éditeur et l'enregistre lui-même. Ne te signe pas, n'ajoute aucun badge.",
  ];
}

/** Clôture commune du contrat : réponse JSON stricte. */
const JSON_ONLY: readonly string[] = [
  "",
  "Réponds UNIQUEMENT par un objet JSON conforme au schéma imposé (aucun texte hors JSON).",
];

/**
 * Prompt **système** : identité Fëanor dérivée du canon (ou anonyme) + contrat générique + champs du
 * pool. Sœur structurée de `buildAdviceSystemPrompt`, registre PROPOSITION D'ÉLÉMENT.
 */
export function buildElementSystemPrompt<T>(
  spec: ElementPropositionSpec<T>,
  identity?: CopiloteIdentity | null,
): string {
  const head = identity ? identityBlock(identity, spec.typeLabel) : anonymousHead(spec.typeLabel);
  return [
    ...head,
    ...genericContract(spec.typeLabel),
    ...spec.contractFields,
    ...JSON_ONLY,
  ].join("\n");
}

/** Prompt **utilisateur** : l'intention + le contexte de l'élément (mode/type/nom/rôle). Déterministe. */
export function buildElementUserPrompt<T>(
  spec: ElementPropositionSpec<T>,
  prompt: string,
  ctx: FeanorContext,
): string {
  const payload = {
    demande: prompt,
    element: {
      type: ctx.entityType,
      mode: ctx.mode,
      nom: ctx.entityName ?? `(nouveau ${spec.typeLabel}, non nommé)`,
      role: ctx.entityRole ?? null,
    },
  };
  return [
    "Demande de l'utilisateur et élément en cours d'authoring (JSON) :",
    JSON.stringify(payload, null, 2),
    "",
    `Propose les CHAMPS de ce ${spec.typeLabel}. Ne renvoie que l'objet JSON des champs.`,
  ].join("\n");
}

/* ─────────────────────────────────── Résolveur générique ─────────────────────────────────── */

/**
 * Oriente vers live ou repli honnête et rend l'`ElementProposalResult<T>`. **Ne lève jamais.**
 * Discipline **identique** au pilote `resolvePersonaProposition` : un repli **ne fabrique aucune
 * proposition** (`proposition: null` + `reason`). C'est la mécanique factorisée, paramétrée par le
 * `ElementPropositionSpec<T>` du pool. Conforme à `ElementProposeRun<T>` (`elementKind.ts`).
 */
export async function resolveElementProposition<T>(
  spec: ElementPropositionSpec<T>,
  prompt: string,
  ctx: FeanorContext,
  deps: ElementProposeDeps,
): Promise<ElementProposalResult<T>> {
  const rawModel = typeof deps.model === "string" ? deps.model.trim() : "";

  // 1. Modèle vide/absent → repli honnête : on le SIGNALE, aucune fausse proposition.
  if (rawModel.length === 0) {
    return { proposition: null, source: "mock", reason: NO_AUTHORING_MODEL_HINT };
  }

  // 2. Provider non supporté (hors {ollama, openai}) → repli + message.
  const { provider, model } = parseProviderModel(rawModel);
  if (!SUPPORTED_PROVIDERS.has(provider) || model.length === 0) {
    return { proposition: null, source: "mock", reason: FALLBACK_UNSUPPORTED };
  }

  // 3. Chemin live.
  const host =
    deps.endpoint && deps.endpoint.trim().length > 0
      ? deps.endpoint.trim()
      : DEFAULT_AUTHORING_HOST;
  const apiKey =
    typeof deps.apiKey === "string" && deps.apiKey.trim().length > 0 ? deps.apiKey.trim() : undefined;
  const req: LlmRequest = {
    provider,
    model,
    host,
    system: buildElementSystemPrompt(spec, deps.identity),
    user: buildElementUserPrompt(spec, prompt, ctx),
    timeoutMs: deps.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS,
    // Sortie structurée : Ollama lit `format:<schema>` ; openai (Lot 2b) mappe sa PRÉSENCE vers
    // `response_format:{"type":"json_object"}` côté Rust (le schéma exact n'est pas transmis au wire).
    format: spec.schema,
    apiKey,
  };

  let raw: string;
  try {
    raw = await deps.llm.complete(req);
  } catch {
    // Réseau KO / timeout / provider indispo → repli honnête (jamais une stack).
    return { proposition: null, source: "mock", reason: FALLBACK_UNAVAILABLE };
  }

  const proposition = spec.parse(raw);
  if (proposition === null) {
    return { proposition: null, source: "mock", reason: FALLBACK_UNREADABLE };
  }
  return { proposition, source: "live" };
}

/**
 * Fabrique un `ElementProposeRun<T>` prêt à brancher sur `ElementKind.proposeElement` — application
 * partielle du résolveur générique sur le `spec` du pool (signature `(prompt, ctx, deps)`).
 */
export function makeProposeRun<T>(spec: ElementPropositionSpec<T>) {
  return (prompt: string, ctx: FeanorContext, deps: ElementProposeDeps) =>
    resolveElementProposition(spec, prompt, ctx, deps);
}
