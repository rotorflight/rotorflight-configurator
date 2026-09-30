<script>
  import { slide } from "svelte/transition";

  import { i18n } from "@/js/i18n.js";

  let { children, label, summary, header } = $props();

  let showSummary = $state(false);

  function toggleSummary() {
    showSummary = !showSummary;
  }
</script>

<div class="wrapper svelte">
  <div class="container" data-tooltip-boundary>
    {#if header}
      {@render header()}
    {:else}
      <div class="header">
        <span class="title">{$i18n.t(label)}</span>
        {#if summary}
          <div class="grow"></div>
          <button
            aria-label="help"
            onclick={toggleSummary}
            class={[
              "icon",
              "fas",
              "fa-question-circle",
              showSummary && "active",
            ]}
          >
          </button>
        {/if}
      </div>
    {/if}
    {#if showSummary && typeof summary === "string"}
      <div class="summary" transition:slide>
        <p>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html $i18n.t(summary)}
        </p>
      </div>
    {/if}
    <div class="content">
      <div class="content-wrapper">
        {@render children?.()}
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .wrapper {
    padding-top: var(--section-gap);
  }

  .container {
    @extend %section-shadow;
  }

  .header {
    @extend %section-header;
  }

  .title {
    padding-left: 8px;
  }

  .content {
    padding: 6px 4px;
    background-color: var(--color-surface);
  }

  .content-wrapper {
    display: flex;
    flex-direction: column;
    margin-bottom: -12px;

    > :global(*) {
      margin-bottom: 12px;
    }
  }

  .summary {
    padding: 10px 12px;
    font-size: 0.82rem;
    line-height: 1.5;
    color: var(--color-text-muted);
    background-color: var(--color-surface-sunken);
    border-bottom: 1px solid var(--color-border-soft);
  }

  .grow {
    flex-grow: 1;
  }

  .icon {
    background: none;
    border: none;
    padding: 6px;
    margin: 0 4px 0 0;
    font-size: 0.95rem;
    line-height: 1;
    cursor: pointer;
    border-radius: var(--radius-sm);
    color: var(--color-neutral-500);
    transition:
      color var(--animation-speed),
      background-color var(--animation-speed);

    -webkit-tap-highlight-color: transparent;

    :global(html[data-theme="dark"]) & {
      color: var(--color-neutral-400);
    }

    &:hover {
      color: var(--color-text);
      background-color: var(--color-hover);
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px var(--color-focus-ring);
    }

    &.active,
    &.active:hover {
      color: var(--color-accent-500);
    }
  }

  @media only screen and (max-width: 480px) {
    .container {
      border-radius: 0px;
    }

    .summary {
      padding: 8px;
    }

    .content-wrapper {
      margin-bottom: -16px;

      > :global(*) {
        margin-bottom: 16px;
      }
    }

    .icon {
      padding: 8px;
      padding-left: 16px;
    }
  }
</style>
