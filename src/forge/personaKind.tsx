/**
 * personaKind — la **persona en tant que pool authorable** de l'hôte générique `ElementReservoir`
 * (chantier #3 Lot 1, extension-feanor-en-tete-pages-elements.md § 4.2). C'est la **preuve de
 * non-régression** : le réservoir de personas (Lot 3) est désormais un simple `ElementKind` branché
 * sur l'hôte commun — même DOM, même éditeur (`PersonaEditor`, réutilisé tel quel), même
 * Fëanor-en-tête, mais le montage n'est plus écrit ici (il vit dans `ElementReservoir`, écrit une
 * seule fois pour tous les types).
 *
 * Réutilise l'existant SANS le réimplémenter : `personaCards` (projection), `PersonaEditor`
 * (éditeur), `personaToAuthoredEntity` (adaptateur Fëanor). AUCUN contrat cœur touché.
 */
import { cloneCanonicalRoster, type Persona } from "@iakaframe/core";
import { buildPersonaReservoir } from "./personaCards";
import { personaToAuthoredEntity, PERSONA_BLANK_ENTITY } from "./feanorHeadModel";
import type { ElementCardVM, ElementKind } from "./elementKind";
import { PersonaEditor } from "../components/PersonaEditor";

/** Projette une persona (via `personaCards`) vers le view-model de fiche **unifié** de l'hôte. */
function personaCards(personas: readonly Persona[]): ElementCardVM[] {
  return buildPersonaReservoir(personas).map((p) => ({
    id: p.id,
    name: p.name,
    initials: p.initials,
    gradient: p.gradient,
    pastille: p.pastille,
    royaume: p.royaume,
    ref: p.badge,
    roleLabel: p.roleLabel,
    roleIndex: p.roleIndex,
    summary: p.mission,
    chips: [
      ...p.skills.map((s) => ({ key: `sk-${s}`, text: s, kind: "sk" as const })),
      ...p.guardrails.map((g) => ({ key: `gd-${g}`, text: g, kind: "gd" as const })),
    ],
    emptyChipsLabel: "aucune skill déclarée",
  }));
}

/** Le pool **persona** de l'hôte générique (cas de référence, prouve la non-régression). */
export const personaKind: ElementKind<Persona> = {
  type: "persona",
  typeLabel: "persona",
  scopeClass: "persona-reservoir",
  crumbCollection: "personas",
  crumb: "LIBRARY / PERSONAS",
  title: "Le réservoir de personas",
  subtitle: (
    <>
      Le <strong>casting du réservoir</strong> — les personas de 1er ordre, réutilisables et
      référencées (jamais copiées) par les teams. Ouvrez une fiche pour l'éditer.
    </>
  ),
  sectionLabel: "Personas",
  sectionMeta: (n) => `— le casting · ${n}`,
  newButtonLabel: "Nouvelle persona",
  idOf: (p) => p.id,
  buildCards: personaCards,
  toAuthoredEntity: personaToAuthoredEntity,
  blankEntity: PERSONA_BLANK_ENTITY,
  fallback: cloneCanonicalRoster,
  feanorSourceFrom: (personas) => personas,
  Editor: ({ element, existingIds, onSubmit, onCancel }) => (
    <PersonaEditor
      persona={element ?? undefined}
      existingIds={existingIds}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  ),
};
