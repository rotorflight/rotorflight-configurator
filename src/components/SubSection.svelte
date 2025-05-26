<script>
  import { i18n } from "@/js/i18n.js";

  let { children, label } = $props();
</script>

<div class="container">
  {#if label}
    <div class="header">
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

    :global(html[data-theme="light"]) & {
      color: var(--color-neutral-700);
      border-bottom: 1px solid var(--color-neutral-400);
    }

    :global(html[data-theme="dark"]) & {
      color: var(--color-neutral-200);
      border-bottom: 1px solid var(--color-neutral-700);
    }
  }

  @media only screen and (max-width: 480px) {
    .content > :global(*) + :global(*) {
      :global(html[data-theme="light"]) & {
        border-top: 1px solid var(--color-neutral-400);
      }

      :global(html[data-theme="dark"]) & {
        border-top: 1px solid var(--color-neutral-700);
      }
    }
  }
</style>
