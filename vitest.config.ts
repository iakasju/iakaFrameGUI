import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Tests front (jsdom + React) ET cœur `@iakaframe/core` (logique pure). jsdom convient
// aux deux ; les tests du cœur n'utilisent pas le DOM.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "packages/*/__tests__/**/*.{test,spec}.ts",
    ],
  },
});
