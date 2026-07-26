/**
 * ritual.ts — le **Rituel / geste outillé** (E2 §3.4) — cœur 🟦.
 *
 * Un rituel = un **geste** avec **déclencheurs** (mots-clés) + **actions** + une **tranche**
 * `forge` (fabrication) | `cockpit` (run). Le continuum §3.7 : le Rituel est la *procédure*
 * qui applique un Principe (le *comment* outillé).
 *
 * **[MVP]** : DONNÉE (type + catalogue + parseur défensif) ; l'**outillage réel** de chaque
 * geste (scripts, journalisation) est **différé** — en particulier `log-conversation` est
 * modélisé (Q-5) mais **aucun code de journalisation** n'est produit dans ce lot.
 */

import type { FrontmatterPatch } from "./frontmatter";

/** Tranche d'un rituel : fabrication (forge) ou run (cockpit) — frontière PROJET.md. */
export type RitualSide = "forge" | "cockpit";

/** Un rituel : geste outillé (déclencheurs → actions), rangé côté forge ou cockpit. */
export interface Ritual {
  /** Id stable, référencé par `Method.ritualIds` (ex. "iakastart"). */
  id: string;
  /** Libellé lisible. */
  label: string;
  /** Mots-clés qui déclenchent le geste (ex. `["iakastart","iakaframe","odin"]`). */
  triggers: string[];
  /** Étapes du geste (résumé au MVP ; outillage réel différé). */
  actions: string[];
  /** Tranche : `forge` (fabrication) | `cockpit` (run). */
  side: RitualSide;
}

/**
 * **`CATALOG_RITUALS`** — les 5 rituels canoniques iakaframe (E2 §3.4), en DONNÉE. `init` est le
 * **seul** geste de fabrication (forge) ; les autres opèrent sur un projet déjà monté (cockpit).
 */
export const CATALOG_RITUALS: readonly Ritual[] = [
  {
    id: "iakastart",
    label: "iakastart (bootstrap team)",
    triggers: ["iakastart", "iakaframe", "odin"],
    actions: [
      "Afficher le banner + le roster des rôles.",
      "Rendre la team prête au dispatch (n'en spawn aucune).",
    ],
    side: "cockpit",
  },
  {
    id: "init",
    label: "init iakaframe (onboard/reprise)",
    triggers: ["init iakaframe", "initialise"],
    actions: [
      "Scaffold non destructif (portefeuille + projet).",
      "Brancher le dépôt Forgejo si absent.",
      "Générer l'état des lieux (v0 ou reprise).",
    ],
    side: "forge",
  },
  {
    id: "update",
    label: "update iakaframe",
    triggers: ["update iakaframe", "update"],
    actions: [
      "Régénérer l'état des lieux.",
      "Commit global (`git add -A` + commit).",
      "Push.",
    ],
    side: "cockpit",
  },
  {
    id: "snapshot",
    label: "snapshot (état des lieux)",
    triggers: ["snapshot", "pause", "reprise", "version"],
    actions: [
      "Capter les faits git.",
      "Écrire `specs/etat-des-lieux.md` (+ récit de reprise).",
    ],
    side: "cockpit",
  },
  {
    id: "log-conversation",
    label: "log-conversation (mémoire humaine)",
    triggers: ["fin de session", "archivage"],
    actions: [
      "Consigner la conversation (mémoire humaine).",
      "Outillage réel différé (Q-5) — MVP : donnée seulement.",
    ],
    side: "cockpit",
  },
] as const;

/** Ids des rituels du catalogue (ordre du catalogue). */
export const CATALOG_RITUAL_IDS: readonly string[] = CATALOG_RITUALS.map(
  (r) => r.id,
);

/** Un rituel du catalogue par id (`undefined` si absent). */
export function ritualById(id: string | undefined | null): Ritual | undefined {
  return id ? CATALOG_RITUALS.find((r) => r.id === id) : undefined;
}

/** Filtre un tableau brut en `string[]` (ignore non-string / vides). */
function toStringArray(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];
}

/**
 * Parse défensif d'UN rituel (`null` si inutilisable : pas d'`id`). `side` non reconnu → repli
 * `cockpit` (run par défaut) ; `triggers`/`actions` filtrés. Jamais d'exception.
 */
export function parseRitual(raw: unknown): Ritual | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id =
    typeof r.id === "string" && r.id.trim().length > 0 ? r.id.trim() : null;
  if (!id) return null;
  const label =
    typeof r.label === "string" && r.label.trim().length > 0 ? r.label.trim() : id;
  const side: RitualSide = r.side === "forge" ? "forge" : "cockpit";
  return {
    id,
    label,
    triggers: toStringArray(r.triggers),
    actions: toStringArray(r.actions),
    side,
  };
}

/**
 * Construit le **patch de frontmatter** d'un rituel pour une réécriture **non-destructive**
 * (Lot 5b, C1) : uniquement les champs que l'éditeur modélise (`label, triggers, actions, side`).
 * **Exclu** : `id` (verrouillé, C-1). Toute clé non modélisée (`cadence`, `timebox`, corps, inconnues)
 * est **préservée à l'octet** par `patchFrontmatter`. `triggers`/`actions` sont des listes : la ligne
 * (ou le bloc `- …`) d'origine est laissé **verbatim** tant que les valeurs ne changent pas — la forme
 * bloc du canon est donc préservée sur un round-trip sans édition.
 */
export function ritualFrontmatterPatch(r: Ritual): FrontmatterPatch {
  return {
    label: { kind: "scalar", value: r.label },
    triggers: { kind: "list", value: [...r.triggers] },
    actions: { kind: "list", value: [...r.actions] },
    side: { kind: "scalar", value: r.side },
  };
}
