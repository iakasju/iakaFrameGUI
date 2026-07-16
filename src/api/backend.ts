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
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { Command } from "@tauri-apps/plugin-shell";

/** Wrapper typé minimal autour de `invoke`. SEUL endroit autorisé à l'appeler. */
export async function call<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
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
 * Collections gérées par la forge (les 4 onglets, Q-6 + P6b). `workflows` = la collection
 * **éditable** `<home>/workflows/` (P6b) — **distincte** du pool d'atomes read-only
 * `<home>/library/workflows/` (`PoolType`, cf. Q-9 : même nom, deux espaces séparés au MVP).
 */
export type LibraryCollection = "teams" | "methods" | "kits" | "workflows";

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
  poolPresent,
  iakaframeHome,
  setIakaframeHome,
  kitDeploy,
  handoffDeliver,
  nowMillis,
  pickDirectory,
  reviewList,
  reviewShow,
  reviewApply,
  reviewReject,
};

export type Backend = typeof backend;
