/**
 * Typage ambiant pour les golden fixtures `.md` importées en texte brut (`?raw`, résolu par
 * Vite/Vitest) depuis les tests `src/` — miroir de `packages/core/__tests__/fixtures/raw-md.d.ts`.
 * Sert les tests de round-trip **au niveau document** (mappers inclus) sur des artefacts réels du frame.
 */
declare module "*.md?raw" {
  const content: string;
  export default content;
}
