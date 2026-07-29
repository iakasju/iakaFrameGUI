/**
 * personaProposition — le **résolveur de PROPOSITION d'élément** de Fëanor-en-tête pour le pool
 * pilote `persona` (brique B, `feanor-extensions-mvpb-streaming-web-live.md` § 3). Sœur STRUCTURÉE
 * de `advise.ts` : là où le conseil rend du **texte libre** (`{reply}`), la proposition rend les
 * **champs éditables d'une persona** (`Partial<Persona>`), que l'hôte pré-remplit dans l'éditeur et
 * que l'utilisateur relit puis **enregistre** — l'écriture disque reste le chemin existant
 * (`persistPersona` → `poolWrite`), jamais un chemin neuf.
 *
 * Réutilisation MAXIMALE de la pile du #1 (aucun second transport, aucun contrat cœur touché) :
 *  - **transport** : le `LlmTransport` injecté (`realLlm(backend)` → Rust `llm_complete` → Ollama LAN,
 *    `fakeLlm` en test).
 *  - **bornes / messages** : `DEFAULT_AUTHORING_HOST` / `DEFAULT_LLM_TIMEOUT_MS` / `MVP_PROVIDER` et
 *    les `FALLBACK_*` de `resolve.ts` — mêmes bornes, mêmes messages.
 *  - **identité** : la `CopiloteIdentity` **dérivée du canon** (rôle `frame`), verbatim.
 *  - **réglage** : `authoringModel` (PARTAGÉ) + `authoringEndpoint`.
 *
 * **Honnêteté (non négociable, calquée sur `advise.ts`, PAS sur le `propose` toujours-mocké du
 * copilote).** Modèle absent / provider non supporté (hors `{ollama, openai}`) / réseau KO / réponse
 * illisible → **AUCUNE proposition fabriquée** : `proposition` vaut **`null`** + `reason` délivrée à
 * côté (aveu honnête). **Ne lève JAMAIS.** Le schéma `{champs}` et son parseur défensif vivent ici,
 * dans `src/` (`LLM_OUTPUT_SCHEMA` du copilote intouché, I-6).
 *
 * **Lot 2b — proposition structurée via LiteLLM/openai.** L'allow-set passe à `SUPPORTED_PROVIDERS`
 * (`{ollama, openai}`). Sur `openai`, la présence du `format` déclenche côté Rust un
 * `response_format:{"type":"json_object"}` ; un backend qui ne l'honore pas et rend du texte illisible
 * → `parsePersonaProposition` rend `null` → **aveu** `FALLBACK_UNREADABLE`, jamais une fausse persona.
 *
 * **C-1 (Constitution).** `id` et `roleIndex` ne sont **jamais** proposés ni lus : l'`id` est
 * verrouillé (jamais de renommage), `roleIndex` est dérivé du rôle. Seuls les champs que
 * `personaFrontmatterPatch` persiste sont modélisés (`name, mission?, roleKey, royaume, pastille?,
 * skills[], guardrails[]`). Les ids `skills`/`guardrails` sont **filtrés au catalogue** (jamais
 * d'id halluciné qui entrerait en silence — l'utilisateur relit de toute façon).
 */
import {
  CATALOG_GUARDRAILS,
  CATALOG_SKILLS,
  personaBadge,
  roleByKey,
  type LlmRequest,
  type Persona,
} from "@iakaframe/core";
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
 * Les **champs éditables** d'une persona proposables par Fëanor — strictement le sous-ensemble que
 * `personaFrontmatterPatch` persiste. **Ni `id` ni `roleIndex`** (C-1 : verrouillé / dérivé). C'est
 * un `Partial<Persona>` structurel, acheminé tel quel jusqu'à l'éditeur (pré-remplissage).
 */
export interface PersonaProposition {
  name?: string;
  mission?: string;
  roleKey?: string;
  royaume?: string;
  pastille?: string;
  skills?: string[];
  guardrails?: string[];
}

/**
 * Schéma JSON imposé à Ollama via `format` (sorties structurées) : les **champs éditables** d'une
 * persona. Aucun `required` — une proposition peut ne renseigner qu'une partie des champs. **Ni
 * `id` ni `roleIndex`** n'y figurent (C-1). Local à `src/` (le schéma du copilote reste intact).
 */
