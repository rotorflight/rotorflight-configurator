import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.jquery },
    },
  },
  pluginJs.configs.recommended,
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
