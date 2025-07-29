<script>
  import { CONFIGURATOR } from "@/js/configurator.svelte.js";

  let { children } = $props();
</script>

{#if CONFIGURATOR.expertMode}
  {@render children?.()}
{/if}

<style lang="scss">
</style>
