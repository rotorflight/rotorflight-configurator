<script>
  import { slide } from "svelte/transition";
  import { i18n } from "@/js/i18n.js";

  let { children, label, summary } = $props();

  let showSummary = $state(false);

  function toggleSummary() {
    showSummary = !showSummary;
  }
</script>

<div class="container">
  <div class="header">
    <span>{$i18n.t(label)}</span>
    {#if summary}
      <div class="grow"></div>
      <button
        aria-label="help"
        onclick={toggleSummary}
        class={["icon", "fas", "fa-question-circle", showSummary && "active"]}
      >
      </button>
    {/if}
  </div>
  <div class="content">
    {#if showSummary && typeof summary === "string"}
      <div class="summary" transition:slide>
        <p>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html $i18n.t(summary)}
        </p>
      </div>
    {/if}
    {@render children?.()}
  </div>
</div>

<style lang="scss">
  .container {
    :global(html[data-theme="light"]) & {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
  }

  .header {
    display: flex;
    padding: 8px;
    font-size: 1rem;
    font-weight: 600;
    font-weight: 600;
    border-bottom-width: 1px;
    border-style: solid;
    align-items: center;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;

    :global(html[data-theme="light"]) & {
      color: var(--color-neutral-900);
      background-color: var(--color-neutral-100);
      border-bottom-color: var(--color-neutral-500);
    }

    :global(html[data-theme="dark"]) & {
      color: var(--color-neutral-100);
      background-color: var(--color-neutral-900);
      border-bottom-color: var(--color-neutral-600);
    }
  }

  .content {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;

    :global(html[data-theme="light"]) & {
      background-color: var(--color-neutral-100);
    }

    :global(html[data-theme="dark"]) & {
      background-color: var(--color-neutral-900);
    }
  }

  .grow {
    flex-grow: 1;
  }

  .icon {
    background: none;
    border: none;
    padding: 0 4px;
    margin: 0;
    font-size: 1rem;

    :global(html[data-theme="light"]) & {
      color: var(--color-neutral-400);
    }

    :global(html[data-theme="dark"]) & {
      color: var(--color-neutral-500);
    }

    &:hover {
      :global(html[data-theme="light"]) & {
        color: var(--color-neutral-500);
      }

      :global(html[data-theme="dark"]) & {
        color: var(--color-neutral-500);
      }
    }

    &.active {
      :global(html[data-theme="light"]) & {
        color: var(--color-yellow-500);
      }

      :global(html[data-theme="dark"]) & {
        color: var(--color-neutral-200);
      }
    }
  }

  @media only screen and (max-width: 480px) {
    .container {
      border-radius: 0px;
    }

    .header {
      margin-top: 16px;

      :global(html[data-theme="light"]) & {
        background: none;
      }

      :global(html[data-theme="dark"]) & {
        background: none;
      }
    }

    .content {
      gap: 16px;
    }

    .icon {
      padding: 8px 16px;
    }
  }
</style>
