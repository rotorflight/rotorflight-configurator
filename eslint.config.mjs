import globals from "globals";
import pluginJs from "@eslint/js";
import pluginSvelte from "eslint-plugin-svelte";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.jquery },
    },
  },
  pluginJs.configs.recommended,
  ...pluginSvelte.configs["flat/recommended"],
  {
    rules: {
      semi: "error",
      "no-prototype-builtins": "off",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      "no-undef": "error",
    },
  },
];
