<script>
  import { slide } from "svelte/transition";
  import { i18n } from "@/js/i18n.js";

  let { children, label, summary, header } = $props();

  let showSummary = $state(false);

  function toggleSummary() {
    showSummary = !showSummary;
  }
</script>

<div class="container">
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
          class={["icon", "fas", "fa-question-circle", showSummary && "active"]}
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
    @extend %section-header;
  }

  .title {
    padding-left: 8px;
  }

  .content {
    padding: 4px;
    display: flex;
    flex-direction: column;
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;

    :global(html[data-theme="light"]) & {
      background-color: var(--color-neutral-100);
    }

    :global(html[data-theme="dark"]) & {
      background-color: var(--color-neutral-900);
    }

    > :global(*) + :global(*) {
      margin-top: 12px;
    }
  }

  .summary {
    padding: 8px;

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
    padding: 8px;
    margin: 0;
    font-size: 1rem;

    -webkit-tap-highlight-color: transparent;

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

    .summary {
      padding: 8px;
    }

    .content {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;

      & > :global(*) + :global(*) {
        margin-top: 16px;
      }
    }

    .icon {
      padding: 8px;
      padding-left: 16px;
    }
  }
</style>
