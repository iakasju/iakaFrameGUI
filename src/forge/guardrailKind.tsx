/**
 * guardrailKind — le **garde-fou en tant que pool authorable** de l'hôte générique `ElementReservoir`
 * (chantier #3 Lot 2). Clone du pilote `principleKind` adapté aux champs réels de `Guardrail`, branché
 * **sans toucher l'hôte** ni FeanorHead. Le champ riche `rendering` est simplifié au MVP (cf.
 * `GuardrailEditor`, simplification remontée).
 *
 * Source = catalogue canonique vendoré `CATALOG_GUARDRAILS` (étiqueté, honnête) ; édition **persistée
 * sur disque** via `persistGuardrail` (Lot 5c, câblé par `ElementsAuthoring`). AUCUN contrat cœur
 * touché. Lot B (chantier #4) fait : `policy` **éditable** (`guardrailFrontmatterPatch` élargi),
 * `kind` **verrouillé** (load-bearing) et le contrôle fantôme `scope` **retiré** dans `GuardrailEditor`.
 */
import { type Guardrail } from "@iakaframe/core";
import {
  buildGuardrailReservoir,
  cloneGuardrailCatalog,
  guardrailToAuthoredEntity,
  GUARDRAIL_BLANK_ENTITY,
  GUARDRAIL_TYPE_LABEL,
} from "./guardrailCards";
import type { ElementKind } from "./elementKind";
import { GuardrailEditor } from "../components/GuardrailEditor";

/** Le pool **garde-fou** de l'hôte générique (Lot 2). */
export const guardrailKind: ElementKind<Guardrail> = {
  type: "guardrail",
  typeLabel: GUARDRAIL_TYPE_LABEL,
  scopeClass: "guardrail-reservoir",
  crumbCollection: "gardes-fous",
  crumb: "LIBRARY / GARDES-FOUS",
  title: "Le réservoir de gardes-fous",
  subtitle: (
    <>
      Les <strong>contraintes de discipline</strong> de la méthode — chaque garde-fou est un{" "}
      <code>{"{ label · kind · scope }"}</code> (identité, périmètre, délégation…). Ouvrez une fiche
      pour l'éditer. Source : le catalogue canonique (édition locale de session).
    </>
  ),
  sectionLabel: "Gardes-fous",
  sectionMeta: (n) => `— le catalogue · ${n}`,
  newButtonLabel: "Nouveau garde-fou",
  idOf: (g) => g.id,
  buildCards: buildGuardrailReservoir,
  toAuthoredEntity: guardrailToAuthoredEntity,
  blankEntity: GUARDRAIL_BLANK_ENTITY,
  fallback: cloneGuardrailCatalog,
  Editor: ({ element, existingIds, onSubmit, onCancel }) => (
    <GuardrailEditor
      element={element}
      existingIds={existingIds}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  ),
};
