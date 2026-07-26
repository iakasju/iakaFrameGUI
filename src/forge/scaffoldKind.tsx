/**
 * scaffoldKind — le **scaffold en tant que pool authorable** de l'hôte générique `ElementReservoir`
 * (chantier #3 Lot 2). Clone du pilote `principleKind` adapté aux champs réels de `Scaffold`, branché
 * **sans toucher l'hôte** ni FeanorHead. Le champ riche `entries` est simplifié au MVP (cf.
 * `ScaffoldEditor`, simplification remontée).
 *
 * Source (Lot 5b) = `frame.scaffolds`, les `.md` RÉELS dérivés du disque (via `loadElements`) ;
 * `CATALOG_SCAFFOLDS` (`fallback`) reste le repli hors-ligne. Édition (le seul champ éditable au MVP
 * est `level` ; `entries` préservées à l'octet) persistée sur disque (`persistScaffold` → `poolWrite`,
 * patch non-destructif). AUCUN contrat cœur touché.
 */
import { type Scaffold } from "@iakaframe/core";
import {
  buildScaffoldReservoir,
  cloneScaffoldCatalog,
  scaffoldToAuthoredEntity,
  SCAFFOLD_BLANK_ENTITY,
  SCAFFOLD_TYPE_LABEL,
} from "./scaffoldCards";
import type { ElementKind } from "./elementKind";
import { ScaffoldEditor } from "../components/ScaffoldEditor";
import { resolveScaffoldProposition } from "./scaffoldProposition";

/** Scaffold **vierge** complet (brique B) — base de fusion en création (miroir de l'`EMPTY` de l'éditeur). */
function blankScaffold(): Scaffold {
  return { id: "", level: "project", entries: [], nonDestructive: true };
}

/** Le pool **scaffold** de l'hôte générique (Lot 2). */
export const scaffoldKind: ElementKind<Scaffold> = {
  type: "scaffold",
  typeLabel: SCAFFOLD_TYPE_LABEL,
  scopeClass: "scaffold-reservoir",
  crumbCollection: "scaffolds",
  crumb: "LIBRARY / SCAFFOLDS",
  title: "Le réservoir de scaffolds",
  subtitle: (
    <>
      Les <strong>échafaudages de dossiers</strong> qu'un projet reçoit — chaque scaffold est un{" "}
      <code>{"{ id · level · entries[] }"}</code>, matérialisé (jamais destructif) par le rituel{" "}
      <code>init</code>. Ouvrez une fiche pour l'éditer. Source : les <code>.md</code> réels du
      réservoir (persistés sur disque).
    </>
  ),
  sectionLabel: "Scaffolds",
  sectionMeta: (n) => `— le catalogue · ${n}`,
  newButtonLabel: "Nouveau scaffold",
  idOf: (s) => s.id,
  buildCards: buildScaffoldReservoir,
  toAuthoredEntity: scaffoldToAuthoredEntity,
  blankEntity: SCAFFOLD_BLANK_ENTITY,
  fallback: cloneScaffoldCatalog,
  Editor: ({ element, existingIds, onSubmit, onCancel }) => (
    <ScaffoldEditor
      element={element}
      existingIds={existingIds}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  ),
  // Brique B : Fëanor propose les champs éditables (level/entries) — `id`/`nonDestructive` jamais
  // proposés (C-1/invariant). Repli honnête `null`+`reason` ; écriture inchangée (`persistScaffold`).
  proposeElement: resolveScaffoldProposition,
  blankElement: blankScaffold,
};
