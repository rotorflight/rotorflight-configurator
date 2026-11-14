<script>
  import { getContext } from "svelte";

  import { CONFIGURATOR } from "@/js/configurator.svelte.js";
  import { isTabInUserLevel } from "@/js/user_level.js";

  // A button that opens another tab, left out when the user level hides
  // that tab (Beginner).
  let { tab, children } = $props();

  const wiz = getContext("setupWizard");
</script>

{#if isTabInUserLevel(tab, CONFIGURATOR.userLevel)}
  <button class="btn" onclick={() => wiz.openTab(tab)}>
    {@render children()}
  </button>
{/if}

<style lang="scss">
  .btn {
    @extend %button;
  }
</style>
