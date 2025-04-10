<script>
  import { slide } from "svelte/transition";

  let { children, summary } = $props();

  let open = $state(false);
</script>

<div class="container" class:open>
  <!-- eslint-disable-next-line svelte/valid-compile -->
  <div class="summary" onclick={() => (open = !open)}>
    {@render summary()}
  </div>
  {#if open}
    <div class="content" transition:slide>
      {@render children?.()}
    </div>
  {/if}
</div>

<style lang="scss">
  .summary {
    font-weight: 600;
    display: flex;
    height: 2rem;
    padding: 0 4px;
    align-items: center;
    cursor: pointer;
  }

  .content {
    padding-top: 4px;
  }

  .open .summary {
    :global(html[data-theme="light"]) & {
      background-color: var(--color-neutral-300);
    }

    :global(html[data-theme="dark"]) & {
      background-color: var(--color-neutral-700);
      background-color: hsl(160, 2%, 46%);
    }
  }

  @media (hover: hover) {
    .summary:hover {
      :global(html[data-theme="light"]) & {
        background-color: var(--color-neutral-200);
      }

      :global(html[data-theme="dark"]) & {
        background-color: var(--color-neutral-800);

        background-color: hsl(160, 2%, 36%);
      }
    }
  }
</style>
