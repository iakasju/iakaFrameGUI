/**
 * useCharte — charte courante + commutation + persistance + application data-theme.
 *
 * Mécanisme : la charte active est portée par `document.documentElement.dataset.theme`.
 * Chaque feuille vendorisée expose ses tokens scopés `:root[data-theme="<id>"]` (déjà
 * bundlés par Vite) → la commutation est **instantanée**, **sans rechargement** et
 * **sans requête réseau**.
 *
 * Persistance : clé `forge_charte` en localStorage (config non sensible, best-effort —
 * même mécanique défensive que la persistance P4). Lue au boot par `bootstrapCharte()`
 * AVANT le premier rendu React (cf. main.tsx) pour éviter le flash de charte par défaut.
 */
import { useCallback, useEffect, useState } from "react";
import {
  charteRegistry,
  CharteDef,
  CharteId,
  DEFAULT_CHARTE,
  isKnownCharte,
} from "./charteRegistry";

/** Clé de persistance dédiée (config non sensible). */
export const CHARTE_STORAGE_KEY = "forge_charte";

/** Lit la charte enregistrée (ou la charte par défaut). Best-effort, jamais throw. */
export function readStoredCharte(): CharteId {
  try {
    if (typeof localStorage !== "undefined") {
      const v = localStorage.getItem(CHARTE_STORAGE_KEY);
      if (isKnownCharte(v)) return v;
    }
  } catch {
    /* localStorage indisponible : on retombe sur le défaut. */
  }
  return DEFAULT_CHARTE;
}

/** Enregistre la charte choisie (best-effort). */
function storeCharte(id: CharteId): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(CHARTE_STORAGE_KEY, id);
  } catch {
    /* best-effort : la persistance ne doit jamais casser le flux. */
  }
}

/** Applique la charte au DOM (pose data-theme sur <html>). */
export function applyCharte(id: CharteId): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = id;
  }
}

/**
 * Applique la charte persistée AVANT le premier rendu (anti-flash).
 * À appeler une fois dans main.tsx, avant ReactDOM.render.
 */
export function bootstrapCharte(): void {
  applyCharte(readStoredCharte());
}

export interface UseCharte {
  /** Charte active. */
  charte: CharteId;
  /** Change de charte : applique data-theme + persiste. */
  setCharte: (id: CharteId) => void;
  /** Catalogue des chartes disponibles (pour le sélecteur). */
  charts: CharteDef[];
}

export function useCharte(): UseCharte {
  const [charte, setCharteState] = useState<CharteId>(() => readStoredCharte());

  // Sûreté : le DOM reflète toujours l'état (utile en tests / montage tardif).
  useEffect(() => {
    applyCharte(charte);
  }, [charte]);

  const setCharte = useCallback((id: CharteId) => {
    if (!isKnownCharte(id)) return;
    setCharteState(id);
    applyCharte(id);
    storeCharte(id);
  }, []);

  return { charte, setCharte, charts: charteRegistry };
}
