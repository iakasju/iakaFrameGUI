/**
 * backend.ts — FAÇADE UNIQUE d'accès au backend Tauri (calque garde D7 du Cockpit).
 *
 * Règle d'architecture : **tout** appel `invoke` vers Rust passe par ce module. Aucun
 * composant ni hook n'importe `@tauri-apps/api/core` directement (grep `invoke(` hors ce
 * fichier = 0 — critère C-8). Ce cloisonnement rend le backend mockable (tests) et empêche
 * un god-component mêlant I/O et rendu.
 *
 * P1 = persistance de teams PURES par **fichiers JSON** (un fichier par team), via les
 * commandes Rust `teams_store` (pathguard). Le front tient le schéma (`@iakaframe/core`) ;
 * Rust est un passe-plat (aucune connaissance de runner/model — AR-1).
 *
 * Sérialisation : les args passés à `call` reprennent les noms des paramètres Rust
 * (snake_case). `team_write(id, json)` → `{ id, json }`.
 */
import { invoke, Channel } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { Command } from "@tauri-apps/plugin-shell";

/**
 * Message utilisateur affiché quand une commande backend est tentée hors de l'app packagée
 * (navigateur de dév / tests, sans runtime Tauri). Constante unique et exportée : la garde de
 * `call()` la lève, les tests l'assertent sur la constante (jamais un littéral recopié).
 */
export const BACKEND_UNAVAILABLE_MSG =
  "Enregistrement indisponible hors de l'app packagée (mode dév navigateur).";

/** Wrapper typé minimal autour de `invoke`. SEUL endroit autorisé à l'appeler. */
export async function call<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauri()) {
    // Hors runtime Tauri, `invoke` n'existe pas : on lève un message clair (pas une stack).
    throw new Error(BACKEND_UNAVAILABLE_MSG);
  }
  return invoke<T>(command, args);
}

/**
 * Détecte un contexte Tauri (fenêtre native) vs simple navigateur (dev front pur / tests).
 * Évite de crasher hors Tauri (le hook dégrade alors en mémoire).
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// --- Persistance des teams (fichiers JSON sous le workspace, commandes Rust) ---

/**
 * Liste le contenu JSON brut de chaque fichier team du workspace
 * (`<workspace>/teams/*.json`). Le front parse chaque entrée via `parseTeamText`
 * (`@iakaframe/core`) — un fichier illisible est ignoré. Ne rejette pas si le dossier
 * est vide/absent (Rust renvoie `[]`).
 */
export function teamList(): Promise<string[]> {
  return call<string[]>("team_list");
}

/** Lit le contenu JSON d'une team (`null` si le fichier n'existe pas). */
export function teamRead(id: string): Promise<string | null> {
  return call<string | null>("team_read", { id });
}

/** Écrit (ou remplace) le fichier `<workspace>/teams/<id>.json`. `json` = team sérialisée. */
export function teamWrite(id: string, json: string): Promise<void> {
  return call<void>("team_write", { id, json });
}

/** Supprime le fichier team `<id>.json` (no-op si absent). */
export function teamDelete(id: string): Promise<void> {
  return call<void>("team_delete", { id });
}

/** Chemin absolu du dossier de travail des teams (`<workspace>/teams`) — affichage Réglages. */
export function workspacePath(): Promise<string> {
  return call<string>("workspace_path");
}

// --- Bibliothèque iakaframe (P5 : artefacts `.md`-frontmatter sous `IAKAFRAME_HOME`) ---

/**
 * Collections gérées par la forge (les onglets, Q-6). **Lot 5c (sous-lot 5c-workflow, Option A)** :
 * `workflows` est **RETIRÉ** de cette liste — le workflow n'a plus de seconde maison éditable
 * `<home>/workflows/` ; sa **vérité unique** est l'atome de pool `library/workflows/` (`PoolType`),
 * écrit via `pool_write("workflows")` par les deux surfaces d'authoring (AC-W1 : aucune double
 * écriture). Le backend Rust `library_write` accepte encore `"workflows"` (compat), mais **aucun
 * appelant TS ne l'emprunte**.
 */
export type LibraryCollection =
  | "teams"
  | "methods"
  | "kits"
  | "bindings"
  | "frames";

/**
 * Liste le contenu `.md` brut de chaque artefact de `<home>/<collection>/` (scan, invariant I2).
 * Le front parse chaque entrée via `parse{Team,Method,Kit}Md` (`@iakaframe/core`) — un fichier
 * illisible est ignoré. Racine non résolue / dossier absent → `[]` (Rust ne rejette pas).
 */
