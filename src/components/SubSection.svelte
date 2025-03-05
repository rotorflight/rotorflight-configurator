<script>
  import { slide } from "svelte/transition";

  import { i18n } from "@/js/i18n.js";

  let { children, label } = $props();
</script>

<div class="container" transition:slide>
  {#if label}
    <div class="header">
      {$i18n.t(label)}
    </div>
  {/if}
  <div class="content">{@render children?.()}</div>
</div>

<style lang="scss">
  .header {
    font-weight: 900;
    padding: 4px;
  }

  @media only screen and (max-width: 480px) {
    .content > :global(*) + :global(*) {
      :global(html[data-theme="light"]) & {
        border-top: 1px solid var(--color-neutral-400);
      }

      :global(html[data-theme="dark"]) & {
        border-top: 1px solid var(--color-neutral-600);
      }
    }

    .header {
      font-weight: 900;
      padding: 4px 0;
    }
  }
</style>
