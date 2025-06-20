<script>
  import { i18n } from "@/js/i18n.js";
  import HoverTooltip from "@/components/HoverTooltip.svelte";

  let { id, children, label, tooltip, unit } = $props();
</script>

<div class="container">
  <label for={id}>
    <span>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html $i18n.t(label)}
    </span>
    {#if unit}
      <span class="units">[ {unit} ]</span>
    {/if}
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
    padding: 0 4px;
    min-height: 2rem;
    border-radius: 2px;
  }

  label {
    display: flex;
    flex-grow: 1;
    align-items: center;
    align-self: stretch;
  }

  .units {
    margin-left: 8px;

    :global(html[data-theme="light"]) & {
      color: hsl(20, 80%, 30%);
    }

    :global(html[data-theme="dark"]) & {
      color: hsl(20, 50%, 70%);
    }
  }

  @media only screen and (max-width: 480px) {
    .container {
      min-height: 3rem;
    }
  }

  @media (hover: hover) {
    .container:hover {
      :global(html[data-theme="light"]) & {
        background-color: var(--color-neutral-200);
      }

      :global(html[data-theme="dark"]) & {
        background-color: var(--color-neutral-800);
      }
    }
  }
</style>