export function libraryList(collection: LibraryCollection): Promise<string[]> {
  return call<string[]>("library_list", { collection });
}

/** Lit le `.md` d'un artefact (`null` si absent ou racine non résolue). */
export function libraryRead(
  collection: LibraryCollection,
  id: string,
): Promise<string | null> {
  return call<string | null>("library_read", { collection, id });
}

/** Écrit (ou remplace) `<home>/<collection>/<id>.md`. `text` = artefact sérialisé (frontmatter). */
export function libraryWrite(
  collection: LibraryCollection,
  id: string,
  text: string,
): Promise<void> {
  return call<void>("library_write", { collection, id, text });
}

/** Indique si `<home>/<collection>/<id>.md` existe (garde Save As non destructif). */
export function libraryExists(
  collection: LibraryCollection,
  id: string,
): Promise<boolean> {
  return call<boolean>("library_exists", { collection, id });
}

/** Types d'atomes du pool `library/<type>/` référencés par les assemblages (I1). */
export type PoolType =
  | "personas"
  | "skills"
  | "guardrails"
  | "principles"
  | "rituals"
  | "roles"
  | "workflows"
  | "scaffolds";

/**
 * Scanne les **ids** d'atomes du pool `<home>/library/<type>/` (I1, miroir de `checkRefs`). Sert à
 * vérifier au Save que chaque id référencé existe. Dossier/racine absent → `[]`.
 */
export function poolList(poolType: PoolType): Promise<string[]> {
  return call<string[]>("pool_list", { poolType });
}

/**
 * Lit le **CONTENU `.md`** de tous les atomes du pool `<home>/library/<type>/` (G1 « Open frame »
 * — pendant en contenu de `poolList` qui ne rend que les ids). Le front parse chaque entrée via le
 * parseur `@iakaframe/core` du type (skills : le contenu est celui de `<id>/SKILL.md`). Dossier /
 * racine absent → `[]` (Rust ne rejette pas).
 */
export function poolReadAll(poolType: PoolType): Promise<string[]> {
  return call<string[]>("pool_read_all", { poolType });
}

/** Lit le `.md` d'UN atome de pool par id (`null` si absent ou racine non résolue). */
export function poolRead(poolType: PoolType, id: string): Promise<string | null> {
  return call<string | null>("pool_read", { poolType, id });
}

/**
 * Écrit (ou remplace) l'atome de pool `<home>/library/<type>/<id>.md` (E2, Lot 5a — persistance de
 * l'authoring). `text` = `.md` sérialisé (frontmatter). Calque de `libraryWrite`, réorienté sous
 * `library/<pool>/` (symétrique de `poolRead`). Le cœur (`@iakaframe/core`) tient la **préservation
 * non-destructive** (`patchFrontmatter` en édition, `serialize<Pool>Md` en création) ; Rust est un
 * passe-plat. `skills` est écrit en **dossier** `library/skills/<id>/SKILL.md` (Lot 5c : création du
 * sous-dossier, non destructif). Racine non résolue → rejet (via `call`) ; hors Tauri →
 * `BACKEND_UNAVAILABLE_MSG` (jamais une stack).
 */
export function poolWrite(poolType: PoolType, id: string, text: string): Promise<void> {
  return call<void>("pool_write", { poolType, id, text });
}

/** Indique si l'atome `library/<type>/<id>.md` existe (garde de création non destructive). */
export function poolExists(poolType: PoolType, id: string): Promise<boolean> {
  return call<boolean>("pool_exists", { poolType, id });
}

/**
 * Le pool `library/` existe-t-il sous la racine ? (Q-4 : pool absent → I1 non vérifiable →
 * avertissement NON bloquant, Save autorisé.)
 */
export function poolPresent(): Promise<boolean> {
  return call<boolean>("pool_present");
}

/**
 * Racine bibliothèque résolue (`IAKAFRAME_HOME`, partagée CLI — §5) ou `null` si introuvable
 * (l'UI Réglages invite alors à la définir).
 */
export function iakaframeHome(): Promise<string | null> {
  return call<string | null>("iakaframe_home");
}

/** Définit (ou retire, si vide) l'override persisté de la racine bibliothèque. */
export function setIakaframeHome(path: string): Promise<void> {
  return call<void>("set_iakaframe_home", { path });
}

/**
 * **Modèle d'authoring** unique et global (§ Volet B) : l'identifiant/endpoint de modèle utilisé par
 * TOUS les prompts d'authoring de la forge (tous les étages, pas par persona). `null` si non défini
 * (l'UI affiche alors le défaut). Persisté comme `iakaframeHome` dans `<workspace>/settings.json`.
 * Réglage build-time, DISTINCT du runner d'EXÉCUTION du Binding (frontière authoring ≠ exécution).
 */
