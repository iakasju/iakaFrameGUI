/**
 * element-pool.ts — l'**element pool** (pool de sous-éléments) d'un élément travaillé dans la forge
 * (Volet A) — cœur 🟦. PUR, sans I/O : `buildElementPool(target, frame)` **identifie** la LISTE typée
 * des sous-éléments **disponibles** (le « stock ») qui peuvent composer un élément, selon son **type**,
 * à partir d'un `Frame` déjà chargé (G1/G2 : `poolReadAll`/`libraryList` via `loadFrame`).
 *
 * > **Vocabulaire (AR-2, reservoir-de-frames.md).** Le mot « réservoir » est **libéré** pour ne
 * > désigner que le niveau **dépôt/frame** (iakaframe = réservoir de frames). Le pool de
 * > sous-éléments d'un élément en édition s'appelle désormais **element pool** (`ElementPool*`).
 *
 * Composition (tranchée par le décideur) :
 *   - **Team**    ← personas ;
 *   - **Méthode** ← principes + rituels + gardes-fous + rôles + scaffolds + workflow ;
 *   - **Skill**   ← skills (le stock de **sous-skills** candidates ; miroir de `team ← personas`) ;
 *   - **Kit**     ← l'assemblage total (les types de frame, **hors `frames`**) ;
 *   - **Frame**   ← les types de frame (**hors `frames`** : une frame ne se compose pas de frames).
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

/** L'élément travaillé dans un étage de la forge, dont on identifie l'element pool. */
export type ElementPoolTarget = "team" | "method" | "skill" | "kit" | "frame";

/**
 * Les types composant un `kit`/`frame` : l'assemblage total **moins `frames`** — une frame ne se
 * compose **pas** de frames (AR-1/entry 16). Dérivé de `FRAME_TYPES` (source unique, aucune liste
 * dupliquée).
 */
const ASSEMBLY_TYPES: readonly FrameType[] = FRAME_TYPES.filter(
  (t) => t !== "frames",
);

/**
 * Composition : pour chaque élément, les **types** de sous-éléments qui peuvent le composer
 * (ordre d'affichage). `skill ← skills` est le miroir exact de `team ← personas` (un élément
 * expose son stock de sous-éléments **de même type**). `kit`/`frame` = l'assemblage total
 * (`ASSEMBLY_TYPES` = `FRAME_TYPES` moins `frames`).
 */
export const ELEMENT_POOL_COMPOSITION: Record<
  ElementPoolTarget,
  readonly FrameType[]
> = {
  team: ["personas"],
  method: ["principles", "rituals", "guardrails", "roles", "scaffolds", "workflows"],
  skill: ["skills"],
  kit: [...ASSEMBLY_TYPES],
  frame: [...ASSEMBLY_TYPES],
};

/** Un groupe typé de l'element pool : le stock disponible pour UN type de sous-élément. */
export interface ElementPoolGroup {
  /** Type de sous-élément (un des `FrameType`). */
  type: FrameType;
  /** Libellé lisible (FR). */
  label: string;
  /**
   * Ids disponibles dans le stock. Renseigné pour les **8 pools** (ids scannés par `buildFrame`) ;
   * **vide** pour les **collections** (teams/methods/bindings/frames) — le frame n'en garde que les
   * comptes, pas les ids (le compte reste exact via `count`).
   */
  ids: string[];
  /** Compte du stock (`frame.counts[type]`) — toujours renseigné. */
  count: number;
}

/** L'element pool d'un élément : ses groupes typés + le total disponible. */
export interface ElementPool {
  target: ElementPoolTarget;
  /** Un groupe par type composant l'élément (ordre de `ELEMENT_POOL_COMPOSITION`). */
  groups: ElementPoolGroup[];
  /** Total de sous-éléments disponibles (somme des comptes). */
  total: number;
}

/**
 * Construit l'**element pool** d'un `target` à partir d'un `frame` chargé (PUR, aucun I/O). Pour
 * chaque type composant l'élément : ids depuis `frame.poolIds` (pools) — sinon `[]` (collections) —
 * et compte depuis `frame.counts`. Défensif : un type absent des maps → `[]` / `0` (jamais d'exception).
 */
export function buildElementPool(
  target: ElementPoolTarget,
  frame: Frame,
): ElementPool {
  const poolIds = frame.poolIds as Partial<Record<FrameType, string[]>>;
  const groups: ElementPoolGroup[] = ELEMENT_POOL_COMPOSITION[target].map(
    (type) => ({
      type,
      label: FRAME_TYPE_LABELS[type],
      ids: [...(poolIds[type] ?? [])],
      count: frame.counts[type] ?? 0,
    }),
  );
  const total = groups.reduce((sum, g) => sum + g.count, 0);
  return { target, groups, total };
}
