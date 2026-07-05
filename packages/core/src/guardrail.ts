/**
 * guardrail.ts — le **garde-fou** (concept de 1re classe, AR-8) — cœur partagé 🟦.
 *
 * Contrat § 2.5 : une contrainte exécutée qui fait respecter la discipline (canal
 * d'identité, garde de périmètre, délégation, permissions). En P1, le cœur ne porte que
 * l'**intention** (id + kind) ; la génération du mécanisme propre au nœud (hooks
 * `settings.json` + permissions pour Claude Code) est **différée en P3**. Les gardes de
 * méthode existantes (`global/hooks/identity-guard.mjs`, `perimeter-guard.mjs`) sont
 * **référencées** ici comme intentions, **branchées seulement en P3**.
 */

/** Nature d'un garde-fou (intention, agnostique du nœud). */
export type GuardrailKind =
  | "identity"
  | "perimeter"
  | "delegation"
  | "permission"
  | "custom";

/** Portée d'application d'un garde-fou. */
export type GuardrailScope = "team" | "persona" | "role";

/** Déclaration d'un garde-fou (MVP = intention ; mécanisme runner généré en P3). */
export interface Guardrail {
  /** Id stable du garde-fou (ex. "identity-guard"). */
  id: string;
  /** Nature de la contrainte. */
  kind: GuardrailKind;
  /** Libellé lisible (menu d'attribution). */
  label: string;
  /** Portée par défaut (indicatif au MVP). */
  scope: GuardrailScope;
}

/**
 * Catalogue des gardes de méthode connues (référence les hooks existants du dépôt).
 * P1 = **déclaration** uniquement : on attache un id de garde à une persona ; la forge
 * ne génère RIEN à ce stade (AR-6).
 */
export const CATALOG_GUARDRAILS: readonly Guardrail[] = [
  {
    id: "identity-guard",
    kind: "identity",
    label: "Canal d'identité (badges/pastilles)",
    scope: "persona",
  },
  {
    id: "perimeter-guard",
    kind: "perimeter",
    label: "Garde de périmètre",
    scope: "persona",
  },
  {
    id: "delegation-guard",
    kind: "delegation",
    label: "Garde de délégation",
    scope: "team",
  },
] as const;

/** Ids de gardes connues (ordre du catalogue). */
export const CATALOG_GUARDRAIL_IDS: readonly string[] = CATALOG_GUARDRAILS.map(
  (g) => g.id,
);
