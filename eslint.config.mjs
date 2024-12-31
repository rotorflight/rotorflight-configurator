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

      // TODO: The codebase makes extensive use of globals. This rule should be
      // enabled and remaining globals explicitly defined.
      "no-undef": "off",
    },
  },
];
