<script>
  import { slide } from "svelte/transition";

  import HoverTooltip from "@/components/HoverTooltip.svelte";

  import { i18n } from "@/js/i18n.js";

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
    border-radius: var(--radius-sm);
    transition: background-color var(--animation-speed);
  }

  .tooltip-container {
    padding: 8px 4px;
  }

  .content {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    padding: 0 8px;
    min-height: 34px;
  }

  label {
    display: flex;
    flex-grow: 1;
    align-items: center;
    align-self: stretch;
  }

  .units {
    margin-left: 8px;
    min-width: fit-content;
    font-size: 0.75rem;
    color: var(--color-text-muted);
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
      background-color: var(--color-hover);
    }
  }
</style>
