/**
 * ritualKind — le **rituel en tant que pool authorable** de l'hôte générique `ElementReservoir`
 * (chantier #3 Lot 2). Clone du pilote `principleKind` adapté aux champs réels de `Ritual`, branché
 * **sans toucher l'hôte** ni FeanorHead.
 *
 * Source (Lot 5b) = `frame.rituals`, les `.md` RÉELS dérivés du disque (via `loadElements`) ;
 * `CATALOG_RITUALS` (`fallback`) reste le repli hors-ligne. Édition/création persistées sur disque
 * (`persistRitual` → `poolWrite`, patch non-destructif). AUCUN contrat cœur touché.
 */
import { type Ritual } from "@iakaframe/core";
import {
  buildRitualReservoir,
  cloneRitualCatalog,
  ritualToAuthoredEntity,
  RITUAL_BLANK_ENTITY,
  RITUAL_TYPE_LABEL,
} from "./ritualCards";
import type { ElementKind } from "./elementKind";
import { RitualEditor } from "../components/RitualEditor";

/** Le pool **rituel** de l'hôte générique (Lot 2). */
export const ritualKind: ElementKind<Ritual> = {
  type: "ritual",
  typeLabel: RITUAL_TYPE_LABEL,
  scopeClass: "ritual-reservoir",
  crumbCollection: "rituels",
  crumb: "LIBRARY / RITUELS",
  title: "Le réservoir de rituels",
  subtitle: (
    <>
      Les <strong>gestes outillés</strong> de la méthode — chaque rituel est un{" "}
      <code>{"{ label · triggers · actions · side }"}</code>, tranché <code>forge</code> ou{" "}
      <code>cockpit</code>. Ouvrez une fiche pour l'éditer. Source : les <code>.md</code> réels du
      réservoir (persistés sur disque).
    </>
  ),
  sectionLabel: "Rituels",
  sectionMeta: (n) => `— le catalogue · ${n}`,
  newButtonLabel: "Nouveau rituel",
  idOf: (r) => r.id,
  buildCards: buildRitualReservoir,
  toAuthoredEntity: ritualToAuthoredEntity,
  blankEntity: RITUAL_BLANK_ENTITY,
  fallback: cloneRitualCatalog,
  Editor: ({ element, existingIds, onSubmit, onCancel }) => (
    <RitualEditor element={element} existingIds={existingIds} onSubmit={onSubmit} onCancel={onCancel} />
  ),
};
