<script>
  import { slide } from "svelte/transition";

  import { i18n } from "@/js/i18n.js";

  let { children, label } = $props();
</script>

<div class="container">
  {#if label}
    <div transition:slide class="header">
      {$i18n.t(label)}
    </div>
  {/if}
  <div class="content">{@render children?.()}</div>
</div>

<style lang="scss">
  .header {
    padding-bottom: 2px;
    margin: 4px;

    font-weight: 900;

    color: var(--color-text-soft);
    border-bottom: 1px solid var(--color-border);
  }

  @media only screen and (max-width: 480px) {
    .content > :global(*) + :global(*) {
      border-top: 1px solid var(--color-border);
    }
  }
</style>
