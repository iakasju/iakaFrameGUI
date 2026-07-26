/**
 * ritualPersist — source réelle + écriture disque **non-destructive** du pool rituel (Lot 5b,
 * persistance-disque-authoring-elements.md § 5b). Calque exact de `personaPersist` (Lot 5a).
 *
 * Lecture : la grille amorce sur `frame.rituals` (les `.md` réels dérivés), le `fallback` synthétique
 * (`CATALOG_RITUALS`) restant le repli hors-ligne. Écriture : édition → `patchFrontmatter` (préserve
 * `cadence`/`timebox`/corps/clés inconnues + la forme bloc des `actions` à l'octet) ; création →
 * `serializeRitualMd` canonique. L'id est **verrouillé** en édition (C-1).
 */
import {
  patchFrontmatter,
  ritualFrontmatterPatch,
  serializeRitualMd,
  type Ritual,
} from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";
import { loadFrame } from "./frame";

/** Source du réservoir : les rituels RÉELS parsés du frame (`frame.rituals`). Repli `[]`. */
export async function loadRitualsReservoir(api: Backend = backend): Promise<Ritual[]> {
  try {
    return (await loadFrame(api)).rituals;
  } catch {
    return [];
  }
}

/**
 * Persiste un rituel dans `<IAKAFRAME_HOME>/library/rituals/<id>.md`. Patch non-destructif en
 * édition (relit les octets réels), `serializeRitualMd` en création. Rejette hors Tauri / racine non
 * résolue — l'appelant dégrade proprement.
 */
export async function persistRitual(ritual: Ritual, api: Backend = backend): Promise<void> {
  const existing = await api.poolRead("rituals", ritual.id);
  const md =
    existing != null
      ? patchFrontmatter(existing, ritualFrontmatterPatch(ritual))
      : serializeRitualMd(ritual);
  await api.poolWrite("rituals", ritual.id, md);
}
