const js = require("@eslint/js");
const sonarjs = require("eslint-plugin-sonarjs");
const globals = require("globals");

module.exports = [
  { ignores: ["coverage"] },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      // lib.jsのpage.evaluate()コールバックはPlaywrightのブラウザ実行コンテキスト内で
      // 実行される（windowを参照する）ため、node向けglobalsに加えてbrowser向けも含める
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: { sonarjs },
    rules: {
      ...js.configs.recommended.rules,
      ...sonarjs.configs.recommended.rules,
      complexity: ["error", 15],
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "no-unused-vars": ["error", { varsIgnorePattern: "^_" }],
    },
  },
];
