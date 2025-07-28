<script>
  import { slide } from "svelte/transition";

  import { i18n } from "@/js/i18n.js";
  import HoverTooltip from "@/components/HoverTooltip.svelte";

  let { id, children, label, tooltip, unit } = $props();

  let width = $state(0);
  let mobile = $derived(width <= 480);
  let showMobileTooltip = $state(false);
</script>

<svelte:window bind:innerWidth={width} />

<div class="container">
  <div class="content">
    <label
      for={id}
      onclick={(e) => {
        if (mobile && tooltip) {
          e.preventDefault();
          showMobileTooltip = !showMobileTooltip;
        }
      }}
    >
      {#if typeof label === "string"}
        <span class="field-label">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html $i18n.t(label)}
        </span>
      {:else if typeof label === "function"}
        {@render label()}
      {/if}
      {#if unit}
        <span class="units">[ {unit} ]</span>
      {/if}
    </label>
    <div class="control">
      {#if !mobile && tooltip}
        <HoverTooltip {tooltip}>
          {@render children?.()}
        </HoverTooltip>
      {:else}
        {@render children?.()}
      {/if}
    </div>
  </div>
  {#if mobile && tooltip && showMobileTooltip}
    <div class="tooltip-container" transition:slide>
      {@render tooltip()}
    </div>
  {/if}
</div>

<style lang="scss">
  .container {
    border-radius: 2px;
  }

  .tooltip-container {
    padding: 8px 4px;
  }

  .content {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 4px;
    padding: 0 4px;
    min-height: 32px;
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
    .content {
      min-height: 48px;
    }

    .field-label {
      font-weight: 600;
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
