/**
 * transport.ts — l'implémentation du `LlmTransport` (cœur 🟦) côté forge.
 *
 * Deux transports, tous deux isolant l'appel réseau derrière l'interface pure `LlmTransport` :
 *  - **`realLlm(backend)`** : branché sur la **façade unique** `backend.ts` → commande Rust
 *    `llm_complete` (reqwest, appel DIRECT à Ollama). C'est la SEULE voie réseau (C-8 préservé).
 *  - **`fakeLlm(script)`** : transport de **test** — renvoie/rejette une réponse **scriptée**,
 *    **zéro réseau**. C'est l'outil qui prouve tout le chemin live en CI (offline).
 *
 * Le transport ignore le schéma `Proposition` : il ne fait que rendre le **texte brut** de la
 * complétion (séparation nette ; le parsing défensif vit dans `@iakaframe/core`).
 */
import type { LlmRequest, LlmTransport } from "@iakaframe/core";
import type { Backend } from "../../api/backend";

/**
 * Transport réel : appelle `backend.llmComplete` (commande Rust `llm_complete`). Tout rejet
 * (réseau KO / timeout / hôte refusé / hors Tauri) **remonte tel quel** ; le résolveur le
 * traduit en repli mock (le transport ne masque ni ne reformule l'erreur).
 */
export function realLlm(backend: Pick<Backend, "llmComplete">): LlmTransport {
  return {
    complete(req: LlmRequest): Promise<string> {
      return backend.llmComplete({
        provider: req.provider,
        model: req.model,
        host: req.host,
        system: req.system,
        user: req.user,
        timeoutMs: req.timeoutMs,
        format: req.format,
      });
    },
  };
}

/**
 * Script d'un `fakeLlm` : soit une chaîne (complétion renvoyée), soit une `Error` (rejet
 * réseau/timeout simulé), soit une fonction de la requête vers l'un des deux (scénarios fins).
 */
export type FakeLlmScript =
  | string
  | Error
  | ((req: LlmRequest) => string | Error | Promise<string>);

/**
 * Transport de test **sans réseau** : rend/rejette une réponse scriptée. Une `Error` (ou une
 * fonction qui en renvoie une) simule un provider indisponible / timeout → le résolveur retombe
 * sur le mock. Enregistre les requêtes reçues (`calls`) pour les assertions.
 */
export function fakeLlm(script: FakeLlmScript): LlmTransport & { calls: LlmRequest[] } {
  const calls: LlmRequest[] = [];
  return {
    calls,
    async complete(req: LlmRequest): Promise<string> {
      calls.push(req);
      const out = typeof script === "function" ? await script(req) : script;
      if (out instanceof Error) throw out;
      return out;
    },
  };
}
