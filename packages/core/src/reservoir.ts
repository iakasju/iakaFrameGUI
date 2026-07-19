/**
 * reservoir.ts — le **réservoir de sous-éléments** d'un élément travaillé dans la forge (Volet A) —
 * cœur 🟦. PUR, sans I/O : `buildReservoir(element, frame)` **identifie** la LISTE typée des
 * sous-éléments **disponibles** (le « stock ») qui peuvent composer un élément, selon son **type**,
 * à partir d'un `Frame` déjà chargé (G1/G2 : `poolReadAll`/`libraryList` via `loadFrame`).
 *
 * Composition (tranchée par le décideur) :
 *   - **Team**    ← personas ;
 *   - **Méthode** ← principes + rituels + gardes-fous + rôles + scaffolds + workflow ;
 *   - **Kit**     ← l'assemblage total (les 11 types) ;
 *   - **Frame**   ← les 11 types.
 *
 * Réutilise la **taxonomie du cœur** (`FRAME_TYPES`/`FrameType`, `frame.ts`) — aucune liste
 * dupliquée. Esprit du cœur : type pur + fonction défensive (jamais d'exception ; un type sans
 * ids scannés → liste vide, le compte reste celui du frame).
 */

import {
  FRAME_TYPES,
  FRAME_TYPE_LABELS,
  type Frame,
  type FrameType,
} from "./frame";

/** L'élément travaillé dans un étage de la forge, dont on identifie le réservoir. */
export type ReservoirElement = "team" | "method" | "kit" | "frame";

/**
 * Composition : pour chaque élément, les **types** de sous-éléments qui peuvent le composer
 * (ordre d'affichage). `kit`/`frame` = l'assemblage total (les 11 types de `FRAME_TYPES`).
 */
export const RESERVOIR_COMPOSITION: Record<ReservoirElement, readonly FrameType[]> = {
  team: ["personas"],
  method: ["principles", "rituals", "guardrails", "roles", "scaffolds", "workflows"],
  kit: [...FRAME_TYPES],
  frame: [...FRAME_TYPES],
};

/** Un groupe typé du réservoir : le stock disponible pour UN type de sous-élément. */
export interface ReservoirGroup {
  /** Type de sous-élément (un des 11 `FrameType`). */
  type: FrameType;
  /** Libellé lisible (FR). */
  label: string;
  /**
   * Ids disponibles dans le stock. Renseigné pour les **8 pools** (ids scannés par `buildFrame`) ;
   * **vide** pour les 3 **collections** (teams/methods/bindings) — le frame n'en garde que les
   * comptes, pas les ids (le compte reste exact via `count`).
   */
  ids: string[];
  /** Compte du stock (`frame.counts[type]`) — toujours renseigné. */
  count: number;
}

/** Le réservoir d'un élément : ses groupes typés + le total disponible. */
export interface Reservoir {
  element: ReservoirElement;
  /** Un groupe par type composant l'élément (ordre de `RESERVOIR_COMPOSITION`). */
  groups: ReservoirGroup[];
  /** Total de sous-éléments disponibles (somme des comptes). */
  total: number;
}

/**
 * Construit le **réservoir** d'un `element` à partir d'un `frame` chargé (PUR, aucun I/O). Pour
 * chaque type composant l'élément : ids depuis `frame.poolIds` (pools) — sinon `[]` (collections) —
 * et compte depuis `frame.counts`. Défensif : un type absent des maps → `[]` / `0` (jamais d'exception).
 */
export function buildReservoir(element: ReservoirElement, frame: Frame): Reservoir {
  const poolIds = frame.poolIds as Partial<Record<FrameType, string[]>>;
  const groups: ReservoirGroup[] = RESERVOIR_COMPOSITION[element].map((type) => ({
    type,
    label: FRAME_TYPE_LABELS[type],
    ids: [...(poolIds[type] ?? [])],
    count: frame.counts[type] ?? 0,
  }));
  const total = groups.reduce((sum, g) => sum + g.count, 0);
  return { element, groups, total };
}
