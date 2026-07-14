/**
 * Typage ambiant pour les imports CSS bruts (`?raw`) résolus par Vite/Vitest.
 * Permet de charger une feuille de charte en texte pour en vérifier le contrat de tokens.
 */
declare module "*.css?raw" {
  const content: string;
  export default content;
}
