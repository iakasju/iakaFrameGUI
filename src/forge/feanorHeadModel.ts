/**
 * feanorHead — dérivations **pures** du composant **Fëanor-en-tête** (Lot 6,
 * alignement-gui-modele-de-frame.md § A6, Fork C). AUCUN I/O, AUCUN contrat touché : on
 * **consomme** les personas vendorées (`CANONICAL_ROSTER`) + les champs canon existants, et on
 * projette deux petits view-models prêts à rendre par `FeanorHead`. Pure **addition** au-dessus du
 * modèle de données (invariant de parité § 3.2) — même geste que `personaCards.ts` (Lot 3).
 *
 * ⚠️ **COQUILLE MVP — aucune IA branchée.** Ces helpers ne portent QUE le rendu (vignettes,
 * initiales, dégradés). Le compagnon Fëanor **fonctionnel (LLM) est un chantier SÉPARÉ** (Fork C) —
 * rien ici n'appelle ni ne simule un modèle. La vignette de Fëanor dérive du **9ᵉ persona réel**
 * (rôle `frame`, index 8 → flamme/braise via `casting.ts`), jamais d'un asset canon neuf.
 */
import { CANONICAL_ROSTER, type Persona } from "@iakaframe/core";
import { vignetteGradient, initialsOf } from "./casting";

/** Clé de rôle du 9ᵉ persona (Fëanor, constructeur de frame). */
export const FEANOR_ROLE_KEY = "frame";

/** Dégradé neutre (grisé) pour l'entité encore **non nommée** en mode création (placeholder honnête). */
const NEUTRAL_GRADIENT: [string, string] = ["#c9ccd4", "#9aa0ad"];

/** La vignette de **Fëanor lui-même** (dérivée du persona réel du rôle `frame`). */
export interface FeanorVignetteVM {
  /** Nom affiché (« Fëanor »). */
  name: string;
  /** Initiales (« FË ») — le texte du badge flamme. */
  initials: string;
  /** Couple de couleurs du dégradé (flamme/braise, index 8). */
  gradient: [string, string];
  /** Royaume MAJUSCULE (« FRAME »). */
  royaume: string;
  /** Emoji de pastille SI le persona le déclare (« 🟠 »), sinon `null` — jamais fabriqué. */
  pastille: string | null;
}

/** La vignette de **l'entité en cours d'authoring** (édition = persona réelle ; création = placeholder). */
export interface EntityVignetteVM {
  /** Initiales de la vignette (repli « ＋ » en création vierge). */
  initials: string;
  /** Couple de couleurs du dégradé (casté par `roleIndex`, ou neutre en création vierge). */
  gradient: [string, string];
  /** Nom affiché (« Nouvelle persona » si vierge). */
  name: string;
  /** Emoji de pastille SI l'entité le déclare, sinon `null` — jamais fabriqué. */
  pastille: string | null;
  /** Libellé de type (« persona »). */
  typeLabel: string;
  /** `true` tant que l'entité n'est pas encore nommée (création vierge). */
  placeholder: boolean;
}

/**
 * Vignette de Fëanor, dérivée du **persona réel** du rôle `frame` dans `source` (les personas
 * réelles du frame chargé, avec leur pastille/royaume) — repli sur `CANONICAL_ROSTER` si absent
 * (hors-ligne). Ne fabrique jamais de pastille : `null` si le persona ne la déclare pas.
 */
export function buildFeanorVignette(
  source: readonly Persona[] = CANONICAL_ROSTER,
): FeanorVignetteVM {
  const feanor =
    source.find((p) => p.roleKey === FEANOR_ROLE_KEY) ??
    CANONICAL_ROSTER.find((p) => p.roleKey === FEANOR_ROLE_KEY)!;
  return {
    name: feanor.name,
    initials: initialsOf(feanor.name),
    gradient: vignetteGradient(feanor.roleIndex),
    royaume: (feanor.royaume || "").toUpperCase(),
    pastille: feanor.pastille && feanor.pastille.length > 0 ? feanor.pastille : null,
  };
}

/**
 * Vignette de l'entité en cours d'authoring : une persona réelle (mode édition) rend ses propres
 * initiales/dégradé/pastille ; une entité `null` ou non nommée (mode création vierge) rend un
 * **placeholder honnête** (« Nouvelle persona », dégradé neutre) — jamais une fausse identité.
 */
export function buildEntityVignette(entity: Persona | null): EntityVignetteVM {
  if (entity && entity.name.trim().length > 0) {
    return {
      initials: initialsOf(entity.name),
      gradient: vignetteGradient(entity.roleIndex),
      name: entity.name,
      pastille: entity.pastille && entity.pastille.length > 0 ? entity.pastille : null,
      typeLabel: "persona",
      placeholder: false,
    };
  }
  return {
    initials: "＋",
    gradient: NEUTRAL_GRADIENT,
    name: "Nouvelle persona",
    pastille: null,
    typeLabel: "persona",
    placeholder: true,
  };
}
