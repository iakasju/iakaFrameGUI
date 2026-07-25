/**
 * casting.ts — helpers **purs** de casting visuel (dégradés + initiales), séparés des
 * composants (`Vignette.tsx`) pour garder le fast-refresh propre (un fichier = composants OU
 * fonctions). Déterministe, borné : sert les pastilles `[ROYAUME][Nom]` et vignettes de rail.
 */

/**
 * Palette de dégradés par index de casting (0..8), repli sur le premier.
 *
 * D-E (role-frame-builder.md) : le 9ᵉ rôle `frame` (index 8) DOIT recevoir un couple
 * EXPLICITE et DISTINCT. Sans lui, `8 % 8 = 0` lui donnerait en silence l'or du portefeuille
 * (mode de défaillance décrit § 4.3 de vocabulaire-roles-agnostique.md). Aucune teinte
 * existante (0..7) ne change (invariant § 8). La teinte de `frame` = flamme/braise (Fëanor,
 * forgeur des Silmarils), distincte de l'or (0) et de l'orange documentation (7).
 */
const CASTING_GRADIENTS: readonly [string, string][] = [
  ["#b8862b", "#8a5e12"], // 0 portefeuille — or
  ["#2f7d43", "#1f5c30"], // 1 coordination — vert
  ["#2b5f9e", "#1d4372"], // 2 cadrage — bleu
  ["#b3261e", "#7d1a15"], // 3 dev — rouge
  ["#1f7a6b", "#124a40"], // 4 qualite — cyan
  ["#7a2b2b", "#4f1a1a"], // 5 déploiement — grenat
  ["#7a3b86", "#52285f"], // 6 design — violet
  ["#9a5b17", "#6b3d0f"], // 7 documentation — orange
  ["#c2410c", "#7c2d12"], // 8 frame — flamme/braise (Fëanor)
];

/** Couple de couleurs du dégradé pour un index de casting (déterministe, borné). */
export function vignetteGradient(roleIndex: number): [string, string] {
  const i = Number.isFinite(roleIndex) ? Math.abs(Math.trunc(roleIndex)) : 0;
  return CASTING_GRADIENTS[i % CASTING_GRADIENTS.length];
}

/** Initiales (2 lettres) d'un nom, MAJUSCULE (repli "?"). */
export function initialsOf(name: string): string {
  const clean = (name || "").trim();
  if (clean.length === 0) return "?";
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}