export function authoringModel(): Promise<string | null> {
  return call<string | null>("authoring_model");
}

/** Définit (ou retire, si vide) le modèle d'authoring persisté. Suit le pattern de `setIakaframeHome`. */
export function setAuthoringModel(model: string): Promise<void> {
  return call<void>("set_authoring_model", { model });
}

/**
 * **Endpoint d'authoring** optionnel (§ D3) — l'hôte Ollama à joindre pour l'inférence d'authoring
 * **live** (ex. un Ollama sur le LAN). `null`/vide ⇒ défaut `http://localhost:11434`. Persisté comme
 * `authoringModel` (même `<workspace>/settings.json`, clé `authoringEndpoint`). Réglage build-time,
 * DISTINCT du runner d'EXÉCUTION du Binding (frontière authoring ≠ exécution).
 */
export function authoringEndpoint(): Promise<string | null> {
  return call<string | null>("authoring_endpoint");
}

/** Définit (ou retire, si vide) l'endpoint d'authoring persisté. Suit le pattern de `setAuthoringModel`. */
export function setAuthoringEndpoint(endpoint: string): Promise<void> {
  return call<void>("set_authoring_endpoint", { endpoint });
}

/**
 * **Clé API d'authoring** OPTIONNELLE (Lot 2 — passerelle OpenAI-compatible LiteLLM). `null`/vide ⇒
 * aucun en-tête Bearer (LiteLLM sans auth). **Secret LOCAL** persisté dans `<workspace>/settings.json`
 * (clé `authoringApiKey`, hors dépôt) — jamais commité, jamais logué. Réglage build-time, DISTINCT du
 * runner d'EXÉCUTION du Binding (frontière authoring ≠ exécution).
 */
export function authoringApiKey(): Promise<string | null> {
  return call<string | null>("authoring_api_key");
}

/** Définit (ou retire, si vide) la clé API d'authoring persistée. Suit le pattern de `setAuthoringEndpoint`. */
export function setAuthoringApiKey(apiKey: string): Promise<void> {
  return call<void>("set_authoring_api_key", { apiKey });
}

/**
 * **Dossier de projet** courant — réglage de la forge (`<workspace>/settings.json`, clé
 * `projectDir`). Il dit **où est le projet**, pas quelle frame y est active : le pointeur de frame,
 * lui, vit dans `<projectDir>/iakaframe.json` et appartient au **lieu**, pas à la GUI.
 */
export function projectDir(): Promise<string | null> {
  return call<string | null>("project_dir");
}

/** Définit (ou retire, si vide) le dossier de projet. Suit le pattern de `setIakaframeHome`. */
export function setProjectDir(dir: string): Promise<void> {
  return call<void>("set_project_dir", { dir });
}

/**
 * **Pointeur de frame active** du projet réglé : la clé `frame` de `<projectDir>/iakaframe.json`.
 * `null` si aucun projet réglé, pas de fichier, ou pas de clé — l'assemblage retombe alors sur la
 * frame `default` du réservoir. **Source unique partagée avec le CLI** : jamais de miroir dans
 * `settings.json` (deux copies divergeraient sans qu'aucune garde ne le voie).
 */
export function activeFrameId(): Promise<string | null> {
  return call<string | null>("active_frame_id");
}

/**
 * Pose (ou retire, si vide) le pointeur de frame active. **Écriture non destructive** : le backend
 * relit `iakaframe.json`, ne touche que la clé `frame`, et **refuse d'écrire** si le fichier existe
 * mais est illisible — l'écraser perdrait les clés du CLI (`runner`/`node`/`target`/`note`).
 */
export function setActiveFrameId(frameId: string): Promise<void> {
  return call<void>("set_active_frame_id", { frameId });
}

// ============================================================================================
// Inférence d'authoring LIVE — commande Rust `llm_complete` (copilote-inference-live.md, D1)
// --------------------------------------------------------------------------------------------
// DÉROGATION ASSUMÉE ET BORNÉE à l'invariant AR-1/AR-6, dans le MÊME esprit que le pilote review
// ci-dessous : le backend Rust fait UN appel HTTP allow-listé (provider `ollama` SEUL), borné en
// HÔTE (localhost + endpoint réglé, garde côté Rust) et en TEMPS (timeout), pour de l'authoring
// BUILD-TIME uniquement — JAMAIS le runner d'EXÉCUTION du Binding. Le front reste testable SANS
// réseau : le chemin live passe par un `LlmTransport` injectable (`fakeLlm` en test). C'est la
// SEULE voie réseau du front (façade unique C-8 préservée : aucun `invoke`/`fetch` hors ce module).
// ============================================================================================

