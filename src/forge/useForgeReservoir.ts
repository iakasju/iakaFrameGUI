/**
 * useForgeReservoir — charge le **réservoir de sous-éléments** (Volet A) de l'élément travaillé.
 *
 * Adossé à **G1/G2** : réutilise `loadFrame` (lectures `poolReadAll`/`libraryList` existantes) puis
 * délègue l'identification pure à `buildElementPool` (`@iakaframe/core`, ex-`buildReservoir`,
 * AR-2). Aucun nouvel I/O. Défensif : racine introuvable / lecture en échec → element pool `null` +
 * message (jamais d'exception). Backend injectable (tests). Recharge quand l'`element` change.
 */
import { useCallback, useEffect, useState } from "react";
import { buildElementPool, type ElementPool, type ElementPoolTarget } from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";
import { loadFrame } from "./frame";

export interface UseForgeReservoir {
  reservoir: ElementPool | null;
  busy: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useForgeReservoir(
  element: ElementPoolTarget,
  api: Backend = backend,
): UseForgeReservoir {
  const [reservoir, setReservoir] = useState<ElementPool | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const frame = await loadFrame(api);
      setReservoir(buildElementPool(element, frame));
    } catch {
      setError("Réservoir indisponible (racine bibliothèque introuvable ?).");
      setReservoir(null);
    } finally {
      setBusy(false);
    }
  }, [api, element]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { reservoir, busy, error, reload };
}
