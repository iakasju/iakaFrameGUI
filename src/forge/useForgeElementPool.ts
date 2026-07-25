/**
 * useForgeElementPool — charge l'**element pool** (stock des sous-éléments, Volet A) de l'élément
 * travaillé.
 *
 * Adossé à **G1/G2** : réutilise `loadFrame` (lectures `poolReadAll`/`libraryList` existantes) puis
 * délègue l'identification pure à `buildElementPool` (`@iakaframe/core`). Aucun nouvel I/O. Défensif :
 * racine introuvable / lecture en échec → element pool `null` + message (jamais d'exception).
 * Backend injectable (tests). Recharge quand l'`element` change.
 *
 * **Vocabulaire (AR-2, `reservoir-de-frames.md`)** : ce hook ne dit plus « réservoir » — le mot est
 * réservé au sens *dépôt de frames*. Ici c'est un **element pool**.
 */
import { useCallback, useEffect, useState } from "react";
import { buildElementPool, type ElementPool, type ElementPoolTarget } from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";
import { loadFrame } from "./frame";

export interface UseForgeElementPool {
  elementPool: ElementPool | null;
  busy: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useForgeElementPool(
  element: ElementPoolTarget,
  api: Backend = backend,
): UseForgeElementPool {
  const [elementPool, setElementPool] = useState<ElementPool | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const frame = await loadFrame(api);
      setElementPool(buildElementPool(element, frame));
    } catch {
      setError("Pool d'éléments indisponible (racine bibliothèque introuvable ?).");
      setElementPool(null);
    } finally {
      setBusy(false);
    }
  }, [api, element]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { elementPool, busy, error, reload };
}
