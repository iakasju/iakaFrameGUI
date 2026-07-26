/**
 * personaCards — dérivation **pure** des « fiches à vignettes » du réservoir de personas
 * (Lot 3, alignement-gui-modele-de-frame.md § A3). AUCUN I/O, AUCUN contrat touché : on
 * **consomme** les personas vendorées (`CANONICAL_ROSTER` du cœur = les 9 personas canoniques)
 * et on projette un view-model prêt à rendre par `PersonaReservoir`. Pure **addition** au-dessus
 * du modèle de données (invariant de parité § 3.2) — même geste que `assemblyModel.ts` (Lot 1).
 *
 * La **vignette** est un rendu GUI dérivé des champs EXISTANTS (initiales du nom + dégradé casté
 * par `roleIndex`, via `casting.ts`) — jamais un asset canon neuf (chemin MVP GUI-only imposé par
 * la règle cross-repo). Aucun champ absent du frontmatter persona (mission/description/avatar)
 * n'est fabriqué ici : la carte ne montre que ce que la persona déclare.
 */
import { personaBadge, roleLabel, type Persona } from "@iakaframe/core";
import { vignetteGradient, initialsOf } from "./casting";

/** Une persona projetée en fiche à vignette (tout dérivé des champs canon existants). */
export interface PersonaCardVM {
  /** Slug stable (id de `library/personas/`). */
  id: string;
  /** Nom libre affiché. */
  name: string;
  /** Pastille `[ROYAUME][Nom]` (badge canonique dérivé). */
  badge: string;
  /** Royaume MAJUSCULE (coin de la fiche). */
  royaume: string;
  /** Clé de rôle canonique castée. */
  roleKey: string;
  /** Libellé d'affichage du rôle (jamais un nom de code). */
  roleLabel: string;
  /** Index de casting (0..8) — pioche la teinte de la vignette. */
  roleIndex: number;
  /** Initiales (2 lettres) — le texte de la vignette. */
  initials: string;
  /** Couple de couleurs du dégradé de la vignette (rendu GUI, pas un asset canon). */
  gradient: [string, string];
  /** Emoji de pastille SI la persona le déclare (sinon `null` — jamais fabriqué). */
  pastille: string | null;
  /** Ids de skills déclarées. */
  skills: string[];
  /** Ids de gardes-fous déclarés. */
  guardrails: string[];
}

/** Projette UNE persona en fiche à vignette (déterministe, borné). */
export function buildPersonaCard(p: Persona): PersonaCardVM {
  return {
    id: p.id,
    name: p.name,
    badge: personaBadge(p),
    royaume: (p.royaume || "").toUpperCase(),
    roleKey: p.roleKey,
    roleLabel: roleLabel(p.roleKey),
    roleIndex: p.roleIndex,
    initials: initialsOf(p.name),
    gradient: vignetteGradient(p.roleIndex),
    pastille: p.pastille && p.pastille.length > 0 ? p.pastille : null,
    skills: [...p.skills],
    guardrails: [...p.guardrails],
  };
}

/** Projette le réservoir complet (l'ordre d'entrée est conservé). */
export function buildPersonaReservoir(personas: readonly Persona[]): PersonaCardVM[] {
  return personas.map(buildPersonaCard);
}
