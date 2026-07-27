/**
 * useDismiss — ferme un popup/menu au **clic extérieur** (mousedown hors du conteneur `ref`) **et**
 * à **Escape** (correctif recette #2). Les écouteurs `document` ne sont montés que **pendant** que le
 * popup est ouvert (`open`) et sont retirés à la fermeture/démontage (aucun listener résiduel).
 *
 * Le conteneur `ref` doit englober **le déclencheur ET le panneau** : ainsi un clic sur le bouton qui
 * bascule le menu est « intérieur » (il ne provoque pas un dismiss qui rouvrirait aussitôt via le
 * onClick du bouton), et un clic **dans** le panneau ne ferme pas. On n'écoute que
 * `mousedown`/`keydown` — aucun déplacement de focus, ARIA du panneau préservé.
 */
import { useEffect, type RefObject } from "react";

export function useDismiss<E extends HTMLElement>(
  open: boolean,
  onDismiss: () => void,
  ref: RefObject<E | null>,
): void {
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onDismiss();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onDismiss, ref]);
}
