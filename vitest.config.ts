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
    ],
  },
});
