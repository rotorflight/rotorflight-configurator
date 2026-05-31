import globals from "globals";
import pluginJs from "@eslint/js";
import pluginSvelte from "eslint-plugin-svelte";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jquery,

        chrome: "readonly",

        // TODO: remove these globals after they're removed from vite defines
        __APP_VERSION__: "readonly",
        __BACKEND__: "readonly",
        __COMMIT_HASH__: "readonly",
      },
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
