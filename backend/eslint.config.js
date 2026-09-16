import js from "@eslint/js";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";

export default [
  // src/opsAlertNotifier.jsはdev-standards由来のsymlink（実体はdev-standards側が所有・lintする）のため対象外とする
  { ignores: ["coverage", "src/opsAlertNotifier.js"] },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    plugins: { sonarjs },
    rules: {
      ...js.configs.recommended.rules,
      ...sonarjs.configs.recommended.rules,
      complexity: ["error", 15],
      "no-unused-vars": ["error", { varsIgnorePattern: "^_" }],
    },
  },
];
