/**
 * inferenceSources — presets de **source d'inférence** de la forge (Lot 1,
 * feanor-source-inference-selecteur.md) + helpers purs de mapping. Extrait de `SettingsRoot.tsx`
 * (règle react-refresh : un fichier composant n'exporte pas d'utilitaires). Aucun I/O, testable seul.
 *
 * Chaque preset pré-remplit `authoringEndpoint` et oriente le **préfixe provider** de `authoringModel`
 * (Option A — aucune nouvelle clé, aucun refacto du parsing partagé `resolve.ts`/`advise.ts`).
 * `provider`/`endpoint` `null` = entrée spéciale (`mock` = valeur réservée du modèle ; `custom` =
 * champs libres conservés). « LiteLLM » = passerelle OpenAI-compatible (Claude / ChatGPT / local via
 * UN seul wire `/v1/chat/completions`).
 */

export interface InferenceSource {
  id: string;
  label: string;
  provider: "ollama" | "openai" | null;
  endpoint: string | null;
}

export const INFERENCE_SOURCES: readonly InferenceSource[] = [
  { id: "ollama-lan", label: "Ollama LAN", provider: "ollama", endpoint: "http://192.168.2.11:11434" },
  { id: "ollama-local", label: "Ollama localhost", provider: "ollama", endpoint: "http://localhost:11434" },
  { id: "litellm", label: "LiteLLM (Claude / ChatGPT / local)", provider: "openai", endpoint: "http://localhost:4000" },
  { id: "mock", label: "Mode démo (mock)", provider: null, endpoint: null },
  { id: "custom", label: "Personnalisé…", provider: null, endpoint: null },
];

/**
 * Nom de modèle **derrière** le préfixe provider (`provider:model` → `model`). La valeur réservée
 * `mock` n'est **pas** un nom de modèle (opt-in du mode démo) : on la traite comme un nom vide, pour
 * ne jamais la traîner en préfixant un provider réel (`ollama:mock` serait faux).
 */
export function extractModelName(raw: string): string {
  const t = raw.trim();
  if (t.length === 0 || t.toLowerCase() === "mock") return "";
  const idx = t.indexOf(":");
  return idx < 0 ? t : t.slice(idx + 1).trim();
}

/**
 * Déduit le preset courant à partir de `authoringModel`/`authoringEndpoint` (mapping inverse). Défaut
 * « Personnalisé » si aucun preset ne correspond — jamais une source inventée.
 */
export function deriveSourceId(model: string | null, endpoint: string | null): string {
  const m = (model ?? "").trim().toLowerCase();
  if (m === "mock") return "mock";
  const provider = m.includes(":") ? m.slice(0, m.indexOf(":")).trim() : "";
  const ep = (endpoint ?? "").trim();
  for (const s of INFERENCE_SOURCES) {
    if (s.provider === null || s.endpoint === null) continue;
    if (provider === s.provider && ep === s.endpoint) return s.id;
  }
  // Ollama sans endpoint réglé = localhost par défaut (le résolveur retombe sur localhost:11434).
  if (provider === "ollama" && ep.length === 0) return "ollama-local";
  return "custom";
}
