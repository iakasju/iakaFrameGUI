/**
 * feanorHead — dérivations **pures** du composant **Fëanor-en-tête** (Lot 6,
 * alignement-gui-modele-de-frame.md § A6, Fork C ; **généralisé** au chantier #3 Lot 1,
 * extension-feanor-en-tete-pages-elements.md § 4.1). AUCUN I/O, AUCUN contrat touché : on
 * **consomme** les personas vendorées (`CANONICAL_ROSTER`) + les champs canon existants, et on
 * projette deux petits view-models prêts à rendre par `FeanorHead`. Pure **addition** au-dessus du
 * modèle de données (invariant de parité § 3.2) — même geste que `personaCards.ts` (Lot 3).
 *
 * **Décoinçage de `Persona` (Lot 1, § 4.1).** `buildEntityVignette` ne consomme plus une `Persona`
 * mais un **descripteur d'entité générique** (`AuthoredEntity`) — pour que N'IMPORTE quel pool
 * (persona, principe, …) alimente Fëanor-en-tête. La persona reste un **cas** de l'entité générique
 * via l'adaptateur `personaToAuthoredEntity` (aucune régression : mêmes initiales/dégradé/pastille).
 *
 * La vignette de Fëanor lui-même dérive du **9ᵉ persona réel** (rôle `frame`, index 8 →
 * flamme/braise via `casting.ts`), jamais d'un asset canon neuf.
 */
import { CANONICAL_ROSTER, type Persona } from "@iakaframe/core";
import { vignetteGradient, initialsOf } from "./casting";

/**
 * **Descripteur d'entité générique** consommé par `FeanorHead` à la place de `Persona` (§ 4.1).
 * N'importe quel pool projette son élément en cours d'authoring vers cette forme, sans que
 * `FeanorHead`/`feanorHeadModel` ne connaissent le type concret. Aucune identité fabriquée : les
 * champs absents (pastille, clé secondaire) sont `null`, jamais inventés.
 */
export interface AuthoredEntity {
  /** Le pool/type de l'élément : "persona" | "principle" | "skill" | … (passé tel quel au LLM). */
  type: string;
  /** Libellé FR affiché sous la vignette ("persona", "principe", …). */
  typeLabel: string;
  /** Nom du placeholder honnête en création vierge, genré ("Nouvelle persona", "Nouveau principe"). */
  newLabel: string;
  /** Nom/id affiché de l'élément ; **vide** en création vierge (placeholder). */
  name: string;
  /** Clé secondaire de contexte (roleKey d'une persona, `null` sinon) — passée au LLM comme `role`. */
  key: string | null;
  /** Index de casting (0..8) pour la teinte de la vignette (défaut stable si le type n'en a pas). */
  roleIndex: number;
  /** Emoji de pastille SI l'entité le déclare, sinon `null` — jamais fabriqué. */
  pastille: string | null;
}

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
 * Vignette de l'entité en cours d'authoring, **agnostique du type** (§ 4.1) : un élément nommé (mode
 * édition) rend ses propres initiales/dégradé/pastille et son `typeLabel` ; un élément non nommé
 * (création vierge) rend un **placeholder honnête** (son `newLabel` genré, dégradé neutre) — jamais
 * une fausse identité. Un descripteur `null` (défensif) retombe sur un placeholder d'« élément ».
 */
export function buildEntityVignette(entity: AuthoredEntity | null): EntityVignetteVM {
  if (entity && entity.name.trim().length > 0) {
    return {
      initials: initialsOf(entity.name),
      gradient: vignetteGradient(entity.roleIndex),
      name: entity.name,
      pastille: entity.pastille && entity.pastille.length > 0 ? entity.pastille : null,
      typeLabel: entity.typeLabel,
      placeholder: false,
    };
  }
  return {
    initials: "＋",
    gradient: NEUTRAL_GRADIENT,
    name: entity ? entity.newLabel : "Nouvel élément",
    pastille: null,
    typeLabel: entity ? entity.typeLabel : "élément",
    placeholder: true,
  };
}

/**
 * Adaptateur **persona → entité générique** (§ 4.1) : la persona reste un cas de `AuthoredEntity`,
 * sans régression (mêmes initiales/dégradé/pastille et `role` = `roleKey` dans le contexte LLM).
 */
export function personaToAuthoredEntity(p: Persona): AuthoredEntity {
  return {
    type: "persona",
    typeLabel: "persona",
    newLabel: "Nouvelle persona",
    name: p.name,
    key: p.roleKey,
    roleIndex: p.roleIndex,
    pastille: p.pastille && p.pastille.length > 0 ? p.pastille : null,
  };
}

/** Descripteur de **création vierge** d'une persona (name vide → placeholder « Nouvelle persona »). */
export const PERSONA_BLANK_ENTITY: AuthoredEntity = {
  type: "persona",
  typeLabel: "persona",
  newLabel: "Nouvelle persona",
  name: "",
  key: null,
  roleIndex: 0,
  pastille: null,
};
