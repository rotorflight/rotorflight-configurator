import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  preprocess: vitePreprocess(),
  onwarn: (warning, handler) => {
    /* Caused by injecting _global.scss into all svelte components */
    if (warning.code === "css_unused_selector") {
      return;
    }

    /* ignore accessibility warnings */
    if (warning.code.startsWith("a11y")) {
      return;
    }

    handler(warning);
  },
};
