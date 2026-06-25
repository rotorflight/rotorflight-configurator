import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import { defineConfig } from "eslint/config";
import globals from "globals";
import ts from "typescript-eslint";

import svelteConfig from "./svelte.config.mjs";

/** @type {import('eslint').Linter.Config[]} */
export default defineConfig(
  js.configs.recommended,
  ts.configs.strict,
  svelte.configs.recommended,
  svelte.configs.prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jquery,

        chrome: "readonly",
        nw: "readonly",
        cordova: "readonly",
        cordova_serial: "readonly",

        LRUMap: "readonly",
        Switchery: "readonly",
        jBox: "readonly",
        ol: "readonly",

        __APP_VERSION__: "readonly",
        __BACKEND__: "readonly",
        __COMMIT_HASH__: "readonly",
      },
    },
  },
  {
    rules: {
      semi: "error",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.ts"],
    extends: [ts.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    files: ["**/*.js"],
    rules: {
      "@typescript-eslint/no-this-alias": "off",
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: ts.parser,
        svelteConfig: {
          ...svelteConfig,
          // remove function so the config can be serialised by eslint --cache
          onwarn: undefined,
        },
      },
    },
  },
);
