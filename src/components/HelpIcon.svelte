<script>
  import HoverTooltip from "./HoverTooltip.svelte";

  let { children } = $props();
</script>

<div class="container">
  <HoverTooltip>
    {#snippet tooltip()}
      {@render children?.()}
    {/snippet}
    <div class="icon fas fa-question-circle"></div>
  </HoverTooltip>
</div>

<style lang="scss">
  .container {
    position: relative;
    margin-left: 8px;

    &:hover .tooltip {
      display: block;
    }

    :global(html[data-theme="light"]) &:hover .icon {
      color: hsl(40, 100%, 50%);
    }

    :global(html[data-theme="dark"]) &:hover .icon {
      color: var(--color-neutral-400);
    }
  }

  .icon {
    font-size: 14px;
    padding: 2px;

    :global(html[data-theme="light"]) & {
      color: var(--color-neutral-500);
    }

    :global(html[data-theme="dark"]) & {
      color: var(--color-neutral-200);
    }
  }
</style>
