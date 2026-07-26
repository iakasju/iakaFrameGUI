/**
 * principleKind — le **principe en tant que pool authorable** de l'hôte générique `ElementReservoir`
 * (chantier #3 Lot 1, pilote de la factorisation, extension-feanor-en-tete-pages-elements.md § 4.3).
 * C'est la **preuve du patron sur un 2ᵉ type** : le même hôte, le même Fëanor-en-tête (agnostique),
 * mais un `buildCards` + un `Editor` + un `toAuthoredEntity` propres au principe — écrits une fois,
 * branchés sans toucher l'hôte. Un lot suivant clonera exactement ce fichier pour skill/rituel/…
 *
 * Source (Lot 5b) = `frame.principles`, les `.md` RÉELS dérivés du disque (via `loadElements`) ;
 * `CATALOG_PRINCIPLES` (`fallback`) reste le repli hors-ligne. Édition/création persistées sur disque
 * (`persistPrinciple` → `poolWrite`, patch non-destructif). AUCUN contrat cœur touché.
 */
import { type Principle } from "@iakaframe/core";
import {
  buildPrincipleReservoir,
  clonePrincipleCatalog,
  principleToAuthoredEntity,
  PRINCIPLE_BLANK_ENTITY,
  PRINCIPLE_TYPE_LABEL,
} from "./principleCards";
import type { ElementKind } from "./elementKind";
import { PrincipleEditor } from "../components/PrincipleEditor";

/** Le pool **principe** de l'hôte générique (pilote du Lot 1). */
export const principleKind: ElementKind<Principle> = {
  type: "principle",
  typeLabel: PRINCIPLE_TYPE_LABEL,
  scopeClass: "principle-reservoir",
  crumbCollection: "principes",
  crumb: "LIBRARY / PRINCIPES",
  title: "Le réservoir de principes",
  subtitle: (
    <>
      Les <strong>politiques de la méthode</strong> — chaque principe est une règle{" "}
      <code>{"{ label · policy · trigger }"}</code>, référencée (jamais copiée) par les méthodes.
      Ouvrez une fiche pour l'éditer. Source : les <code>.md</code> réels du réservoir (persistés sur
      disque).
    </>
  ),
  sectionLabel: "Principes",
  sectionMeta: (n) => `— le catalogue · ${n}`,
  newButtonLabel: "Nouveau principe",
  idOf: (p) => p.id,
  buildCards: buildPrincipleReservoir,
  toAuthoredEntity: principleToAuthoredEntity,
  blankEntity: PRINCIPLE_BLANK_ENTITY,
  fallback: clonePrincipleCatalog,
  Editor: ({ element, existingIds, onSubmit, onCancel }) => (
    <PrincipleEditor
      element={element}
      existingIds={existingIds}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  ),
};
