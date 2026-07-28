/**
 * viewMode — le **contrat partagé** des trois modes de présentation d'un réservoir à cartes
 * (lot « modes de présentation », GUI-only). Factorise ce que consomment les DEUX hôtes de
 * grilles de tuiles (`ElementReservoir`, `FramesGallery`) : le type `ViewMode`, la table des
 * modes (icône + libellé pour le sélecteur), et le hook `useViewMode` qui **persiste le choix**
 * dans `localStorage` (best-effort, par-page via une clé de stockage), avec repli propre
 * « tuiles » par défaut.
 *
 * AUCUN I/O disque, AUCUN contrat `@iakaframe/core` touché : pure addition `src/` de présentation.
 * Le mode change UNIQUEMENT le layout — jamais les données de carte (les `*CardVM` restent la
 * source de vérité, projetés à l'identique quel que soit le mode).
 */
import { useCallback, useState } from "react";

/** Les trois modes commutables : tuiles (défaut), lignes minces, liste détaillée. */
export type ViewMode = "grid" | "rows" | "list";

/** Le mode par défaut du réservoir — les tuiles (la grille de cartes historique). */
export const DEFAULT_VIEW_MODE: ViewMode = "grid";

/** Descripteur d'un mode pour le sélecteur (icône glyphe + libellé accessible). */
export interface ViewModeOption {
  mode: ViewMode;
  /** Glyphe affiché dans le segment (décoratif, `aria-hidden`). */
  icon: string;
  /** Libellé lisible (bouton + `aria-label`). */
  label: string;
}

/** L'ordre canonique des modes dans le sélecteur : ⊞ Tuiles · ▤ Lignes · ☰ Liste détaillée. */
export const VIEW_MODES: readonly ViewModeOption[] = [
  { mode: "grid", icon: "⊞", label: "Tuiles" },
  { mode: "rows", icon: "▤", label: "Lignes" },
  { mode: "list", icon: "☰", label: "Liste détaillée" },
];

/** Garde de sûreté : ne retient une valeur stockée que si c'est un mode connu. */
function isViewMode(v: unknown): v is ViewMode {
  return v === "grid" || v === "rows" || v === "list";
}

/**
 * Lit le mode persisté pour une clé donnée — best-effort. Toute défaillance (localStorage
 * indisponible, quota, valeur corrompue) **dégrade** proprement sur le défaut « tuiles » ;
 * jamais d'exception remontée au rendu.
 */
export function readViewMode(storageKey: string): ViewMode {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return isViewMode(raw) ? raw : DEFAULT_VIEW_MODE;
  } catch {
    return DEFAULT_VIEW_MODE;
  }
}

/**
 * Hook de mode de présentation **persistant** (best-effort). `storageKey` isole la préférence
 * par-page (ex. `"iakaframe.viewMode.personas"`, `"iakaframe.viewMode.models"`). Retourne le mode
 * courant + un setter qui écrit dans `localStorage` sans jamais lever. Défaut = tuiles.
 */
export function useViewMode(storageKey: string): [ViewMode, (m: ViewMode) => void] {
  const [mode, setModeState] = useState<ViewMode>(() => readViewMode(storageKey));
  const setMode = useCallback(
    (m: ViewMode) => {
      setModeState(m);
      try {
        window.localStorage.setItem(storageKey, m);
      } catch {
        /* persistance best-effort : un échec n'empêche pas le changement de mode en session. */
      }
    },
    [storageKey],
  );
  return [mode, setMode];
}
