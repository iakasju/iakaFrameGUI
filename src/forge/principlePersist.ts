/**
 * principlePersist — source réelle + écriture disque **non-destructive** du pool principe (Lot 5b,
 * persistance-disque-authoring-elements.md § 5b). Calque exact de `personaPersist` (Lot 5a).
 *
 * Lecture : la grille amorce sur `frame.principles` (les `.md` réels dérivés par `buildFrame`), le
 * `fallback` synthétique (`CATALOG_PRINCIPLES`) restant le **repli hors-ligne**. Écriture : édition
 * (fichier présent) → `patchFrontmatter` (préserve corps + clés inconnues à l'octet) ; création
 * (fichier absent) → `serializePrincipleMd` canonique. L'id est **verrouillé** en édition (C-1).
 */
import {
  patchFrontmatter,
  principleFrontmatterPatch,
  serializePrincipleMd,
  type Principle,
} from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";
import { loadFrame } from "./frame";

/**
 * Source du réservoir : les principes RÉELS parsés du frame chargé (`frame.principles`). Repli sur
 * `[]` (jamais d'exception) → l'hôte garde alors le catalogue synthétique hors-ligne.
 */
export async function loadPrinciplesReservoir(api: Backend = backend): Promise<Principle[]> {
  try {
    return (await loadFrame(api)).principles;
  } catch {
    return [];
  }
}

/**
 * Persiste un principe dans `<IAKAFRAME_HOME>/library/principles/<id>.md`. Relire le `.md` d'origine
 * (`poolRead`) est ce qui rend le patch non-destructif : on repart des octets réels. Rejette hors
 * Tauri / racine non résolue — l'appelant dégrade proprement (message, jamais une stack).
 */
export async function persistPrinciple(principle: Principle, api: Backend = backend): Promise<void> {
  const existing = await api.poolRead("principles", principle.id);
  const md =
    existing != null
      ? patchFrontmatter(existing, principleFrontmatterPatch(principle)) // édition : patch en place
      : serializePrincipleMd(principle); // création : fichier neuf, forme canonique
  await api.poolWrite("principles", principle.id, md);
}
