/**
 * useOpenFrame — pilote de l'action « Open frame » (G3, open-frame-gui-stefframe2.md). Réutilise le
 * plumbing racine existant : `pickDirectory()` → `setIakaframeHome(dir)` → `loadFramePortfolio()`
 * (charge les 11 types dans le conteneur Portfolio). Expose le frame chargé + son rapport
 * d'intégrité + les états (busy/erreur). `reload()` recharge le frame de la racine courante sans
 * re-sélectionner (utile après un premier chargement). Backend injectable (tests).
 */
import { useCallback, useState } from "react";
import { backend, type Backend } from "../api/backend";
import { loadFramePortfolio, type LoadedFrame } from "./openFrame";

export interface UseOpenFrame {
  /** Frame chargé (Portfolio + intégrité), ou `null` tant qu'aucun n'est ouvert. */
  frame: LoadedFrame | null;
  /** Chargement en cours. */
  busy: boolean;
  /** Dernier message d'erreur (sélection annulée hors Tauri, racine absente…), ou `null`. */
  error: string | null;
  /** Sélectionne un dossier de frame, fixe la racine, puis charge les 11 types. */
  openFrame: () => Promise<void>;
  /** Recharge le frame depuis la racine courante (sans re-sélection). */
  reload: () => Promise<void>;
}

export function useOpenFrame(api: Backend = backend): UseOpenFrame {
  const [frame, setFrame] = useState<LoadedFrame | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const loaded = await loadFramePortfolio(api);
      if (loaded === null) {
        setError("Racine introuvable — choisissez un dossier de frame.");
        setFrame(null);
      } else {
        setFrame(loaded);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du chargement du frame.");
    } finally {
      setBusy(false);
    }
  }, [api]);

  const openFrame = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const dir = await api.pickDirectory();
      if (!dir) {
        setError(null);
        return;
      }
      await api.setIakaframeHome(dir);
      const loaded = await loadFramePortfolio(api);
      if (loaded === null) {
        setError("Frame illisible à cet emplacement.");
        setFrame(null);
      } else {
        setFrame(loaded);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'ouverture du frame.");
    } finally {
      setBusy(false);
    }
  }, [api]);

  return { frame, busy, error, openFrame, reload };
}
