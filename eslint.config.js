import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default tseslint.config(
  {
    // Hors périmètre applicatif : artefacts, backend Rust, outillage iakaframe,
    // hooks de méthode (JS non transpilés) et specs.
    ignores: [
      "dist",
      "src-tauri",
      "coverage",
      "node_modules",
      "packages/*/dist",
      "global",
      "specs",
      // `*.config.js` : hérité du scaffold initial (commit e67dc6c, « monorepo npm
      // workspaces + configs front »), jamais une décision documentée — mesuré par
      // `git log -L19,19:eslint.config.js`. Conservé en l'état : le retirer ouvrirait
      // une cascade d'erreurs sur eslint.config.js lui-même, hors sujet du lot D-8.
      // NB : ne neutralise que la moitié `.js` du bloc « config Node » ci-dessous ;
      // sa moitié `.ts` reste vivante via vite.config.ts.
      "*.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    // Fichiers de config exécutés en contexte Node.
    files: ["*.config.{js,ts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Outillage Node en ESM (scripts de génération, hooks de méthode non vendorés).
    // `globals.nodeBuiltin` et NON `globals.node` : ce dernier ajoute les globals
    // CommonJS (`require`, `module`, `exports`, `__dirname`) qui n'existent pas en
    // `.mjs`. Les accorder rendrait le lint complaisant — il validerait un `require()`
    // qui plante à l'exécution.
    files: ["**/*.mjs", "**/scripts/**/*.{js,mjs}"],
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
  },
);