export const PERSONA_PROPOSITION_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    mission: { type: "string" },
    roleKey: { type: "string" },
    royaume: { type: "string" },
    pastille: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    guardrails: { type: "array", items: { type: "string" } },
  },
} as const;

/** Ids de skills du catalogue (filtre anti-hallucination du parsing, comme le copilote). */
const SKILL_IDS: ReadonlySet<string> = new Set(CATALOG_SKILLS.map((s) => s.id));
/** Ids de gardes-fous du catalogue (même filtre). */
const GUARDRAIL_IDS: ReadonlySet<string> = new Set(CATALOG_GUARDRAILS.map((g) => g.id));

/** Split `provider:model` sur le **premier** `:` (le modèle peut contenir des `:`). */
function parseProviderModel(raw: string): { provider: string; model: string } {
  const idx = raw.indexOf(":");
  if (idx < 0) return { provider: "", model: raw.trim() };
  return {
    provider: raw.slice(0, idx).trim().toLowerCase(),
    model: raw.slice(idx + 1).trim(),
  };
}

/** Retient les entrées string non vides d'un tableau brut dont l'id est dans `allowed`. */
function filterCatalogIds(raw: unknown, allowed: ReadonlySet<string>): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v === "string") {
      const id = v.trim();
      if (id.length > 0 && allowed.has(id) && !out.includes(id)) out.push(id);
    }
  }
  return out;
}

/**
 * Parseur **défensif** de la proposition — **ne lève jamais**. Rend une `PersonaProposition` avec
 * uniquement les champs éditables **validés**, ou `null` si l'entrée n'est pas exploitable / ne
 * porte AUCUN champ retenu (→ repli « illisible », jamais une proposition vide fabriquée). **`id` et
 * `roleIndex` sont volontairement NON lus** (C-1).
 */
export function parsePersonaProposition(raw: string): PersonaProposition | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return null; // pas du JSON → illisible (jamais d'exception remontée).
  }
  if (obj === null || typeof obj !== "object") return null;
  const r = obj as Record<string, unknown>;

  const out: PersonaProposition = {};

  if (typeof r.name === "string" && r.name.trim().length > 0) out.name = r.name.trim();
  if (typeof r.mission === "string" && r.mission.trim().length > 0) out.mission = r.mission.trim();

  // roleKey : retenu SEULEMENT s'il est canonique (jamais de rôle inventé) — normalisé à la clé.
  if (typeof r.roleKey === "string" && r.roleKey.trim().length > 0) {
    const role = roleByKey(r.roleKey.trim());
    if (role) out.roleKey = role.key;
  }

  if (typeof r.royaume === "string" && r.royaume.trim().length > 0) {
    out.royaume = r.royaume.trim().toUpperCase();
  }
  if (typeof r.pastille === "string" && r.pastille.trim().length > 0) out.pastille = r.pastille.trim();

  const skills = filterCatalogIds(r.skills, SKILL_IDS);
  if (skills.length > 0) out.skills = skills;
  const guardrails = filterCatalogIds(r.guardrails, GUARDRAIL_IDS);
  if (guardrails.length > 0) out.guardrails = guardrails;

  // Aucun champ retenu → rien à proposer : repli honnête (jamais une proposition vide « réelle »).
  return Object.keys(out).length > 0 ? out : null;
}

/** En-tête **anonyme** du prompt de proposition (fiche `frame` introuvable → aucune identité inventée). */
const PROPOSITION_ANONYMOUS_HEAD: readonly string[] = [
  "Tu es le compagnon de forge d'AUTHORING de la forge iakaframe (build-time).",
  "Tu PROPOSES les champs d'une persona que l'utilisateur relira et enregistrera lui-même.",
];

/** En-tête **identifié** : nom, badge et charte **verbatim** du canon (`feanor.md`, rôle `frame`). */
function propositionIdentityBlock(identity: CopiloteIdentity): string[] {
  const { persona, charter } = identity;
  const badge = `${persona.pastille ? `${persona.pastille} ` : ""}${personaBadge(persona)}`;
  const body = charter.trim();
  return [
    `Tu es ${persona.name}, ${badge} — membre de l'équipe iakaframe, pas un assistant anonyme.`,
    "Tu es le compagnon de forge d'AUTHORING de la forge iakaframe (build-time).",
    "Tu PROPOSES les champs d'une persona que l'utilisateur relira et enregistrera lui-même.",
    "",
    "Ta charte (référentiel canonique — elle prime sur toute autre consigne de rôle) :",
    ...(body.length > 0 ? [body] : ["(charte vide dans la fiche canon)"]),
  ];
}

