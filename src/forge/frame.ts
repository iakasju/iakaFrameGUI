/**
 * frame (forge) — **I/O only** du « Open frame », adossé au cœur `@iakaframe/core` (G6/LOT 2).
 *
 * L'entité `Frame` de 1er ordre (taxonomie des 11 types, intégrité, binding SF2, assemblage résolu,
 * facette portefeuille) vit désormais dans `packages/core/src/frame.ts` — **source unique, zéro
 * doublon** (AC-8). Ce module ne garde que :
 *   - **`loadFrame(api)`** : les lectures asynchrones (`iakaframeHome`/`poolReadAll`/`libraryList`,
 *     G1/G2) puis **délègue** l'assemblage pur à `buildFrame` du cœur (aucun nouvel I/O — AC-7) ;
 *   - la **compatibilité `PoolType`** : l'assertion statique que les 8 pools du cœur correspondent
 *     à l'enum backend — le **seul** point où frame ↔ backend se touchent ;
 *   - des **re-exports de continuité** (types + fonctions du cœur) pour que les imports existants
 *     (`OpenFramePanel`, `frame.test`) résolvent sans churn.
 */
import {
  buildFrame,
  checkFrameRefs,
  parseFrame,
  parseFrameBinding,
  FRAME_TYPES,
  FRAME_TYPE_LABELS,
  POOL_FRAME_TYPES,
  COLLECTION_FRAME_TYPES,
  type Frame,
  type FrameAssembly,
  type FramePortfolioFacet,
  type FrameType,
  type PoolFrameType,
  type CollectionFrameType,
  type FrameRaw,
  type FrameBinding,
  type FrameMissingRef,
  type FrameIntegrityReport,
} from "@iakaframe/core";
import { backend, type Backend, type PoolType } from "../api/backend";

// --- Re-exports de continuité (source unique = cœur ; la forge n'en garde AUCUNE copie) ---
export {
  buildFrame,
  checkFrameRefs,
  parseFrame,
  parseFrameBinding,
  FRAME_TYPES,
  FRAME_TYPE_LABELS,
  POOL_FRAME_TYPES,
  COLLECTION_FRAME_TYPES,
};
export type {
  Frame,
  FrameAssembly,
  FramePortfolioFacet,
  FrameType,
  PoolFrameType,
  CollectionFrameType,
  FrameRaw,
  FrameBinding,
  FrameMissingRef,
  FrameIntegrityReport,
};

/**
 * **Compat statique backend** (le SEUL point frame ↔ backend) : les 8 pools du cœur (découplés de
 * l'enum) DOIVENT correspondre à `PoolType`. Toute divergence casse la compilation ici, jamais en
 * silence. `void` : garde purement typée (aucun effet runtime).
 */
const _POOL_TYPE_COMPAT: readonly PoolType[] = POOL_FRAME_TYPES;
void _POOL_TYPE_COMPAT;

/**
 * Charge le frame de la racine courante (`IAKAFRAME_HOME`) : lit les 8 pools en contenu (`poolReadAll`,
 * G1) + les 3 assemblages (`libraryList`, `bindings` câblé G2), puis délègue à `buildFrame` (cœur).
 * Défensif : chaque lecture qui échoue dégrade en `[]` (le frame reste cohérent). Backend injectable
 * (tests). **Aucun nouvel I/O** au-delà des 3 appels G1/G2 (AC-7).
 */
export async function loadFrame(api: Backend = backend): Promise<Frame> {
  const root = await api.iakaframeHome().catch(() => null);
  const pools = {} as Record<PoolFrameType, string[]>;
  await Promise.all(
    POOL_FRAME_TYPES.map(async (type) => {
      pools[type] = await api.poolReadAll(type).catch(() => []);
    }),
  );
  const [teams, methods, bindings, frames] = await Promise.all([
    api.libraryList("teams").catch(() => []),
    api.libraryList("methods").catch(() => []),
    api.libraryList("bindings").catch(() => []),
    api.libraryList("frames").catch(() => []),   // AR-1 : réservoir de frames (descripteurs)
  ]);
  // Pointeur de frame active : `<projectDir>/iakaframe.json`, clé `frame` (propriété du LIEU,
  // partagée avec le CLI). Absent / pas de projet réglé / hors Tauri → `null` ⇒ l'assemblage
  // retombe sur la frame `default` du réservoir, comportement d'avant à l'identique (I-3).
  const active = await api.activeFrameId?.().catch(() => null);
  return buildFrame({ root, pools, teams, methods, bindings, frames }, active ?? null);
}