/** Requête minimale de complétion d'authoring (les args snake_case côté Rust : `timeout_ms`). */
export interface LlmCompleteArgs {
  provider: string;
  model: string;
  host: string;
  system: string;
  user: string;
  timeoutMs: number;
  /**
   * Schéma JSON de sortie (Ollama `format`, D4) — optionnel (absent ⇒ `format:"json"` côté Rust).
   * Lot 2b : sur le provider `openai`, sa **présence** signale une sortie structurée → le backend Rust
   * pose `response_format:{"type":"json_object"}` (le schéma lui-même n'est pas transmis au wire OpenAI).
   */
  format?: unknown;
  /**
   * Clé API **optionnelle** (Lot 2 — passerelle OpenAI-compatible LiteLLM). Transmise à Rust, qui la
   * pose en `Authorization: Bearer <clé>` sur le SEUL provider `openai`. **Secret local** : jamais
   * commitée, jamais loguée, jamais dans un message d'erreur. Absente ⇒ aucun en-tête (LiteLLM sans clé).
   */
  apiKey?: string;
}

/**
 * Appelle la commande Rust `llm_complete` (reqwest, appel DIRECT à Ollama `POST {host}/api/chat`,
 * `stream:false`, `format:<schema>`). Renvoie le **texte brut** de la complétion (le JSON produit
 * par le modèle). Rejette (via `call`) hors Tauri ou sur réseau KO / timeout / hôte refusé — le
 * résolveur traduit tout rejet en repli mock (jamais de stack à l'UI).
 */
export function llmComplete(args: LlmCompleteArgs): Promise<string> {
  return call<string>("llm_complete", {
    provider: args.provider,
    model: args.model,
    host: args.host,
    system: args.system,
    user: args.user,
    timeoutMs: args.timeoutMs,
    format: args.format,
    apiKey: args.apiKey,
  });
}

/**
 * Un événement de STREAMING poussé par la commande Rust `llm_complete_stream` via le Channel
 * Tauri v2 (canal Rust → JS). Union interne-tagged (`kind`), miroir EXACT de l'enum `StreamChunk`
 * de `src-tauri/src/llm.rs` : `token` (fragment de texte), `done` (fin PROPRE), `error` (aveu
 * honnête — le partiel n'est PAS complet, AC-S2).
 */
export type LlmStreamChunk =
  | { kind: "token"; text: string }
  | { kind: "done" }
  | { kind: "error"; message: string };

/**
 * Appelle la commande Rust `llm_complete_stream` (Ollama `/api/chat`, `stream:true`, NDJSON). Ouvre
 * un **Channel Tauri v2**, y branche `onEvent` (chaque delta/état poussé par Rust), et le passe à la
 * commande. La `Promise` se résout quand la commande se termine (fin propre) et **rejette** sur toute
 * rupture (hôte refusé / réseau / flux coupé / fin sans `done`) — le résolveur traduit tout rejet en
 * repli honnête (jamais de stack à l'UI). SEULE voie de streaming du front (façade unique C-8, même
 * hôte Ollama LAN allow-listé que `llmComplete` — aucun élargissement).
 */
export function llmCompleteStream(
  args: LlmCompleteArgs,
  onEvent: (chunk: LlmStreamChunk) => void,
): Promise<void> {
  const channel = new Channel<LlmStreamChunk>();
  channel.onmessage = onEvent;
  return call<void>("llm_complete_stream", {
    provider: args.provider,
    model: args.model,
    host: args.host,
    system: args.system,
    user: args.user,
    timeoutMs: args.timeoutMs,
    format: args.format,
    apiKey: args.apiKey,
    onEvent: channel,
  });
}

/**
 * Résultat de la découverte des modèles (`llm_models`, Lot 2b — `GET {host}/v1/models`). `models` =
 * la liste d'ids (peut être vide) ; `reason` = l'aveu honnête quand elle est vide (hôte refusé /
 * injoignable / réponse illisible / aucun modèle). `reason` absent/`null` ⇔ au moins un modèle. Le
 * GUI peuple un dropdown depuis `models`, et sur liste vide **laisse la saisie manuelle** (jamais une
 * fausse liste).
 */
export interface LlmModelsResult {
  models: string[];
  reason?: string | null;
}

