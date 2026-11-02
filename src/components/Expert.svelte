<script>
  import { CONFIGURATOR } from "@/js/configurator.svelte.js";

  // Settings only the Advanced user level shows (CONFIGURATOR.expertMode).
  // Below it they are simply not there: no per-section reveal. `changed`
  // keeps one shown anyway when the FC holds a non-default value the pilot
  // should still see; once shown it stays, so it doesn't vanish while being
  // edited back to its default.
  let { children, changed = false } = $props();

  let keep = $state(false);
  $effect.pre(() => {
    if (changed) keep = true;
  });
</script>

{#if CONFIGURATOR.expertMode || changed || keep}
  {@render children?.()}
{/if}
