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
import type { Backend, LlmStreamChunk } from "../../api/backend";

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

// ============================================================================================
// STREAMING (feanor-extensions-mvpb-streaming-web-live.md, brique STREAMING) — variante ADDITIVE
// --------------------------------------------------------------------------------------------
// Confinée en `src/` : le cœur `@iakaframe/core` (interface `LlmTransport.complete`) reste INTOUCHÉ.
// Le streaming est un contrat LOCAL (`LlmStreamTransport`) — le conseil/chat le consomme (chemin
// `advise`) ; la proposition B garde le transport bloquant. La discipline d'honnêteté est identique :
// aucune fausse réponse, un partiel n'est jamais passé pour complet (le transport REJETTE sur erreur).
// ============================================================================================

/**
 * Transport d'inférence en **STREAMING** — contrat LOCAL `src/` (le cœur n'en sait rien). `stream`
 * pousse chaque fragment au `onChunk` (token/done/error) et **résout avec le texte accumulé** sur fin
 * propre. Il **rejette** sur toute rupture (réseau / flux coupé / fin sans `done`) : le résolveur
 * traduit alors en repli honnête, le partiel n'est JAMAIS présenté comme une réponse aboutie (AC-S2).
 */
export interface LlmStreamTransport {
  stream(req: LlmRequest, onChunk: (chunk: LlmStreamChunk) => void): Promise<string>;
}

/**
 * Transport réel de streaming : branche `backend.llmCompleteStream` (commande Rust
 * `llm_complete_stream` → Ollama `/api/chat` `stream:true`, Channel Tauri v2). Accumule les tokens,
 * relaie CHAQUE chunk à `onChunk` (l'UI se remplit progressivement, AC-S1), puis rend le texte
 * complet. Un chunk `error` ou un rejet de la commande fait **rejeter** (jamais masqué en réponse).
 */
export function realStreamLlm(
  backend: Pick<Backend, "llmCompleteStream">,
): LlmStreamTransport {
  return {
    async stream(req, onChunk): Promise<string> {
      let acc = "";
      let done = false;
      let failure: string | null = null;
      const relay = (chunk: LlmStreamChunk): void => {
        if (chunk.kind === "token") acc += chunk.text;
        else if (chunk.kind === "done") done = true;
        else failure = chunk.message; // aveu honnête : le partiel n'est pas fiable
        onChunk(chunk);
      };
      try {
        await backend.llmCompleteStream(
          {
            provider: req.provider,
            model: req.model,
            host: req.host,
            system: req.system,
            user: req.user,
            timeoutMs: req.timeoutMs,
            format: req.format,
          },
          relay,
        );
      } catch (e) {
        // Rejet de la commande (pré-flux : hôte refusé / réseau ; ou Err mid-flux). Si aucun chunk
        // `error` n'a été vu, on en fabrique un pour que l'UI marque l'échec — jamais une stack.
        const message = e instanceof Error ? e.message : String(e);
        if (failure === null) {
          failure = message;
          onChunk({ kind: "error", message });
        }
        throw new Error(failure);
      }
      if (failure !== null) throw new Error(failure);
      if (!done) throw new Error("flux interrompu avant la fin");
      return acc;
    },
  };
}

/**
 * Script d'un `fakeStreamLlm` (test, ZÉRO réseau) : la liste des chunks à émettre dans l'ordre, ou
 * une `Error` (rejet de la commande simulé), ou une fonction de la requête vers l'un des deux.
 */
export type FakeStreamScript =
  | LlmStreamChunk[]
  | Error
  | ((req: LlmRequest) => LlmStreamChunk[] | Error);

/**
 * Transport de streaming de **test**, sans réseau : rejoue une liste de chunks déterministe (ou
 * simule un rejet de commande via `Error`). Reproduit fidèlement `realStreamLlm` (accumulation,
 * relais, rejet honnête sur `error`/absence de `done`). Enregistre les requêtes (`calls`).
 */
export function fakeStreamLlm(
  script: FakeStreamScript,
): LlmStreamTransport & { calls: LlmRequest[] } {
  const calls: LlmRequest[] = [];
  return {
    calls,
    async stream(req, onChunk): Promise<string> {
      calls.push(req);
      const out = typeof script === "function" ? script(req) : script;
      if (out instanceof Error) {
        // Rejet de commande AVANT tout chunk (ex. hôte refusé) : aveu + rejet, aucun token fabriqué.
        onChunk({ kind: "error", message: out.message });
        throw out;
      }
      let acc = "";
      let done = false;
      let failure: string | null = null;
      for (const chunk of out) {
        if (chunk.kind === "token") acc += chunk.text;
        else if (chunk.kind === "done") done = true;
        else failure = chunk.message;
        onChunk(chunk);
      }
      if (failure !== null) throw new Error(failure);
      if (!done) throw new Error("flux interrompu avant la fin");
      return acc;
    },
  };
}