/**
 * Découvre les modèles d'une source **OpenAI-compatible** (LiteLLM) via la commande Rust `llm_models`
 * (`GET {host}/v1/models`, garde d'hôte + Bearer optionnel). **Ne rejette pas** côté Rust : un échec
 * devient `{ models: [], reason }`. Hors Tauri, `call` rejette (`BACKEND_UNAVAILABLE_MSG`) — l'appelant
 * (Réglages) capte et retombe sur la saisie manuelle. La clé n'apparaît jamais dans `reason` (non-fuite).
 */
export function llmModels(
  endpoint: string,
  apiKey?: string,
  timeoutMs?: number,
): Promise<LlmModelsResult> {
  return call<LlmModelsResult>("llm_models", { endpoint, apiKey, timeoutMs });
}

// --- Déploiement de kit (P3 : écrit une arborescence générée dans un dossier cible) ---

/**
 * Déploie un kit (arbre { chemin relatif → contenu }, produit par `generateClaudeCodeKit`
 * de `@iakaframe/core`) dans `destDir`. Non destructif par défaut ; `force` autorise
 * l'écrasement. Renvoie la liste des chemins effectivement écrits. Côté Rust : pathguard +
 * pré-vérification atomique des conflits (`kit_deploy`).
 */
export function kitDeploy(
  destDir: string,
  files: Record<string, string>,
  force = false,
): Promise<string[]> {
  return call<string[]>("kit_deploy", { destDir, files, force });
}

// --- Handoff (H1 : livraison du paquet forge → cockpit dans le canal partagé) ---

/**
 * Livre le paquet de handoff d'une team (`team.json` + `handoff.json`) dans le canal partagé
 * `<handoff_root>/<teamId>/`. `teamJson`/`handoffJson` sont produits par `buildHandoffPackage`
 * (`@iakaframe/core`). Une (re-)livraison remplace le paquet. Renvoie le dossier écrit.
 * Côté Rust : pathguard sur l'id + noms de fichiers fixes (`handoff::handoff_deliver`).
 */
export function handoffDeliver(
  teamId: string,
  teamJson: string,
  handoffJson: string,
): Promise<string> {
  return call<string>("handoff_deliver", { teamId, teamJson, handoffJson });
}

/**
 * Horloge du backend (epoch ms UTC). Source d'horodatage du manifeste — jamais `Date.now()`
 * côté JS (artefact reproductible + testable ; l'horloge vit dans Rust `SystemTime`).
 */
export function nowMillis(): Promise<number> {
  return call<number>("now_millis");
}

// --- Sélecteur de dossier natif (P4 : plugin Tauri `dialog`, option Q-1 = a) ---

/**
 * Ouvre le sélecteur de dossier natif (plugin `dialog`) et renvoie le chemin choisi,
 * ou `null` si l'utilisateur annule. **SEUL** endroit autorisé à toucher au plugin
 * `dialog` (même cloisonnement que `invoke` : aucun composant ne l'importe — invariant P1).
 * Le dialog ne fait que **fournir un chemin** ; `kit_deploy` reste l'autorité de l'écriture
 * non destructive + pathguard (le chemin choisi n'esquive aucune garde). Hors Tauri (dev
 * front pur / tests), le plugin est mocké.
 */
export async function pickDirectory(): Promise<string | null> {
  const selection = await openDialog({ directory: true, multiple: false });
  return typeof selection === "string" ? selection : null;
}

// ============================================================================================
// Pilote « Apprentissage » — review (U1, surface-apprentissage.md, Q-1 / § 4.2bis)
// --------------------------------------------------------------------------------------------
// DÉROGATION ASSUMÉE ET BORNÉE à l'invariant AR-1/AR-6 (« backend passe-plat de texte, AUCUN
// sous-processus, aucun appel runner »). Cette section — et ELLE SEULE — exécute un sous-processus :
// la CLI SŒUR DÉTERMINISTE `iakaframe review --json`. Raison (tranchée Q-1) : garder UNE source
// unique du garde de consentement et des plafonds (le réservoir vu par `review`, T5). Réimplémenter
// apply/reject en Rust dupliquerait T5+T1 et risquerait de rendre un amendement STRUCTUREL
// (`skill`/`hook`/`config`) auto-applicable — refusé.
//
// Ce n'est PAS un « appel runner » au sens AR-1 : un runner = un moteur LLM (Claude Code, codex,
// ollama). Ici on appelle l'outil frère déterministe d'iakaframe, jamais un modèle, jamais le réseau.
//
// BORNAGE : l'exécution est allow-listée dans `src-tauri/capabilities/default.json`
// (`shell:allow-execute`) à UN binaire (`iakaframe` sur le PATH, repli `node <entrée CLI>`), la
// SOUS-COMMANDE `review`, un argv FIGÉ (seul `<id>` est un validateur), la sortie `--json`. Tout
// appel hors liste est refusé par Tauri (bloqué par défaut). AUCUNE logique de consentement/plafond
// n'est réimplémentée ici : on parse la sortie `--json` de `review` et on la relaie telle quelle.
// ============================================================================================

