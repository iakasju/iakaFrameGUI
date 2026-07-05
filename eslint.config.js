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
);
