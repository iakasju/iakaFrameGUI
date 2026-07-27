/**
 * forgeCreate — le **canal de création** entre le chrome (bouton **New** de la barre supérieure)
 * et l'**écran actif** (correctif recette #1, unification du New). Le chrome ne connaît pas le geste
 * de création propre à chaque surface : l'écran actif **enregistre** son geste (`setCreateHandler`)
 * quand il sait créer, le retire (`null`) au démontage. Le chrome lit ce handler pour **activer** son
 * New et le **déclencher**.
 *
 * Deux familles cohabitent :
 *   • entrées **documentaires** (team · méthode · kit · workflow) → le chrome appelle `requestNew()`
 *     sur le `useForgeDocument` actif (chemin historique, inchangé) ;
 *   • **réservoirs** (persona · éléments, via `ElementReservoir`) → l'écran enregistre ici le **même**
 *     geste que son New interne (mode ✚ création) ; le chrome le déclenche à l'identique.
 *
 * Les entrées **sans création** (frame · assemblage · models · apprentissage) n'enregistrent rien :
 * le handler reste `null`, le New du chrome reste **honnêtement désactivé** (titre clair).
 */
import { createContext, useContext, useEffect } from "react";

/** Geste de création de l'écran actif (ou `null` = aucun geste enregistré). */
export type CreateHandler = (() => void) | null;

export interface ForgeCreateApi {
  /** Enregistre (fonction) ou retire (`null`) le geste de création de l'écran actif. */
  setCreateHandler: (fn: CreateHandler) => void;
}

/** Contexte optionnel : `null` hors ForgeShell (ex. tests d'unité d'un réservoir isolé). */
export const ForgeCreateContext = createContext<ForgeCreateApi | null>(null);

/**
 * useRegisterCreate — un écran actif publie son geste de création vers le chrome. No-op hors
 * provider (contexte `null`). Le geste est retiré au démontage (l'écran quitté ne laisse pas un
 * New « fantôme » actif sur l'entrée suivante).
 */
export function useRegisterCreate(startCreate: () => void): void {
  const create = useContext(ForgeCreateContext);
  useEffect(() => {
    if (!create) return;
    create.setCreateHandler(startCreate);
    return () => create.setCreateHandler(null);
  }, [create, startCreate]);
}