/** Une proposition du réservoir, telle que renvoyée par `review list --json` (T5). */
export interface ReviewProposal {
  id: string;
  type: string;
  target?: string | null;
  slug?: string;
  status: "en-attente" | "applique" | "rejete";
  created?: string;
  occurrences?: number;
  /** Politique de consentement calculée par `review` (jamais ici) : `auto` ⇒ REGISTRE auto-applicable. */
  policy?: "auto" | "file";
}

export interface ReviewListResult {
  ok: boolean;
  home?: string;
  count?: number;
  proposals: ReviewProposal[];
  error?: string;
}
export interface ReviewShowResult {
  ok: boolean;
  proposal?: ReviewProposal;
  text?: string;
  error?: string;
}
export interface ReviewMaterialize {
  ok?: boolean;
  kind?: string;
  dest?: string;
  target?: string;
  length?: number;
  cap?: number;
  reason?: string;
  type?: string;
  id?: string;
}
export interface ReviewApplyResult {
  ok: boolean;
  id?: string;
  type?: string;
  status?: string;
  reason?: string;
  materialize?: ReviewMaterialize;
}
export interface ReviewRejectResult {
  ok: boolean;
  id?: string;
  type?: string;
  status?: string;
  reason?: string;
}

/** Chemin d'entrée de la CLI pour le repli `node` (résolu relativement à `IAKAFRAME_HOME`). */
function cliEntryPoint(home: string): string {
  const sep = home.includes("\\") && !home.includes("/") ? "\\" : "/";
  return `${home}${sep}cli${sep}src${sep}index.js`;
}

/**
 * Exécute `iakaframe review <verb> [id] --json` via l'allow-list `plugin-shell`. `iakaframe` sur
 * le PATH **d'abord** ; si le binaire est introuvable (spawn en échec), **repli** sur
 * `node <IAKAFRAME_HOME>/cli/src/index.js …`. Un code de sortie non-nul n'est **pas** une erreur
 * d'exécution : `review --json` imprime un JSON `{ ok:false, … }` sur un refus (plafond, déjà
 * traité…) tout en sortant en code 1 — on renvoie donc `stdout` tel quel dès qu'il est présent.
 */
async function execReview(verb: string, id?: string): Promise<string> {
  const args = id === undefined ? ["review", verb, "--json"] : ["review", verb, id, "--json"];
  try {
    const out = await Command.create(`iaka-review-${verb}`, args).execute();
    if (out.stdout.trim().length > 0) return out.stdout;
    throw new Error(out.stderr || `review ${verb} : sortie vide`);
  } catch (pathErr) {
    // PATH indisponible (`iakaframe` introuvable) → repli `node <entrée CLI>` sous IAKAFRAME_HOME.
    const home = await iakaframeHome();
    if (!home) throw pathErr;
    const nodeArgs = [cliEntryPoint(home), ...args];
    const out = await Command.create(`iaka-review-${verb}-node`, nodeArgs).execute();
    if (out.stdout.trim().length > 0) return out.stdout;
    throw new Error(out.stderr || `review ${verb} : sortie vide (repli node)`);
  }
}

function parseReview<T>(stdout: string, label: string): T {
  try {
    return JSON.parse(stdout) as T;
  } catch {
    throw new Error(`sortie \`review ${label}\` illisible (JSON attendu)`);
  }
}

/** Liste TOUTES les propositions du réservoir (le filtre de statut est appliqué côté vue, Q-4). */
export async function reviewList(): Promise<ReviewListResult> {
  return parseReview<ReviewListResult>(await execReview("list"), "list");
}

/** Détail d'une proposition (`proposal.md` complet via `review show <id> --json`). */
export async function reviewShow(id: string): Promise<ReviewShowResult> {
  return parseReview<ReviewShowResult>(await execReview("show", id), "show");
}

/** Valide (matérialise via `review apply <id>`). Aucune re-décision côté GUI (source unique = review). */
export async function reviewApply(id: string): Promise<ReviewApplyResult> {
  return parseReview<ReviewApplyResult>(await execReview("apply", id), "apply");
}

/** Rejette (`review reject <id>`) : statut `rejete`, rien matérialisé. */
export async function reviewReject(id: string): Promise<ReviewRejectResult> {
  return parseReview<ReviewRejectResult>(await execReview("reject", id), "reject");
}

