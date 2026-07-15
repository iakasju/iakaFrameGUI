/**
 * Typage ambiant pour les golden fixtures `.md` importées en texte brut (`?raw`, résolu par
 * Vite/Vitest). Permet de vérifier la byte-parité frontmatter depuis les tests du cœur.
 */
declare module "*.md?raw" {
  const content: string;
  export default content;
}
