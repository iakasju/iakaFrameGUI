/**
 * scaffold.ts — le **Scaffold** (structure de folders à deux niveaux, E2 §3.1) — cœur 🟦.
 *
 * Décrit l'**échafaudage** qu'un projet reçoit, sur deux niveaux : **portefeuille** (`~/work`)
 * et **projet**. **Invariant d'onboarding** : `nonDestructive: true` — ne jamais écraser
 * l'existant. Au MVP, DONNÉE seedée (type + catalogue + parseur défensif) ; la matérialisation
 * réelle des dossiers est portée par le rituel `init` (outillage différé).
 */

import type { FrontmatterPatch } from "./frontmatter";

/** Niveau d'un scaffold : portefeuille (`~/work`) ou projet. */
export type ScaffoldLevel = "portfolio" | "project";

/** Une entrée d'échafaudage : un chemin, son rôle, créé si absent. */
export interface ScaffoldEntry {
  /** Chemin relatif au niveau (ex. "specs/instructions/"). */
  path: string;
  /** Rôle de l'entrée (à quoi elle sert). */
  role: string;
  /** Créée si absente (jamais écrasée — cf. `Scaffold.nonDestructive`). */
  createIfAbsent: boolean;
}

/** Un scaffold : l'échafaudage d'un niveau (portefeuille ou projet). */
export interface Scaffold {
  /** Id stable, référencé par `Method.scaffoldIds` (ex. "project"). */
  id: string;
  /** Niveau d'application. */
  level: ScaffoldLevel;
  /** Entrées de structure (chemins + rôles). */
  entries: ScaffoldEntry[];
  /** Invariant d'onboarding : ne jamais écraser l'existant (toujours `true`). */
  nonDestructive: boolean;
}

/** Scaffold **portefeuille** (`~/work`) : racine + backlog transverse. */
export const PORTFOLIO_SCAFFOLD: Scaffold = {
  id: "portfolio",
  level: "portfolio",
  nonDestructive: true,
  entries: [
    { path: ".", role: "Racine du portefeuille (`~/work`).", createIfAbsent: true },
    {
      path: "BACKLOG.md",
      role: "Backlog transverse du portefeuille.",
      createIfAbsent: true,
    },
  ],
};

/** Scaffold **projet** : specs, contrat, isolation Docker, remote Forgejo. */
export const PROJECT_SCAFFOLD: Scaffold = {
  id: "project",
  level: "project",
  nonDestructive: true,
  entries: [
    { path: "specs/", role: "Décisions & vision (jamais de code).", createIfAbsent: true },
    {
      path: "specs/instructions/",
      role: "Une instruction par feature, avant de coder.",
      createIfAbsent: true,
    },
    { path: "CLAUDE.md", role: "Fichier-contrat de méthode du projet.", createIfAbsent: true },
    { path: ".iakaframe", role: "Marqueur de projet iakaframe.", createIfAbsent: true },
    {
      path: "docker/",
      role: "Isolation Docker : stack + ports préfixés par projet.",
      createIfAbsent: true,
    },
    {
      path: ".git/config",
      role: "Remote Forgejo (LAN, HTTP + token).",
      createIfAbsent: true,
    },
  ],
};

/** **`CATALOG_SCAFFOLDS`** — les 2 scaffolds canoniques (portefeuille + projet). */
export const CATALOG_SCAFFOLDS: readonly Scaffold[] = [
  PORTFOLIO_SCAFFOLD,
  PROJECT_SCAFFOLD,
];

/** Ids des scaffolds du catalogue (ordre du catalogue). */
export const CATALOG_SCAFFOLD_IDS: readonly string[] = CATALOG_SCAFFOLDS.map(
  (s) => s.id,
);

/** Un scaffold du catalogue par id (`undefined` si absent). */
export function scaffoldById(id: string | undefined | null): Scaffold | undefined {
  return id ? CATALOG_SCAFFOLDS.find((s) => s.id === id) : undefined;
}

/** Parse défensif d'UNE entrée de scaffold (`null` si pas de `path`). */
function parseScaffoldEntry(raw: unknown): ScaffoldEntry | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const path =
    typeof r.path === "string" && r.path.trim().length > 0 ? r.path.trim() : null;
  if (!path) return null;
  const role = typeof r.role === "string" ? r.role : "";
  const createIfAbsent = r.createIfAbsent !== false; // défaut : true (non destructif)
  return { path, role, createIfAbsent };
}

/**
 * Parse défensif d'UN scaffold (`null` si inutilisable : pas d'`id`). `level` non reconnu →
 * repli `project` ; `nonDestructive` **forcé** à `true` (invariant) ; entrées filtrées.
 */
export function parseScaffold(raw: unknown): Scaffold | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id =
    typeof r.id === "string" && r.id.trim().length > 0 ? r.id.trim() : null;
  if (!id) return null;
  const level: ScaffoldLevel = r.level === "portfolio" ? "portfolio" : "project";
  const entries = Array.isArray(r.entries)
    ? r.entries.map(parseScaffoldEntry).filter((e): e is ScaffoldEntry => e !== null)
    : [];
  return { id, level, entries, nonDestructive: true };
}

/**
 * Construit le **patch de frontmatter** d'un scaffold pour une réécriture **non-destructive**
 * (Lot 5b, C1) : au MVP le seul champ éditable est `level` (l'éditeur ne touche ni `entries` — tableau
 * riche préservé, cf. simplification MVP du Lot 2 — ni `nonDestructive`, invariant). **Exclus** : `id`
 * (verrouillé, C-1), `entries` et `nonDestructive` — **préservés à l'octet** par `patchFrontmatter` du
 * seul fait de leur absence du patch. Round-trip sans édition ⇒ document byte-identique.
 */
export function scaffoldFrontmatterPatch(s: Scaffold): FrontmatterPatch {
  return {
    level: { kind: "scalar", value: s.level },
  };
}