// ============================================================================================
// Pilote « Retrait symétrique +/− » — attach / detach / remove (S6, symetrie-ajout-suppression.md)
// --------------------------------------------------------------------------------------------
// MÊME DÉROGATION AR-1/AR-6 ASSUMÉE ET BORNÉE que le pilote review ci-dessus, ÉTENDUE au RETRAIT.
// Raison (Q-4 tranchée) : la logique de retrait sûr — RESTRICT (`findReferrers`), corbeille
// `<root>/.trash-<ts>/`, cascade explicite, mutation du `skills:[]` du frontmatter (Option 1) — vit
// DÉJÀ dans la CLI 1ʳᵉ tranche (`attach`/`detach`/`remove`, S1..S5). La réimplémenter en Rust
// dupliquerait ce socle et risquerait une suppression sèche / une cascade silencieuse. La GUI n'est
// donc qu'un PILOTE : elle appelle les verbes CLI `--json` et relaie la sortie telle quelle (les
// référents d'un refus RESTRICT, le chemin de corbeille, le `skills:[]` après mutation).
//
// Ce n'est PAS un « appel runner » (AR-1) : `list`/`show`/`attach`/`detach`/`remove` sont l'outil
// frère DÉTERMINISTE d'iakaframe, jamais un modèle LLM, jamais le réseau.
//
// BORNAGE : allow-listé dans `src-tauri/capabilities/default.json` — sous-commandes FIGÉES, argv
// FIGÉ, seuls `<id>`/`<personaId>`/`<kind>`/`<type>` sont des validateurs (enum ou regex étroite),
// sortie `--json`. `remove` non forcé et `remove --cascade --yes` sont DEUX entrées distinctes : la
// cascade (retrait de référents) exige donc un appel explicite séparé (jamais atteint sans geste
// humain côté vue). Tout appel hors liste est refusé par Tauri (bloqué par défaut).
// ============================================================================================

/** Une entrée de la bibliothèque telle que renvoyée par `list <type> --json` (scan, I2). */
export interface LibraryEntry {
  type: string;
  id: string;
  label: string;
  path: string;
}

/** Résultat d'un `attach`/`detach <skillId> --persona <id> --json` (mute le seul `skills:[]`, Option 1). */
export interface AttachDetachResult {
  ok: boolean;
  mode?: "attach" | "detach";
  skillId?: string;
  personaId?: string;
  /** `false` = no-op idempotent (déjà attaché / déjà absent). */
  changed?: boolean;
  /** `skills:[]` du persona APRÈS mutation (la vue Option 1 se rafraîchit dessus). */
  skills?: string[];
  path?: string;
  error?: string;
}

/** Un référent renvoyé par un refus RESTRICT (`findReferrers`, inverse de `checkRefs`). */
export interface RemoveReferrer {
  type: string;
  id: string;
  field: string;
}

/** Résultat d'un `remove <kind> <id> [--cascade --yes] --json` (retrait sûr : RESTRICT + corbeille). */
export interface RemoveResult {
  ok: boolean;
  /** `restrict` = refusé (encore référencé) ; `confirm-required` = cascade demandée non confirmée. */
  reason?: "restrict" | "confirm-required" | string;
  kind?: string;
  id?: string;
  /** Référents à traiter d'abord (refus RESTRICT ou plan de cascade). */
  referrers?: RemoveReferrer[];
  /** Corbeille horodatée où l'artefact est archivé (restaurable) — jamais de suppression sèche. */
  trash?: string;
  trashed?: { type: string; id: string; rel: string }[];
  /** Personas détachés par une cascade skill (leur `skills:[]` a été mis à jour). */
  detached?: string[];
  manifest?: string;
  error?: string;
}

/** Type d'artefact retirable par `remove` (le `−` de `add` + dé-matérialisation d'un skill). */
export type RemoveKind = "team" | "method" | "binding" | "skill";

/**
 * Exécute un verbe iakaframe `--json` via l'allow-list `plugin-shell`. `iakaframe` sur le PATH
 * **d'abord** ; à défaut, **repli** `node <IAKAFRAME_HOME>/cli/src/index.js …` (nom de commande
 * `${name}-node`). Un code de sortie non-nul n'est **pas** une erreur : un refus RESTRICT ou une
 * confirmation requise imprime un JSON `{ ok:false, … }` en sortant en code 1 — on renvoie donc
 * `stdout` dès qu'il est présent. Générique (mêmes bornes que `execReview`), réutilisé par le retrait.
 */
