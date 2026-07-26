/**
 * scaffoldKind — le **scaffold en tant que pool authorable** de l'hôte générique `ElementReservoir`
 * (chantier #3 Lot 2). Clone du pilote `principleKind` adapté aux champs réels de `Scaffold`, branché
 * **sans toucher l'hôte** ni FeanorHead. Le champ riche `entries` est simplifié au MVP (cf.
 * `ScaffoldEditor`, simplification remontée).
 *
 * Source = catalogue canonique vendoré `CATALOG_SCAFFOLDS` (étiqueté, honnête) ; édition = état local
 * de session (aucune écriture disque — Lot 5 différé). AUCUN contrat cœur touché.
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
      <code>init</code>. Ouvrez une fiche pour l'éditer. Source : le catalogue canonique (édition
      locale de session).
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
};
