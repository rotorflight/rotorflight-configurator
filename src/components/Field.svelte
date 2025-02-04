<script>
  import { i18n } from "@/js/i18n.js";
  import HoverTooltip from "@/components/HoverTooltip.svelte";

  let { id, children, label, tooltip } = $props();
</script>

<div class="container">
  <label for={id}>
    {$i18n.t(label)}
  </label>
  <div class="control">
    {#if tooltip}
      <HoverTooltip {tooltip}>
        {@render children?.()}
      </HoverTooltip>
    {:else}
      {@render children?.()}
    {/if}
  </div>
</div>

<style lang="scss">
  .container {
    display: flex;
    align-items: center;
    min-height: 2rem;
    padding: 0 4px;
  }

  label {
    flex-grow: 1;
    padding: 4px 0;
  }

  .control {
    max-width: 200px;
  }

  @media only screen and (max-width: 480px) {
    .container {
      height: 3rem;
      padding: 0;
    }
  }

  @media (hover: hover) {
    .container:hover {
      :global(html[data-theme="light"]) & {
        background-color: var(--color-neutral-200);
      }

      :global(html[data-theme="dark"]) & {
        background-color: var(--color-neutral-700);
      }
    }
  }
</style>
