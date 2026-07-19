/**
 * useForgeReservoir — charge le **réservoir de sous-éléments** (Volet A) de l'élément travaillé.
 *
 * Adossé à **G1/G2** : réutilise `loadFrame` (lectures `poolReadAll`/`libraryList` existantes) puis
 * délègue l'identification pure à `buildReservoir` (`@iakaframe/core`). Aucun nouvel I/O. Défensif :
 * racine introuvable / lecture en échec → réservoir `null` + message (jamais d'exception). Backend
 * injectable (tests). Recharge quand l'`element` change (Team ↔ Méthode ↔ Kit ↔ Frame).
 */
import { useCallback, useEffect, useState } from "react";
import { buildReservoir, type Reservoir, type ReservoirElement } from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";
import { loadFrame } from "./frame";

export interface UseForgeReservoir {
  reservoir: Reservoir | null;
  busy: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useForgeReservoir(
  element: ReservoirElement,
  api: Backend = backend,
): UseForgeReservoir {
  const [reservoir, setReservoir] = useState<Reservoir | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const frame = await loadFrame(api);
      setReservoir(buildReservoir(element, frame));
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
