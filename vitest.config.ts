import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Tests front (jsdom + React) ET cœur `@iakaframe/core` (logique pure). jsdom convient
// aux deux ; les tests du cœur n'utilisent pas le DOM.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    // Laisse Vite traiter les feuilles importées (dont les imports `?raw`) afin de
    // pouvoir vérifier le contrat de tokens d'une charte depuis un test.
    css: true,
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "packages/*/__tests__/**/*.{test,spec}.ts",
      // Outillage Node de la chaîne de publication (`scripts/publish-update.mjs`) : la partie qui
      // DÉCIDE (manifeste, garde d'alignement) est testée au même titre que le front — sinon elle
      // ne serait vérifiée que le jour d'une release, c'est-à-dire trop tard.
      "scripts/**/*.{test,spec}.mjs",
    ],
  },
});
