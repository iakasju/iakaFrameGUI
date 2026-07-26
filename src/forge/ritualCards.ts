/**
 * ritualCards — dérivation **pure** des fiches à vignettes du pool **rituel** (chantier #3 Lot 2),
 * clone de `principleCards` adapté aux champs réels de `Ritual`. AUCUN I/O, AUCUN contrat touché :
 * on **consomme** le catalogue canonique vendoré `CATALOG_RITUALS`
 * (`{id, label, triggers[], actions[], side}`) et on projette le view-model de fiche unifié.
 *
 * Honnêteté (§ 8) : source = catalogue canonique **étiqueté** (repli de session). La `side` réelle
 * (`forge`|`cockpit`) caste la teinte (forge → flamme, cockpit → vert de run) — couleur dérivée d'un
 * champ réel, jamais fabriquée. Les déclencheurs deviennent des puces méta (jamais un rôle/royaume).
 */
import { CATALOG_RITUALS, type Ritual, type RitualSide } from "@iakaframe/core";
import { vignetteGradient, initialsOf } from "./casting";
import type { AuthoredEntity } from "./feanorHeadModel";
import type { ElementCardVM } from "./elementKind";

/** Le type FR affiché du pool. */
export const RITUAL_TYPE_LABEL = "rituel";

/**
 * Teinte de vignette d'un rituel, castée par sa **tranche réelle** : `forge` (fabrication) → flamme
 * (index 8), `cockpit` (run) → vert de coordination (index 1). Couleur dérivée d'un champ canon.
 */
export function ritualTint(side: RitualSide): number {
  return side === "forge" ? 8 : 1;
}

/** Projette UN rituel en fiche à vignette (déterministe, castée par sa tranche). */
export function buildRitualCard(r: Ritual): ElementCardVM {
  const tint = ritualTint(r.side);
  const triggerChips = r.triggers.map((t, i) => ({
    key: `trig-${r.id}-${i}`,
    text: `⟶ ${t}`,
    kind: "meta" as const,
  }));
  return {
    id: r.id,
    name: r.label,
    initials: initialsOf(r.label),
    gradient: vignetteGradient(tint),
    pastille: null,
    royaume: null,
    ref: r.id,
    roleLabel: null,
    roleIndex: tint,
    // Résumé = la tranche + la première action (que du déclaré ; null si aucune action).
    summary: r.actions.length > 0 ? `[${r.side}] ${r.actions[0]}` : `[${r.side}]`,
    chips: triggerChips,
    emptyChipsLabel: "aucun déclencheur déclaré",
  };
}

/** Projette le pool de rituels complet (l'ordre d'entrée est conservé). */
export function buildRitualReservoir(rituals: readonly Ritual[]): ElementCardVM[] {
  return rituals.map(buildRitualCard);
}

/** Repli hors-ligne / source de session du pool : le catalogue canonique (copie éditable profonde). */
export function cloneRitualCatalog(): Ritual[] {
  return CATALOG_RITUALS.map((r) => ({
    ...r,
    triggers: [...r.triggers],
    actions: [...r.actions],
  }));
}

/** Adapte un rituel vers l'entité générique de Fëanor-en-tête (édition). */
export function ritualToAuthoredEntity(r: Ritual): AuthoredEntity {
  return {
    type: "ritual",
    typeLabel: RITUAL_TYPE_LABEL,
    newLabel: "Nouveau rituel",
    name: r.label,
    key: r.side,
    roleIndex: ritualTint(r.side),
    pastille: null,
  };
}

/** Descripteur de **création vierge** d'un rituel (name vide → placeholder « Nouveau rituel »). */
export const RITUAL_BLANK_ENTITY: AuthoredEntity = {
  type: "ritual",
  typeLabel: RITUAL_TYPE_LABEL,
  newLabel: "Nouveau rituel",
  name: "",
  key: "cockpit",
  roleIndex: 1,
  pastille: null,
};
