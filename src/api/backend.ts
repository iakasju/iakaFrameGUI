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

/** Collections gérées par la forge (les 3 onglets, Q-6). */
export type LibraryCollection = "teams" | "methods" | "kits";

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
};

export type Backend = typeof backend;
