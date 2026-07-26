/**
 * PersonaReservoir — l'écran **réservoir de personas** de 1er ordre (Lot 3,
 * alignement-gui-modele-de-frame.md § A3). **Rebasculé** sur l'hôte générique `ElementReservoir`
 * (chantier #3 Lot 1, extension-feanor-en-tete-pages-elements.md § 4.2) : ce fichier n'est plus
 * qu'un **adaptateur mince** qui branche le pool `personaKind` et fournit la source (personas
 * réelles du frame). Tout le montage (grille + fiche + ✚/✎ + **Fëanor-en-tête**) vit désormais dans
 * l'hôte, écrit **une seule fois** — plus aucune duplication.
 *
 * DONNÉES (inchangées, AR-2) : la vérité DÉRIVE des `.md` — le réservoir est alimenté par les
 * personas RÉELLES parsées du frame (`frame.personas`, casting de la team active), repli hors-ligne
 * `cloneCanonicalRoster()`. Édition = **état local de session** (MVP, aucune écriture disque).
 */
import { type Persona } from "@iakaframe/core";
import { reservoirPersonasFromFrame } from "./personaCards";
import { loadFrame } from "./frame";
import { ElementReservoir } from "./ElementReservoir";
import { personaKind } from "./personaKind";

/**
 * Source du réservoir : les personas RÉELLES parsées du frame chargé (AR-2). Injectable pour les
 * tests ; par défaut, charge le frame et en dérive le casting de la team active. Repli sur `[]`
 * (jamais d'exception) → l'hôte garde alors le gabarit canonique hors-ligne.
 */
async function defaultLoadReservoir(): Promise<Persona[]> {
  try {
    return reservoirPersonasFromFrame(await loadFrame());
  } catch {
    return [];
  }
}

export function PersonaReservoir({
  loadReservoir = defaultLoadReservoir,
}: {
  /** Chargeur des personas réelles (injectable en test). Défaut : `frame.personas` via `loadFrame`. */
  loadReservoir?: () => Promise<Persona[]>;
} = {}) {
  return <ElementReservoir kind={personaKind} loadElements={loadReservoir} />;
}
