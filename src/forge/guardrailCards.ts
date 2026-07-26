/**
 * guardrailCards — dérivation **pure** des fiches à vignettes du pool **garde-fou** (chantier #3
 * Lot 2), clone de `principleCards` adapté aux champs réels de `Guardrail`. AUCUN I/O, AUCUN contrat
 * touché : on **consomme** le catalogue canonique vendoré `CATALOG_GUARDRAILS`
 * (`{id, kind, label, scope, rendering}`) et on projette le view-model de fiche unifié.
 *
 * Honnêteté (§ 8) : source = catalogue canonique **étiqueté** (repli de session). La `kind` réelle
 * (identity/perimeter/…) caste la teinte ; `kind` + `scope` deviennent des puces méta (champs
 * réels). Les **rendus** (`rendering` hook/prose) sont surfacés en puce d'indication, jamais fabriqués.
 */
import { CATALOG_GUARDRAILS, type Guardrail, type GuardrailKind } from "@iakaframe/core";
import { vignetteGradient, initialsOf } from "./casting";
import type { AuthoredEntity } from "./feanorHeadModel";
import type { ElementCardVM } from "./elementKind";

/** Le type FR affiché du pool. */
export const GUARDRAIL_TYPE_LABEL = "garde-fou";

/** Teinte de vignette d'un garde-fou, castée par sa **nature réelle** (couleur dérivée du champ). */
export function guardrailTint(kind: GuardrailKind): number {
  switch (kind) {
    case "identity":
      return 2; // bleu
    case "perimeter":
      return 3; // rouge
    case "delegation":
      return 1; // vert
    case "permission":
      return 4; // cyan
    default:
      return 6; // violet (custom)
  }
}

/** Projette UN garde-fou en fiche à vignette (déterministe, casté par sa nature). */
export function buildGuardrailCard(g: Guardrail): ElementCardVM {
  const tint = guardrailTint(g.kind);
  const chips: ElementCardVM["chips"] = [
    { key: `kind-${g.id}`, text: `nature · ${g.kind}`, kind: "meta" as const },
    { key: `scope-${g.id}`, text: `portée · ${g.scope}`, kind: "meta" as const },
  ];
  // Rendus disponibles (que du déclaré : hook et/ou prose).
  const rendus: string[] = [];
  if (g.rendering.hook) rendus.push("hook");
  if (g.rendering.prose) rendus.push("prose");
  if (rendus.length > 0) {
    chips.push({ key: `rend-${g.id}`, text: `rendus · ${rendus.join("+")}`, kind: "meta" as const });
  }
  return {
    id: g.id,
    name: g.label,
    initials: initialsOf(g.label),
    gradient: vignetteGradient(tint),
    pastille: null,
    royaume: null,
    ref: g.id,
    roleLabel: null,
    roleIndex: tint,
    summary: null,
    chips,
    emptyChipsLabel: "aucune nature déclarée",
  };
}

/** Projette le pool de gardes-fous complet (l'ordre d'entrée est conservé). */
export function buildGuardrailReservoir(guardrails: readonly Guardrail[]): ElementCardVM[] {
  return guardrails.map(buildGuardrailCard);
}

/** Repli hors-ligne / source de session du pool : le catalogue canonique (copie éditable profonde). */
export function cloneGuardrailCatalog(): Guardrail[] {
  return CATALOG_GUARDRAILS.map((g) => ({
    ...g,
    rendering: {
      ...(g.rendering.hook ? { hook: { ...g.rendering.hook } } : {}),
      ...(g.rendering.prose ? { prose: { ...g.rendering.prose } } : {}),
    },
  }));
}

/** Adapte un garde-fou vers l'entité générique de Fëanor-en-tête (édition). */
export function guardrailToAuthoredEntity(g: Guardrail): AuthoredEntity {
  return {
    type: "guardrail",
    typeLabel: GUARDRAIL_TYPE_LABEL,
    newLabel: "Nouveau garde-fou",
    name: g.label,
    key: g.kind,
    roleIndex: guardrailTint(g.kind),
    pastille: null,
  };
}

/** Descripteur de **création vierge** d'un garde-fou (name vide → placeholder « Nouveau garde-fou »). */
export const GUARDRAIL_BLANK_ENTITY: AuthoredEntity = {
  type: "guardrail",
  typeLabel: GUARDRAIL_TYPE_LABEL,
  newLabel: "Nouveau garde-fou",
  name: "",
  key: "custom",
  roleIndex: 6,
  pastille: null,
};
