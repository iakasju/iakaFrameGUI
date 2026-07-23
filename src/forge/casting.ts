/**
 * casting.ts — helpers **purs** de casting visuel (dégradés + initiales), séparés des
 * composants (`Vignette.tsx`) pour garder le fast-refresh propre (un fichier = composants OU
 * fonctions). Déterministe, borné : sert les pastilles `[ROYAUME][Nom]` et vignettes de rail.
 */

/** Palette de dégradés par index de casting (0..7), repli sur le premier. */
const CASTING_GRADIENTS: readonly [string, string][] = [
  ["#b8862b", "#8a5e12"], // 0 portefeuille — or
  ["#2f7d43", "#1f5c30"], // 1 coordination — vert
  ["#2b5f9e", "#1d4372"], // 2 architecture — bleu
  ["#b3261e", "#7d1a15"], // 3 fabrication — rouge
  ["#1f7a6b", "#124a40"], // 4 tests — cyan
  ["#7a3b86", "#52285f"], // 5 graphisme — violet
  ["#9a5b17", "#6b3d0f"], // 6 doc — orange
  ["#7a2b2b", "#4f1a1a"], // 7 déploiement — grenat
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
