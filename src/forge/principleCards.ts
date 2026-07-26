/**
 * principleCards — dérivation **pure** des fiches à vignettes du pool **principe** (chantier #3
 * Lot 1, extension-feanor-en-tete-pages-elements.md § 4.3), sœur de `personaCards`. AUCUN I/O,
 * AUCUN contrat touché : on **consomme** le catalogue canonique vendoré `CATALOG_PRINCIPLES`
 * (`{id,label,policy,trigger}`) et on projette le view-model de fiche **unifié** de l'hôte
 * générique. Pure addition `src/` au-dessus du contrat (parité drift 0 par construction).
 *
 * Honnêteté (§ 8) : la source est le **catalogue canonique étiqueté comme tel** (repli de session),
 * jamais une donnée fabriquée — miroir exact du repli `cloneCanonicalRoster()` de la persona. La
 * vignette (initiales + dégradé) est un rendu GUI dérivé des champs existants ; le principe n'a pas
 * de « rôle », donc sa teinte est castée par un **hash déterministe de l'id** (couleur, pas rôle).
 */
import { CATALOG_PRINCIPLES, type Principle } from "@iakaframe/core";
import { vignetteGradient, initialsOf } from "./casting";
import type { AuthoredEntity } from "./feanorHeadModel";
import type { ElementCardVM } from "./elementKind";

/** Le type FR affiché du pool. */
export const PRINCIPLE_TYPE_LABEL = "principe";

/**
 * Teinte de vignette d'un principe — hash **déterministe** de l'id vers un index de casting (0..8).
 * C'est un choix de **couleur** (rendu GUI), pas un rôle : un principe n'a pas de `roleIndex` canon.
 */
export function principleTint(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 9;
}

/** Projette UN principe en fiche à vignette (déterministe, borné). */
export function buildPrincipleCard(p: Principle): ElementCardVM {
  const tint = principleTint(p.id);
  return {
    id: p.id,
    name: p.label,
    initials: initialsOf(p.label),
    gradient: vignetteGradient(tint),
    pastille: null,
    royaume: null,
    ref: p.id,
    roleLabel: null,
    roleIndex: tint,
    summary: p.policy && p.policy.length > 0 ? p.policy : null,
    chips:
      p.trigger && p.trigger.length > 0
        ? [{ key: `trig-${p.id}`, text: `⟶ ${p.trigger}`, kind: "meta" as const }]
        : [],
    emptyChipsLabel: "aucun déclencheur déclaré",
  };
}

/** Projette le pool de principes complet (l'ordre d'entrée est conservé). */
export function buildPrincipleReservoir(principles: readonly Principle[]): ElementCardVM[] {
  return principles.map(buildPrincipleCard);
}

/** Repli hors-ligne / source de session du pool : le catalogue canonique (copie éditable). */
export function clonePrincipleCatalog(): Principle[] {
  return CATALOG_PRINCIPLES.map((p) => ({ ...p }));
}

/** Adapte un principe vers l'entité générique de Fëanor-en-tête (édition). */
export function principleToAuthoredEntity(p: Principle): AuthoredEntity {
  return {
    type: "principle",
    typeLabel: PRINCIPLE_TYPE_LABEL,
    newLabel: "Nouveau principe",
    name: p.label,
    key: null,
    roleIndex: principleTint(p.id),
    pastille: null,
  };
}

/** Descripteur de **création vierge** d'un principe (name vide → placeholder « Nouveau principe »). */
export const PRINCIPLE_BLANK_ENTITY: AuthoredEntity = {
  type: "principle",
  typeLabel: PRINCIPLE_TYPE_LABEL,
  newLabel: "Nouveau principe",
  name: "",
  key: null,
  roleIndex: 2,
  pastille: null,
};
