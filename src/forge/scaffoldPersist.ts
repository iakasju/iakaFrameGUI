/**
 * scaffoldPersist — source réelle + écriture disque **non-destructive** du pool scaffold (Lot 5b,
 * persistance-disque-authoring-elements.md § 5b). Calque exact de `personaPersist` (Lot 5a).
 *
 * Lecture : la grille amorce sur `frame.scaffolds` (les `.md` réels dérivés), le `fallback`
 * synthétique (`CATALOG_SCAFFOLDS`) restant le repli hors-ligne. Écriture : édition →
 * `patchFrontmatter` (préserve le tableau `entries` — non éditable au MVP — + `nonDestructive` + corps
 * à l'octet) ; création → `serializeScaffoldMd` canonique. L'id est **verrouillé** en édition (C-1).
 */
import {
  patchFrontmatter,
  scaffoldFrontmatterPatch,
  serializeScaffoldMd,
  type Scaffold,
} from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";
import { loadFrame } from "./frame";

/** Source du réservoir : les scaffolds RÉELS parsés du frame (`frame.scaffolds`). Repli `[]`. */
export async function loadScaffoldsReservoir(api: Backend = backend): Promise<Scaffold[]> {
  try {
    return (await loadFrame(api)).scaffolds;
  } catch {
    return [];
  }
}

/**
 * Persiste un scaffold dans `<IAKAFRAME_HOME>/library/scaffolds/<id>.md`. Patch non-destructif en
 * édition (le tableau `entries` réel est préservé à l'octet, absent du patch), `serializeScaffoldMd`
 * en création. Rejette hors Tauri / racine non résolue — l'appelant dégrade proprement.
 */
export async function persistScaffold(scaffold: Scaffold, api: Backend = backend): Promise<void> {
  const existing = await api.poolRead("scaffolds", scaffold.id);
  const md =
    existing != null
      ? patchFrontmatter(existing, scaffoldFrontmatterPatch(scaffold))
      : serializeScaffoldMd(scaffold);
  await api.poolWrite("scaffolds", scaffold.id, md);
}