async function execIaka(name: string, args: string[]): Promise<string> {
  try {
    const out = await Command.create(name, args).execute();
    if (out.stdout.trim().length > 0) return out.stdout;
    throw new Error(out.stderr || `${name} : sortie vide`);
  } catch (pathErr) {
    const home = await iakaframeHome();
    if (!home) throw pathErr;
    const nodeArgs = [cliEntryPoint(home), ...args];
    const out = await Command.create(`${name}-node`, nodeArgs).execute();
    if (out.stdout.trim().length > 0) return out.stdout;
    throw new Error(out.stderr || `${name} : sortie vide (repli node)`);
  }
}

function parseIaka<T>(stdout: string, label: string): T {
  try {
    return JSON.parse(stdout) as T;
  } catch {
    throw new Error(`sortie \`${label}\` illisible (JSON attendu)`);
  }
}

/** Types de bibliothèque scannables par le pilote de retrait (bornés par l'allow-list). */
export type LibraryScanType = "personas" | "skills" | "teams" | "methods" | "bindings";

/** Liste les entrées d'une collection (`list <type> --json`) — sert les sélecteurs de la vue. */
export async function libraryScan(type: LibraryScanType): Promise<LibraryEntry[]> {
  return parseIaka<LibraryEntry[]>(await execIaka("iaka-lib-list", ["list", type, "--json"]), `list ${type}`);
}

/**
 * `skills:[]` d'un persona (VUE Option 1) via `show <id> --type personas --json` → `data.skills`.
 * Le frontmatter est la **source unique** ; on ne lit jamais le corps. Absent/illisible → `[]`.
 */
export async function personaSkills(personaId: string): Promise<string[]> {
  const parsed = parseIaka<{ data?: { skills?: unknown } }>(
    await execIaka("iaka-persona-show", ["show", personaId, "--type", "personas", "--json"]),
    `show ${personaId}`,
  );
  const skills = parsed?.data?.skills;
  return Array.isArray(skills) ? skills.map(String) : [];
}

/** Attache un skill à un persona (`attach`) — mute le seul `skills:[]` (le `+` symétrique). */
export async function attachSkill(skillId: string, personaId: string): Promise<AttachDetachResult> {
  return parseIaka<AttachDetachResult>(
    await execIaka("iaka-attach", ["attach", skillId, "--persona", personaId, "--json"]),
    "attach",
  );
}

/** Détache un skill d'un persona (`detach`) — mute le seul `skills:[]` (le `−` au titre du skill). */
export async function detachSkill(skillId: string, personaId: string): Promise<AttachDetachResult> {
  return parseIaka<AttachDetachResult>(
    await execIaka("iaka-detach", ["detach", skillId, "--persona", personaId, "--json"]),
    "detach",
  );
}

/**
 * Retire un artefact livré (`remove <kind> <id>`), non destructif (corbeille). RESTRICT par défaut ;
 * `cascade` = **appel séparé** `remove … --cascade --yes` (retrait des référents) — jamais atteint
 * sans un geste humain explicite côté vue. Aucune décision ici : on relaie la sortie de la CLI.
 */
export async function removeArtifact(
  kind: RemoveKind,
  id: string,
  cascade = false,
): Promise<RemoveResult> {
  const name = cascade ? "iaka-remove-cascade" : "iaka-remove";
  const args = cascade
    ? ["remove", kind, id, "--cascade", "--yes", "--json"]
    : ["remove", kind, id, "--json"];
  return parseIaka<RemoveResult>(await execIaka(name, args), `remove ${kind}`);
}

/**
 * Façade backend en objet — facilite le mock dans les tests (les hooks `useForgeTeams`
 * et `useForgeDeploy` acceptent une implémentation de `Backend` en dépendance injectable).
 */
export const backend = {
  call,
  isTauri,
  teamList,
  teamRead,
  teamWrite,
  teamDelete,
  workspacePath,
  libraryList,
  libraryRead,
  libraryWrite,
  libraryExists,
  poolList,
  poolReadAll,
  poolRead,
  poolWrite,
  poolExists,
  poolPresent,
  iakaframeHome,
  setIakaframeHome,
  authoringModel,
  setAuthoringModel,
  authoringEndpoint,
  authoringApiKey,
  setAuthoringApiKey,
  projectDir,
  setProjectDir,
  activeFrameId,
  setActiveFrameId,
  setAuthoringEndpoint,
  llmComplete,
  llmCompleteStream,
  llmModels,
  kitDeploy,
  handoffDeliver,
  nowMillis,
  pickDirectory,
  reviewList,
  reviewShow,
  reviewApply,
  reviewReject,
  libraryScan,
  personaSkills,
  attachSkill,
  detachSkill,
  removeArtifact,
};

export type Backend = typeof backend;
