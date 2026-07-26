/**
 * scaffoldCards — dérivation **pure** des fiches à vignettes du pool **scaffold** (chantier #3 Lot 2),
 * clone de `principleCards` adapté aux champs réels de `Scaffold`. AUCUN I/O, AUCUN contrat touché :
 * on **consomme** le catalogue canonique vendoré `CATALOG_SCAFFOLDS`
 * (`{id, level, entries[], nonDestructive}`) et on projette le view-model de fiche unifié.
 *
 * PARTICULARITÉ : un scaffold n'a **pas de `label`** — son nom affiché est son `id`. Honnêteté (§ 8) :
 * source = catalogue canonique **étiqueté** (repli de session). Le `level` réel caste la teinte ; les
 * `entries` (chemins) deviennent des puces méta (champs réels, jamais fabriqués).
 */
import { CATALOG_SCAFFOLDS, type Scaffold, type ScaffoldLevel } from "@iakaframe/core";
import { vignetteGradient, initialsOf } from "./casting";
import type { AuthoredEntity } from "./feanorHeadModel";
import type { ElementCardVM } from "./elementKind";

/** Le type FR affiché du pool. */
export const SCAFFOLD_TYPE_LABEL = "scaffold";

/** Teinte de vignette d'un scaffold, castée par son **niveau réel** (couleur dérivée du champ). */
export function scaffoldTint(level: ScaffoldLevel): number {
  return level === "portfolio" ? 0 : 2; // portefeuille → or ; projet → bleu
}

/** Projette UN scaffold en fiche à vignette (déterministe, casté par son niveau). */
export function buildScaffoldCard(s: Scaffold): ElementCardVM {
  const tint = scaffoldTint(s.level);
  return {
    id: s.id,
    name: s.id,
    initials: initialsOf(s.id),
    gradient: vignetteGradient(tint),
    pastille: null,
    royaume: null,
    ref: s.id,
    roleLabel: null,
    roleIndex: tint,
    summary: `${s.level} · ${s.entries.length} entrée${s.entries.length > 1 ? "s" : ""}`,
    chips: s.entries.map((e, i) => ({
      key: `entry-${s.id}-${i}`,
      text: e.path,
      kind: "meta" as const,
    })),
    emptyChipsLabel: "aucune entrée déclarée",
  };
}

/** Projette le pool de scaffolds complet (l'ordre d'entrée est conservé). */
export function buildScaffoldReservoir(scaffolds: readonly Scaffold[]): ElementCardVM[] {
  return scaffolds.map(buildScaffoldCard);
}

/** Repli hors-ligne / source de session du pool : le catalogue canonique (copie éditable profonde). */
export function cloneScaffoldCatalog(): Scaffold[] {
  return CATALOG_SCAFFOLDS.map((s) => ({
    ...s,
    entries: s.entries.map((e) => ({ ...e })),
  }));
}

/** Adapte un scaffold vers l'entité générique de Fëanor-en-tête (édition). */
export function scaffoldToAuthoredEntity(s: Scaffold): AuthoredEntity {
  return {
    type: "scaffold",
    typeLabel: SCAFFOLD_TYPE_LABEL,
    newLabel: "Nouveau scaffold",
    name: s.id,
    key: s.level,
    roleIndex: scaffoldTint(s.level),
    pastille: null,
  };
}

/** Descripteur de **création vierge** d'un scaffold (name vide → placeholder « Nouveau scaffold »). */
export const SCAFFOLD_BLANK_ENTITY: AuthoredEntity = {
  type: "scaffold",
  typeLabel: SCAFFOLD_TYPE_LABEL,
  newLabel: "Nouveau scaffold",
  name: "",
  key: "project",
  roleIndex: 2,
  pastille: null,
};