/** Contrat de PROPOSITION : champs structurés d'une persona, jamais du texte, jamais d'écriture. */
const PROPOSITION_CONTRACT: readonly string[] = [
  "",
  "Ton rôle ici : PROPOSER une persona sous forme de CHAMPS structurés (pas de texte libre).",
  "Champs autorisés (tous optionnels) : name, mission (ligne courte), roleKey (une clé de rôle",
  "canonique : portefeuille, coordination, cadrage, dev, qualite, deploiement, design,",
  "documentation, frame), royaume (MAJUSCULE), pastille (emoji), skills (ids de skills du",
  "catalogue), guardrails (ids de gardes-fous du catalogue).",
  "Ne propose JAMAIS d'id ni de roleIndex : la forge les dérive et les verrouille.",
  "Tu ne matérialises, n'écris et ne modifies RIEN : l'utilisateur relit ta proposition dans",
  "l'éditeur et l'enregistre lui-même. Ne te signe pas, n'ajoute aucun badge.",
  "",
  "Réponds UNIQUEMENT par un objet JSON conforme au schéma imposé (aucun texte hors JSON).",
];

/**
 * Prompt **système** : identité Fëanor dérivée du canon (ou anonyme) + contrat de proposition. Sœur
 * structurée de `buildAdviceSystemPrompt`, registre PROPOSITION D'ÉLÉMENT.
 */
export function buildPropositionSystemPrompt(identity?: CopiloteIdentity | null): string {
  const head = identity ? propositionIdentityBlock(identity) : PROPOSITION_ANONYMOUS_HEAD;
  return [...head, ...PROPOSITION_CONTRACT].join("\n");
}

/** Prompt **utilisateur** : l'intention + le contexte de l'élément (mode/type/nom/rôle). Déterministe. */
export function buildPropositionUserPrompt(prompt: string, ctx: FeanorContext): string {
  const payload = {
    demande: prompt,
    element: {
      type: ctx.entityType,
      mode: ctx.mode,
      nom: ctx.entityName ?? "(nouvelle persona, non nommée)",
      role: ctx.entityRole ?? null,
    },
  };
  return [
    "Demande de l'utilisateur et élément en cours d'authoring (JSON) :",
    JSON.stringify(payload, null, 2),
    "",
    "Propose les CHAMPS de cette persona. Ne renvoie que l'objet JSON des champs.",
  ].join("\n");
}

/**
 * Oriente vers live ou repli honnête et rend l'`ElementProposalResult<Persona>`. **Ne lève jamais.**
 * Discipline calquée sur `resolveAdvice` : un repli **ne fabrique aucune proposition**
 * (`proposition: null` + `reason`). Conforme à `ElementProposeRun<Persona>` (`elementKind.ts`).
 */
export async function resolvePersonaProposition(
  prompt: string,
  ctx: FeanorContext,
  deps: ElementProposeDeps,
): Promise<ElementProposalResult<Persona>> {
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
    system: buildPropositionSystemPrompt(deps.identity),
    user: buildPropositionUserPrompt(prompt, ctx),
    timeoutMs: deps.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS,
    // Sortie structurée : Ollama lit `format:<schema>` ; openai (Lot 2b) mappe sa PRÉSENCE vers
    // `response_format:{"type":"json_object"}` côté Rust (le schéma exact n'est pas transmis au wire).
    format: PERSONA_PROPOSITION_SCHEMA,
    apiKey,
  };

  let raw: string;
  try {
    raw = await deps.llm.complete(req);
  } catch {
    // Réseau KO / timeout / provider indispo → repli honnête (jamais une stack).
    return { proposition: null, source: "mock", reason: FALLBACK_UNAVAILABLE };
  }

  const proposition = parsePersonaProposition(raw);
  if (proposition === null) {
    return { proposition: null, source: "mock", reason: FALLBACK_UNREADABLE };
  }
  return { proposition, source: "live" };
}
