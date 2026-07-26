/**
 * frameCards — dérivation **pure** des « cartes de frames » de la galerie `models`
 * (Lot 4, alignement-gui-modele-de-frame.md § A4, Fork D). AUCUN I/O, AUCUN contrat touché :
 * on **consomme** le réservoir de frames déjà exposé par le cœur (`frame.frames`,
 * `FrameDescriptor[]`) + l'id de la frame **active** (`frame.assembly.frame`) et on projette
 * un view-model prêt à rendre par `FramesGallery`. Pure **addition** au-dessus du modèle de
 * données (invariant de parité § 3.2) — même geste que `personaCards.ts` (Lot 3).
 *
 * La **vignette** est un rendu GUI dérivé des champs EXISTANTS (initiales du nom + dégradé casté
 * par la position dans la galerie, via `casting.ts`) — jamais un asset canon neuf ni une table
 * synthétique. La carte ne montre que ce que le descripteur déclare (id/name/version/methodId/teamId
 * + le drapeau `default`), plus le marqueur « actif » dérivé de l'assemblage résolu.
 */
import type { Frame, FrameDescriptor } from "@iakaframe/core";
import { vignetteGradient, initialsOf } from "./casting";

/** Un frame du réservoir projeté en carte de galerie (tout dérivé des descripteurs canon). */
export interface FrameCardVM {
  /** Slug stable (id de `frames/`). */
  id: string;
  /** Nom libre affiché. */
  name: string;
  /** Version déclarée par le descripteur. */
  version: string;
  /** Id de la méthode assemblée (frère « discipline »). */
  methodId: string;
  /** Id de la team assemblée (frère « casting »). */
  teamId: string;
  /** `default: true` — la frame héritée / le repli du réservoir. */
  isDefault: boolean;
  /** La frame **active** (pivot de l'assemblage résolu) — distinguée dans la galerie. */
  isActive: boolean;
  /** Initiales (2 lettres) — le texte de la vignette. */
  initials: string;
  /** Couple de couleurs du dégradé de la vignette (rendu GUI, pas un asset canon). */
  gradient: [string, string];
}

/**
 * Projette UN descripteur en carte (déterministe, borné). Le dégradé est casté par la **position**
 * dans la galerie (variété visuelle stable), l'`active` est vrai quand l'id vaut l'id actif fourni.
 */
export function buildFrameCard(
  f: FrameDescriptor,
  index: number,
  activeId: string | null,
): FrameCardVM {
  return {
    id: f.id,
    name: f.name,
    version: f.version,
    methodId: f.methodId,
    teamId: f.teamId,
    isDefault: f.default,
    isActive: activeId != null && f.id === activeId,
    initials: initialsOf(f.name || f.id),
    gradient: vignetteGradient(index),
  };
}

/** Projette la galerie complète (l'ordre de chargement du réservoir est conservé). */
export function buildFramesGallery(
  frames: readonly FrameDescriptor[],
  activeId: string | null,
): FrameCardVM[] {
  return frames.map((f, i) => buildFrameCard(f, i, activeId));
}

/**
 * Sélectionne le réservoir de frames + l'id de la frame active depuis un `Frame` chargé (AR-1 :
 * `frame.frames` liste les descripteurs, `frame.assembly.frame` désigne l'active — résolue par le
 * cœur via le pointeur projet, sinon la frame `default`, sinon la première). Aucun contrat touché.
 */
export function galleryFromFrame(frame: Frame): {
  frames: FrameDescriptor[];
  activeId: string | null;
} {
  return { frames: frame.frames, activeId: frame.assembly.frame?.id ?? null };
}
