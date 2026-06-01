/** @type {import("prettier").Config} */
export default {
  plugins: ["prettier-plugin-svelte", "@trivago/prettier-plugin-sort-imports"],
  overrides: [{ files: "*.svelte", options: { parser: "svelte" } }],

  importOrder: ["^node:", "<THIRD_PARTY_MODULES>", "^@/", "^[./]"],
  importOrderSeparation: true,
};
