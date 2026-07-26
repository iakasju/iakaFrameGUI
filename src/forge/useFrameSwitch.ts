/**
 * useFrameSwitch — le **geste de bascule de frame active**, extrait de `OpenFramePanel.selectFrame`
 * (galerie-models-actionnable.md, D-2) et **partagé** entre `OpenFramePanel` et `FramesGallery`
 * pour qu'ils aient EXACTEMENT le même comportement (une seule garde de dangling / d'erreur, zéro
 * divergence — R4).
 *
 * Le pattern PROUVÉ qu'il porte : `setActiveFrameId(id)` (écriture non destructive côté Rust,
 * `iakaframe.json`/`frame`) → **recharge depuis le disque** (`loadFrame`, jamais un état local
 * optimiste qui mentirait si l'écriture avait échoué — R5) → relit le pointeur → expose le
 * **dangling** (`activeFrameIsDangling` : pointeur mort → repli `default`, mais on le DIT — I-4).
 * Le **no-op** sur la carte active est de la responsabilité de l'appelant (bouton désactivé).
 *
 * AUCUN I/O neuf : réutilise `loadFrame(api)` et la façade backend existante. Pure présentation
 * `src/` — aucun contrat `packages/core` touché (invariant de parité tenu par construction).
 */
import { useCallback, useEffect, useState } from "react";
import { backend, type Backend } from "../api/backend";
import { loadFrame, type Frame } from "./frame";
import { activeFrameIsDangling } from "@iakaframe/core";

/** Le pointeur désigne une frame qui n'existe plus : on retombe sur `default`, mais on le DIT (I-4). */
export const DANGLING_FRAME_HINT =
  "pointeur de frame active cassé (frame introuvable dans le réservoir) — repli sur « default »";

/** Bascule refusée : pas de projet réglé, ou `iakaframe.json` illisible (écriture refusée, non écrasée). */
export const FRAME_SWITCH_ERROR =
  "Bascule impossible : aucun dossier de projet réglé, ou iakaframe.json illisible " +
  "(l'écriture est refusée plutôt que d'écraser les clés du CLI).";

/** Rechargement impossible (racine introuvable). */
export const FRAME_LOAD_ERROR = "Chargement du frame impossible (racine introuvable ?).";

/** Ouverture (choix de dossier) impossible. */
export const FRAME_OPEN_ERROR = "Ouverture du frame impossible.";

export interface UseFrameSwitch {
  /** Le frame chargé (assemblage résolu, réservoir de frames). `null` avant tout chargement. */
  frame: Frame | null;
  /** Le pointeur brut relu à côté du frame — sert à détecter le pointeur mort (I-4). */
  pointer: string | null;
  /** Une opération d'I/O est en cours (désactive les contrôles). */
  busy: boolean;
  /** Message d'erreur inline (jamais une exception à l'UI). */
  error: string | null;
  /** Le pointeur désigne une frame absente du réservoir chargé (repli `default` signalé). */
  dangling: boolean;
  /** Recharge le frame de la racine courante + relit le pointeur (sans re-choisir de dossier). */
  reload: () => Promise<void>;
  /** Pose `frameId` comme frame active (non destructif) puis **recharge depuis le disque**. */
  switchTo: (frameId: string) => Promise<void>;
  /** Choisit un dossier → le fixe comme racine → charge le frame (le flux « Ouvrir un frame »). */
  pickAndLoad: () => Promise<void>;
}

/**
 * Hook de bascule de frame active. `api` injectable (tests). `autoLoad` déclenche un `reload` au
 * montage (la galerie s'alimente seule ; le panneau attend un clic explicite, donc `autoLoad`=false).
 */
export function useFrameSwitch(
  api: Backend = backend,
  { autoLoad = false }: { autoLoad?: boolean } = {},
): UseFrameSwitch {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [pointer, setPointer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Relit frame + pointeur depuis le disque (le seul chemin de vérité — jamais d'état optimiste). */
  const refresh = useCallback(async () => {
    setFrame(await loadFrame(api));
    setPointer((await api.activeFrameId?.().catch(() => null)) ?? null);
  }, [api]);

  const reload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await refresh();
    } catch {
      setError(FRAME_LOAD_ERROR);
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const switchTo = useCallback(
    async (frameId: string) => {
      setBusy(true);
      setError(null);
      try {
        await api.setActiveFrameId(frameId);
        await refresh(); // recharge-depuis-disque : l'assemblage affiché est celui du disque (R5)
      } catch {
        setError(FRAME_SWITCH_ERROR);
      } finally {
        setBusy(false);
      }
    },
    [api, refresh],
  );

  const pickAndLoad = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const dir = await api.pickDirectory();
      if (!dir) return; // annulation utilisateur : on ne change rien.
      await api.setIakaframeHome(dir);
      await refresh();
    } catch {
      setError(FRAME_OPEN_ERROR);
    } finally {
      setBusy(false);
    }
  }, [api, refresh]);

  useEffect(() => {
    if (autoLoad) void reload();
  }, [autoLoad, reload]);

  const dangling = frame ? activeFrameIsDangling(frame.frames, pointer) : false;
  return { frame, pointer, busy, error, dangling, reload, switchTo, pickAndLoad };
}
